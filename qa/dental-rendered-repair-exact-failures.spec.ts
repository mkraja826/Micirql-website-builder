import { expect, test } from "@playwright/test";
import { planRenderedFirstScreenRepair } from "../apps/builder/app/rendered-first-screen-repair";
import { planRenderedPageTypographyRepair } from "../apps/builder/app/rendered-page-typography-repair";

test("Dental first-screen repair removes excessive hero lead-in without weakening the gate", () => {
  const plan = planRenderedFirstScreenRepair({
    width: 390,
    failures: ["excess-space-before-headline:303px"],
    attempt: 0,
  });

  expect(plan.required).toBe(true);
  expect(plan.operations).toContain("reduce-hero-top-space");
  expect(plan.css).toContain("min-height:0!important");
  expect(plan.css).toContain("align-content:start!important");
  expect(plan.css).toContain("margin-top:0!important");
});

test("Dental typography repair widens headings and keeps actions from arbitrary word-breaking", () => {
  const plan = planRenderedPageTypographyRepair({
    width: 390,
    issues: [
      { code: "HEADING_TOO_MANY_RENDERED_LINES", severity: "error" },
      { code: "ACTION_WRAP_EXCESSIVE", severity: "error" },
    ],
    attempt: 0,
  });

  expect(plan.required).toBe(true);
  expect(plan.operations).toEqual(expect.arrayContaining(["rebalance-heading-wrap", "stabilize-action-wrap"]));
  expect(plan.css).toContain("max-width:24ch");
  expect(plan.css).toContain("overflow-wrap:normal");
  expect(plan.css).toContain("word-break:normal");
  expect(plan.css).not.toContain("overflow-wrap:anywhere");
});
