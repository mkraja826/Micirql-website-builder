import { describe, expect, it } from "vitest";
import { interpretMinimalBrief } from "./interpreter";

const cases = [
  ["Harbor Dental Hyderabad", "dental", "general-dentistry", "clinic"],
  ["Luxury resort Goa", "hospitality", "luxury-hotel", "hotel"],
  ["Raja Constructions", "construction", "general-contractor", "contractor"],
  ["Italian restaurant Hyderabad", "food-beverage", "casual-dining", "restaurant"],
  ["AI startup", "ai-data", "ai-products", "startup"],
] as const;

describe("interpretMinimalBrief", () => {
  it.each(cases)("interprets %s", (brief, industry, subIndustry, businessType) => {
    const result = interpretMinimalBrief(brief);
    expect(result.business.industry.value).toBe(industry);
    expect(result.business.subIndustry?.value).toBe(subIndustry);
    expect(result.business.businessType?.value).toBe(businessType);
    expect(result.website.requiredSectionTypes.value).toContain("hero");
    expect(result.truth.prohibitedClaims.length).toBeGreaterThan(0);
  });

  it("does not invent verified business facts", () => {
    const result = interpretMinimalBrief("Harbor Dental Hyderabad");
    expect(result.truth.knownFacts).toEqual({ location: "Hyderabad" });
    expect(result.truth.unknownFacts).toContain("team");
    expect(result.truth.unknownFacts).toContain("pricing");
    expect(result.truth.unknownFacts).toContain("testimonials");
  });
});
