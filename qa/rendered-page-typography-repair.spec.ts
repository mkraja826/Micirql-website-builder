import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

test("rendered typography repair is bounded and presentation-only", () => {
  const planner = readFileSync("apps/builder/app/rendered-page-typography-repair.ts", "utf8");
  const browser = readFileSync("qa/rendered-page-typography-browser.ts", "utf8");

  expect(planner).toContain("One bounded rendered-typography repair pass");
  expect(planner).toContain("attempt > 0");
  expect(planner).toContain("rebalance-heading-wrap");
  expect(planner).toContain("stabilize-action-wrap");
  expect(planner).toContain("relax-paragraph-measure");
  expect(planner).toContain("normalize-card-title-rhythm");
  expect(planner).not.toContain("font-family");
  expect(planner).not.toContain("textContent =");
  expect(planner).not.toContain("innerText =");
  expect(browser).toContain("runRenderedPageTypographyRepairCycle");
  expect((browser.match(/planRenderedPageTypographyRepair\(/g) ?? []).length).toBe(1);
});

test("dental certification records before and after typography evidence", () => {
  const harness = readFileSync("qa/dental-blueprint-qa.ts", "utf8");

  expect(harness).toContain("runRenderedPageTypographyRepairCycle");
  expect(harness).toContain("renderedTypographyRepair");
  expect(harness).toContain("before: typographyRepair.before");
  expect(harness).toContain("after: typographyRepair.after");
  expect(harness).toContain("repaired: typographyRepair.repaired");
  expect(harness).toContain("rejectedAfterRepair: typographyRepair.rejectedAfterRepair");
  expect(harness).toContain('renderedResponsiveTypographyAutoRepair: "single-bounded-pass"');
});
