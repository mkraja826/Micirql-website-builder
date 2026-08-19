import { expect, test } from "@playwright/test";
import { planRenderedFirstScreenRepair } from "../apps/builder/app/rendered-first-screen-repair";

test("mobile weak first screen produces a bounded geometry repair", () => {
  const plan = planRenderedFirstScreenRepair({
    width: 390,
    failures: [
      "headline-too-small:26px<28px",
      "headline-wraps-too-many-lines:5>4",
      "navbar-too-tall:108px>96px",
      "cta-not-visible-in-first-screen:912px",
      "excess-space-before-headline:282px",
    ],
  });

  expect(plan.required).toBe(true);
  expect(plan.viewport).toBe("mobile");
  expect(plan.operations).toEqual(expect.arrayContaining([
    "increase-headline-scale",
    "reduce-headline-wrap",
    "tighten-headline-leading",
    "compress-navigation",
    "reduce-hero-top-space",
    "compact-hero-stack",
    "raise-primary-cta",
  ]));
  expect(plan.css).toContain("data-mi-first-screen-repair='1'");
  expect(plan.css).toContain("28px");
});

test("structural absence is not hidden by a CSS repair", () => {
  const plan = planRenderedFirstScreenRepair({
    width: 390,
    failures: ["missing-visible-h1", "missing-visible-hero-cta"],
  });

  expect(plan.required).toBe(false);
  expect(plan.operations).toEqual([]);
  expect(plan.css).toBe("");
});

test("only one repair attempt is allowed", () => {
  const plan = planRenderedFirstScreenRepair({
    width: 1440,
    failures: ["headline-too-small:38px<40px", "hero-starts-too-low:240px"],
    attempt: 1,
  });

  expect(plan.required).toBe(false);
  expect(plan.attempt).toBe(1);
  expect(plan.operations).toEqual([]);
});

test("healthy render creates no repair", () => {
  const plan = planRenderedFirstScreenRepair({ width: 768, failures: [] });
  expect(plan.required).toBe(false);
  expect(plan.reasons).toEqual([]);
});
