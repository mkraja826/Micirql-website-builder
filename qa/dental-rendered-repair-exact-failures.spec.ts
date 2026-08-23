import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { expect, test } from "@playwright/test";
import { planRenderedFirstScreenRepair } from "../apps/builder/app/rendered-first-screen-repair";
import { planRenderedPageTypographyRepair } from "../apps/builder/app/rendered-page-typography-repair";

const here = dirname(fileURLToPath(import.meta.url));
const structuralSafetyCss = readFileSync(join(here, "../packages/sections/src/dental-production-structural-safety.css"), "utf8");

test("Dental first-screen repair removes excessive hero lead-in without weakening the gate", () => {
  for (const width of [390, 768, 1024]) {
    const plan = planRenderedFirstScreenRepair({
      width,
      failures: ["excess-space-before-headline:295px"],
      attempt: 0,
    });

    expect(plan.required).toBe(true);
    expect(plan.operations).toContain("reduce-hero-top-space");
    expect(plan.css).toContain("min-height:0!important");
    expect(plan.css).toContain("align-content:start!important");
    expect(plan.css).toContain("justify-content:flex-start!important");
    expect(plan.css).toContain("padding-top:0!important");
    expect(plan.css).toContain("margin-top:0!important");
  }
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
  expect(plan.css).toContain("flex-direction:column");
  expect(plan.css).not.toContain("overflow-wrap:anywhere");
});

test("Dental action-wrap repair remains bounded at tablet breakpoint edges", () => {
  for (const width of [768, 1024]) {
    const plan = planRenderedPageTypographyRepair({
      width,
      issues: [{ code: "ACTION_WRAP_EXCESSIVE", severity: "error" }],
      attempt: 0,
    });

    expect(plan.required).toBe(true);
    expect(plan.viewport).toBe("tablet");
    expect(plan.operations).toContain("stabilize-action-wrap");
    expect(plan.css).toContain("flex-wrap:wrap");
    expect(plan.css).toContain("min-width:0");
    expect(plan.css).toContain("max-width:100%");
    expect(plan.css).not.toContain("overflow-wrap:anywhere");
  }
});

test("recovered production layouts own their failing geometry before rendered repair", () => {
  expect(structuralSafetyCss).toContain('[data-mi-layout-blueprint="dental-02-implant-luxury"] .mi-hero--immersive .mi-hero__overlay');
  expect(structuralSafetyCss).toContain("align-items:flex-start");
  expect(structuralSafetyCss).toContain("min-height:0");

  for (const layoutId of ["dental-06-doctor-brand", "dental-13-implant-results", "dental-18-proof-first"]) {
    expect(structuralSafetyCss).toContain(`[data-mi-layout-blueprint="${layoutId}"]`);
  }
  expect(structuralSafetyCss).toContain("grid-template-columns:repeat(auto-fit,minmax(min(100%,13rem),1fr))");
  expect(structuralSafetyCss).toContain("grid-template-columns:minmax(0,1fr)");
  expect(structuralSafetyCss).toContain("overflow-wrap:normal");
  expect(structuralSafetyCss).not.toContain("overflow-wrap:anywhere");
});
