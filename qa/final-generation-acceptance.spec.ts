import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";

const root = process.cwd();

test("onboarding retries failed final premium acceptance before hard rejection and persistence", async () => {
  const source = await readFile(path.join(root, "apps/builder/app/api/onboarding/route.ts"), "utf8");
  const firstEvaluation = source.indexOf("finalAcceptance=evaluateFinalGenerationAcceptance(nextSnapshot)");
  const correction = source.indexOf("finalCorrection=applyFinalGenerationCorrection(nextSnapshot)");
  const secondEvaluation = source.indexOf("finalAcceptance=evaluateFinalGenerationAcceptance(nextSnapshot)", firstEvaluation + 1);
  const rejection = source.indexOf("if(!finalAcceptance.ready)throw premiumGenerationError(finalAcceptance)");
  const persistence = source.indexOf("await saveSupabaseDraft(request,{snapshot:nextSnapshot");
  const softCatch = source.indexOf("if(isPremiumGenerationError(error))throw error");

  expect(firstEvaluation).toBeGreaterThan(-1);
  expect(correction).toBeGreaterThan(firstEvaluation);
  expect(secondEvaluation).toBeGreaterThan(correction);
  expect(rejection).toBeGreaterThan(secondEvaluation);
  expect(persistence).toBeGreaterThan(rejection);
  expect(softCatch).toBeGreaterThan(rejection);
  expect(source).toContain('code:"PREMIUM_GENERATION_NOT_READY"');
  expect(source).toContain("quality:error.report");
  expect(source).toContain("finalCorrection:finalCorrection?");
});

test("final acceptance combines flagship visual, premium, content, typography, imagery and mobile-structure dimensions", async () => {
  const source = await readFile(path.join(root, "apps/builder/app/final-generation-acceptance.ts"), "utf8");

  for (const dimension of ["flagship-visual", "premium", "content", "typography", "imagery", "mobile-structure"]) {
    expect(source).toContain(`id: \"${dimension}\"`);
  }
  expect(source).toContain("evaluateFlagshipVisualQuality(site)");
  expect(source).toContain("flagshipVisual.score < 90");
  expect(source).toContain("flagshipVisual.flagshipReady");
  expect(source).toContain("premium.score < 85");
  expect(source).toContain("firstBuild.score < 88");
  expect(source).toContain("content.score < 82");
  expect(source).toContain("IMAGERY_UNRESOLVED");
  expect(source).toContain("IMAGERY_DUPLICATE_PROMINENT");
  expect(source).toContain("TYPOGRAPHY_HERO_WRAP_RISK");
  expect(source).toContain("MOBILE_CTA_WRAP_RISK");
  expect(source).toContain("RENDERED_MOBILE_REQUIRED");
});

test("targeted correction runs bounded dimension-aware recovery passes and re-scores each pass", async () => {
  const source = await readFile(path.join(root, "apps/builder/app/final-generation-correction.ts"), "utf8");

  expect(source).toContain("const MAX_RECOVERY_PASSES = 3");
  expect(source).toContain("pass <= MAX_RECOVERY_PASSES && !final.ready");
  expect(source).toContain("final.dimensions.filter((dimension) => !dimension.ready)");
  expect(source).toContain('failed.has("content") || failed.has("premium") || failed.has("flagship-visual")');
  expect(source).toContain('failed.has("flagship-visual")');
  expect(source).toContain('failed.has("typography")');
  expect(source).toContain('failed.has("mobile-structure") || failed.has("typography")');
  expect(source).toContain('failed.has("imagery")');
  expect(source).toContain("repairContentDepth(candidate)");
  expect(source).toContain("repairFlagshipComposition(candidate)");
  expect(source).toContain("arrangeFlagshipOpening(content)");
  expect(source).toContain("repairTypography(candidate)");
  expect(source).toContain("compactMobileRiskCopy(candidate)");
  expect(source).toContain("repairImageReferences(candidate)");
  expect(source).toContain("applyPremiumQualityCorrection(candidate)");
  expect(source).toContain("evaluateFinalGenerationAcceptance(candidate)");
  expect(source).toContain("pass-${pass}[");
  expect(source).toContain("if (JSON.stringify(candidate) === beforePass) break");
});
