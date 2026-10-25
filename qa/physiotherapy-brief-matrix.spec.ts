import { expect, test } from "@playwright/test";
import { PHYSIOTHERAPY_DRAFT_CANDIDATES } from "../apps/builder/app/industry-packs/drafts";
import {
  PHYSIOTHERAPY_PAGE_PATHS,
  PHYSIOTHERAPY_VIEWPORTS,
  assertPhysiotherapyVisualState,
  assertPinnedPhysiotherapyLinks,
  expectedPhysiotherapyFamilies,
  physiotherapyPageLabel,
  physiotherapyPreviewRoute,
} from "./support/physiotherapy-visual-contract";

const MATRIX_VIEWPORTS = PHYSIOTHERAPY_VIEWPORTS.filter(
  ({ width }) => width === 320 || width === 1440,
);

const BRIEFS = [
  {
    id: "calm",
    businessName: "Quiet Path Physiotherapy",
    hasPracticalFacts: false,
    suppliedServices: [
      "Physiotherapy assessment",
      "Mobility and movement support",
      "Guided exercise planning",
    ],
    suppliedConditions: ["Mobility concerns", "Muscle and joint concerns"],
    omittedFacts: [
      "Sports rehabilitation",
      "Post-operative rehabilitation",
      "Hyderabad, Telangana",
      "Monday–Friday, 8:00 AM–6:00 PM",
    ],
  },
  {
    id: "local",
    businessName: "Neighbourhood Motion Physio",
    hasPracticalFacts: true,
    suppliedServices: [
      "Physiotherapy assessment",
      "Sports rehabilitation",
      "Post-operative rehabilitation",
      "Mobility and movement support",
    ],
    suppliedConditions: [
      "Sports injuries",
      "Post-operative rehabilitation",
      "Mobility concerns",
    ],
    practicalFacts: [
      "Hyderabad, Telangana",
      "Monday–Friday, 8:00 AM–6:00 PM",
      "Saturday, 9:00 AM–1:00 PM",
    ],
    omittedFacts: ["Guided exercise planning", "Muscle and joint concerns"],
  },
  {
    id: "process",
    businessName: "Stepwise Physiotherapy",
    hasPracticalFacts: false,
    suppliedServices: [
      "Physiotherapy assessment",
      "Post-operative rehabilitation",
      "Guided exercise planning",
      "Mobility and movement support",
    ],
    suppliedConditions: [
      "Post-operative rehabilitation",
      "Mobility concerns",
      "Muscle and joint concerns",
    ],
    omittedFacts: [
      "Sports rehabilitation",
      "Sports injuries",
      "Hyderabad, Telangana",
      "Monday–Friday, 8:00 AM–6:00 PM",
    ],
  },
] as const;

const SELECTED_BRIEFS = selectBriefs();
const SELECTED_CANDIDATES = selectCandidates();

/**
 * Pairwise certification matrix:
 * - the five-width candidate gate already proves each visual direction at all
 *   required breakpoints;
 * - this suite crosses all 20 candidates with all three supplied-fact briefs
 *   on the narrowest mobile and full desktop widths, across all six routes.
 *
 * The default run covers 20 × 3 × 6 × 2 = 720 rendered states without
 * duplicating the already-green intermediate-width evidence. Environment
 * filters exist only to make a failed row reproducible locally.
 */
test.describe("Physiotherapy 20-candidate × three-brief variance matrix", () => {
  expect(PHYSIOTHERAPY_DRAFT_CANDIDATES).toHaveLength(20);
  expect(BRIEFS).toHaveLength(3);
  expect(MATRIX_VIEWPORTS.map(({ width }) => width)).toEqual([320, 1440]);

  for (const brief of SELECTED_BRIEFS) {
    for (const candidate of SELECTED_CANDIDATES) {
      test(`${brief.id} / ${candidate.rankSeed.toString().padStart(2, "0")} ${candidate.name} preserves supplied facts, action safety, media, and responsive identity`, async ({
        page,
      }) => {
        test.setTimeout(300_000);

        const siteImageSources = new Set<string>();
        const heroImageSources = new Set<string>();
        const supportingImageSources = new Set<string>();
        const desktopRouteText: string[] = [];

        for (const pagePath of PHYSIOTHERAPY_PAGE_PATHS) {
          const pageLabel = physiotherapyPageLabel(pagePath);
          const route = physiotherapyPreviewRoute(pagePath, {
            brief: brief.id,
            candidate: candidate.recipeId,
          });
          const expectedFamilies = expectedPhysiotherapyFamilies({
            pagePath,
            homeFlow: candidate.homeFlow,
            hasPracticalFacts: brief.hasPracticalFacts,
          });

          for (const viewport of MATRIX_VIEWPORTS) {
            await test.step(`${pageLabel} at ${viewport.width}px`, async () => {
              const label = `${brief.id}/${candidate.recipeId}/${pageLabel}`;
              const evidence = await assertPhysiotherapyVisualState({
                page,
                route,
                pagePath,
                viewport,
                label,
                briefId: brief.id,
                candidateRecipeId: candidate.recipeId,
                candidateId: candidate.id,
                businessName: brief.businessName,
                expectedFamilies,
                expectedTheme: candidate.theme.family,
              });

              await expect
                .soft(
                  page.locator('[data-mi-physiotherapy-draft] a[href^="tel:"]'),
                  `${label} must not invent a phone action`,
                )
                .toHaveCount(0);
              await expect
                .soft(
                  page.locator("[data-mi-physiotherapy-draft] form"),
                  `${label} must render the full appointment form on Contact only`,
                )
                .toHaveCount(pagePath === "/contact" ? 1 : 0);

              if (pagePath === "/" && viewport.width === 1440) {
                await assertPinnedPhysiotherapyLinks({
                  page,
                  candidateRecipeId: candidate.recipeId,
                  briefId: brief.id,
                });
              }

              if (viewport.width === 1440) {
                desktopRouteText.push(
                  normalizeText(
                    await page
                      .locator("[data-mi-physiotherapy-draft]")
                      .innerText(),
                  ),
                );
                for (const { src } of evidence.images) {
                  siteImageSources.add(src);
                }
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

        const corpus = desktopRouteText.join(" ");
        for (const fact of [
          brief.businessName,
          ...brief.suppliedServices,
          ...brief.suppliedConditions,
          ...(brief.hasPracticalFacts ? brief.practicalFacts : []),
        ]) {
          expect
            .soft(
              corpus,
              `${brief.id}/${candidate.recipeId} must retain supplied fact: ${fact}`,
            )
            .toContain(normalizeText(fact));
        }
        for (const fact of brief.omittedFacts) {
          expect
            .soft(
              corpus,
              `${brief.id}/${candidate.recipeId} must not invent omitted fact: ${fact}`,
            )
            .not.toContain(normalizeText(fact));
        }

        expect
          .soft(
            heroImageSources.size,
            `${brief.id}/${candidate.recipeId} must retain six distinct page heroes`,
          )
          .toBe(PHYSIOTHERAPY_PAGE_PATHS.length);
        expect
          .soft(
            siteImageSources.size,
            `${brief.id}/${candidate.recipeId} must retain its complete 12-image pool`,
          )
          .toBe(12);
        expect
          .soft(
            [...heroImageSources].filter((source) =>
              supportingImageSources.has(source),
            ),
            `${brief.id}/${candidate.recipeId} must not reuse hero media as support media`,
          )
          .toEqual([]);
      });
    }
  }
});

function selectBriefs() {
  const requested = commaSeparatedValues(process.env.MI_QA_PHYSIO_BRIEFS);
  if (!requested.length) return [...BRIEFS];
  const selected = BRIEFS.filter(({ id }) => requested.includes(id));
  const matched = new Set(selected.map(({ id }) => id));
  const unknown = requested.filter((id) => !matched.has(id));
  if (unknown.length) {
    throw new Error(
      `Unknown Physiotherapy matrix briefs: ${unknown.join(", ")}`,
    );
  }
  return selected;
}

function selectCandidates() {
  const requested = commaSeparatedValues(
    process.env.MI_QA_PHYSIO_MATRIX_CANDIDATES,
  );
  if (!requested.length) return [...PHYSIOTHERAPY_DRAFT_CANDIDATES];
  const selected = PHYSIOTHERAPY_DRAFT_CANDIDATES.filter(
    ({ id, recipeId }) =>
      requested.includes(id) || requested.includes(recipeId),
  );
  const matched = new Set(
    selected.flatMap(({ id, recipeId }) => [id, recipeId]),
  );
  const unknown = requested.filter((value) => !matched.has(value));
  if (unknown.length) {
    throw new Error(
      `Unknown Physiotherapy matrix candidates: ${unknown.join(", ")}`,
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

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("en");
}
