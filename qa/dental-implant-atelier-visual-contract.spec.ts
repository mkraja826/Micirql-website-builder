import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const css = fs.readFileSync(path.join(process.cwd(), "packages/sections/src/dental-02-implant-atelier.css"), "utf8");

test("Implant Atelier keeps flagship editorial luxury invariants", () => {
  expect(css).toContain('[data-mi-layout-blueprint="dental-02-implant-luxury"] .mi-hero--immersive');
  expect(css).toContain("font-family:var(--mi-atelier-serif)");
  expect(css).toContain("font-size:clamp(4.35rem,7.35vw,7.8rem)");
  expect(css).toContain(".mi-services--spotlight .mi-services-spotlight");
  expect(css).toContain("grid-template-columns:minmax(8rem,.28fr) minmax(0,1fr)");
  expect(css).toContain(".mi-team-card--lead");
  expect(css).toContain("aspect-ratio:4/5");
  expect(css).toContain("border-top:1px solid rgba(255,250,244,.18)");
  expect(css).toContain("border-radius:999px");
});

test("Implant Atelier mobile is intentionally recomposed", () => {
  const mobile = css.slice(css.indexOf("@media(max-width:47.99rem)"));
  expect(mobile).toContain(".mi-hero--immersive{min-height:auto;display:flex;flex-direction:column}");
  expect(mobile).toContain(".mi-hero--immersive>.mi-section__media{position:relative;order:2");
  expect(mobile).toContain(".mi-hero--immersive .mi-hero__overlay{position:relative;order:1");
  expect(mobile).toContain("grid-template-columns:1fr");
  expect(mobile).toContain("min-height:52px");
  expect(mobile).toContain("aspect-ratio:16/10");
});
