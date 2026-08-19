import fs from "node:fs";
import assert from "node:assert/strict";

const css = fs.readFileSync(new URL("../packages/sections/src/dental-01-clinical-authority-refinement.css", import.meta.url), "utf8");

const required = [
  '[data-mi-layout-blueprint="dental-01-clinical-authority"] .mi-shell-navbar',
  '.mi-section--hero .mi-type--display',
  '.mi-services--spotlight .mi-service-item',
  '.mi-team--featured .mi-team-card--lead',
  '.mi-conv-cta--split .mi-conv-heading h2',
  '@media(max-width:47.99rem)',
  'grid-template-columns:1fr',
  'min-height:52px',
  'prefers-reduced-motion:reduce',
];

for (const token of required) {
  assert.ok(css.includes(token), `Clinical Authority visual contract missing: ${token}`);
}

assert.ok(/\.mi-section--hero[\s\S]*font-size:clamp\(3\.5rem,6\.2vw,6\.4rem\)/.test(css), "Hero must retain premium desktop display scale");
assert.ok(/\.mi-section--hero[\s\S]*aspect-ratio:4\/3/.test(css), "Hero must retain an intentional mobile image composition");
assert.ok(/\.mi-services--spotlight[\s\S]*border-bottom:1px solid var\(--mi-clinical-hairline\)/.test(css), "Services must retain editorial row rhythm");
assert.ok(/\.mi-conv-cta--split[\s\S]*background:var\(--mi-clinical-strong\)/.test(css), "CTA must retain the dark authority band");

console.log("Clinical Authority visual contract: PASS");
