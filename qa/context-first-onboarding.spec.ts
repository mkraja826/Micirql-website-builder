import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const onboarding = fs.readFileSync(path.join(root, "apps/builder/app/guided-onboarding.tsx"), "utf8");
const interpreter = fs.readFileSync(path.join(root, "apps/builder/app/onboarding-brief-intelligence.ts"), "utf8");
const route = fs.readFileSync(path.join(root, "apps/builder/app/api/onboarding/interpret/route.ts"), "utf8");

test("onboarding is context-first instead of selector-first", () => {
  expect(onboarding).toContain("Describe the website you want.");
  expect(onboarding).toContain("Your website brief");
  expect(onboarding).toContain("/api/onboarding/interpret");
  expect(onboarding).not.toContain("<ChoiceGroup");
  expect(onboarding).not.toContain('const steps = ["Business", "Brand", "Goals", "Review"]');
});

test("context interpretation uses Workers AI with a deterministic fallback", () => {
  expect(interpreter).toContain("createWorkersAiJsonPlannerModel");
  expect(interpreter).toContain('source: "cloudflare-workers-ai"');
  expect(interpreter).toContain('source: "deterministic-fallback"');
  expect(route).toContain("interpretOnboardingBrief(context)");
});

test("context interpretation preserves the existing structured generation contract", () => {
  for (const field of ["businessName", "industry", "subindustry", "location", "services", "goals", "styleTags", "requiredCapabilities", "languages", "notes"]) {
    expect(interpreter).toContain(field);
  }
});

test("user supplied factual claims are locked before content generation", () => {
  expect(interpreter).toContain("LockedBriefFacts");
  expect(interpreter).toContain("LOCKED FACTS");
  expect(interpreter).toContain("never invent missing values");
  for (const field of ["addresses", "phoneNumbers", "emails", "urls", "people", "credentials", "prices", "openingHours", "claims"]) {
    expect(interpreter).toContain(field);
  }
  expect(interpreter).toContain("Do not create fictional names, contact details, addresses, credentials, prices, hours, awards, statistics, guarantees, reviews or factual claims");
});
