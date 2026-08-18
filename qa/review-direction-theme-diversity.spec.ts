import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(path.resolve(process.cwd(), "apps/builder/app/review-directions.ts"), "utf8");

test("healthcare review directions rotate only across trust-compatible theme families", () => {
  const healthcare = source.match(/"healthcare-clinic": \[([^\]]+)\]/)?.[1] ?? "";
  for (const theme of ["corporate", "minimalist", "luxury", "editorial", "organic", "cinematic"]) {
    expect(healthcare).toContain(`"${theme}"`);
  }
  for (const unsafeTheme of ["playful", "maximalist", "futuristic"]) {
    expect(healthcare).not.toContain(`"${unsafeTheme}"`);
  }
});

test("candidate generation actively changes theme family before section ids are composed", () => {
  expect(source).toContain("const themeFamily = themeFamilyForCandidate(archetypeId, site.theme.family, candidateIndex)");
  expect(source).toContain("next.theme.family = themeFamily");
  expect(source).toContain("sectionDesignId(next.theme.family, family, certified)");
  expect(source).toContain("`${themeFamily} design system`");
});

test("the original compatible theme is preserved as the first design-system option", () => {
  expect(source).toContain("compatible.includes(baseTheme)");
  expect(source).toContain("[baseTheme, ...compatible.filter((theme) => theme !== baseTheme)]");
});
