import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import type { GroundingFacts } from "@micirql/design-engine";
import { contentRulesForFacts } from "../packages/ai/src/content-generation-pipeline";

const architectSource = readFileSync(new URL("../apps/builder/app/api/onboarding/architect/route.ts", import.meta.url), "utf8");
const serviceSource = readFileSync(new URL("../apps/builder/app/api/generate-content/service.ts", import.meta.url), "utf8");

function dentalFacts(): GroundingFacts {
  return {
    businessName: "Aurelia Dental",
    industry: "Dental clinic",
    subindustry: "implant dentistry",
    location: "Hyderabad",
    services: ["Dental implants", "Smile design", "Crowns", "Veneers"],
    goals: ["Book appointments"],
    notes: null,
    people: [],
    credentials: [],
    proofClaims: [],
    prices: [],
  };
}

test("supplemental dental QA instructions reach the content model without replacing safety rules", () => {
  const rules = contentRulesForFacts(dentalFacts(), [
    "Dental QA 1 — HERO_MISSES_PRIMARY_TREATMENT: Hero must represent implants.",
    "Dental QA 2 — DENTAL_CTA_TOO_GENERIC: Use a clinic-specific next step.",
  ]);
  const joined = rules.join("\n");

  expect(joined).toContain("DENTAL CONTENT MODE");
  expect(joined).toContain("HERO_MISSES_PRIMARY_TREATMENT");
  expect(joined).toContain("DENTAL_CTA_TOO_GENERIC");
  expect(joined).toContain("Never invent");
});

test("architect performs one bounded dental repair before final failure", () => {
  expect(architectSource).toContain('stage = "dental-content-repair"');
  expect(architectSource).toContain("repairRules: dentalContentRepairRules(dentalContentQuality)");
  expect(architectSource).toContain("dentalRepairApplied = true");
  expect(architectSource).toContain("GENERATED_DENTAL_CONTENT_QUALITY_FAILED_AFTER_REPAIR");
  expect(architectSource.match(/dentalContentRepairRules\(dentalContentQuality\)/g)?.length).toBe(1);
});

test("repair pass is re-certified by general, dental and visual quality gates", () => {
  const repairIndex = architectSource.indexOf('stage = "dental-content-repair"');
  const afterRepair = architectSource.slice(repairIndex);

  expect(afterRepair).toContain("evaluateGeneratedSiteQuality(finalDraft.snapshot, businessName)");
  expect(afterRepair).toContain("evaluateDentalContentQuality(finalDraft.snapshot, dentalProfile)");
  expect(afterRepair).toContain("evaluateSiteVisualQuality(finalDraft.snapshot)");
  expect(afterRepair).toContain("Dental specialty content auto-repaired");
});

test("generation service passes repair rules through the guarded integrity boundary", () => {
  expect(serviceSource).toContain("repairRules?: string[]");
  expect(serviceSource).toContain("supplementalRules: repairRules");
  expect(serviceSource).toContain("repairRuleCount: repairRules.length");
});
