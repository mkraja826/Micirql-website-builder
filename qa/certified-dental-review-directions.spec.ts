import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { DENTAL_LAYOUT_BLUEPRINTS } from "../packages/design-engine/src/dental-layout-blueprints";

test("dental review uses server-certified blueprint systems instead of generic recipe mutations", () => {
  const review = readFileSync("apps/builder/app/first-build-review.tsx", "utf8");
  const route = readFileSync("apps/builder/app/api/review-directions/dental/route.ts", "utf8");
  const helper = readFileSync("apps/builder/app/dental-review-directions.ts", "utf8");
  const diagnostics = readFileSync("apps/builder/app/dental-review-diagnostics-lite.ts", "utf8");

  expect(review).toContain("isDentalReviewProfile(profile)");
  expect(review).toContain('fetch("/api/review-directions/dental"');
  expect(review).not.toContain("buildCertifiedDentalReviewDirections(");
  expect(review).not.toContain("MICIRQL_DENTAL_CERTIFIED_LAYOUT_IDS");

  expect(route).toContain("getSupabaseDraft(request, workspaceId, siteId)");
  expect(route).toContain("buildCertifiedDentalReviewDirections(");
  expect(route).toContain("diagnoseCertifiedDentalReviewDirectionsLite(draft.snapshot, profile)");
  expect(route).toContain("summarizeDentalReviewDiagnosticsLite(diagnostics)");
  expect(route).toContain("{ status: 422 }");
  expect(route).toContain("draft.snapshot");
  expect(route).toContain("directions,");

  expect(helper).toContain("DENTAL_LAYOUT_BLUEPRINTS");
  expect(helper).toContain("applyWebsiteLayoutBlueprint(site, blueprint)");
  expect(helper).toContain("const REVIEW_LIMIT = 8");
  expect(helper).toContain("const RUNTIME_EVALUATION_LIMIT = 20");
  expect(helper).toContain("selectBlueprintEvaluationSet(eligibleBlueprints");
  expect(helper).toContain("Every returned direction still passes every existing quality threshold below");
  expect(helper).toContain("MICIRQL_DENTAL_CERTIFIED_LAYOUT_IDS");

  expect(diagnostics).toContain("const DIAGNOSTIC_SAMPLE_LIMIT = 1");
  expect(diagnostics).toContain("matching.slice(0, DIAGNOSTIC_SAMPLE_LIMIT)");
  expect(diagnostics).toContain('failingStage: "dental-content"');
  expect(diagnostics).toContain('failingStage: "multipage"');
  expect(diagnostics).toContain('failingStage: "page-rhythm"');
  expect(diagnostics).toContain('failingStage: "typography"');
  expect(diagnostics).toContain('failingStage: "media-art-direction"');
  expect(diagnostics).toContain("runtimeRenderedCertifiedDentalIds()");
  expect(diagnostics).toContain("MIN_DENTAL_CONTENT_SCORE = 82");
  expect(diagnostics).toContain("MIN_DENTAL_MULTIPAGE_SCORE = 90");
  expect(diagnostics).toContain("MIN_PAGE_RHYTHM_SCORE = 78");
  expect(diagnostics).toContain("MIN_PAGE_TYPOGRAPHY_SCORE = 82");
  expect(diagnostics).toContain("MIN_MEDIA_ART_DIRECTION_SCORE = 80");

  const flagshipNames = DENTAL_LAYOUT_BLUEPRINTS.slice(0, 5).map((item) => item.name);
  expect(flagshipNames).toEqual([
    "Clinical Authority",
    "Implant Atelier",
    "Smile Studio",
    "Family Care",
    "Digital Dentistry",
  ]);
  expect(new Set(flagshipNames).size).toBe(5);
});

test("certified dental directions carry materially different composition contracts", () => {
  const flagships = DENTAL_LAYOUT_BLUEPRINTS.slice(0, 5);
  const signatures = flagships.map((item) => [
    item.shell.navbarBlueprintId,
    item.shell.heroBlueprintId,
    item.shell.footerBlueprintId,
    item.archetype,
    item.design.imageStyle,
    item.design.sectionRhythm,
    item.sections.map((section) => `${section.family}:${section.pattern}`).join("|"),
  ].join("::"));

  expect(new Set(signatures).size).toBe(flagships.length);
});
