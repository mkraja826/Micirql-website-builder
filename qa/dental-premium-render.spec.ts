import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  SCHEMA_VERSION,
  siteSchema,
  type CompositionIdentity,
  type Site,
} from "@micirql/schema";
import { seedSectionCatalog, type SectionFamily } from "@micirql/sections";
import {
  DENTAL_HERO_ASSETS_BY_IMAGE_STRATEGY,
  applyIndustryPreset,
} from "../apps/builder/app/apply-industry-preset";
import { POST as renderPreview } from "../apps/builder/app/api/preview/route";
import { demoAssetById } from "../apps/builder/app/demo-assets";
import {
  DENTAL_CATALOG_VERSION,
  DESIGN_REVIEW_COUNT,
  compositionAboveFoldSignature,
  compositionIdentityForPreset,
  listIndustryDesignPresets,
  type IndustryDesignPreset,
} from "../apps/builder/app/industry-design-preset-data";
import {
  handlePublicFunctionRequest,
  type PublicFunctionDependencies,
} from "../apps/live/function-gateway";
import { LIVE_SITE_SCRIPT } from "../apps/live/live-site-assets";

const premiumViewports = [
  { width: 320, height: 800 },
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1280, height: 900 },
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

const readableDisplayCandidateIds = new Set([
  "clinic-dental-modern-assurance",
  "clinic-dental-contemporary-grid",
  "clinic-dental-immersive-narrative",
]);
const visualEvidenceWidths = new Set([390, 768, 1440]);

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
      structuralGeometry: string;
      aboveFold: string;
      palette: string;
      typography: string;
      heroMedia: string;
    }> = [];

    for (const preset of presets) {
      const candidate = siteSchema.parse(applyIndustryPreset(scaffold, preset));
      if (!candidate.generation) {
        throw new Error("The generated Dental candidate is missing metadata.");
      }
      candidate.generation.selectedCandidateId = preset.id;
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
      expect(
        DENTAL_HERO_ASSETS_BY_IMAGE_STRATEGY[preset.imageStrategy],
        `${preset.id} must use media assigned to its approved imagery direction`,
      ).toContain(storedImage?.assetId);
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
      expect(payload.candidateId).toBe(preset.id);
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
        structuralGeometry: JSON.stringify(
          sections.map((section, index) => ({
            family: sectionFamilies[index],
            variant: section.componentId.match(/-(\d{3})$/)?.[1] ?? "unknown",
          })),
        ),
        aboveFold: compositionAboveFoldSignature(preset),
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
      new Set(rendered.map(({ aboveFold }) => aboveFold)).size,
      "all 20 candidates must have a distinct above-fold composition without palette or font tokens",
    ).toBe(DESIGN_REVIEW_COUNT);
    for (const candidate of rendered) {
      const layouts = JSON.parse(candidate.structuralGeometry) as Array<{
        variant: string;
      }>;
      expect(
        new Set(layouts.map(({ variant }) => variant)).size,
        `${candidate.id} must choose renderer layouts per section instead of globally`,
      ).toBeGreaterThan(1);
    }
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

    const mediaByStrategy = new Map<string, Set<string>>();
    for (const candidate of rendered) {
      expect(
        candidate.heroMedia,
        `${candidate.id} must render licensed dental media in the hero`,
      ).not.toBe("");
      const strategyMedia =
        mediaByStrategy.get(candidate.imageStrategy) ?? new Set<string>();
      strategyMedia.add(candidate.heroMedia);
      mediaByStrategy.set(candidate.imageStrategy, strategyMedia);
    }
    expect(
      new Set(rendered.map((candidate) => candidate.heroMedia)).size,
      "each Top-20 candidate must open with a distinct licensed hero asset",
    ).toBe(DESIGN_REVIEW_COUNT);
    for (const [strategy, assets] of mediaByStrategy) {
      const strategyCount = rendered.filter(
        (candidate) => candidate.imageStrategy === strategy,
      ).length;
      if (strategyCount > 1) {
        expect(
          assets.size,
          `${strategy} candidates must rotate through distinct licensed assets`,
        ).toBeGreaterThan(1);
      }
    }
  });

  test("the rendered dental appointment form submits through the production gateway contract", async ({
    page,
  }) => {
    const siteId = "f9145920-ece1-4230-b90c-4d2b93f1e8f0";
    const preset = listIndustryDesignPresets("clinic", "dental")[0]!;
    const candidate = applyIndustryPreset(generatedDentalScaffold(), preset);
    candidate.siteId = siteId;
    const composition = allCompositions[0]!;
    await page.setViewportSize({ width: 390, height: 844 });
    await mountComposition(page, composition.identity);
    await applyDentalFixtureContent(page);

    const form = page.locator("#contact-form");
    const action = `https://forms.micirql.com/api/functions/appointment.request?siteId=${siteId}`;
    await form.evaluate(
      (element, formAction) => element.setAttribute("action", formAction),
      action,
    );
    await page.addScriptTag({ content: LIVE_SITE_SCRIPT });
    await expect(form).toHaveAttribute("action", action);
    await form.locator('input[name="name"]').fill("Test Visitor");
    await form.locator('input[name="email"]').fill("visitor@example.com");
    await form
      .locator('textarea[name="message"]')
      .fill("Please contact me about an appointment.");
    await form.locator('input[name="consent"]').check();

    const entries = await form.evaluate((element) =>
      [...new FormData(element as HTMLFormElement).entries()].map(
        ([key, value]) => [key, String(value)] as [string, string],
      ),
    );
    const formBody = new URLSearchParams(entries);
    const idempotencyKey = formBody.get("_idempotencyKey");
    expect(idempotencyKey).toMatch(/^[A-Za-z0-9._:-]+$/);
    await form.evaluate((element) => {
      element.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
    });
    await expect(form.locator('button[type="submit"]')).toBeDisabled();

    const records: Array<Record<string, unknown>> = [];
    const dependencies: PublicFunctionDependencies = {
      ipHashSalt: "rendered-form-test-salt",
      async getPublishedSite(requestedSiteId) {
        return requestedSiteId === siteId
          ? { siteId, snapshot: candidate }
          : undefined;
      },
      async createRecord(input) {
        records.push(input);
        return {
          ...input,
          id: "record-rendered-form",
          createdAt: "2026-10-12T00:00:00.000Z",
        };
      },
      async writeAudit() {},
      async rateLimit() {
        return true;
      },
    };
    const response = await handlePublicFunctionRequest(
      new Request(action, {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/x-www-form-urlencoded",
        },
        body: formBody,
      }),
      "appointment.request",
      dependencies,
    );
    expect(response.status).toBe(201);
    expect(records).toHaveLength(1);
    expect(records[0]?.idempotencyKey).toBe(idempotencyKey);
    expect(records[0]?.payload).not.toHaveProperty("_idempotencyKey");
    expect(records[0]?.payload).not.toHaveProperty("preferredDate");

    await page.evaluate(() => {
      window.dispatchEvent(
        new PageTransitionEvent("pageshow", { persisted: true }),
      );
    });
    await expect(form.locator('button[type="submit"]')).toBeEnabled();
    const rotatedIdempotencyKey = await form
      .locator('input[name="_idempotencyKey"]')
      .inputValue();
    expect(rotatedIdempotencyKey).toMatch(/^[A-Za-z0-9._:-]+$/);
    expect(rotatedIdempotencyKey).not.toBe(idempotencyKey);
  });

  test("the Top 20 expose twenty distinct rendered visual signatures", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    const signatures: string[] = [];
    const aboveFoldBySystem: Array<{
      id: string;
      designSystem: string;
      heroVariant: string;
      signature: string;
    }> = [];

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
          const headingRect = heading.getBoundingClientRect();
          const mediaRect = media.getBoundingClientRect();
          return {
            columns: layoutStyle.gridTemplateColumns,
            areas: layoutStyle.gridTemplateAreas,
            align: layoutStyle.alignItems,
            justify: layoutStyle.justifyItems,
            headingFamily: headingStyle.fontFamily,
            headingWeight: headingStyle.fontWeight,
            headingSize: headingStyle.fontSize,
            headingLeading: headingStyle.lineHeight,
            headingTransform: headingStyle.textTransform,
            headingAlign: headingStyle.textAlign,
            headingGeometry: [
              Math.round(headingRect.x),
              Math.round(headingRect.y),
              Math.round(headingRect.width),
              Math.round(headingRect.height),
            ].join("x"),
            mediaOrder: mediaStyle.order,
            mediaRadius: mediaStyle.borderRadius,
            mediaShadow: mediaStyle.boxShadow,
            mediaGeometry: [
              Math.round(mediaRect.x),
              Math.round(mediaRect.y),
              Math.round(mediaRect.width),
              Math.round(mediaRect.height),
            ].join("x"),
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
      aboveFoldBySystem.push({
        id: composition.id,
        designSystem: composition.identity.designSystem,
        heroVariant: heroId.match(/-(\d{3})$/)?.[1] ?? "unknown",
        signature: JSON.stringify({
          columns: hero.columns,
          areas: hero.areas,
          align: hero.align,
          justify: hero.justify,
          headingSize: hero.headingSize,
          headingLeading: hero.headingLeading,
          headingTransform: hero.headingTransform,
          headingAlign: hero.headingAlign,
          headingGeometry: hero.headingGeometry,
          mediaOrder: hero.mediaOrder,
          mediaRadius: hero.mediaRadius,
          mediaShadow: hero.mediaShadow,
          mediaGeometry: hero.mediaGeometry,
          surfaceBackground: hero.surfaceBackground,
        }),
      });
    }

    expect(
      new Set(signatures).size,
      "each certified candidate must render a distinct visual signature",
    ).toBe(DESIGN_REVIEW_COUNT);

    const systems = Map.groupBy(
      aboveFoldBySystem,
      ({ designSystem }) => designSystem,
    );
    expect(systems.size).toBe(10);
    for (const [designSystem, pair] of systems) {
      expect(
        pair,
        `${designSystem} must expose two dental directions`,
      ).toHaveLength(2);
      expect(
        new Set(pair.map(({ heroVariant }) => heroVariant)).size,
        `${designSystem} must change the hero renderer layout, not only tokens`,
      ).toBe(2);
      expect(
        new Set(pair.map(({ signature }) => signature)).size,
        `${designSystem} must produce perceptibly different above-fold geometry`,
      ).toBe(2);
    }
  });

  for (const composition of compositions) {
    test(`${composition.id} across all premium viewports`, async ({
      page,
    }, testInfo) => {
      test.setTimeout(180_000);
      await page.setViewportSize(premiumViewports[0]);
      await mountComposition(page, composition.identity);
      await applyDentalFixtureContent(page);

      const root = page.locator(`[data-mi-composition-id="${composition.id}"]`);
      await expect(root).toBeVisible();
      await expect(root.locator("[data-section-family]")).toHaveCount(12);

      for (const viewport of premiumViewports) {
        await test.step(`${viewport.width}x${viewport.height}`, async () => {
          await page.setViewportSize(viewport);
          await verifyNavigation(page, viewport.width);

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

            const heroHeading = document.querySelector<HTMLElement>(
              '[data-section-family="hero"] h1',
            );
            const heroHeadingStyle = heroHeading
              ? getComputedStyle(heroHeading)
              : undefined;

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
              heroTypography: heroHeadingStyle
                ? {
                    fontSize: Number.parseFloat(heroHeadingStyle.fontSize),
                    lineHeight: Number.parseFloat(heroHeadingStyle.lineHeight),
                    fontWeight: Number.parseInt(
                      heroHeadingStyle.fontWeight,
                      10,
                    ),
                    textTransform: heroHeadingStyle.textTransform,
                  }
                : undefined,
            };

            function isVisible(element: HTMLElement) {
              if (element.closest('[aria-hidden="true"]')) return false;
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

          if (readableDisplayCandidateIds.has(composition.id)) {
            expect(geometry.heroTypography).toBeDefined();
            expect(
              geometry.heroTypography?.fontWeight,
              "reviewed Dental display headings must use a readable, moderate weight",
            ).toBeLessThanOrEqual(700);
            expect(
              (geometry.heroTypography?.lineHeight ?? 0) /
                (geometry.heroTypography?.fontSize ?? 1),
              "reviewed Dental display headings must keep open line spacing",
            ).toBeGreaterThanOrEqual(0.98);
            expect(
              geometry.heroTypography?.fontSize,
              "reviewed Dental display headings must not become billboard-sized",
            ).toBeLessThanOrEqual(72.1);
            expect(
              geometry.heroTypography?.textTransform,
              "reviewed Dental display headings must preserve readable case",
            ).toBe("none");
          }

          await verifyDocumentSemantics(page);
          await verifyAutomatedAccessibility(page);

          if (
            readableDisplayCandidateIds.has(composition.id) &&
            visualEvidenceWidths.has(viewport.width)
          ) {
            await page.screenshot({
              path: testInfo.outputPath(
                `${composition.id}-${viewport.width}x${viewport.height}.png`,
              ),
              fullPage: true,
              animations: "disabled",
            });
          }
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
  const startingViewport = page.viewportSize();
  const navigation = page.getByRole("navigation", {
    name: "Primary navigation",
  });
  const toggle = navigation.locator(".mi-nav-menu__toggle");
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
    const navbarBox = await page.locator(".mi-navbar").first().boundingBox();
    const firstLinkBox = await links.first().boundingBox();
    expect(navbarBox, "the responsive navbar must have a box").not.toBeNull();
    expect(firstLinkBox, "the open menu link must have a box").not.toBeNull();
    expect(
      firstLinkBox!.x,
      "the open menu must stay within the left viewport edge",
    ).toBeGreaterThanOrEqual(0);
    expect(
      firstLinkBox!.x + firstLinkBox!.width,
      "the open menu must stay within the right viewport edge",
    ).toBeLessThanOrEqual(width);
    expect(
      firstLinkBox!.y,
      "the menu must open below the complete navbar",
    ).toBeGreaterThanOrEqual(navbarBox!.y + navbarBox!.height);
    const linkIsHitTarget = await page.evaluate(
      ({ x, y }) =>
        Boolean(document.elementFromPoint(x, y)?.closest(".mi-nav-menu a")),
      {
        x: firstLinkBox!.x + firstLinkBox!.width / 2,
        y: firstLinkBox!.y + firstLinkBox!.height / 2,
      },
    );
    expect(linkIsHitTarget, "the menu must not be clipped or covered").toBe(
      true,
    );
    await links.first().focus();
    await links.first().press("Escape");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(toggle).toHaveAttribute(
      "aria-label",
      "Open primary navigation",
    );
    await expect(toggle).toBeFocused();

    if (width === 768 && startingViewport) {
      await toggle.press("Enter");
      await expect(toggle).toHaveAttribute("aria-expanded", "true");
      await page.setViewportSize({
        width: 1024,
        height: startingViewport.height,
      });
      await expect(toggle).toBeHidden();
      await expect(toggle).toHaveAttribute("aria-expanded", "false");
      await expect(links.first()).toBeVisible();
      await page.setViewportSize(startingViewport);
      await expect(toggle).toBeVisible();
      await expect(toggle).toHaveAttribute("aria-expanded", "false");
    }
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

    setText(
      root.querySelector("[data-section-family='hero'] .mi-section__lede"),
      "Clear information about preventive, restorative, and implant dentistry, with practical next steps from Pearl Dental Studio in Hyderabad.",
    );

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

  const appointmentForm = page.locator("#contact-form");
  await expect(appointmentForm).toHaveCount(1);
  await expect(appointmentForm).toHaveAttribute(
    "action",
    "/api/functions/appointment.request",
  );
  await expect(appointmentForm).toHaveAttribute("method", "post");
  await expect(
    appointmentForm.locator('input[name="_idempotencyKey"]'),
  ).toHaveAttribute("type", "hidden");
  await expect(appointmentForm.locator('input[name="phone"]')).toHaveAttribute(
    "minlength",
    "6",
  );
  await expect(
    appointmentForm.locator('input[name="consent"]'),
  ).toHaveAttribute("required", "");
  await expect(
    appointmentForm.locator('input[name="preferredDate"]'),
  ).toHaveAttribute("type", "date");
  await expect(
    appointmentForm.locator('input[name="preferredTime"]'),
  ).toHaveAttribute("type", "time");
  await expect(
    appointmentForm.getByRole("button", { name: "Request appointment" }),
  ).toHaveAttribute("type", "submit");

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
  candidateId?: string;
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
                  appointment: {
                    actionId: "appointment.request",
                    inputMap: {},
                  },
                  submit: { actionId: "lead.create", inputMap: {} },
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
