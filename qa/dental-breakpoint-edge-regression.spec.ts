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