import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";
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

const RANKED_SHORTLIST = new Set([
  "calm-arrival",
  "local-access",
  "guided-milestones",
]);
const REMAINING_CANDIDATES = PHYSIOTHERAPY_DRAFT_CANDIDATES.filter(
  ({ recipeId }) => !RANKED_SHORTLIST.has(recipeId),
).sort((left, right) => left.rankSeed - right.rankSeed);
const BATCH_SIZE = positiveInteger(
  process.env.MI_QA_PHYSIO_BATCH_SIZE,
  5,
  "MI_QA_PHYSIO_BATCH_SIZE",
);
const GEOMETRY_ONLY = process.env.MI_QA_PHYSIO_GEOMETRY_ONLY === "1";
const SELECTED_CANDIDATES = selectCandidates();
const SCREENSHOT_WIDTHS = screenshotWidths();
const OUTPUT_DIRECTORY = path.resolve(
  process.cwd(),
  "test-results",
  `physiotherapy-candidate-batch-${batchLabel()}`,
);

/**
 * Full coverage is the default: 17 candidates × 6 routes × 5 widths.
 * Local focused runs can use:
 *   MI_QA_PHYSIO_BATCH=1 MI_QA_PHYSIO_BATCH_SIZE=5 pnpm exec playwright test ...
 * or:
 *   MI_QA_PHYSIO_CANDIDATES=movement-pathway,mobility-atlas pnpm exec ...
 * Set MI_QA_PHYSIO_GEOMETRY_ONLY=1 for a fast Home/1440 recipe-geometry check.
 *
 * Screenshots default to the narrowest mobile and full desktop widths. Override
 * MI_QA_PHYSIO_SCREENSHOT_WIDTHS with a comma-separated subset of 320,390,768,
 * 1024,1440, or set it to "none" for assertion-only CI runs.
 */
test.describe("Physiotherapy remaining candidates: explicit override visual batches", () => {
  expect(
    REMAINING_CANDIDATES,
    "the shortlist exclusion must leave exactly 17 candidates",
  ).toHaveLength(17);
  expect(
    SELECTED_CANDIDATES.length,
    "the requested Physiotherapy candidate batch must not be empty",
  ).toBeGreaterThan(0);

  for (const candidate of SELECTED_CANDIDATES) {
    test(`${candidate.rankSeed.toString().padStart(2, "0")} ${candidate.name} passes all six routes and five widths by explicit override`, async ({
      page,
    }) => {
      test.setTimeout(420_000);
      await mkdir(OUTPUT_DIRECTORY, { recursive: true });

      const siteImageSources = new Set<string>();
      const heroImageSources = new Set<string>();
      const supportingImageSources = new Set<string>();

      const pagePaths = GEOMETRY_ONLY
        ? (["/"] as const)
        : PHYSIOTHERAPY_PAGE_PATHS;
      const viewports = GEOMETRY_ONLY
        ? PHYSIOTHERAPY_VIEWPORTS.filter(({ width }) => width === 1440)
        : PHYSIOTHERAPY_VIEWPORTS;

      for (const pagePath of pagePaths) {
        const pageLabel = physiotherapyPageLabel(pagePath);
        const route = physiotherapyPreviewRoute(pagePath, {
          candidate: candidate.recipeId,
        });
        const expectedFamilies = expectedPhysiotherapyFamilies({
          pagePath,
          homeFlow: candidate.homeFlow,
          // The reference fixture supplies both location and opening hours.
          hasPracticalFacts: true,
        });

        for (const viewport of viewports) {
          await test.step(`${pageLabel} at ${viewport.width}px`, async () => {
            const label = `${candidate.recipeId}/${pageLabel}`;
            const evidence = await assertPhysiotherapyVisualState({
              page,
              route,
              pagePath,
              viewport,
              label,
              briefId: "reference",
              candidateRecipeId: candidate.recipeId,
              candidateId: candidate.id,
              businessName: "Radhika Physiotherapy",
              expectedFamilies,
              expectedTheme: candidate.theme.family,
              screenshotPath: SCREENSHOT_WIDTHS.has(viewport.width)
                ? path.join(
                    OUTPUT_DIRECTORY,
                    `${candidate.rankSeed.toString().padStart(2, "0")}-${candidate.recipeId}-${pageLabel}-${viewport.width}px-full.png`,
                  )
                : undefined,
            });

            if (pagePath === "/" && viewport.width === 1440) {
              await assertPinnedPhysiotherapyLinks({
                page,
                candidateRecipeId: candidate.recipeId,
              });
              await assertReviewedHeroGeometry(page, candidate.recipeId);
            }
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

      if (!GEOMETRY_ONLY) {
        expect
          .soft(
            heroImageSources.size,
            `${candidate.id} must use a distinct hero image on all six routes`,
          )
          .toBe(PHYSIOTHERAPY_PAGE_PATHS.length);
        expect
          .soft(
            siteImageSources.size,
            `${candidate.id} must exercise its complete 12-image candidate pool`,
          )
          .toBe(12);
        expect
          .soft(
            [...heroImageSources].filter((source) =>
              supportingImageSources.has(source),
            ),
            `${candidate.id} hero images must not reappear as supporting media`,
          )
          .toEqual([]);
      }
    });
  }
});

function selectCandidates() {
  const requested = process.env.MI_QA_PHYSIO_CANDIDATES?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (requested?.length) {
    const requestedIds = new Set(requested);
    const selected = REMAINING_CANDIDATES.filter(
      ({ id, recipeId }) => requestedIds.has(id) || requestedIds.has(recipeId),
    );
    const matched = new Set(
      selected.flatMap(({ id, recipeId }) => [id, recipeId]),
    );
    const unknown = requested.filter((value) => !matched.has(value));
    if (unknown.length) {
      throw new Error(
        `Unknown or already-shortlisted Physiotherapy candidates: ${unknown.join(", ")}`,
      );
    }
    return selected;
  }

  if (!process.env.MI_QA_PHYSIO_BATCH) return REMAINING_CANDIDATES;
  const batch = positiveInteger(
    process.env.MI_QA_PHYSIO_BATCH,
    1,
    "MI_QA_PHYSIO_BATCH",
  );
  const start = (batch - 1) * BATCH_SIZE;
  return REMAINING_CANDIDATES.slice(start, start + BATCH_SIZE);
}

function screenshotWidths() {
  const configured = process.env.MI_QA_PHYSIO_SCREENSHOT_WIDTHS?.trim();
  if (configured?.toLowerCase() === "none") return new Set<number>();
  const values = configured
    ? configured
        .split(",")
        .map((value) => Number.parseInt(value.trim(), 10))
        .filter(Number.isFinite)
    : [320, 1440];
  const supported = new Set(PHYSIOTHERAPY_VIEWPORTS.map(({ width }) => width));
  const unknown = values.filter((value) => !supported.has(value));
  if (unknown.length) {
    throw new Error(
      `Unsupported MI_QA_PHYSIO_SCREENSHOT_WIDTHS values: ${unknown.join(", ")}`,
    );
  }
  return new Set(values);
}

function positiveInteger(
  value: string | undefined,
  fallback: number,
  variableName: string,
) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (
    !Number.isInteger(parsed) ||
    parsed < 1 ||
    String(parsed) !== value.trim()
  ) {
    throw new Error(`${variableName} must be a positive integer`);
  }
  return parsed;
}

function batchLabel() {
  if (process.env.MI_QA_PHYSIO_CANDIDATES) {
    const ranks = SELECTED_CANDIDATES.map(({ rankSeed }) => rankSeed).sort(
      (left, right) => left - right,
    );
    return ranks.length === 1
      ? ranks[0]!.toString().padStart(2, "0")
      : `${ranks[0]!.toString().padStart(2, "0")}-${ranks.at(-1)!.toString().padStart(2, "0")}`;
  }
  return process.env.MI_QA_PHYSIO_BATCH
    ? `${process.env.MI_QA_PHYSIO_BATCH}-of-${Math.ceil(REMAINING_CANDIDATES.length / BATCH_SIZE)}`
    : "all-17";
}

async function assertReviewedHeroGeometry(
  page: import("@playwright/test").Page,
  candidateRecipeId: string,
) {
  if (
    ![
      "mobility-atlas",
      "assessment-blueprint",
      "recovery-journal",
      "active-studio",
      "clinical-notebook",
      "step-by-step",
      "human-pace",
      "grounded-strength",
    ].includes(candidateRecipeId)
  ) {
    return;
  }

  const geometry = await page
    .locator('[data-section-family="hero"] .mi-section__layout')
    .evaluate((layout) => {
      const root = layout as HTMLElement;
      const copy = root.querySelector<HTMLElement>(":scope > div:first-child");
      const media = root.querySelector<HTMLElement>(
        ":scope > .mi-section__media",
      );
      const section = root.closest<HTMLElement>(".mi-section");
      if (!copy || !media || !section) {
        throw new Error("Candidate hero geometry is incomplete");
      }
      const layoutRect = root.getBoundingClientRect();
      const copyRect = copy.getBoundingClientRect();
      const mediaRect = media.getBoundingClientRect();
      const copyStyle = getComputedStyle(copy);
      const mediaStyle = getComputedStyle(media);
      const sectionStyle = getComputedStyle(section);
      const afterStyle = getComputedStyle(root, "::after");
      const mediaBeforeStyle = getComputedStyle(media, "::before");
      const mediaAfterStyle = getComputedStyle(media, "::after");
      const overlapWidth = Math.max(
        0,
        Math.min(copyRect.right, mediaRect.right) -
          Math.max(copyRect.left, mediaRect.left),
      );
      const overlapHeight = Math.max(
        0,
        Math.min(copyRect.bottom, mediaRect.bottom) -
          Math.max(copyRect.top, mediaRect.top),
      );
      return {
        layoutWidth: layoutRect.width,
        layoutBottom: layoutRect.bottom,
        layoutBorderBottomPx: Number.parseFloat(
          getComputedStyle(root).borderBottomWidth,
        ),
        layoutPaddingLeftPx: Number.parseFloat(
          getComputedStyle(root).paddingLeft,
        ),
        layoutBackgroundImage: getComputedStyle(root).backgroundImage,
        copyWidth: copyRect.width,
        copyCenterX: copyRect.left + copyRect.width / 2,
        copyBottom: copyRect.bottom,
        copyZIndex: Number.parseInt(copyStyle.zIndex, 10) || 0,
        copyBorderLeftPx: Number.parseFloat(copyStyle.borderLeftWidth),
        mediaWidth: mediaRect.width,
        mediaCenterX: mediaRect.left + mediaRect.width / 2,
        mediaTop: mediaRect.top,
        mediaBottom: mediaRect.bottom,
        mediaRatio: mediaRect.width / mediaRect.height,
        mediaTransform: mediaStyle.transform,
        mediaClipPath: mediaStyle.clipPath,
        overlapArea: Math.round(overlapWidth * overlapHeight),
        textAlign: getComputedStyle(root).textAlign,
        sectionBackgroundImage: sectionStyle.backgroundImage,
        afterContent: afterStyle.content,
        afterFontSizePx: Number.parseFloat(afterStyle.fontSize),
        mediaBeforeContent: mediaBeforeStyle.content,
        mediaAfterContent: mediaAfterStyle.content,
      };
    });

  if (candidateRecipeId === "mobility-atlas") {
    expect
      .soft(geometry.textAlign, "Mobility Atlas needs a centered hero axis")
      .toBe("center");
    expect
      .soft(
        geometry.mediaWidth / geometry.layoutWidth,
        "Mobility Atlas panorama must span the hero container",
      )
      .toBeGreaterThanOrEqual(0.95);
    expect
      .soft(geometry.mediaRatio, "Mobility Atlas needs a wide 16:7 panorama")
      .toBeGreaterThan(2.15);
    expect
      .soft(
        Math.abs(geometry.mediaCenterX - geometry.copyCenterX),
        "Mobility Atlas copy and panorama must share a centered axis",
      )
      .toBeLessThanOrEqual(2);
    expect
      .soft(
        geometry.mediaTop,
        "Mobility Atlas panorama must follow, not cover, the copy",
      )
      .toBeGreaterThanOrEqual(geometry.copyBottom - 1);
  }

  if (candidateRecipeId === "assessment-blueprint") {
    expect
      .soft(
        geometry.copyCenterX,
        "Assessment Blueprint must keep copy in the first column",
      )
      .toBeLessThan(geometry.mediaCenterX);
    expect
      .soft(
        geometry.copyWidth / geometry.mediaWidth,
        "Assessment Blueprint must retain its text-led 7/5 split",
      )
      .toBeGreaterThan(1.25);
    expect
      .soft(
        geometry.mediaRatio,
        "Assessment Blueprint needs a controlled portrait inset",
      )
      .toBeGreaterThan(0.75);
    expect.soft(geometry.mediaRatio).toBeLessThan(0.85);
    expect
      .soft(
        geometry.copyBorderLeftPx,
        "Assessment Blueprint needs its measurement rail",
      )
      .toBeGreaterThanOrEqual(3);
    expect.soft(geometry.overlapArea).toBe(0);
  }

  if (candidateRecipeId === "recovery-journal") {
    expect
      .soft(
        geometry.overlapArea,
        "Recovery Journal needs a note card overlapping its image",
      )
      .toBeGreaterThan(1_000);
    expect
      .soft(geometry.copyZIndex, "Recovery Journal note must sit above media")
      .toBeGreaterThanOrEqual(2);
    expect
      .soft(geometry.mediaRatio, "Recovery Journal needs a 4:5 image")
      .toBeGreaterThan(0.75);
    expect.soft(geometry.mediaRatio).toBeLessThan(0.85);
    expect.soft(geometry.mediaTransform).not.toBe("none");
  }

  if (candidateRecipeId === "active-studio") {
    expect
      .soft(
        geometry.mediaClipPath,
        "Active Studio needs a diagonal image treatment",
      )
      .not.toBe("none");
    expect
      .soft(
        geometry.sectionBackgroundImage,
        "Active Studio needs a diagonal full-width color dock",
      )
      .toContain("linear-gradient");
    expect
      .soft(geometry.mediaRatio, "Active Studio image must remain landscape")
      .toBeGreaterThan(1.2);
  }

  if (candidateRecipeId === "clinical-notebook") {
    expect
      .soft(
        geometry.layoutBackgroundImage,
        "Clinical Notebook needs visible ruled-paper intervals",
      )
      .toContain("repeating-linear-gradient");
    expect
      .soft(
        geometry.copyWidth / geometry.mediaWidth,
        "Clinical Notebook must keep its text-first 5/3 split",
      )
      .toBeGreaterThan(1.35);
    expect
      .soft(
        geometry.mediaRatio,
        "Clinical Notebook needs a pinned portrait crop",
      )
      .toBeGreaterThan(0.75);
    expect.soft(geometry.mediaRatio).toBeLessThan(0.85);
    expect.soft(geometry.mediaTransform).not.toBe("none");
    expect.soft(geometry.mediaBeforeContent).not.toBe("none");
    expect.soft(geometry.afterContent).toContain("VISIT NOTES");
  }

  if (candidateRecipeId === "step-by-step") {
    expect
      .soft(geometry.afterContent, "Step by Step must expose its opening 01")
      .toContain("01");
    expect
      .soft(
        geometry.afterFontSizePx,
        "Step by Step opening numeral must be visibly oversized",
      )
      .toBeGreaterThanOrEqual(140);
    expect
      .soft(
        geometry.layoutPaddingLeftPx,
        "Step by Step must reserve a readable numeral rail",
      )
      .toBeGreaterThanOrEqual(130);
    expect
      .soft(geometry.mediaRatio, "Step by Step needs a narrow image strip")
      .toBeLessThan(0.65);
    expect.soft(geometry.copyCenterX).toBeLessThan(geometry.mediaCenterX);
  }

  if (candidateRecipeId === "human-pace") {
    expect
      .soft(
        geometry.mediaAfterContent,
        "Human Pace needs a visible documentary caption rail",
      )
      .toContain("MOVEMENT STUDY");
    expect
      .soft(
        geometry.mediaRatio,
        "Human Pace needs a landscape documentary frame",
      )
      .toBeGreaterThan(1.2);
    expect
      .soft(
        geometry.mediaCenterX,
        "Human Pace must lead with the documentary image on desktop",
      )
      .toBeLessThan(geometry.copyCenterX);
  }

  if (candidateRecipeId === "grounded-strength") {
    expect
      .soft(
        geometry.layoutBorderBottomPx,
        "Grounded Strength needs a visible load-bearing baseline",
      )
      .toBeGreaterThanOrEqual(9);
    expect
      .soft(
        geometry.sectionBackgroundImage,
        "Grounded Strength needs a low structural color field",
      )
      .toContain("linear-gradient");
    expect
      .soft(
        geometry.afterContent,
        "Grounded Strength needs a visible structural joint",
      )
      .not.toBe("none");
    expect.soft(geometry.mediaTransform).not.toBe("none");
    expect
      .soft(
        geometry.layoutBottom - geometry.mediaBottom,
        "Grounded Strength image must settle within one spacing unit of the baseline",
      )
      .toBeLessThanOrEqual(32);
    expect
      .soft(geometry.layoutBottom - geometry.mediaBottom)
      .toBeGreaterThanOrEqual(0);
    expect.soft(geometry.mediaCenterX).toBeLessThan(geometry.copyCenterX);
  }
}
