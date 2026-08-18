import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { composeWebsite, type CompositionIntent } from "../apps/builder/app/composition-intelligence";
import type { OnboardingProfile } from "../apps/builder/app/preset-ranking";

const scenarios: Array<{ id: string; expectedLayout: string; expectedIntent: CompositionIntent; profile: OnboardingProfile }> = [
  { id: "general", expectedLayout: "dental-01-clinical-authority", expectedIntent: "trust", profile: { industry: "dental clinic", subindustry: "general dentistry", goals: ["book appointments", "build trust"], style_tags: ["clean", "professional"], required_capabilities: ["booking", "contact"], services: ["checkups", "root canal", "crowns"] } },
  { id: "implants", expectedLayout: "dental-02-implant-luxury", expectedIntent: "showcase", profile: { industry: "dental clinic", subindustry: "implant dentistry", goals: ["book implant consultations", "build credibility"], style_tags: ["premium", "elegant"], required_capabilities: ["booking", "before after gallery"], services: ["dental implants", "full arch implants", "implant crowns"] } },
  { id: "cosmetic", expectedLayout: "dental-03-smile-studio", expectedIntent: "showcase", profile: { industry: "dental clinic", subindustry: "cosmetic dentistry", goals: ["showcase smile transformations", "book consultations"], style_tags: ["premium", "visual"], required_capabilities: ["gallery", "booking"], services: ["veneers", "smile design", "teeth whitening"] } },
  { id: "orthodontic", expectedLayout: "dental-09-ortho-journey", expectedIntent: "education", profile: { industry: "dental clinic", subindustry: "orthodontics", goals: ["book aligner consultations", "build trust"], style_tags: ["modern", "professional"], required_capabilities: ["booking", "treatment process"], services: ["clear aligners", "braces", "retainers"] } },
  { id: "emergency", expectedLayout: "dental-10-emergency-trust", expectedIntent: "conversion", profile: { industry: "dental clinic", subindustry: "emergency dentistry", goals: ["urgent appointments", "contact clinic"], style_tags: ["clear", "professional"], required_capabilities: ["contact", "booking"], services: ["tooth pain", "broken tooth", "emergency care"] } },
  { id: "family", expectedLayout: "dental-04-family-care", expectedIntent: "trust", profile: { industry: "dental clinic", subindustry: "family dentistry", goals: ["book family appointments", "build trust"], style_tags: ["welcoming", "clean"], required_capabilities: ["booking", "team"], services: ["preventive dentistry", "fillings", "gum care"] } },
  { id: "endodontic", expectedLayout: "dental-05-digital-dentistry", expectedIntent: "education", profile: { industry: "dental clinic", subindustry: "endodontics", goals: ["book specialist consultations", "explain treatment"], style_tags: ["clinical", "professional"], required_capabilities: ["booking", "treatment process"], services: ["root canal treatment", "retreatment", "dental pain assessment"] } },
  { id: "restorative", expectedLayout: "dental-12-wellness-calm", expectedIntent: "showcase", profile: { industry: "dental clinic", subindustry: "restorative dentistry", goals: ["build credibility", "book consultations"], style_tags: ["premium", "calm"], required_capabilities: ["booking", "gallery"], services: ["crowns", "bridges", "full mouth rehabilitation"] } },
  { id: "smile-design", expectedLayout: "dental-03-smile-studio", expectedIntent: "showcase", profile: { industry: "dental clinic", subindustry: "smile design", goals: ["showcase portfolio", "book smile consultations"], style_tags: ["luxury", "visual"], required_capabilities: ["gallery", "booking"], services: ["digital smile design", "veneers", "whitening"] } },
  { id: "implant-education", expectedLayout: "dental-13-implant-results", expectedIntent: "education", profile: { industry: "dental clinic", subindustry: "implant dentistry", goals: ["learn about implant treatment", "book consultations"], style_tags: ["premium", "educational"], required_capabilities: ["treatment process", "booking"], services: ["single tooth implants", "implant bridges", "full arch rehabilitation"] } },
];

function fingerprint(profile: OnboardingProfile) {
  const composition = composeWebsite(profile);
  const layout = composition.layoutCandidate;
  return {
    preset: composition.preset.id,
    intent: composition.intent,
    recipe: composition.industryPack?.recipe.id ?? "none",
    layout: layout?.layout.id ?? "none",
    layoutStatus: layout?.layout.status ?? "none",
    layoutScore: layout?.score ?? 0,
    layoutReasons: layout?.reasons ?? [],
    sectionOrder: composition.sections.map((section) => section.family).join(">"),
    variants: composition.sections.map((section) => `${section.family}:${section.variant}`).join("|"),
    full: [composition.preset.id, composition.intent, composition.industryPack?.recipe.id ?? "none", layout?.layout.id ?? "none", composition.sections.map((section) => `${section.family}:${section.variant}`).join("|")].join("::"),
  };
}

test("dental generation maintains meaningful composition and layout-selection diversity", async () => {
  const results = scenarios.map(({ id, expectedLayout, expectedIntent, profile }) => ({ id, expectedLayout, expectedIntent, ...fingerprint(profile) }));
  const counts = new Map<string, number>();
  for (const result of results) counts.set(result.full, (counts.get(result.full) ?? 0) + 1);

  const uniqueFull = new Set(results.map((result) => result.full)).size;
  const uniqueRecipes = new Set(results.map((result) => result.recipe)).size;
  const uniqueIntents = new Set(results.map((result) => result.intent)).size;
  const uniqueVariantPatterns = new Set(results.map((result) => result.variants)).size;
  const uniqueLayouts = new Set(results.map((result) => result.layout)).size;
  const selectorMatches = results.filter((result) => result.layout === result.expectedLayout).length;
  const intentMatches = results.filter((result) => result.intent === result.expectedIntent).length;
  const largestCluster = Math.max(...counts.values());
  const largestClusterShare = largestCluster / results.length;

  const summary = {
    generatedAt: new Date().toISOString(),
    benchmark: "dental-composition-diversity-v3",
    samples: results.length,
    uniqueFull,
    uniqueRecipes,
    uniqueIntents,
    uniqueVariantPatterns,
    uniqueLayouts,
    selectorMatches,
    intentMatches,
    largestCluster,
    largestClusterShare,
    results,
  };

  const outputDirectory = path.join(process.cwd(), "test-results", "dental-diversity");
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(path.join(outputDirectory, "report.json"), JSON.stringify(summary, null, 2), "utf8");
  await writeFile(path.join(outputDirectory, "summary.md"), [
    "# MiCirql Dental Composition + Layout Selection",
    "",
    `- Samples: **${results.length}**`,
    `- Selector matches: **${selectorMatches}/${results.length}**`,
    `- Intent matches: **${intentMatches}/${results.length}**`,
    `- Unique selected layouts: **${uniqueLayouts}**`,
    `- Unique full compositions: **${uniqueFull}**`,
    `- Unique industry recipes: **${uniqueRecipes}**`,
    `- Unique intents: **${uniqueIntents}**`,
    `- Unique variant patterns: **${uniqueVariantPatterns}**`,
    `- Largest identical cluster: **${largestCluster}/${results.length} (${Math.round(largestClusterShare * 100)}%)**`,
    "",
    "| Scenario | Expected layout | Selected layout | Score | Expected intent | Intent | Recipe |",
    "| --- | --- | --- | ---: | --- | --- | --- |",
    ...results.map((result) => `| ${result.id} | ${result.expectedLayout} | ${result.layout} | ${result.layoutScore} | ${result.expectedIntent} | ${result.intent} | ${result.recipe} |`),
    "",
  ].join("\n"), "utf8");

  for (const result of results) {
    expect(result.layoutStatus, `${result.id} must only select a production-certified layout`).toBe("certified");
    expect(result.layoutScore, `${result.id} did not produce a strong enough layout match: ${JSON.stringify(result.layoutReasons)}`).toBeGreaterThanOrEqual(70);
    expect(result.layout, `${result.id} selected the wrong blueprint: ${JSON.stringify(result.layoutReasons)}`).toBe(result.expectedLayout);
    expect(result.intent, `${result.id} inferred the wrong narrative intent`).toBe(result.expectedIntent);
  }

  expect(selectorMatches, JSON.stringify(summary, null, 2)).toBe(results.length);
  expect(intentMatches, JSON.stringify(summary, null, 2)).toBe(results.length);
  expect(uniqueLayouts, "Specific Dental onboarding profiles should distribute across the curated library.").toBeGreaterThanOrEqual(8);
  expect(uniqueFull, JSON.stringify(summary, null, 2)).toBeGreaterThanOrEqual(8);
  expect(uniqueVariantPatterns, "Dental sites should not all use the same certified variant pattern.").toBeGreaterThanOrEqual(4);
  expect(uniqueIntents, "Different Dental goals should produce more than one narrative intent.").toBeGreaterThanOrEqual(3);
  expect(largestClusterShare, "No single identical Dental composition should dominate more than 30% of samples.").toBeLessThanOrEqual(0.3);
});
