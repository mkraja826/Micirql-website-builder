import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

test("Dental 13 keeps treatment headings contained at the 1024px certification edge", () => {
  const css = readFileSync("packages/sections/src/dental-13-implant-results-refinement.css", "utf8");
  expect(css).toContain("@media(min-width:48rem) and (max-width:64rem)");
  expect(css).toContain('[data-mi-prop-path="title"]');
  expect(css).toContain("white-space:normal!important");
  expect(css).toContain("overflow-wrap:break-word");
  expect(css).toContain("word-break:normal");
});

test("Dental 15 switches to a contained campaign composition at exactly 768px", () => {
  const css = readFileSync("packages/sections/src/dental-15-smile-campaign-refinement.css", "utf8");
  expect(css).toContain("@media(max-width:48rem)");
  expect(css).toContain(".site-preview.viewport-tablet");
  expect(css).toContain("flex-direction:column");
  expect(css).toContain("min-width:0");
  expect(css).toContain("max-width:100%");
});

test("Dental 15 and 19 constrain whole-page authored containers at the narrow tablet edge", () => {
  const css = readFileSync("packages/sections/src/dental-99-zzzz-responsive-certification-refinement.css", "utf8");
  expect(css).toContain("@media (min-width:48rem) and (max-width:52rem)");
  expect(css).toContain('[data-mi-layout-blueprint="dental-15-smile-campaign"] :is(');
  expect(css).toContain('[data-mi-layout-blueprint="dental-19-minimal-white"] :is(');
  expect(css).toContain(".mi-contact-split");
  expect(css).toContain(".mi-proof-quote");
  expect(css).toContain("width:100%!important");
  expect(css).toContain("min-width:0!important");
  expect(css).toContain("max-width:100%!important");
  expect(css).toContain("box-sizing:border-box!important");
  expect(css).not.toContain("overflow-x:hidden");
  expect(css).not.toContain("overflow-x:clip");
});

test("rendered repair selectors outrank authored important typography without becoming global", () => {
  const typographyRepair = readFileSync("apps/builder/app/rendered-page-typography-repair.ts", "utf8");
  const firstScreenRepair = readFileSync("apps/builder/app/rendered-first-screen-repair.ts", "utf8");

  expect(typographyRepair).toContain("const priorityRoot = `${root}${root}${root}${root}`");
  expect(typographyRepair).toContain("`${priorityRoot} h1{font-size:${h1}!important");
  expect(firstScreenRepair).toContain("const PRIORITY_ROOT = `${ROOT}${ROOT}${ROOT}${ROOT}`");
  expect(firstScreenRepair).toContain("const h1 = `${PRIORITY_ROOT} h1`");
  expect(typographyRepair).not.toContain("body h1{");
  expect(firstScreenRepair).not.toContain("body h1{");
});
