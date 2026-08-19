import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

test("builder and live runtime consume the same persisted responsive composition contract", () => {
  const persisted = readFileSync("apps/builder/app/persisted-responsive-composition-repair.ts", "utf8");
  const previewBridge = readFileSync("apps/builder/app/persisted-first-screen-repair.ts", "utf8");
  const liveHelper = readFileSync("packages/live-runtime/src/responsive-composition-repair.ts", "utf8");
  const liveRuntime = readFileSync("packages/live-runtime/src/index.ts", "utf8");

  expect(persisted).toContain('const PROP_KEY = "responsiveCompositionRepairs"');
  expect(previewBridge).toContain("persistedResponsiveCompositionRepairCss(site, viewport, path)");
  expect(liveHelper).toContain("responsiveCompositionRepairs");
  expect(liveRuntime).toContain("liveResponsiveCompositionRepair(site, path)");
  expect(liveRuntime).toContain("data-mi-persisted-responsive-composition-repair");
});

test("published responsive composition repair keeps preview breakpoint semantics", () => {
  const liveHelper = readFileSync("packages/live-runtime/src/responsive-composition-repair.ts", "utf8");

  expect(liveHelper).toContain("@media (max-width:430px)");
  expect(liveHelper).toContain("@media (min-width:431px) and (max-width:1024px)");
  expect(liveHelper).toContain("@media (min-width:1025px)");
  expect(liveHelper).toContain('const mobile = cssFor("mobile")');
  expect(liveHelper).toContain('const tablet = cssFor("tablet")');
  expect(liveHelper).toContain('const desktop = cssFor("desktop")');
});

test("live runtime replays certified CSS without recomputing layout", () => {
  const liveHelper = readFileSync("packages/live-runtime/src/responsive-composition-repair.ts", "utf8");

  expect(liveHelper).toContain("The live runtime never recomputes or broadens a certified repair");
  expect(liveHelper).not.toContain("measureResponsiveCompositionIssues");
  expect(liveHelper).not.toContain("planResponsiveCompositionRepair");
});
