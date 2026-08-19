import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

const interactionCss = readFileSync("packages/sections/src/interaction-polish.css", "utf8");
const outputSafetyCss = readFileSync("packages/sections/src/premium-output-system.css", "utf8");
const builderLayout = readFileSync("apps/builder/app/layout.tsx", "utf8");
const liveCssBuilder = readFileSync("apps/live/scripts/build-runtime-css.mjs", "utf8");

test("generated-site interaction polish is pointer-aware and preserves explicit states", () => {
  expect(interactionCss).toContain("@media (hover:hover) and (pointer:fine)");
  expect(interactionCss).toContain(":active");
  expect(interactionCss).toContain(":focus-visible");
  expect(interactionCss).toContain(".mi-mobile-nav[open] .mi-mobile-drawer");
  expect(interactionCss).toContain("mi-mobile-drawer-enter");
});

test("interaction polish avoids layout-changing transition properties", () => {
  expect(interactionCss).not.toMatch(/transition[^;{}]*(?:width|height|top|right|bottom|left|margin|padding)/i);
  expect(interactionCss).not.toMatch(/transition-property\s*:[^;{}]*(?:width|height|top|right|bottom|left|margin|padding)/i);
  expect(interactionCss).not.toContain("transition:all");
});

test("reduced motion disables generated-site interaction movement", () => {
  expect(interactionCss).toContain("@media (prefers-reduced-motion:reduce)");
  expect(interactionCss).toContain("transition:none!important");
  expect(interactionCss).toContain("animation:none!important");
  expect(interactionCss).toContain("transform:none!important");
  expect(outputSafetyCss).toContain("@media (prefers-reduced-motion:reduce)");
  expect(outputSafetyCss).toContain("animation-duration:.01ms!important");
  expect(outputSafetyCss).toContain("transition-duration:.01ms!important");
});

test("interaction polish is shared by Builder Preview and published runtime", () => {
  expect(builderLayout).toContain('import "@micirql/sections/interaction-polish.css"');
  expect(liveCssBuilder).toContain('const interactionPolishSource = "packages/sections/src/interaction-polish.css"');
  expect(liveCssBuilder).toContain("interactionPolishSource,");
  const geometryIndex = builderLayout.indexOf('import "@micirql/sections/premium-geometry.css"');
  const interactionIndex = builderLayout.indexOf('import "@micirql/sections/interaction-polish.css"');
  const firstRefinementIndex = builderLayout.indexOf('import "@micirql/sections/dental-01-clinical-authority-refinement.css"');
  expect(geometryIndex).toBeGreaterThanOrEqual(0);
  expect(interactionIndex).toBeGreaterThan(geometryIndex);
  expect(firstRefinementIndex).toBeGreaterThan(interactionIndex);
});
