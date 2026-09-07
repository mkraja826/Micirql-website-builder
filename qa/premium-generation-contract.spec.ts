import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const onboarding = readFileSync(
  resolve(process.cwd(), "apps/builder/app/api/onboarding/route.ts"),
  "utf8",
);

const acceptance = readFileSync(
  resolve(process.cwd(), "apps/builder/app/final-generation-acceptance.ts"),
  "utf8",
);

test("generated sites cannot bypass premium acceptance for design review", () => {
  expect(onboarding).not.toContain("canDeliverForDesignReview");
  expect(onboarding).not.toContain("foundation preserved for architecture enrichment");
  expect(onboarding).toContain("if(!finalAcceptance.ready)throw premiumGenerationError(finalAcceptance)");
  expect(onboarding).toContain("qualityReviewRequired:false");
});

test("content composition and media failures do not silently downgrade generation", () => {
  expect(onboarding).not.toContain("continuing with structural draft");
  expect(onboarding).not.toContain("continuing with generated draft");
  expect(onboarding).not.toContain("continuing without resolved media");
  expect(onboarding).toContain("runGuardedContentGeneration");
  expect(onboarding).toContain("materializeGeneratedMedia");
});

test("final acceptance includes visual coherence as a first-class quality dimension", () => {
  expect(acceptance).toContain('evaluateVisualCoherence');
  expect(acceptance).toContain('id: "visual-coherence"');
  expect(acceptance).toContain("visualCoherence.ready");
  expect(acceptance).toContain("VISUAL_COHERENCE_SCORE");
});

test("premium generation requires a ninety-point contract instead of legacy good-enough thresholds", () => {
  expect(acceptance).toContain("const FINAL_GENERATION_SCORE = 90");
  expect(acceptance).toContain("premium.score < 90");
  expect(acceptance).toContain("firstBuild.score < 90");
  expect(acceptance).toContain("content.score < 90");
  expect(acceptance).toContain("visualCoherence.score < 90");
  expect(acceptance).not.toContain("premium.score < 85");
  expect(acceptance).not.toContain("content.score < 82");
});
