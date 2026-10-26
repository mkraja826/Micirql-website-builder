import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  RESTAURANT_DRAFT_CANDIDATES,
  RESTAURANT_DRAFT_PAGE_PATHS,
  type RestaurantDraftBrief,
  type RestaurantDraftPagePath,
} from "../apps/builder/app/industry-packs/drafts";
import { RESTAURANT_MATRIX_BRIEFS } from "../apps/preview/app/restaurant-draft/preview-briefs";

const PREVIEW_ROOT = "/restaurant-draft";
const QA_LOGO_ASSET_ID = "qa-only/restaurant-supplied-logo-contract";
const MATRIX_VIEWPORTS = [
  { width: 320, height: 800 },
  { width: 1440, height: 900 },
] as const;
const EXPECTED_IMAGE_COUNTS: Record<RestaurantDraftPagePath, number> = {
  "/": 6,
  "/menu": 3,
  "/visit": 3,
  "/reservations": 1,
  "/story": 2,
  "/contact": 1,
};
const INNER_PAGE_FAMILIES: Record<
  Exclude<RestaurantDraftPagePath, "/">,
  readonly string[]
> = {
  "/menu": [
    "navbar",
    "hero",
    "services",
    "features",
    "gallery",
    "about",
    "cta",
    "footer",
  ],
  "/visit": [
    "navbar",
    "hero",
    "gallery",
    "contact",
    "features",
    "about",
    "cta",
    "footer",
  ],
  "/reservations": [
    "navbar",
    "hero",
    "contact",
    "process",
    "features",
    "about",
    "cta",
    "footer",
  ],
  "/story": [
    "navbar",
    "hero",
    "about",
    "gallery",
    "team",
    "features",
    "cta",
    "footer",
  ],
  "/contact": [
    "navbar",
    "hero",
    "contact",
    "features",
    "about",
    "cta",
    "footer",
  ],
};
const OMITTED_SENTINELS = {
  menu: [
    "Monsoon Verandah",
    "Koregaon Park, Pune, Maharashtra",
    "+91 20 4100 7788",
    "Cedar Room Suppers",
    "Charred aubergine dip",
    "Mira Sethi",
  ],
  arrival: [
    "Sunroom Tiffin Counter",
    "Podi idli",
    "Nannari lime cooler",
    "Cedar Room Suppers",
    "Orange blossom custard",
    "Mira Sethi",
  ],
  hosted: [
    "Sunroom Tiffin Counter",
    "Podi idli",
    "Monsoon Verandah",
    "Koregaon Park, Pune, Maharashtra",
    "+91 20 4100 7788",
  ],
} as const;

const SELECTED_BRIEFS = selectBriefs();
const SELECTED_CANDIDATES = selectCandidates();

/**
 * Crosses every Restaurant composition with three materially different
 * supplied-fact shapes. The five-width route suite already owns intermediate
 * breakpoints; this matrix proves the narrowest mobile and full desktop
 * extremes across 20 x 3 x 6 x 2 = 720 rendered states.
 */
test.describe("Restaurant Top-20 x three-brief factual variance matrix", () => {
  expect(RESTAURANT_DRAFT_CANDIDATES).toHaveLength(20);
  expect(RESTAURANT_MATRIX_BRIEFS).toHaveLength(3);
  expect(RESTAURANT_DRAFT_PAGE_PATHS).toHaveLength(6);

  for (const brief of SELECTED_BRIEFS) {
    for (const candidate of SELECTED_CANDIDATES) {
      test(`${brief.id} / ${candidate.rankSeed.toString().padStart(2, "0")} ${candidate.name} preserves facts, sparse anatomy, media and responsive identity`, async ({
        page,
      }) => {
        test.setTimeout(360_000);
        const content: RestaurantDraftBrief = brief.content;
        const siteImageSources = new Set<string>();
        const heroImageSources = new Set<string>();
        const supportingImageSources = new Set<string>();
        const phoneTargets = new Set<string>();
        const desktopRouteText: string[] = [];

        for (const pagePath of RESTAURANT_DRAFT_PAGE_PATHS) {
          const pageLabel = pagePath === "/" ? "home" : pagePath.slice(1);
          const route = previewRoute(pagePath, candidate.recipeId, brief.id);
          const expectedFamilies = expectedFamiliesFor({
            pagePath,
            homeFlow: candidate.homeFlow,
            content,
          });

          for (const viewport of MATRIX_VIEWPORTS) {
            await test.step(`${pageLabel} at ${viewport.width}px`, async () => {
              const label = `${brief.id}/${candidate.recipeId}/${pageLabel}/${viewport.width}`;
              await page.setViewportSize(viewport);
              const response = await page.goto(route, {
                waitUntil: "domcontentloaded",
              });
              expect(response?.ok(), `${label} must render`).toBeTruthy();
              await settlePage(page);

              const preview = page.locator(
                `[data-mi-restaurant-draft="${candidate.recipeId}"]`,
              );
              await expect(preview).toBeVisible();
              await expect(preview).toHaveAttribute(
                "data-mi-restaurant-brief",
                brief.id,
              );
              await expect(preview).toHaveAttribute(
                "data-mi-restaurant-candidate",
                candidate.recipeId,
              );
              await expect(preview).toHaveAttribute(
                "data-mi-restaurant-path",
                pagePath,
              );

              const site = preview.locator("main[data-mi-site]");
              await expect(site).toHaveAttribute(
                "data-mi-domain",
                "restaurant",
              );
              await expect(site).toHaveAttribute(
                "data-mi-subtype",
                "restaurant",
              );
              await expect(site).toHaveAttribute(
                "data-mi-candidate",
                candidate.id,
              );
              await expect(site).toHaveAttribute(
                "data-mi-theme",
                candidate.theme.family,
              );

              const visibleText = await preview.innerText();
              expect
                .soft(visibleText, `${label} must retain the brief identity`)
                .toContain(content.businessName);
              expect
                .soft(
                  await preview
                    .locator("[data-section-family]")
                    .evaluateAll((sections) =>
                      sections.map(
                        (section) =>
                          (section as HTMLElement).dataset.sectionFamily,
                      ),
                    ),
                  `${label} must expose only fact-supported anatomy`,
                )
                .toEqual(expectedFamilies);
              expect
                .soft(visibleText, `${label} must not leak clinic language`)
                .not.toMatch(
                  /\b(?:dental|dentist|tooth|teeth|root canal|physiotherapy|therapist|rehabilitation|appointment)\b/i,
                );
              expect
                .soft(
                  visibleText,
                  `${label} must never claim a confirmed or live-available table`,
                )
                .not.toMatch(
                  /\b(?:book now|instant (?:booking|confirmation)|your table is confirmed|reservation (?:is|has been) confirmed|live availability|guaranteed table)\b/i,
                );
              expect
                .soft(visibleText, `${label} must disclose stock imagery`)
                .toMatch(/imagery is illustrative/i);

              await assertExactLogo(preview, content.businessName);
              await assertFormJourney(preview, pagePath);
              await assertFactDependentControls({
                preview,
                pagePath,
                content,
                label,
              });
              if (pagePath === "/menu") {
                await assertExactMenu(preview, content, label);
              }
              if (pagePath === "/" && viewport.width === 1440) {
                await assertPinnedInternalLinks(
                  preview,
                  candidate.recipeId,
                  brief.id,
                  label,
                );
              }

              const audit = await responsiveAudit(page);
              expect
                .soft(audit.documentOverflowPx, label)
                .toBeLessThanOrEqual(1);
              expect.soft(audit.escapedElements, label).toEqual([]);
              expect.soft(audit.clippedText, label).toEqual([]);
              expect.soft(audit.menuLayoutIssues, label).toEqual([]);
              expect.soft(audit.navbarSiblingOverlaps, label).toEqual([]);
              expect.soft(audit.heroTextProtected, label).toBe(true);
              expect.soft(audit.h1.count, label).toBe(1);
              expect.soft(audit.h1.text, label).not.toBe("");
              expect
                .soft(audit.h1.fontWeight, label)
                .toBeGreaterThanOrEqual(500);
              expect.soft(audit.h1.fontWeight, label).toBeLessThanOrEqual(650);
              expect.soft(audit.h1.textTransform, label).toBe("none");
              expect.soft(audit.h1.wordBreak, label).toBe("normal");
              expect.soft(audit.h1.overflowWrap, label).toBe("normal");
              expect.soft(audit.h1.clipped, label).toBe(false);
              expect
                .soft(audit.h1.fontSizePx, label)
                .toBeGreaterThanOrEqual(32);
              expect
                .soft(audit.h1.fontSizePx, label)
                .toBeLessThanOrEqual(viewport.width === 320 ? 46 : 68);
              expect
                .soft(audit.h1.lineHeightRatio, label)
                .toBeGreaterThanOrEqual(1);
              expect
                .soft(audit.h1.lineHeightRatio, label)
                .toBeLessThanOrEqual(1.15);
              expect
                .soft(audit.h1.lineCount, label)
                .toBeLessThanOrEqual(viewport.width === 320 ? 6 : 5);
              if (viewport.width === 320) {
                expect.soft(audit.undersizedControls, label).toEqual([]);
              }

              const telTargets = await preview
                .locator('a[href^="tel:"]')
                .evaluateAll((links) =>
                  links.map(
                    (link) =>
                      (link as HTMLAnchorElement).getAttribute("href") ?? "",
                  ),
                );
              for (const target of telTargets) phoneTargets.add(target);

              if (viewport.width === 1440) {
                desktopRouteText.push(normalizeText(visibleText));
                const images = await visibleContentImageAudit(preview);
                expect
                  .soft(images.length, `${label} image count`)
                  .toBe(EXPECTED_IMAGE_COUNTS[pagePath]);
                expect
                  .soft(
                    new Set(images.map(({ src }) => src)).size,
                    `${label} must not repeat media`,
                  )
                  .toBe(images.length);
                for (const image of images) {
                  expect.soft(image.naturalWidth, image.src).toBeGreaterThan(0);
                  expect
                    .soft(image.naturalHeight, image.src)
                    .toBeGreaterThan(0);
                  expect
                    .soft(image.alt.trim().length, image.src)
                    .toBeGreaterThan(20);
                  siteImageSources.add(image.src);
                }
                const heroSources = await preview
                  .locator(
                    '[data-section-family="hero"] img:not([data-mi-logo-asset-id])',
                  )
                  .evaluateAll((images) =>
                    images.map(
                      (image) => (image as HTMLImageElement).currentSrc,
                    ),
                  );
                expect.soft(heroSources, `${label} hero image`).toHaveLength(1);
                const heroSource = heroSources[0];
                if (heroSource) {
                  heroImageSources.add(heroSource);
                  for (const image of images) {
                    if (image.src !== heroSource) {
                      supportingImageSources.add(image.src);
                    }
                  }
                }
              }
            });
          }
        }

        const corpus = desktopRouteText.join(" ");
        for (const fact of visibleFacts(content)) {
          expect
            .soft(
              corpus,
              `${brief.id}/${candidate.recipeId} must retain supplied fact: ${fact}`,
            )
            .toContain(normalizeText(fact));
        }
        for (const fact of OMITTED_SENTINELS[brief.id]) {
          expect
            .soft(
              corpus,
              `${brief.id}/${candidate.recipeId} must not invent omitted fact: ${fact}`,
            )
            .not.toContain(normalizeText(fact));
        }
        if (content.menu) {
          expect
            .soft(
              corpus,
              `${brief.id}/${candidate.recipeId} menu must be visible`,
            )
            .toContain(normalizeText(content.menu.notes?.[0] ?? ""));
        } else {
          expect
            .soft(
              corpus,
              `${brief.id}/${candidate.recipeId} must not claim a current menu`,
            )
            .not.toContain("current menu");
        }
        expect
          .soft(
            phoneTargets,
            `${brief.id}/${candidate.recipeId} phone actions must match supplied facts`,
          )
          .toEqual(new Set(content.phone ? [phoneHref(content.phone)] : []));
        expect
          .soft(
            heroImageSources.size,
            `${brief.id}/${candidate.recipeId} route heroes`,
          )
          .toBe(RESTAURANT_DRAFT_PAGE_PATHS.length);
        expect
          .soft(
            siteImageSources.size,
            `${brief.id}/${candidate.recipeId} image pool`,
          )
          .toBe(16);
        expect
          .soft(
            [...heroImageSources].filter((source) =>
              supportingImageSources.has(source),
            ),
            `${brief.id}/${candidate.recipeId} hero media cannot become support media`,
          )
          .toEqual([]);
      });
    }
  }
});

function expectedFamiliesFor({
  pagePath,
  homeFlow,
  content,
}: {
  pagePath: RestaurantDraftPagePath;
  homeFlow: readonly string[];
  content: RestaurantDraftBrief;
}) {
  const planned =
    pagePath === "/"
      ? ["navbar", "hero", ...homeFlow, "footer"]
      : [...INNER_PAGE_FAMILIES[pagePath]];
  return planned.filter((family) =>
    sectionHasSupportedContent(family, pagePath, content),
  );
}

function sectionHasSupportedContent(
  family: string,
  pagePath: RestaurantDraftPagePath,
  content: RestaurantDraftBrief,
) {
  if (family === "services") return menuItems(content).length > 0;
  if (family === "team") {
    return Boolean(
      pagePath === "/story" &&
      content.story?.people?.some(
        (person) => person.verified && person.name.trim(),
      ),
    );
  }
  if (family === "features") {
    if (pagePath === "/menu") {
      return Boolean(content.menu?.disclosureNotes?.length);
    }
    if (pagePath === "/visit") {
      return Boolean(
        content.accessibility?.length ||
        content.parking?.length ||
        content.transit?.length,
      );
    }
    if (pagePath === "/reservations") {
      return Boolean(
        content.reservationPolicy?.length || content.partyDetails?.length,
      );
    }
    if (pagePath === "/story") {
      return Boolean(content.story?.principles?.length);
    }
    if (pagePath === "/contact") {
      return Boolean(
        content.phone ||
        content.email ||
        content.address ||
        content.openingHours?.length,
      );
    }
    return Boolean(
      content.address ||
      content.cuisines?.length ||
      content.serviceModes?.length ||
      content.openingHours?.length,
    );
  }
  if (family === "about") {
    if (pagePath === "/menu") return Boolean(content.menu?.notes?.length);
    if (pagePath === "/visit") return Boolean(content.visitDetails?.length);
    if (pagePath === "/reservations") {
      return Boolean(content.specialRequestNotes?.length);
    }
    if (pagePath === "/contact") return Boolean(content.directions?.length);
    return Boolean(content.story?.paragraphs?.length);
  }
  return true;
}

async function assertExactLogo(preview: Locator, businessName: string) {
  const logos = preview.locator(
    `img[data-mi-logo-asset-id="${QA_LOGO_ASSET_ID}"]`,
  );
  await expect(logos).toHaveCount(2);
  const audit = await logos.evaluateAll((elements) =>
    elements.map((element) => {
      const image = element as HTMLImageElement;
      return {
        src: image.currentSrc,
        alt: image.alt,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
        objectFit: getComputedStyle(image).objectFit,
      };
    }),
  );
  expect.soft(new Set(audit.map(({ src }) => src)).size).toBe(1);
  for (const logo of audit) {
    expect.soft(logo.alt).toBe(`${businessName} supplied logo QA fixture`);
    expect.soft(logo.naturalWidth).toBe(560);
    expect.soft(logo.naturalHeight).toBe(120);
    expect.soft(logo.objectFit).toBe("contain");
  }
}

async function assertFormJourney(
  preview: Locator,
  pagePath: RestaurantDraftPagePath,
) {
  const forms = preview.locator("form.mi-section__form");
  const reservationForms = preview.locator(
    'form.mi-section__form[action*="reservation.request"]',
  );
  const enquiryForms = preview.locator(
    'form.mi-section__form[action*="lead.create"]',
  );
  if (pagePath === "/reservations") {
    await expect(forms).toHaveCount(1);
    await expect(reservationForms).toHaveCount(1);
    await expect(enquiryForms).toHaveCount(0);
    const form = reservationForms.first();
    await expect(form.getByLabel("Name", { exact: true })).toBeVisible();
    await expect(
      form.getByLabel("Phone (optional)", { exact: true }),
    ).toBeVisible();
    await expect(form.getByLabel("Email", { exact: true })).toBeVisible();
    await expect(
      form.getByLabel("Requested date", { exact: true }),
    ).toBeVisible();
    await expect(
      form.getByLabel("Requested time", { exact: true }),
    ).toBeVisible();
    const partySize = form.getByLabel("Party size", { exact: true });
    await expect(partySize).toBeVisible();
    await expect(partySize).toHaveAttribute("min", "1");
    await expect(partySize).toHaveAttribute("max", "100");
    await expect(form.getByLabel("Message", { exact: true })).toBeVisible();
    await expect(
      form.getByLabel(
        /I agree that this business may use these details to respond to my request/,
      ),
    ).toBeVisible();
    await expect(
      form.getByRole("button", { name: "Request a table", exact: true }),
    ).toBeVisible();
    await expect(
      preview.getByText(/does not confirm a reservation/i).first(),
    ).toBeVisible();
    return;
  }
  if (pagePath === "/contact") {
    await expect(forms).toHaveCount(1);
    await expect(reservationForms).toHaveCount(0);
    await expect(enquiryForms).toHaveCount(1);
    const form = enquiryForms.first();
    await expect(form.getByLabel("Name", { exact: true })).toBeVisible();
    await expect(
      form.getByLabel("Phone (optional)", { exact: true }),
    ).toBeVisible();
    await expect(form.getByLabel("Email", { exact: true })).toBeVisible();
    await expect(form.getByLabel("Message", { exact: true })).toBeVisible();
    await expect(
      form.getByLabel(
        /I agree that this business may use these details to respond to my request/,
      ),
    ).toBeVisible();
    await expect(
      form.getByRole("button", { name: "Send enquiry", exact: true }),
    ).toBeVisible();
    return;
  }
  await expect(forms).toHaveCount(0);
}

async function assertFactDependentControls({
  preview,
  pagePath,
  content,
  label,
}: {
  preview: Locator;
  pagePath: RestaurantDraftPagePath;
  content: RestaurantDraftBrief;
  label: string;
}) {
  const directions = preview.getByRole("link", {
    name: "Get directions",
    exact: true,
  });
  const expectedDirections = pagePath === "/visit" && content.mapUrl ? 1 : 0;
  await expect
    .soft(directions, `${label} map action must follow supplied facts`)
    .toHaveCount(expectedDirections);
  if (expectedDirections && content.mapUrl) {
    await expect(directions).toHaveAttribute("href", content.mapUrl);
  }

  const team = preview.locator('[data-section-family="team"]');
  const verifiedPeople = (content.story?.people ?? []).filter(
    (person) => person.verified && person.name.trim(),
  );
  await expect
    .soft(team, `${label} people section must require verified people`)
    .toHaveCount(pagePath === "/story" && verifiedPeople.length ? 1 : 0);
  if (pagePath === "/story") {
    for (const person of verifiedPeople) {
      await expect(
        preview.getByText(person.name, { exact: true }),
      ).toBeVisible();
    }
  }

  if (!content.menu) {
    await expect
      .soft(
        preview.locator('[data-section-family="services"]'),
        `${label} must hide an unsupplied menu`,
      )
      .toHaveCount(0);
    await expect
      .soft(
        preview.getByRole("link", { name: "View menu", exact: true }),
        `${label} must not link to invented menu content`,
      )
      .toHaveCount(0);
  }
}

async function assertExactMenu(
  preview: Locator,
  content: RestaurantDraftBrief,
  label: string,
) {
  const categories = menuCategories(content);
  const items = menuItems(content);
  const menu = preview.locator('[data-section-family="services"]');
  if (!items.length) {
    await expect(menu, `${label} must hide an absent menu`).toHaveCount(0);
    await expect(preview.locator(".mi-section__item-group")).toHaveCount(0);
    await expect(preview.locator(".mi-section__card-meta")).toHaveCount(0);
    return;
  }
  await expect(menu).toHaveCount(1);
  await expect(menu.locator(".mi-section__item-group")).toHaveCount(
    categories.length,
  );
  await expect(menu.locator(".mi-section__card")).toHaveCount(items.length);
  const expectedPrices = items.map((item) =>
    [item.currency, item.price].filter(Boolean).join(" "),
  );
  const priceLabels = menu.locator(".mi-section__card-meta");
  await expect(priceLabels).toHaveCount(expectedPrices.length);
  expect
    .soft(await priceLabels.allInnerTexts(), `${label} exact prices`)
    .toEqual(expectedPrices);
}

async function assertPinnedInternalLinks(
  preview: Locator,
  candidateRecipeId: string,
  briefId: string,
  label: string,
) {
  const hrefs = await preview
    .locator(`a[href^="${PREVIEW_ROOT}"]`)
    .evaluateAll((links) =>
      links.map(
        (link) => (link as HTMLAnchorElement).getAttribute("href") ?? "",
      ),
    );
  expect
    .soft(hrefs.length, `${label} must expose internal navigation`)
    .toBeGreaterThan(0);
  for (const href of hrefs) {
    const target = new URL(href, "https://preview.micirql.test");
    expect
      .soft(target.searchParams.get("candidate"), href)
      .toBe(candidateRecipeId);
    expect.soft(target.searchParams.get("brief"), href).toBe(briefId);
  }
}

function visibleFacts(content: RestaurantDraftBrief) {
  const values: Array<string | null | undefined> = [
    content.businessName,
    ...(content.cuisines ?? []),
    ...(content.serviceModes ?? []),
    content.address,
    ...(content.directions ?? []),
    ...(content.openingHours ?? []),
    ...(content.accessibility ?? []),
    ...(content.parking ?? []),
    ...(content.transit ?? []),
    ...(content.visitDetails ?? []),
    content.phone,
    content.email,
    ...(content.reservationPolicy ?? []),
    ...(content.partyDetails ?? []),
    ...(content.specialRequestNotes ?? []),
    content.story?.heading,
    ...(content.story?.paragraphs ?? []),
    ...(content.story?.principles ?? []),
  ];
  for (const category of menuCategories(content)) {
    values.push(category.name, category.description);
    for (const item of category.items) {
      values.push(
        item.name,
        item.description,
        [item.currency, item.price].filter(Boolean).join(" "),
        ...(item.disclosures ?? []),
      );
    }
  }
  values.push(
    ...(content.menu?.notes ?? []),
    ...(content.menu?.disclosureNotes ?? []),
  );
  for (const person of content.story?.people ?? []) {
    if (person.verified) {
      values.push(person.name, person.role, person.biography);
    }
  }
  return values
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));
}

function menuCategories(content: RestaurantDraftBrief) {
  return content.menu?.suppliedAsCurrent ? content.menu.categories : [];
}

function menuItems(content: RestaurantDraftBrief) {
  return menuCategories(content).flatMap((category) => category.items);
}

async function visibleContentImageAudit(preview: Locator) {
  return preview
    .locator("img:not([data-mi-logo-asset-id])")
    .evaluateAll((elements) =>
      elements
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return (
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            rect.width > 0 &&
            rect.height > 0
          );
        })
        .map((element) => {
          const image = element as HTMLImageElement;
          return {
            src: image.currentSrc,
            alt: image.alt,
            naturalWidth: image.naturalWidth,
            naturalHeight: image.naturalHeight,
          };
        }),
    );
}

async function settlePage(page: Page) {
  await page.evaluate(async () => {
    await Promise.race([
      Promise.all(
        [...document.images].map((image) => {
          if (image.complete) return Promise.resolve();
          return new Promise<void>((resolve) => {
            image.addEventListener("load", () => resolve(), { once: true });
            image.addEventListener("error", () => resolve(), { once: true });
          });
        }),
      ),
      new Promise<void>((resolve) => window.setTimeout(resolve, 8_000)),
    ]);
    await document.fonts.ready;
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  });
}

async function responsiveAudit(page: Page) {
  return page.locator("[data-mi-restaurant-draft]").evaluate((preview) => {
    const root = preview as HTMLElement;
    const documentRoot = document.documentElement;
    const visible = [...root.querySelectorAll<HTMLElement>("*")].filter(
      (element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          Number(style.opacity) !== 0 &&
          rect.width > 0 &&
          rect.height > 0
        );
      },
    );
    const visibleSet = new Set(visible);
    const describe = (element: HTMLElement) => {
      const family = element.closest<HTMLElement>("[data-section-family]")
        ?.dataset.sectionFamily;
      const text = element.textContent?.trim().replace(/\s+/g, " ") ?? "";
      return `${family ?? "page"}:${element.tagName.toLowerCase()}.${String(element.className).trim().replace(/\s+/g, ".")}${text ? ` "${text.slice(0, 40)}"` : ""}`;
    };
    const insideHorizontalScroller = (element: HTMLElement) => {
      let ancestor = element.parentElement;
      while (ancestor && ancestor !== root) {
        const overflow = getComputedStyle(ancestor).overflowX;
        if (overflow === "auto" || overflow === "scroll") return true;
        ancestor = ancestor.parentElement;
      }
      return false;
    };
    const overlapArea = (first: DOMRect, second: DOMRect) => {
      const width = Math.max(
        0,
        Math.min(first.right, second.right) - Math.max(first.left, second.left),
      );
      const height = Math.max(
        0,
        Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top),
      );
      return Math.round(width * height);
    };

    const escapedElements = visible
      .filter((element) => !insideHorizontalScroller(element))
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.left < -1 || rect.right > documentRoot.clientWidth + 1;
      })
      .map(describe);
    const clippedText = visible
      .filter((element) =>
        ["H1", "H2", "H3", "P", "A", "BUTTON", "LABEL"].includes(
          element.tagName,
        ),
      )
      .filter((element) => !element.closest(".mi-form__honeypot"))
      .filter((element) => !insideHorizontalScroller(element))
      .filter((element) => {
        const style = getComputedStyle(element);
        return (
          ((style.overflowX === "hidden" || style.overflowX === "clip") &&
            element.scrollWidth > element.clientWidth + 1) ||
          ((style.overflowY === "hidden" || style.overflowY === "clip") &&
            element.scrollHeight > element.clientHeight + 1)
        );
      })
      .map(describe);

    const h1s = visible.filter((element) => element.tagName === "H1");
    const h1 = h1s[0];
    if (!h1) throw new Error("Restaurant page is missing its H1");
    const h1Style = getComputedStyle(h1);
    const fontSizePx = Number.parseFloat(h1Style.fontSize);
    const lineHeightPx = Number.parseFloat(h1Style.lineHeight);
    const heroLayout = root.querySelector<HTMLElement>(
      '[data-section-family="hero"] .mi-section__layout',
    );
    const heroCopy = heroLayout?.querySelector<HTMLElement>(
      ":scope > div:first-child",
    );
    const heroMedia = heroLayout?.querySelector<HTMLElement>(
      ":scope > .mi-section__media",
    );
    if (!heroLayout || !heroCopy || !heroMedia) {
      throw new Error("Restaurant page is missing its hero composition");
    }
    const heroOverlapArea = overlapArea(
      heroCopy.getBoundingClientRect(),
      heroMedia.getBoundingClientRect(),
    );
    const heroCopyStyle = getComputedStyle(heroCopy);
    const copyHasSurface = ![
      "transparent",
      "rgba(0, 0, 0, 0)",
      "color(srgb 0 0 0 / 0)",
    ].includes(heroCopyStyle.backgroundColor);

    const controls = visible.filter((element) =>
      element.matches(
        ".mi-section__action, .mi-navbar__brand, .mi-nav-menu__toggle, .mi-nav-menu a, .mi-footer a, .mi-section__form input:not([type=hidden]):not([type=checkbox]), .mi-section__form textarea, .mi-section__form select, .mi-section__form button",
      ),
    );
    const undersizedControls = controls
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width < 43.5 || rect.height < 43.5;
      })
      .map(describe);

    const navbarItems = [
      root.querySelector<HTMLElement>(".mi-navbar > .mi-nav-menu"),
      root.querySelector<HTMLElement>(".mi-navbar > .mi-navbar__brand"),
      root.querySelector<HTMLElement>(".mi-navbar > .mi-section__action"),
    ].filter((element): element is HTMLElement =>
      Boolean(element && visibleSet.has(element)),
    );
    const navbarSiblingOverlaps: string[] = [];
    for (let left = 0; left < navbarItems.length; left += 1) {
      for (let right = left + 1; right < navbarItems.length; right += 1) {
        if (
          overlapArea(
            navbarItems[left]!.getBoundingClientRect(),
            navbarItems[right]!.getBoundingClientRect(),
          ) > 1
        ) {
          navbarSiblingOverlaps.push(
            `${describe(navbarItems[left]!)} <> ${describe(navbarItems[right]!)}`,
          );
        }
      }
    }

    const menuLayoutIssues: string[] = [];
    for (const menuGroups of root.querySelectorAll<HTMLElement>(
      '[data-section-family="services"] .mi-section__item-groups',
    )) {
      const boundary = menuGroups.getBoundingClientRect();
      const textElements = [
        ...menuGroups.querySelectorAll<HTMLElement>(
          ".mi-section__item-group > .mi-type--h3, .mi-section__card > .mi-type--h3, .mi-section__card-meta, .mi-section__card > .mi-type--body-sm",
        ),
      ].filter((element) => visibleSet.has(element));
      for (const element of textElements) {
        const rect = element.getBoundingClientRect();
        if (rect.left < boundary.left - 1 || rect.right > boundary.right + 1) {
          menuLayoutIssues.push(`${describe(element)} escapes the menu track`);
        }
      }
      for (let left = 0; left < textElements.length; left += 1) {
        for (let right = left + 1; right < textElements.length; right += 1) {
          const first = textElements[left]!;
          const second = textElements[right]!;
          if (first.contains(second) || second.contains(first)) continue;
          if (
            overlapArea(
              first.getBoundingClientRect(),
              second.getBoundingClientRect(),
            ) > 2
          ) {
            menuLayoutIssues.push(
              `${describe(first)} overlaps ${describe(second)}`,
            );
          }
        }
      }
    }

    return {
      documentOverflowPx: Math.max(
        0,
        documentRoot.scrollWidth - documentRoot.clientWidth,
        document.body.scrollWidth - document.body.clientWidth,
      ),
      escapedElements,
      clippedText,
      menuLayoutIssues,
      undersizedControls,
      navbarSiblingOverlaps,
      heroTextProtected:
        heroOverlapArea === 0 ||
        (Number.parseInt(heroCopyStyle.zIndex, 10) >= 1 && copyHasSurface),
      h1: {
        count: h1s.length,
        text: h1.textContent?.trim().replace(/\s+/g, " ") ?? "",
        fontSizePx,
        fontWeight: Number.parseInt(h1Style.fontWeight, 10),
        lineHeightRatio:
          Number.isFinite(lineHeightPx) && fontSizePx > 0
            ? lineHeightPx / fontSizePx
            : 0,
        lineCount:
          Number.isFinite(lineHeightPx) && lineHeightPx > 0
            ? Math.round(h1.getBoundingClientRect().height / lineHeightPx)
            : 0,
        textTransform: h1Style.textTransform,
        wordBreak: h1Style.wordBreak,
        overflowWrap: h1Style.overflowWrap,
        clipped:
          ((h1Style.overflowX === "hidden" || h1Style.overflowX === "clip") &&
            h1.scrollWidth > h1.clientWidth + 1) ||
          ((h1Style.overflowY === "hidden" || h1Style.overflowY === "clip") &&
            h1.scrollHeight > h1.clientHeight + 1),
      },
    };
  });
}

function previewRoute(
  pagePath: RestaurantDraftPagePath,
  candidateRecipeId: string,
  briefId: string,
) {
  const pathname =
    pagePath === "/" ? PREVIEW_ROOT : `${PREVIEW_ROOT}${pagePath}`;
  const search = new URLSearchParams({
    candidate: candidateRecipeId,
    brief: briefId,
  });
  return `${pathname}?${search.toString()}`;
}

function selectBriefs() {
  const requested = commaSeparatedValues(process.env.MI_QA_RESTAURANT_BRIEFS);
  if (!requested.length) return [...RESTAURANT_MATRIX_BRIEFS];
  const selected = RESTAURANT_MATRIX_BRIEFS.filter(({ id }) =>
    requested.includes(id),
  );
  const matched = new Set(selected.map(({ id }) => id));
  const unknown = requested.filter((id) => !matched.has(id));
  if (unknown.length) {
    throw new Error(`Unknown Restaurant matrix briefs: ${unknown.join(", ")}`);
  }
  return selected;
}

function selectCandidates() {
  const requested = commaSeparatedValues(
    process.env.MI_QA_RESTAURANT_MATRIX_CANDIDATES ??
      process.env.MI_QA_RESTAURANT_CANDIDATES,
  );
  if (!requested.length) return [...RESTAURANT_DRAFT_CANDIDATES];
  const selected = RESTAURANT_DRAFT_CANDIDATES.filter(
    ({ id, recipeId }) =>
      requested.includes(id) || requested.includes(recipeId),
  );
  const matched = new Set(
    selected.flatMap(({ id, recipeId }) => [id, recipeId]),
  );
  const unknown = requested.filter((id) => !matched.has(id));
  if (unknown.length) {
    throw new Error(
      `Unknown Restaurant matrix candidates: ${unknown.join(", ")}`,
    );
  }
  return selected;
}

function commaSeparatedValues(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function phoneHref(phone: string) {
  return `tel:${phone.replace(/[^+\d,;*#]/g, "")}`;
}

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("en");
}
