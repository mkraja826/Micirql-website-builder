import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

test("media art direction evaluator protects dominant page-wide visual language", () => {
  const source = readFileSync("apps/builder/app/page-media-art-direction-quality.ts", "utf8");
  expect(source).toContain("MEDIA_STYLE_FRAGMENTED");
  expect(source).toContain("MEDIA_TEMPERATURE_FRAGMENTED");
  expect(source).toContain("MEDIA_LIGHTING_FRAGMENTED");
  expect(source).toContain("MEDIA_NO_DOMINANT_DIRECTION");
  expect(source).toContain("value.ratio >= 0.67");
  expect(source).toContain("strongest < 0.5");
});

test("Dental Review gates and scores candidates by media art direction", () => {
  const source = readFileSync("apps/builder/app/dental-review-directions.ts", "utf8");
  expect(source).toContain('evaluatePageMediaArtDirection(candidateSite)');
  expect(source).toContain('MIN_MEDIA_ART_DIRECTION_SCORE = 80');
  expect(source).toContain('mediaArtDirectionErrors.length || mediaArtDirection.score < MIN_MEDIA_ART_DIRECTION_SCORE');
  expect(source).toContain('mediaArtDirection.score');
  expect(source).toContain('media art direction ${mediaArtDirection.score}/100');
});

test("art direction classifier distinguishes editorial clinical documentary and studio cues", () => {
  const source = readFileSync("apps/builder/app/page-media-art-direction-quality.ts", "utf8");
  expect(source).toContain('["editorial", /editorial|campaign|luxury|atelier|cinematic|fashion/]');
  expect(source).toContain('["clinical", /clinical|precision|medical|sterile|technology|scanner|technical/]');
  expect(source).toContain('["documentary", /documentary|candid|consultation|planning|over-shoulder|natural/]');
  expect(source).toContain('["studio", /studio|portrait|posed|headshot/]');
});
