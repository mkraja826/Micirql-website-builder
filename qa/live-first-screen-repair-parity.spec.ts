import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

test("live runtime consumes persisted first-screen repairs from published Site", () => {
  const live = readFileSync("packages/live-runtime/src/index.ts", "utf8");

  expect(live).toContain("renderedFirstScreenRepairs");
  expect(live).toContain("liveFirstScreenRepair(site, path)");
  expect(live).toContain("@media (max-width:430px)");
  expect(live).toContain("@media (min-width:431px) and (max-width:1024px)");
  expect(live).toContain("@media (min-width:1025px)");
  expect(live).toContain('data-mi-persisted-first-screen-repair');
  expect(live).toContain('data-mi-first-screen-repair=\"1\"');
});

test("live repair CSS uses the same root contract as builder preview", () => {
  const planner = readFileSync("apps/builder/app/rendered-first-screen-repair.ts", "utf8");
  const preview = readFileSync("apps/builder/app/renderer-preview.tsx", "utf8");
  const live = readFileSync("packages/live-runtime/src/index.ts", "utf8");

  expect(planner).toContain("[data-mi-first-screen-repair='1']");
  expect(preview).toContain("data-mi-first-screen-repair={repairCss ? \"1\" : undefined}");
  expect(live).toContain('data-mi-first-screen-repair=\"1\"');
});
