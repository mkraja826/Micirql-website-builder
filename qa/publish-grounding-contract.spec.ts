import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const route = fs.readFileSync(path.join(root, "apps/builder/app/api/publish/route.ts"), "utf8");
const controller = fs.readFileSync(path.join(root, "apps/builder/app/publish-controller.tsx"), "utf8");

test("publish reruns factual grounding before runtime publishing", () => {
  expect(route).toContain("groundSiteContent(parsed.data, groundingFacts)");
  expect(route).toContain('code: "CONTENT_GROUNDING_NOT_READY"');
  expect(route).toContain('code: "UNSUPPORTED_CONTENT_CLAIM"');
  expect(route.indexOf("groundSiteContent(parsed.data, groundingFacts)")).toBeLessThan(route.indexOf("getPublishRuntime()"));
});

test("publish request carries saved onboarding facts", () => {
  expect(controller).toContain("useOnboardingProfile");
  expect(controller).toContain("groundingFacts:");
  for (const field of ["businessName", "industry", "subindustry", "location", "services", "goals", "notes"]) expect(controller).toContain(`${field}:`);
});
