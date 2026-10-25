import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import {
  PHYSIOTHERAPY_PAGE_PATHS,
  PHYSIOTHERAPY_PREVIEW_ROOT,
  PHYSIOTHERAPY_VIEWPORTS,
  assertPhysiotherapyVisualState,
  assertPinnedPhysiotherapyLinks,
  expectedPhysiotherapyFamilies,
  physiotherapyPageLabel,
  physiotherapyPreviewRoute,
} from "./support/physiotherapy-visual-contract";

const SCREENSHOT_WIDTHS = new Set([320, 390, 1440]);
const OUTPUT_DIRECTORY = path.resolve(
  process.cwd(),
  "test-results",
  "physiotherapy-shortlist-visual",
);

const BRIEFS = [
  {
    id: "calm",
    expectedCandidate: "calm-arrival",
    businessName: "Quiet Path Physiotherapy",
    homeFlow: ["features", "services", "contact", "process", "cta"],
    hasPracticalFacts: false,
  },
  {
    id: "local",
    expectedCandidate: "local-access",
    businessName: "Neighbourhood Motion Physio",
    homeFlow: ["contact", "services", "features", "process", "cta"],
    hasPracticalFacts: true,
  },
  {
    id: "process",
    expectedCandidate: "guided-milestones",
    businessName: "Stepwise Physiotherapy",
    homeFlow: ["process", "features", "services", "cta", "contact"],
    hasPracticalFacts: false,
  },
] as const;

test.describe("Physiotherapy shortlist: ranked multi-route visual gate", () => {
  for (const brief of BRIEFS) {
    test(`${brief.id} brief auto-selects ${brief.expectedCandidate} and passes the six-route responsive contract`, async ({
      page,
    }) => {
      test.setTimeout(420_000);
      await mkdir(OUTPUT_DIRECTORY, { recursive: true });

      const siteImageSources = new Set<string>();
      const heroImageSources = new Set<string>();
      const supportingImageSources = new Set<string>();

      for (const pagePath of PHYSIOTHERAPY_PAGE_PATHS) {
        const pageLabel = physiotherapyPageLabel(pagePath);
        const route = physiotherapyPreviewRoute(pagePath, {
          brief: brief.id,
        });
        const expectedFamilies = expectedPhysiotherapyFamilies({
          pagePath,
          homeFlow: brief.homeFlow,
          hasPracticalFacts: brief.hasPracticalFacts,
        });

        for (const viewport of PHYSIOTHERAPY_VIEWPORTS) {
          await test.step(`${pageLabel} at ${viewport.width}px`, async () => {
            const evidence = await assertPhysiotherapyVisualState({
              page,
              route,
              pagePath,
              viewport,
              label: `${brief.id}/${pageLabel}`,
              briefId: brief.id,
              candidateRecipeId: brief.expectedCandidate,
              candidateId: `clinic-physiotherapy-${brief.expectedCandidate}`,
              businessName: brief.businessName,
              expectedFamilies,
              screenshotPath: SCREENSHOT_WIDTHS.has(viewport.width)
                ? path.join(
                    OUTPUT_DIRECTORY,
                    `${brief.id}-${pageLabel}-${viewport.width}px-full.png`,
                  )
                : undefined,
            });

            if (viewport.width === 1440) {
              for (const { src } of evidence.images) siteImageSources.add(src);
              if (evidence.heroSource) {
                heroImageSources.add(evidence.heroSource);
              }
              for (const src of evidence.supportingSources) {
                supportingImageSources.add(src);
              }
            }
          });
        }
      }

      expect
        .soft(
          heroImageSources.size,
          `${brief.id} must use a distinct hero image on all six routes`,
        )
        .toBe(PHYSIOTHERAPY_PAGE_PATHS.length);
      expect
        .soft(
          siteImageSources.size,
          `${brief.id} must exercise its complete 12-image candidate pool`,
        )
        .toBe(12);
      expect
        .soft(
          [...heroImageSources].filter((source) =>
            supportingImageSources.has(source),
          ),
          `${brief.id} hero images must not reappear as supporting media`,
        )
        .toEqual([]);
    });
  }

  test("pins ranked links, honors explicit candidate review, and fails closed for unknown inputs", async ({
    page,
  }) => {
    const response = await page.goto(
      `${PHYSIOTHERAPY_PREVIEW_ROOT}?brief=calm`,
      { waitUntil: "domcontentloaded" },
    );
    expect(response?.ok()).toBeTruthy();
    await assertPinnedPhysiotherapyLinks({
      page,
      candidateRecipeId: "calm-arrival",
      briefId: "calm",
    });

    await page.goto(
      `${PHYSIOTHERAPY_PREVIEW_ROOT}?brief=calm&candidate=${encodeURIComponent("local-access")}`,
      { waitUntil: "domcontentloaded" },
    );
    const overridden = page.locator("[data-mi-physiotherapy-draft]");
    await expect(overridden).toHaveAttribute(
      "data-mi-physiotherapy-candidate",
      "local-access",
    );
    await expect(overridden).toContainText("Quiet Path Physiotherapy");

    const unknownBrief = await page.goto(
      `${PHYSIOTHERAPY_PREVIEW_ROOT}?brief=unknown`,
      { waitUntil: "domcontentloaded" },
    );
    expect(unknownBrief?.status()).toBe(404);
    const unknownCandidate = await page.goto(
      `${PHYSIOTHERAPY_PREVIEW_ROOT}?candidate=unknown`,
      { waitUntil: "domcontentloaded" },
    );
    expect(unknownCandidate?.status()).toBe(404);
  });
});
