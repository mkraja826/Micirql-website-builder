import { expect, test, type Page } from "@playwright/test";
import type { CompositionIdentity } from "@micirql/schema";
import {
  compositionIdentityForPreset,
  listIndustryDesignPresets,
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

  for (const composition of compositions) {
    for (const viewport of premiumViewports) {
      test(`${composition.id} at ${viewport.width}x${viewport.height}`, async ({
        page,
      }) => {
        await page.setViewportSize(viewport);
        await mountComposition(page, composition.identity);

        const root = page.locator(
          `[data-mi-composition-id="${composition.id}"]`,
        );
        await expect(root).toBeVisible();
        await expect(root.locator("[data-section-family]")).toHaveCount(12);

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
            const text = element.textContent?.trim().replace(/\s+/g, " ") ?? "";
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
      });
    }
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
    await toggle.press("Enter");
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
