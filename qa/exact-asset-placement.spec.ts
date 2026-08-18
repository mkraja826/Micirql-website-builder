import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const placement = fs.readFileSync(path.join(root, "apps/builder/app/exact-asset-placement.ts"), "utf8");
const classifier = fs.readFileSync(path.join(root, "apps/builder/app/uploaded-asset-intelligence.ts"), "utf8");
const route = fs.readFileSync(path.join(root, "apps/builder/app/api/onboarding/architect/route.ts"), "utf8");

test("uploaded filenames preserve safe entity and case hints", () => {
  expect(classifier).toContain("filenameTags");
  expect(classifier).toContain('`label:${token}`');
  expect(classifier).toContain('`case:${caseMatch[1].toLowerCase()}`');
  expect(classifier).toContain('"stage:before"');
  expect(classifier).toContain('"stage:after"');
});

test("exact placement matches finished item titles without face identification", () => {
  expect(placement).toContain("bestExactMatch");
  expect(placement).toContain("titleTokens");
  expect(placement).toContain('family === "team"');
  expect(placement).toContain('family === "services"');
  expect(placement).toContain('family === "gallery"');
  expect(placement).not.toContain("face recognition");
});

test("before and after case assets remain paired and adjacent", () => {
  expect(placement).toContain("caseGroups");
  expect(placement).toContain('tags.includes("stage:before")');
  expect(placement).toContain('tags.includes("stage:after")');
  expect(placement).toContain("pairedCases++");
});

test("exact placement runs after grounded content generation", () => {
  expect(route.indexOf("runGuardedContentGeneration")).toBeLessThan(route.indexOf("applyExactAssetPlacement"));
  expect(route).toContain("exactPlacement");
});
