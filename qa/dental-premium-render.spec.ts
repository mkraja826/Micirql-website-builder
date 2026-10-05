import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  SCHEMA_VERSION,
  siteSchema,
  type CompositionIdentity,
  type Site,
} from "@micirql/schema";
import { seedSectionCatalog, type SectionFamily } from "@micirql/sections";
import { applyIndustryPreset } from "../apps/builder/app/apply-industry-preset";
import { POST as renderPreview } from "../apps/builder/app/api/preview/route";
import { demoAssetById } from "../apps/builder/app/demo-assets";
import {
  DENTAL_CATALOG_VERSION,
  DESIGN_REVIEW_COUNT,
  compositionIdentityForPreset,
  listIndustryDesignPresets,
  type IndustryDesignPreset,
} from "../apps/builder/app/industry-design-preset-data";

const premiumViewports = [
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
] as const;

const allCompositions = listIndustryDesignPresets("clinic", "dental").map(
  (preset) => ({
    id: preset.id,
    identity: compositionIdentityForPreset(preset),
  }),
);

const compositions =
  process.env.MI_QA_DENTAL_SMOKE === "1"
    ? allCompositions.slice(0, 1)
    : allCompositions;

test.describe("certified dental compositions: rendered premium gate", () => {
  test.describe.configure({ mode: "parallel" });

  test("the actual generated Top 20 produce materially different review payloads", async () => {
    test.setTimeout(180_000);

    const scaffold = generatedDentalScaffold();
    const presets = listIndustryDesignPresets("clinic", "dental");
    const rendered: Array<{
      id: string;
      imageStrategy: IndustryDesignPreset["imageStrategy"];
      sectionOrder: string;
      geometry: string;
      palette: string;
      typography: string;
      heroMedia: string;
    }> = [];

    for (const preset of presets) {
      const candidate = siteSchema.parse(applyIndustryPreset(scaffold, preset));
      const storedHero = candidate.pages[0]?.sections.find((section) =>
        section.component.componentId.includes("-HERO-"),
      );
      const storedImage = storedHero?.props.image as
        Record<string, unknown> | undefined;
      expect(
        storedImage?.src,
        `${preset.id} must retain a live-renderable certified media URL`,
      ).toMatch(/^https:\/\/images\.pexels\.com\/photos\//);
      expect(storedImage?.license).toBe("licensed");
      expect(storedImage?.sourceReference).toMatch(
        /^https:\/\/www\.pexels\.com\/photo\//,
      );
      const response = await renderPreview(
        new Request("https://builder.micirql.test/api/preview", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ site: candidate, path: "/" }),
        }),
      );
      expect(
        response.ok,
        `${preset.id} must pass the actual builder preview route`,
      ).toBeTruthy();

      const payload = (await response.json()) as ActualPreviewPayload;
      expect(payload.ok).toBeTruthy();
      expect(payload.sections).toHaveLength(12);
      const sections = payload.sections ?? [];
      const sectionFamilies = sections.map((section) => {
        const registered = seedSectionCatalog.find(
          (candidate) => candidate.id === section.componentId,
        );
        if (!registered) {
          throw new Error(
            `The builder returned unregistered component ${section.componentId}`,
          );
        }
        return registered.family;
      });
      const heroIndex = sectionFamilies.indexOf("hero");
      const heroImage = sections[heroIndex]?.props.image as
        Record<string, unknown> | undefined;
      const themeStyle = payload.themeStyle ?? {};
      const signature = {
        sectionOrder: sectionFamilies.join(","),
        geometry: JSON.stringify(
          sections.map((section) => ({
            componentId: section.componentId,
            version: section.componentVersion,
          })),
        ),
        palette: JSON.stringify(
          Object.entries(themeStyle)
            .filter(([key]) => key.startsWith("--mi-color-"))
            .sort(([left], [right]) => left.localeCompare(right)),
        ),
        typography: JSON.stringify(
          Object.entries(themeStyle)
            .filter(
              ([key]) =>
                key.startsWith("--mi-font-") ||
                key.includes("weight") ||
                key.includes("leading") ||
                key.includes("tracking"),
            )
            .sort(([left], [right]) => left.localeCompare(right)),
        ),
        heroMedia: typeof heroImage?.src === "string" ? heroImage.src : "",
      };

      expect(
        signature.sectionOrder,
        `${preset.id} must render the selected recipe order`,
      ).toBe(preset.sectionOrder.join(","));
      rendered.push({
        id: preset.id,
        imageStrategy: preset.imageStrategy,
        ...signature,
      });
    }

    expect(rendered).toHaveLength(DESIGN_REVIEW_COUNT);
    expect(
      new Set(
        rendered.map(({ geometry, palette, typography }) =>
          JSON.stringify({ geometry, palette, typography }),
        ),
      ).size,
      "all 20 applied candidates must have a distinct rendered visual system",
    ).toBe(DESIGN_REVIEW_COUNT);

    for (let leftIndex = 0; leftIndex < rendered.length; leftIndex += 1) {
      for (
        let rightIndex = leftIndex + 1;
        rightIndex < rendered.length;
        rightIndex += 1
      ) {
        const left = rendered[leftIndex]!;
        const right = rendered[rightIndex]!;
        const visualDifference =
          left.geometry !== right.geometry ||
          left.palette !== right.palette ||
          left.typography !== right.typography ||
          left.heroMedia !== right.heroMedia;
        expect(
          left.sectionOrder !== right.sectionOrder && visualDifference,
          `${left.id} and ${right.id} must differ in rendered structure and visual treatment`,
        ).toBeTruthy();
      }
    }

    const mediaByStrategy = new Map<string, string>();
    for (const candidate of rendered) {
      expect(
        candidate.heroMedia,
        `${candidate.id} must render licensed dental media in the hero`,
      ).not.toBe("");
      const existing = mediaByStrategy.get(candidate.imageStrategy);
      if (existing) {
        expect(
          candidate.heroMedia,
          `${candidate.imageStrategy} must resolve deterministically`,
        ).toBe(existing);
      } else {
        mediaByStrategy.set(candidate.imageStrategy, candidate.heroMedia);
      }
    }
    expect(
      new Set(mediaByStrategy.values()).size,
      "each approved image strategy must create a visibly different hero-media direction",
    ).toBe(mediaByStrategy.size);
  });

  test("the Top 20 expose twenty distinct rendered visual signatures", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    const signatures: string[] = [];

    for (const composition of allCompositions) {
      const componentByFamily = Object.fromEntries(
        composition.identity.components.map((component) => [
          component.family,
          component.componentId,
        ]),
      );
      const heroId = componentByFamily.hero;
      const servicesId = componentByFamily.services;
      if (!heroId || !servicesId) {
        throw new Error(
          `${composition.id} is missing a visual-signature component`,
        );
      }

      await page.goto(`/library/${heroId}`, { waitUntil: "networkidle" });
      const hero = await page
        .locator("[data-section-family='hero']")
        .evaluate((section) => {
          const layout = section.querySelector<HTMLElement>(
            ".mi-section__layout",
          );
          const heading =
            section.querySelector<HTMLElement>(".mi-type--display");
          const media =
            section.querySelector<HTMLElement>(".mi-section__media");
          const surface = section.querySelector<HTMLElement>(".mi-section");
          if (!layout || !heading || !media || !surface) {
            throw new Error("The hero signature could not be measured");
          }
          const layoutStyle = getComputedStyle(layout);
          const headingStyle = getComputedStyle(heading);
          const mediaStyle = getComputedStyle(media);
          const surfaceStyle = getComputedStyle(surface);
          return {
            columns: layoutStyle.gridTemplateColumns,
            align: layoutStyle.alignItems,
            headingFamily: headingStyle.fontFamily,
            headingWeight: headingStyle.fontWeight,
            headingSize: headingStyle.fontSize,
            headingLeading: headingStyle.lineHeight,
            headingTransform: headingStyle.textTransform,
            mediaOrder: mediaStyle.order,
            mediaRadius: mediaStyle.borderRadius,
            mediaShadow: mediaStyle.boxShadow,
            surfaceBackground: surfaceStyle.backgroundImage,
          };
        });

      await page.goto(`/library/${servicesId}`, {
        waitUntil: "networkidle",
      });
      const services = await page
        .locator("[data-section-family='services']")
        .evaluate((section) => {
          const composition = section.querySelector<HTMLElement>(
            ".mi-section__composition",
          );
          const card = section.querySelector<HTMLElement>(".mi-section__card");
          if (!composition || !card) {
            throw new Error("The services signature could not be measured");
          }
          const compositionStyle = getComputedStyle(composition);
          const cardStyle = getComputedStyle(card);
          return {
            compositionDisplay: compositionStyle.display,
            compositionColumns: compositionStyle.gridTemplateColumns,
            cardBackground: cardStyle.backgroundImage,
            cardBorder:
              cardStyle.borderTopWidth + " " + cardStyle.borderTopStyle,
            cardRadius: cardStyle.borderRadius,
            cardShadow: cardStyle.boxShadow,
            cardClip: cardStyle.clipPath,
          };
        });

      signatures.push(JSON.stringify({ hero, services }));
    }

    expect(
      new Set(signatures).size,
      "each certified candidate must render a distinct visual signature",
    ).toBe(DESIGN_REVIEW_COUNT);
  });

  for (const composition of compositions) {
    test(`${composition.id} across all premium viewports`, async ({ page }) => {
      test.setTimeout(180_000);
      await page.setViewportSize(premiumViewports[0]);
      await mountComposition(page, composition.identity);

      const root = page.locator(`[data-mi-composition-id="${composition.id}"]`);
      await expect(root).toBeVisible();
      await expect(root.locator("[data-section-family]")).toHaveCount(12);

      for (const viewport of premiumViewports) {
        await test.step(`${viewport.width}x${viewport.height}`, async () => {
          await page.setViewportSize(viewport);
          await verifyNavigation(page, viewport.width);
          await applyDentalFixtureContent(page);

          const geometry = await page.evaluate(() => {
            const visibleInteractive = [
              ...document.querySelectorAll<HTMLElement>(
                'a, button, summary, input:not([type="hidden"]), select, textarea',
              ),
            ].filter(isVisible);

            const undersizedTargets = visibleInteractive
              .filter((element) => {
                const rect = element.getBoundingClientRect();
                return rect.width < 44 || rect.height < 44;
              })
              .map(describeElement);

            const clippedControls = visibleInteractive
              .filter((element) => isHorizontallyClipped(element))
              .map(describeElement);

            const collidingControls: string[] = [];
            for (let left = 0; left < visibleInteractive.length; left += 1) {
              for (
                let right = left + 1;
                right < visibleInteractive.length;
                right += 1
              ) {
                const first = visibleInteractive[left];
                const second = visibleInteractive[right];
                if (!first || !second) continue;
                if (first.contains(second) || second.contains(first)) continue;
                if (
                  overlaps(
                    first.getBoundingClientRect(),
                    second.getBoundingClientRect(),
                  )
                ) {
                  collidingControls.push(
                    `${describeElement(first)} <> ${describeElement(second)}`,
                  );
                }
              }
            }

            const overflowingHeadings = [
              ...document.querySelectorAll<HTMLElement>("h1, h2, h3"),
            ]
              .filter(isVisible)
              .filter(
                (heading) =>
                  heading.scrollWidth > heading.clientWidth + 1 ||
                  isHorizontallyClipped(heading),
              )
              .map(describeElement);

            return {
              overflowPx: Math.max(
                0,
                document.documentElement.scrollWidth -
                  document.documentElement.clientWidth,
              ),
              undersizedTargets,
              clippedControls,
              collidingControls,
              overflowingHeadings,
            };

            function isVisible(element: HTMLElement) {
              const style = getComputedStyle(element);
              const rect = element.getBoundingClientRect();
              return (
                style.display !== "none" &&
                style.visibility !== "hidden" &&
                Number(style.opacity) !== 0 &&
                rect.width > 0 &&
                rect.height > 0
              );
            }

            function isHorizontallyClipped(element: HTMLElement) {
              const rect = element.getBoundingClientRect();
              const ownStyle = getComputedStyle(element);
              if (
                element.scrollWidth > element.clientWidth + 1 &&
                ["hidden", "clip"].includes(ownStyle.overflowX)
              ) {
                return true;
              }
              if (
                rect.left < -1 ||
                rect.right > document.documentElement.clientWidth + 1
              ) {
                return true;
              }

              let ancestor = element.parentElement;
              while (ancestor && ancestor !== document.body) {
                const style = getComputedStyle(ancestor);
                if (["hidden", "clip"].includes(style.overflowX)) {
                  const ancestorRect = ancestor.getBoundingClientRect();
                  if (
                    rect.left < ancestorRect.left - 1 ||
                    rect.right > ancestorRect.right + 1
                  ) {
                    return true;
                  }
                }
                ancestor = ancestor.parentElement;
              }
              return false;
            }

            function overlaps(first: DOMRect, second: DOMRect) {
              const horizontal =
                Math.min(first.right, second.right) -
                Math.max(first.left, second.left);
              const vertical =
                Math.min(first.bottom, second.bottom) -
                Math.max(first.top, second.top);
              return horizontal > 1 && vertical > 1;
            }

            function describeElement(element: HTMLElement) {
              const text =
                element.textContent?.trim().replace(/\s+/g, " ") ?? "";
              return `${element.tagName.toLowerCase()}${element.className ? `.${String(element.className).trim().replace(/\s+/g, ".")}` : ""}${text ? ` \"${text.slice(0, 48)}\"` : ""}`;
            }
          });

          expect(
            geometry.overflowPx,
            "the composition must not create horizontal page overflow",
          ).toBeLessThanOrEqual(1);
          expect(
            geometry.undersizedTargets,
            `interactive targets below 44x44: ${JSON.stringify(geometry.undersizedTargets)}`,
          ).toEqual([]);
          expect(
            geometry.clippedControls,
            `horizontally clipped controls: ${JSON.stringify(geometry.clippedControls)}`,
          ).toEqual([]);
          expect(
            geometry.collidingControls,
            `colliding controls: ${JSON.stringify(geometry.collidingControls)}`,
          ).toEqual([]);
          expect(
            geometry.overflowingHeadings,
            `clipped or overflowing headings: ${JSON.stringify(geometry.overflowingHeadings)}`,
          ).toEqual([]);

          await verifyDocumentSemantics(page);
          await verifyAutomatedAccessibility(page);
        });
      }
    });
  }
});

async function mountComposition(page: Page, identity: CompositionIdentity) {
  const componentByFamily = Object.fromEntries(
    identity.components.map((component) => [
      component.family,
      component.componentId,
    ]),
  );
  const navbarId = componentByFamily.navbar;
  if (!navbarId) throw new Error(`${identity.id} does not define a navbar`);

  const response = await page.goto(`/library/${navbarId}`, {
    waitUntil: "networkidle",
  });
  expect(response?.ok(), `${navbarId} preview route must load`).toBeTruthy();
  await expect(
    page.locator(`[data-mi-preview-id="${navbarId}"]`),
  ).toBeVisible();
  // Mount only after React has hydrated the server-rendered preview. Mutating the
  // DOM earlier can be reconciled away by hydration under parallel test load.
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );

  await page.evaluate(
    async ({ candidateId, componentByFamily, sectionOrder }) => {
      const root = document.querySelector<HTMLElement>(
        `main[data-mi-preview-id]`,
      );
      if (!root) throw new Error("Preview root was not rendered");

      root.dataset.miCompositionId = candidateId;
      root.firstElementChild?.setAttribute(
        "data-mi-design-id",
        componentByFamily.navbar ?? "",
      );

      const parser = new DOMParser();
      const sections = await Promise.all(
        sectionOrder.slice(1).map(async (family) => {
          const designId = componentByFamily[family];
          if (!designId) {
            throw new Error(`${candidateId} does not define ${family}`);
          }
          const response = await fetch(
            `/library/${encodeURIComponent(designId)}`,
          );
          if (!response.ok) {
            throw new Error(
              `${designId} preview failed with ${response.status}`,
            );
          }
          const preview = parser.parseFromString(
            await response.text(),
            "text/html",
          );
          const section = preview.querySelector<HTMLElement>(
            `main[data-mi-preview-id="${designId}"] > [data-section-family="${family}"]`,
          );
          if (!section) throw new Error(`${designId} did not render ${family}`);
          section.dataset.miDesignId = designId;
          return section.outerHTML;
        }),
      );

      root.insertAdjacentHTML("beforeend", sections.join(""));
    },
    {
      candidateId: identity.id,
      componentByFamily,
      sectionOrder: identity.sectionOrder,
    },
  );

  await expect(page.locator("[data-section-family='footer']")).toBeVisible();
}

async function verifyNavigation(page: Page, width: number) {
  const navigation = page.getByRole("navigation", {
    name: "Primary navigation",
  });
  const toggle = navigation.getByRole("button");
  const links = navigation.getByRole("link");

  await expect(navigation).toBeVisible();
  if (width < 1024) {
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(toggle).toHaveAttribute(
      "aria-label",
      "Open primary navigation",
    );
    await toggle.focus();
    await expect(toggle).toBeFocused();
    for (let attempt = 0; attempt < 3; attempt += 1) {
      if ((await toggle.getAttribute("aria-expanded")) === "true") break;
      await toggle.focus();
      await toggle.press("Enter");
      await page.waitForTimeout(100 * (attempt + 1));
    }
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(toggle).toHaveAttribute(
      "aria-label",
      "Close primary navigation",
    );
    await expect(links.first()).toBeVisible();
    await links.first().focus();
    await links.first().press("Escape");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(toggle).toHaveAttribute(
      "aria-label",
      "Open primary navigation",
    );
    await expect(toggle).toBeFocused();
  } else {
    await expect(toggle).toBeHidden();
    await expect(links.first()).toBeVisible();
    await links.first().focus();
    await expect(links.first()).toBeFocused();
  }
}

async function applyDentalFixtureContent(page: Page) {
  await page.evaluate(() => {
    const root = document.querySelector<HTMLElement>(
      "main[data-mi-composition-id]",
    );
    if (!root) throw new Error("Dental composition root was not rendered");

    setText(root.querySelector(".mi-navbar__brand"), "Pearl Dental Studio");
    setText(root.querySelector(".mi-navbar__cta"), "Request appointment");
    root
      .querySelector<HTMLAnchorElement>(".mi-navbar__cta")
      ?.setAttribute("href", "/contact");

    const navigation = [
      ["Treatments", "/services"],
      ["Doctors", "/doctors"],
      ["About", "/about"],
      ["Contact", "/contact"],
    ] as const;
    root
      .querySelectorAll<HTMLAnchorElement>(".mi-nav-menu a")
      .forEach((link, index) => {
        const item = navigation[index];
        if (!item) return;
        link.textContent = item[0];
        link.href = item[1];
      });

    const headings: Partial<Record<string, string>> = {
      hero: "Pearl Dental Studio: Dental Implants in Hyderabad",
      about: "About Pearl Dental Studio",
      services: "Dental services",
      features: "Plan your visit with clear information",
      process: "Requesting an appointment",
      testimonials: "Patient feedback",
      gallery: "Clinic gallery",
      team: "Dental team",
      cta: "Ready to ask about your next step?",
      contact: "Contact Pearl Dental Studio",
    };

    root
      .querySelectorAll<HTMLElement>("[data-section-family]")
      .forEach((section) => {
        const family = section.dataset.sectionFamily ?? "";
        const heading = section.querySelector("h1, h2");
        if (headings[family]) setText(heading, headings[family] ?? "");

        if (!["hero", "cta", "contact"].includes(family)) {
          section.querySelector(".mi-section__actions")?.remove();
        }
        if (["cta", "contact"].includes(family)) {
          section.querySelector(".mi-section__action--secondary")?.remove();
        }
      });

    root
      .querySelectorAll<HTMLElement>(
        "[data-section-family='hero'] .mi-section__action--primary, [data-section-family='cta'] .mi-section__action--primary",
      )
      .forEach((action) => {
        setText(action, "Request appointment");
        action.setAttribute("href", "/contact");
      });
    root
      .querySelectorAll<HTMLElement>(
        "[data-section-family='hero'] .mi-section__action--secondary",
      )
      .forEach((action) => {
        setText(action, "Explore treatments");
        action.setAttribute("href", "/services");
      });
    root
      .querySelectorAll<HTMLElement>(
        "[data-section-family='contact'] .mi-section__action--primary",
      )
      .forEach((action) => {
        setText(action, "Send enquiry");
        action.setAttribute("href", "#contact-form");
      });

    root
      .querySelectorAll<HTMLElement>(".mi-footer nav a")
      .forEach((link, index) => {
        const item = navigation[index];
        if (!item) return;
        link.textContent = item[0];
        link.setAttribute("href", item[1]);
      });

    function setText(element: Element | null, value: string) {
      if (element) element.textContent = value;
    }
  });
}

async function verifyDocumentSemantics(page: Page) {
  await expect(page.locator("main")).toHaveCount(1);
  await expect(page.locator("header")).toHaveCount(1);
  await expect(page.locator("footer")).toHaveCount(1);
  await expect(
    page.getByRole("navigation", { name: "Primary navigation" }),
  ).toHaveCount(1);
  await expect(
    page.getByRole("navigation", { name: "Footer links" }),
  ).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  expect(await page.getByRole("heading", { level: 2 }).count()).toBeGreaterThan(
    0,
  );

  const skippedHeadingLevels = await page
    .locator("h1, h2, h3, h4, h5, h6")
    .evaluateAll((headings) => {
      let previous = 0;
      return headings.flatMap((heading) => {
        const level = Number(heading.tagName.slice(1));
        const skipped = previous > 0 && level > previous + 1;
        previous = level;
        return skipped
          ? [`h${level} \"${heading.textContent?.trim().slice(0, 48) ?? ""}\"`]
          : [];
      });
    });
  expect(
    skippedHeadingLevels,
    `heading levels must not be skipped: ${JSON.stringify(skippedHeadingLevels)}`,
  ).toEqual([]);

  const imageAlternatives = await page.locator("img").evaluateAll((images) =>
    images.flatMap((image) => {
      const alt = image.getAttribute("alt");
      return alt?.trim()
        ? []
        : [image.getAttribute("src")?.slice(0, 80) ?? "unknown image"];
    }),
  );
  expect(
    imageAlternatives,
    `content images require meaningful alternative text: ${JSON.stringify(imageAlternatives)}`,
  ).toEqual([]);
}

async function verifyAutomatedAccessibility(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags([
      "wcag2a",
      "wcag2aa",
      "wcag21a",
      "wcag21aa",
      "wcag22a",
      "wcag22aa",
    ])
    .analyze();
  expect(
    results.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      targets: violation.nodes.flatMap((node) => node.target),
    })),
    "WCAG 2.2 AA automated scan must not report violations",
  ).toEqual([]);
}

type ActualPreviewPayload = {
  ok: boolean;
  siteId?: string;
  pageId?: string;
  theme?: string;
  themeStyle?: Record<string, string>;
  sections?: Array<{
    id: string;
    componentId: string;
    componentVersion: string;
    props: Record<string, unknown>;
  }>;
};

function generatedDentalScaffold(): Site {
  const families: readonly SectionFamily[] = [
    "navbar",
    "hero",
    "about",
    "services",
    "features",
    "process",
    "testimonials",
    "gallery",
    "team",
    "cta",
    "contact",
    "footer",
  ];
  const navigation = [
    { label: "Home", href: "/" },
    { label: "Treatments", href: "/services" },
    { label: "Doctors", href: "/doctors" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ];

  return siteSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    siteId: "pearl-dental-generated-review",
    workspaceId: "workspace-pearl-generated-review",
    name: "Pearl Dental Studio",
    domain: "clinic",
    subtype: "dental",
    theme: {
      family: "minimalist",
      modifiers: ["light", "rounded"],
      brand: {
        colors: {
          primary: "#123A63",
          secondary: "#0D6E75",
          accent: "#70D7D2",
          background: "#FCFFFF",
          surface: "#EFF7F7",
          textPrimary: "#112A3B",
          textSecondary: "#536A78",
          border: "#CFDEE3",
          success: "#168A4A",
          warning: "#AD6A00",
          error: "#C93636",
        },
        typography: {
          display: "Manrope, sans-serif",
          body: "Inter, sans-serif",
          ui: "Inter, sans-serif",
        },
        density: "comfortable",
        shape: "soft",
        motion: "subtle",
      },
    },
    seoBlueprint: {
      primaryGoal: "Help Hyderabad patients request a dental appointment",
      targetLocations: ["Hyderabad, Telangana"],
      priorityTopics: ["dental implants", "family dentistry", "root canal"],
      audiences: ["families", "implant patients"],
      languages: ["en"],
      localSeo: true,
      servicePages: true,
      locationPages: false,
      blog: false,
    },
    pages: [
      {
        id: "home",
        path: "/",
        name: "Home",
        sections: families.map((family, index) => ({
          id: `home-${family}-${index + 1}`,
          component: {
            componentId: `${family}.placeholder`,
            version: "1.0.0",
          },
          props: actualReviewProps(family, navigation),
          bindings:
            family === "contact"
              ? {
                  submit: { actionId: "lead.create", inputMap: {} },
                  appointment: {
                    actionId: "appointment.request",
                    inputMap: {},
                  },
                }
              : {},
          hidden: false,
        })),
        seo: {
          title: "Pearl Dental Studio | Hyderabad",
          description:
            "Dental implants, family dentistry and root canal care in Hyderabad.",
          canonicalPath: "/",
          indexable: true,
          structuredDataTypes: ["Dentist"],
        },
      },
    ],
    navigation,
    integrations: [],
    domains: [],
    generation: {
      catalogVersion: DENTAL_CATALOG_VERSION,
      packStatus: "certified",
      candidateIds: listIndustryDesignPresets("clinic", "dental").map(
        (preset) => preset.id,
      ),
      brandInput: {
        colors: {
          primary: "#123A63",
          secondary: "#0D6E75",
          accent: "#70D7D2",
        },
      },
      brandProvenance: {
        colors: {
          primary: "user-supplied",
          secondary: "user-supplied",
          accent: "user-supplied",
        },
      },
    },
  });
}

function actualReviewProps(
  family: SectionFamily,
  navigation: Array<{ label: string; href: string }>,
): Record<string, unknown> {
  const primaryAction = {
    label: "Request an appointment",
    href: "/contact",
  };
  const standardItems = [
    {
      title: "Dental implants",
      description: "Consultation-led implant care based on your needs.",
    },
    {
      title: "Family dentistry",
      description: "Preventive care and clear treatment information.",
    },
    {
      title: "Root canal care",
      description: "Assessment and treatment planning in Hyderabad.",
    },
  ];
  const common = {
    title: `${family[0]?.toUpperCase()}${family.slice(1)} at Pearl Dental`,
    description:
      "Factual clinic information presented with calm, accessible next steps.",
    items: standardItems,
  };

  if (family === "navbar") {
    return {
      title: "Pearl Dental Studio",
      items: navigation.map((item) => ({
        title: item.label,
        href: item.href,
      })),
      primaryAction,
    };
  }
  if (family === "hero") {
    return {
      eyebrow: "Dental care in Hyderabad",
      title: "Thoughtful dental care built around clear next steps",
      description:
        "Family dentistry, dental implants, crowns and root canal care.",
      primaryAction,
      secondaryAction: { label: "Explore treatments", href: "/services" },
      image: actualReviewHeroImage(),
    };
  }
  if (family === "cta") {
    return { ...common, primaryAction };
  }
  if (family === "contact") {
    return { ...common, primaryAction };
  }
  if (family === "footer") {
    return {
      title: "Pearl Dental Studio",
      description: "Hyderabad, Telangana",
      footerLinks: navigation.map((item) => ({
        label: item.label,
        href: item.href,
      })),
      copyright: "© Pearl Dental Studio",
    };
  }
  return common;
}

function actualReviewHeroImage() {
  const asset = demoAssetById("mi-dental-calm-clinic");
  if (!asset) throw new Error("The certified dental review image is missing");
  return {
    assetId: asset.id,
    src: asset.originalUrl,
    alt: asset.alt,
    focalPoint: asset.focalPoint,
    license: asset.license,
    sourceReference: asset.sourceReference,
  };
}
