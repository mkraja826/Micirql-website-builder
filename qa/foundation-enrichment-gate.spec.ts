import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

test("safe generation foundations are not forced to satisfy final visual scores before architecture enrichment", () => {
  const source = readFileSync("apps/builder/app/api/onboarding/route.ts", "utf8");

  expect(source).toContain('new Set<FinalGenerationAcceptance["dimensions"][number]["id"]>(["content","typography","imagery","mobile-structure"])');
  expect(source).toContain("if(report.dimensions.some(dimension=>hardDimensions.has(dimension.id)&&!dimension.ready))return false;");
  expect(source).not.toContain("if(report.score<80)return false;");
  expect(source).not.toContain('dimension.score>=75');
  expect(source).toContain("foundation preserved for architecture enrichment after bounded repair");
});

test("final architecture stage still owns the full generated-site quality gates", () => {
  const source = readFileSync("apps/builder/app/api/onboarding/architect/route.ts", "utf8");

  expect(source).toContain("evaluateGeneratedSiteQuality");
  expect(source).toContain("evaluateDentalContentQuality");
  expect(source).toContain("evaluateHeroCoherence");
  expect(source).toContain("evaluateAboveFoldComposition");
  expect(source).toContain("evaluateSiteVisualQuality");
  expect(source).toContain("evaluateFunctionalPublishGate");
});
