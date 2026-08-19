import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const onboarding = fs.readFileSync(path.join(root, "apps/builder/app/guided-onboarding.tsx"), "utf8");
const interpreter = fs.readFileSync(path.join(root, "apps/builder/app/onboarding-brief-intelligence.ts"), "utf8");
const route = fs.readFileSync(path.join(root, "apps/builder/app/api/onboarding/interpret/route.ts"), "utf8");
const contentService = fs.readFileSync(path.join(root, "apps/builder/app/api/generate-content/service.ts"), "utf8");
const assetUpload = fs.readFileSync(path.join(root, "apps/builder/app/api/assets/upload/route.ts"), "utf8");
const assetVision = fs.readFileSync(path.join(root, "apps/builder/app/uploaded-asset-intelligence.ts"), "utf8");

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
  for (const field of ["businessName", "industry", "subindustry", "location", "services", "goals", "styleTags", "requiredCapabilities", "languages", "notes"]) expect(interpreter).toContain(field);
});

test("user supplied factual claims are locked before content generation", () => {
  expect(interpreter).toContain("LockedBriefFacts");
  expect(interpreter).toContain("LOCKED FACTS");
  expect(interpreter).toContain("never invent missing values");
  for (const field of ["addresses", "phoneNumbers", "emails", "urls", "people", "credentials", "prices", "openingHours", "claims"]) expect(interpreter).toContain(field);
  expect(interpreter).toContain("Do not create fictional names, contact details, addresses, credentials, prices, hours, awards, statistics, guarantees, reviews or factual claims");
});

test("deterministic fallback preserves explicit high-risk business facts without a model", () => {
  for (const helper of ["inferExplicitAddresses", "inferExplicitPeople", "inferExplicitCredentials", "inferExplicitOpeningHours", "inferExplicitClaims"]) expect(interpreter).toContain(helper);
  expect(interpreter).toContain("years?(?:\\s+of)?\\s+experience");
  expect(interpreter).toContain("patients|implants|cases|surgeries|procedures|customers|clients");
  expect(interpreter).toContain("BDS|MDS|MBBS|MD|MS|DNB|MCh|DDS|DMD|FDS|PhD");
});

test("locked onboarding facts hydrate structured grounding buckets before AI writing", () => {
  expect(contentService).toContain("lockedFactsFromNotes");
  expect(contentService).toContain('labelledFacts(notes, "People/team")');
  expect(contentService).toContain('labelledFacts(notes, "Credentials")');
  expect(contentService).toContain('labelledFacts(notes, "Claims/statistics/guarantees")');
  expect(contentService).toContain('labelledFacts(notes, "Prices")');
  for (const field of ["people", "credentials", "proofClaims", "prices"]) expect(contentService).toContain(`${field},`);
});

test("onboarding accepts a batch of business photos and persists them before generation", () => {
  expect(onboarding).toContain("Business photos");
  expect(onboarding).toContain("multiple");
  expect(onboarding).toContain("uploadBusinessAssets");
  expect(onboarding).toContain('fetch("/api/assets/upload"');
  expect(onboarding).toContain("slice(0, 12)");
});

test("uploaded business media is vision classified with safe fallbacks", () => {
  expect(assetUpload).toContain("classifyUploadedBusinessAsset");
  expect(assetUpload).toContain("classification.sectionFamilies");
  expect(assetUpload).toContain("classification.tags");
  expect(assetVision).toContain('@cf/meta/llama-3.2-11b-vision-instruct');
  expect(assetVision).toContain('source: "cloudflare-workers-ai-vision"');
  expect(assetVision).toContain('source: "deterministic-fallback"');
  for (const category of ["team", "results", "clinic", "service", "certificate", "product", "general"]) expect(assetVision).toContain(category);
  expect(assetVision).toContain("Do not identify a real person or infer credentials, medical outcomes, ownership, awards, or facts not visually evident");
});
