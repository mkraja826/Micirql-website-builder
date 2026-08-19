import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";

const root = process.cwd();

test("onboarding hard-rejects failed final premium acceptance before persisting", async () => {
  const source = await readFile(path.join(root, "apps/builder/app/api/onboarding/route.ts"), "utf8");
  const evaluation = source.indexOf("finalAcceptance=evaluateFinalGenerationAcceptance(nextSnapshot)");
  const rejection = source.indexOf("if(!finalAcceptance.ready)throw premiumGenerationError(finalAcceptance)");
  const persistence = source.indexOf("await saveSupabaseDraft(request,{snapshot:nextSnapshot");
  const softCatch = source.indexOf("if(isPremiumGenerationError(error))throw error");

  expect(evaluation).toBeGreaterThan(-1);
  expect(rejection).toBeGreaterThan(evaluation);
  expect(persistence).toBeGreaterThan(rejection);
  expect(softCatch).toBeGreaterThan(rejection);
  expect(source).toContain('code:"PREMIUM_GENERATION_NOT_READY"');
  expect(source).toContain("quality:error.report");
});

test("final acceptance combines premium, content, typography, imagery and mobile-structure dimensions", async () => {
  const source = await readFile(path.join(root, "apps/builder/app/final-generation-acceptance.ts"), "utf8");

  for (const dimension of ["premium", "content", "typography", "imagery", "mobile-structure"]) {
    expect(source).toContain(`id: \"${dimension}\"`);
  }
  expect(source).toContain("premium.score < 85");
  expect(source).toContain("firstBuild.score < 88");
  expect(source).toContain("content.score < 82");
  expect(source).toContain("IMAGERY_UNRESOLVED");
  expect(source).toContain("IMAGERY_DUPLICATE_PROMINENT");
  expect(source).toContain("TYPOGRAPHY_HERO_WRAP_RISK");
  expect(source).toContain("MOBILE_CTA_WRAP_RISK");
  expect(source).toContain("RENDERED_MOBILE_REQUIRED");
});
