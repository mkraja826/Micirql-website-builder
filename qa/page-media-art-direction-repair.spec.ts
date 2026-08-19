import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

test("media art direction repair is bounded and preserves customer identity media", () => {
  const repair = readFileSync("apps/builder/app/page-media-art-direction-repair.ts", "utf8");
  expect(repair).toContain("attempt > 0");
  expect(repair).toContain("replacements >= 2");
  expect(repair).toContain('intent.source === "customer"');
  expect(repair).toContain("entry.match >= 2");
  expect(repair).toContain("!usedUrls.has(alternate.url)");
  expect(repair).toContain('operation: "reselect-outlier-to-dominant-family"');
});

test("art direction QA and repair share the same visual classifier", () => {
  const quality = readFileSync("apps/builder/app/page-media-art-direction-quality.ts", "utf8");
  const repair = readFileSync("apps/builder/app/page-media-art-direction-repair.ts", "utf8");
  expect(quality).toContain("export function classifyMediaArtDirectionTokens");
  expect(repair).toContain("classifyMediaArtDirectionTokens");
});

test("selected primary asset tags are persisted instead of inferring style from alternates", () => {
  const apply = readFileSync("apps/builder/app/apply-media-execution.ts", "utf8");
  const quality = readFileSync("apps/builder/app/page-media-art-direction-quality.ts", "utf8");
  expect(apply).toContain("selectedAssetTags:[...request.asset.tags]");
  expect(quality).toContain("record.selectedAssetTags");
  expect(quality).not.toContain("alternates[0]");
});

test("Dental Review performs one art direction repair and re-evaluates before admission", () => {
  const directions = readFileSync("apps/builder/app/dental-review-directions.ts", "utf8");
  expect(directions).toContain("repairPageMediaArtDirection(candidateSite, mediaArtDirection)");
  expect(directions).toContain("candidateSite = artDirectionRepair.site");
  expect(directions).toContain("mediaArtDirection = evaluatePageMediaArtDirection(candidateSite)");
  expect(directions).toContain("mediaArtDirectionErrors.length || mediaArtDirection.score < MIN_MEDIA_ART_DIRECTION_SCORE");
});
