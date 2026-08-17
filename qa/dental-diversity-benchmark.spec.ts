import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { composeWebsite } from "../apps/builder/app/composition-intelligence";
import type { OnboardingProfile } from "../apps/builder/app/preset-ranking";

const scenarios: Array<{ id: string; profile: OnboardingProfile }> = [
  { id: "general", profile: { industry: "dental clinic", subindustry: "general dentistry", goals: ["book appointments", "build trust"], style_tags: ["clean", "professional"], required_capabilities: ["booking", "contact"], services: ["checkups", "root canal", "crowns"] } },
  { id: "implants", profile: { industry: "dental clinic", subindustry: "implant dentistry", goals: ["book implant consultations", "build credibility"], style_tags: ["premium", "elegant"], required_capabilities: ["booking", "before after gallery"], services: ["dental implants", "full arch implants", "implant crowns"] } },
  { id: "cosmetic", profile: { industry: "dental clinic", subindustry: "cosmetic dentistry", goals: ["showcase smile transformations", "book consultations"], style_tags: ["premium", "visual"], required_capabilities: ["gallery", "booking"], services: ["veneers", "smile design", "teeth whitening"] } },
  { id: "orthodontic", profile: { industry: "dental clinic", subindustry: "orthodontics", goals: ["book aligner consultations", "build trust"], style_tags: ["modern", "professional"], required_capabilities: ["booking", "treatment process"], services: ["clear aligners", "braces", "retainers"] } },
  { id: "emergency", profile: { industry: "dental clinic", subindustry: "emergency dentistry", goals: ["urgent appointments", "contact clinic"], style_tags: ["clear", "professional"], required_capabilities: ["contact", "booking"], services: ["tooth pain", "broken tooth", "emergency care"] } },
  { id: "family", profile: { industry: "dental clinic", subindustry: "family dentistry", goals: ["book family appointments", "build trust"], style_tags: ["welcoming", "clean"], required_capabilities: ["booking", "team"], services: ["preventive dentistry", "fillings", "gum care"] } },
  { id: "endodontic", profile: { industry: "dental clinic", subindustry: "endodontics", goals: ["book specialist consultations", "explain treatment"], style_tags: ["clinical", "professional"], required_capabilities: ["booking", "treatment process"], services: ["root canal treatment", "retreatment", "dental pain assessment"] } },
  { id: "restorative", profile: { industry: "dental clinic", subindustry: "restorative dentistry", goals: ["build credibility", "book consultations"], style_tags: ["premium", "calm"], required_capabilities: ["booking", "gallery"], services: ["crowns", "bridges", "full mouth rehabilitation"] } },
  { id: "smile-design", profile: { industry: "dental clinic", subindustry: "smile design", goals: ["showcase portfolio", "book smile consultations"], style_tags: ["luxury", "visual"], required_capabilities: ["gallery", "booking"], services: ["digital smile design", "veneers", "whitening"] } },
  { id: "implant-education", profile: { industry: "dental clinic", subindustry: "implant dentistry", goals: ["learn about implant treatment", "book consultations"], style_tags: ["premium", "educational"], required_capabilities: ["treatment process", "booking"], services: ["single tooth implants", "implant bridges", "full arch rehabilitation"] } },
];

function fingerprint(profile: OnboardingProfile) {
  const composition = composeWebsite(profile);
  return {
    preset: composition.preset.id,
    intent: composition.intent,
    recipe: composition.industryPack?.recipe.id ?? "none",
    sectionOrder: composition.sections.map((section) => section.family).join(">"),
    variants: composition.sections.map((section) => `${section.family}:${section.variant}`).join("|"),
    full: [composition.preset.id, composition.intent, composition.industryPack?.recipe.id ?? "none", composition.sections.map((section) => `${section.family}:${section.variant}`).join("|")].join("::"),
  };
}

test("dental generation maintains meaningful composition diversity", async () => {
  const results = scenarios.map(({ id, profile }) => ({ id, ...fingerprint(profile) }));
  const counts = new Map<string, number>();
  for (const result of results) counts.set(result.full, (counts.get(result.full) ?? 0) + 1);

  const uniqueFull = new Set(results.map((result) => result.full)).size;
  const uniqueRecipes = new Set(results.map((result) => result.recipe)).size;
  const uniqueIntents = new Set(results.map((result) => result.intent)).size;
  const uniqueVariantPatterns = new Set(results.map((result) => result.variants)).size;
  const largestCluster = Math.max(...counts.values());
  const largestClusterShare = largestCluster / results.length;

  const summary = {
    generatedAt: new Date().toISOString(),
    benchmark: "dental-composition-diversity-v1",
    samples: results.length,
    uniqueFull,
    uniqueRecipes,
    uniqueIntents,
    uniqueVariantPatterns,
    largestCluster,
    largestClusterShare,
    results,
  };

  const outputDirectory = path.join(process.cwd(), "test-results", "dental-diversity");
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(path.join(outputDirectory, "report.json"), JSON.stringify(summary, null, 2), "utf8");
  await writeFile(path.join(outputDirectory, "summary.md"), [
    "# MiCirql Dental Composition Diversity",
    "",
    `- Samples: **${results.length}**`,
    `- Unique full compositions: **${uniqueFull}**`,
    `- Unique industry recipes: **${uniqueRecipes}**`,
    `- Unique intents: **${uniqueIntents}**`,
    `- Unique variant patterns: **${uniqueVariantPatterns}**`,
    `- Largest identical cluster: **${largestCluster}/${results.length} (${Math.round(largestClusterShare * 100)}%)**`,
    "",
    "| Scenario | Preset | Intent | Recipe | Section pattern |",
    "| --- | --- | --- | --- | --- |",
    ...results.map((result) => `| ${result.id} | ${result.preset} | ${result.intent} | ${result.recipe} | ${result.variants} |`),
    "",
  ].join("\n"), "utf8");

  expect(uniqueFull, JSON.stringify(summary, null, 2)).toBeGreaterThanOrEqual(5);
  expect(uniqueVariantPatterns, "Dental sites should not all use the same certified variant pattern.").toBeGreaterThanOrEqual(4);
  expect(uniqueIntents, "Different Dental goals should produce more than one narrative intent.").toBeGreaterThanOrEqual(3);
  expect(largestClusterShare, "No single identical Dental composition should dominate more than 40% of samples.").toBeLessThanOrEqual(0.4);
});
