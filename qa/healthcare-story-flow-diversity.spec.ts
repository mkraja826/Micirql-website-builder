import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(path.resolve(process.cwd(), "apps/builder/app/review-directions.ts"), "utf8");

test("healthcare Top-20 uses multiple deliberate story flows", () => {
  expect(source).toContain("const HEALTHCARE_STORY_FLOWS");
  expect(source).toContain('"healthcare-clinic"');
  expect(source).toContain("applyStoryFlow(mutatedRecipe, archetypeId, candidateIndex)");

  const flowBlock = source.match(/const HEALTHCARE_STORY_FLOWS:[\s\S]*?as const;/)?.[0] ?? "";
  expect(flowBlock).toContain('["navbar", "hero", "testimonials", "team", "services"');
  expect(flowBlock).toContain('["navbar", "hero", "services", "process", "testimonials"');
  expect(flowBlock).toContain('["navbar", "hero", "team", "about", "services"');
  expect(flowBlock).toContain('["navbar", "hero", "gallery", "testimonials", "services"');
  expect(flowBlock).toContain('["navbar", "hero", "features", "services", "testimonials"');
  expect(flowBlock).toContain('["navbar", "hero", "about", "team", "services"');

  const sequences = [...flowBlock.matchAll(/\[(?:"[a-z-]+"(?:, )?)+\]/g)].map((match) => match[0]);
  expect(new Set(sequences).size).toBeGreaterThanOrEqual(6);
  for (const sequence of sequences.slice(0, 6)) {
    expect(sequence.startsWith('["navbar", "hero"')).toBeTruthy();
    expect(sequence.endsWith('"cta", "contact", "footer"]')).toBeTruthy();
  }
});
