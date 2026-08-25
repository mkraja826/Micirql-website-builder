import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const layout = readFileSync("apps/builder/app/layout.tsx", "utf8");
const ux = readFileSync("apps/builder/app/product-ux-system.css", "utf8");
const onboarding = readFileSync("apps/builder/app/guided-onboarding.module.css", "utf8");
const dashboard = readFileSync("apps/builder/app/project-dashboard.module.css", "utf8");
const review = readFileSync("apps/builder/app/first-build-review.module.css", "utf8");

test("product UX system is loaded after legacy hardening styles", () => {
  const hardening = layout.indexOf('import "./mobile-layout-hardening.css";');
  const product = layout.indexOf('import "./product-ux-system.css";');
  assert.ok(hardening >= 0);
  assert.ok(product > hardening);
});

test("product UX system provides accessible interaction foundations", () => {
  assert.match(ux, /:focus-visible/);
  assert.match(ux, /prefers-reduced-motion/);
  assert.match(ux, /min-height:44px/);
  assert.match(ux, /--mi-primary:/);
});

test("primary product journeys share the same typography and mobile touch targets", () => {
  assert.doesNotMatch(review, /font-family:Arial/);
  assert.match(onboarding, /min-height:50px/);
  assert.match(dashboard, /min-height:48px/);
  assert.match(review, /min-height:50px/);
});
