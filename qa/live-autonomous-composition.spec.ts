import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { composeSiteFromRegistry, plannerModelFromEnvironment } from "@micirql/ai";
import { sitePlanSchema } from "@micirql/schema";
import { designRegistryEntrySchema, type ComponentFamily, type DesignRegistryEntry } from "@micirql/registry";

const scenarios = [
  { id: "general", name: "Harbor Dental Care", goal: "Book general dentistry appointments", positioning: "value" as const, theme: "minimalist" as const },
  { id: "implants", name: "Apex Implant Centre", goal: "Generate dental implant consultation enquiries", positioning: "premium" as const, theme: "luxury" as const },
  { id: "cosmetic", name: "Ivory Smile Studio", goal: "Generate cosmetic dentistry consultations", positioning: "luxury" as const, theme: "luxury" as const },
  { id: "orthodontic", name: "Align Dental Studio", goal: "Book orthodontic and aligner consultations", positioning: "premium" as const, theme: "corporate" as const },
  { id: "emergency", name: "Rapid Relief Dental", goal: "Drive urgent dental calls and appointments", positioning: "mid-market" as const, theme: "corporate" as const },
  { id: "family", name: "Greenleaf Family Dental", goal: "Book family dentistry appointments", positioning: "value" as const, theme: "organic" as const },
];

const families: ComponentFamily[] = ["navbar", "hero", "services", "features", "testimonials", "team", "cta", "contact", "footer"];
const scenarioLimit = Math.max(1, Math.min(Number(process.env.MI_LIVE_SAMPLE_COUNT ?? 2), scenarios.length));

function makeEntry(family: ComponentFamily, variant: number, theme: "minimalist" | "corporate" | "luxury" | "organic"): DesignRegistryEntry {
  const familyCode = ({ navbar: "NAV", hero: "HERO", services: "SERV", features: "FEAT", testimonials: "TEST", team: "TEAM", cta: "CTA", contact: "CONT", footer: "FOOT" } as Record<string, string>)[family] ?? family.slice(0, 4).toUpperCase();
  const prefix = ({ minimalist: "MIN", corporate: "COR", luxury: "LUX", organic: "ORG" } as const)[theme];
  const visualWeight = variant === 3 ? "heavy" : variant === 2 ? "light" : "medium";
  const contentDensity = variant === 3 ? "high" : variant === 2 ? "low" : "medium";
  return designRegistryEntrySchema.parse({
    id: `${prefix}-${familyCode}-${String(variant).padStart(3, "0")}`,
    family,
    theme,
    version: "1.0.0",
    status: "production",
    displayName: `${family} ${variant}`,
    description: `Certified ${family} composition candidate ${variant}`,
    tags: ["certified", "dental"],
    layoutTraits: [variant === 2 ? "airy" : variant === 3 ? "editorial" : "balanced"],
    brandPersonalities: ["professional", "trustworthy", "premium"],
    modifiers: ["light"],
    domainCompatibility: {
      clinic: 100,
      "landing-page": 65,
      "real-estate": 20,
      restaurant: 20,
      corporate: 55,
      saas: 25,
      portfolio: 25,
      construction: 20,
      education: 25,
      hospitality: 20,
    },
    capabilities: {
      primaryCTA: ["hero", "cta", "contact"].includes(family),
      functionalBinding: family === "contact",
    },
    contentSchema: [],
    intelligence: {
      conversionGoals: ["appointments", "lead-generation", "trust"],
      placementRoles: ["opening", "early-proof", "core-content", "decision-support", "conversion", "closing"],
      visualWeight,
      contentDensity,
      imageRequirement: "optional",
      preferredImageRatios: [],
      idealPredecessors: [],
      idealSuccessors: [],
      avoidAdjacent: [],
      maxRecommendedPerPage: 1,
      aiPriority: variant === 1 ? 92 : variant === 2 ? 87 : 82,
      mobileSuitability: variant === 3 ? 88 : 96,
      contentCapacity: {},
    },
    quality: { mobile: variant === 3 ? 88 : 96, performance: 96, accessibility: 96, visual: variant === 1 ? 94 : 90, conversion: 92 },
    technical: { clientJavascript: "none", animationCost: "low", requiresBackend: false, requiresThirdParty: false },
    protocol: { passed: true, score: 96, checkedAt: "2026-08-18T00:00:00.000Z" },
    dependencies: [],
    previews: { thumbnail: `https://example.com/${prefix.toLowerCase()}-${family}-${variant}.png` },
    usage: { selected: 0, published: 0, replaced: 0 },
  });
}

function makeRegistry(theme: "minimalist" | "corporate" | "luxury" | "organic") {
  return families.flatMap((family) => [1, 2, 3].map((variant) => makeEntry(family, variant, theme)));
}

function buildPlan(scenario: (typeof scenarios)[number]) {
  return sitePlanSchema.parse({
    business: {
      businessName: scenario.name,
      domain: "clinic",
      subtype: "dental",
      primaryGoal: scenario.goal,
      audiences: ["Dental patients"],
      locations: ["Hyderabad"],
      positioning: scenario.positioning,
      requiredFunctions: ["appointment", "contact"],
    },
    brand: {
      personalities: ["professional", "trustworthy", scenario.positioning === "luxury" ? "refined" : "welcoming"],
      visualWeight: scenario.theme === "luxury" ? "heavy" : "medium",
      geometry: scenario.theme === "organic" ? "organic" : "balanced",
      preferredSurface: "light",
      imageryDirection: "photography",
      motionPreference: "subtle",
    },
    design: { theme: scenario.theme, modifiers: ["light"], rationale: ["Dental trust and conversion benchmark"] },
    pages: [{
      name: "Home",
      path: "/",
      purpose: scenario.goal,
      requiredSectionFamilies: families,
      requiredFunctions: ["appointment", "contact"],
    }],
  });
}

function rhythmViolations(result: Awaited<ReturnType<typeof composeSiteFromRegistry>>, registry: DesignRegistryEntry[]) {
  const byId = new Map(registry.map((entry) => [entry.id, entry]));
  let violations = 0;
  for (const page of result.pages) {
    for (let index = 1; index < page.sections.length; index++) {
      const previous = byId.get(page.sections[index - 1]!.componentId)?.intelligence;
      const current = byId.get(page.sections[index]!.componentId)?.intelligence;
      if (!previous || !current) continue;
      if (previous.visualWeight === "heavy" && current.visualWeight === "heavy") violations++;
      if (previous.contentDensity === "high" && current.contentDensity === "high") violations++;
    }
  }
  return violations;
}

test("live model selects only approved dental composition candidates", async () => {
  const model = plannerModelFromEnvironment(process.env);
  test.skip(!model, "No live text provider configured.");
  if (!model) return;

  const results = [];
  for (const scenario of scenarios.slice(0, scenarioLimit)) {
    const registry = makeRegistry(scenario.theme);
    const approved = new Set(registry.map((entry) => entry.id));
    const result = await composeSiteFromRegistry({ plan: buildPlan(scenario), registry, model, shortlistSize: 3 });
    const sections = result.pages.flatMap((page) => page.sections);
    const unapproved = sections.filter((section) => !approved.has(section.componentId)).map((section) => section.componentId);
    const familyOrder = result.pages[0]?.sections.map((section) => section.family) ?? [];
    const aiSelected = sections.filter((section) => section.source === "ai").length;
    const rhythm = rhythmViolations(result, registry);
    const passed = unapproved.length === 0 && familyOrder.join("|") === families.join("|") && rhythm === 0 && !result.fallbackUsed;

    results.push({
      scenario: scenario.id,
      passed,
      fallbackUsed: result.fallbackUsed,
      modelId: result.modelId,
      aiSelected,
      sectionCount: sections.length,
      unapproved,
      familyOrder,
      rhythmViolations: rhythm,
      warnings: result.warnings,
      selections: sections.map((section) => ({ family: section.family, componentId: section.componentId, source: section.source, score: section.score })),
    });
  }

  const aiAccepted = results.filter((result) => !result.fallbackUsed).length;
  const passRate = results.filter((result) => result.passed).length / results.length;
  const outputDirectory = path.join(process.cwd(), "test-results", "live-autonomous-composition");
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(path.join(outputDirectory, "report.json"), JSON.stringify({ generatedAt: new Date().toISOString(), modelId: model.id, scenarios: results.length, aiAccepted, acceptanceRate: aiAccepted / results.length, passRate, results }, null, 2), "utf8");

  expect(passRate, JSON.stringify(results, null, 2)).toBe(1);
  expect(aiAccepted, "The live model should produce at least one composition accepted without deterministic fallback.").toBeGreaterThan(0);
});
