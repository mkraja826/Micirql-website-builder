import { expect, test } from "@playwright/test";
import type { GroundingFacts } from "@micirql/design-engine";
import { contentRulesForFacts } from "../packages/ai/src/content-generation-pipeline";

function facts(overrides: Partial<GroundingFacts> = {}): GroundingFacts {
  return {
    businessName: "Aurelia Dental",
    industry: "Dental clinic",
    subindustry: "implant dentistry",
    location: "Hyderabad",
    services: ["Dental implants", "Smile design", "Crowns", "Veneers"],
    goals: ["Book appointments", "Showcase treatments"],
    notes: "Premium private dental clinic. Do not invent doctor credentials or clinical claims.",
    people: [],
    credentials: [],
    proofClaims: [],
    prices: [],
    ...overrides,
  };
}

test("implant dental brief gets treatment-specific first-pass content rules", () => {
  const rules = contentRulesForFacts(facts());
  const joined = rules.join("\n");

  expect(joined).toContain("DENTAL CONTENT MODE");
  expect(joined).toContain("IMPLANT FOCUS");
  expect(joined).toContain("make dental implants unmistakably central");
  expect(joined).toContain("Book a consultation");
  expect(joined).toContain("Never invent clinical outcomes");
  expect(joined).toContain("same-day treatment");
});

test("cosmetic brief adds cosmetic-specific safety and differentiation rules", () => {
  const rules = contentRulesForFacts(facts({
    subindustry: "cosmetic dentistry",
    services: ["Smile design", "Veneers", "Crowns"],
  }));
  const joined = rules.join("\n");

  expect(joined).toContain("COSMETIC FOCUS");
  expect(joined).toContain("distinguish smile design, veneers, crowns");
  expect(joined).not.toContain("IMPLANT FOCUS");
});

test("non-dental briefs keep the universal content rules without dental instructions", () => {
  const rules = contentRulesForFacts(facts({
    businessName: "Northstar Legal",
    industry: "Law firm",
    subindustry: "commercial law",
    services: ["Commercial contracts", "Business advisory"],
    goals: ["Generate enquiries"],
    notes: null,
  }));
  const joined = rules.join("\n");

  expect(joined).toContain("Return one complete Site object");
  expect(joined).not.toContain("DENTAL CONTENT MODE");
  expect(joined).not.toContain("IMPLANT FOCUS");
  expect(joined).not.toContain("COSMETIC FOCUS");
});
