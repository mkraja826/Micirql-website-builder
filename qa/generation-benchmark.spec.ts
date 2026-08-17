import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { SCHEMA_VERSION, siteSchema, type Site } from "@micirql/schema";
import { evaluatePremiumQualityGate, validateWebsite } from "@micirql/design-engine";

type DentalScenario = {
  id: string;
  name: string;
  focus: string;
  location: string;
  services: string[];
  theme: "minimalist" | "corporate" | "luxury" | "organic";
};

const scenarios: DentalScenario[] = [
  { id: "general", name: "Harbor Dental Care", focus: "Complete family dental care", location: "Hyderabad", services: ["Preventive dentistry", "Root canal treatment", "Crowns and bridges"], theme: "minimalist" },
  { id: "implants", name: "Apex Implant Centre", focus: "Dental implant consultations", location: "Hyderabad", services: ["Dental implants", "Full-arch rehabilitation", "Implant-supported crowns"], theme: "luxury" },
  { id: "cosmetic", name: "Ivory Smile Studio", focus: "Cosmetic smile consultations", location: "Bengaluru", services: ["Smile design", "Veneers", "Teeth whitening"], theme: "luxury" },
  { id: "orthodontic", name: "Align Dental Studio", focus: "Orthodontic consultations", location: "Chennai", services: ["Clear aligners", "Braces", "Retention care"], theme: "corporate" },
  { id: "emergency", name: "Rapid Relief Dental", focus: "Urgent dental enquiries", location: "Pune", services: ["Dental pain assessment", "Emergency dental care", "Broken tooth care"], theme: "corporate" },
  { id: "family", name: "Greenleaf Family Dental", focus: "Family dentistry appointments", location: "Kochi", services: ["Routine check-ups", "Restorative dentistry", "Gum care"], theme: "organic" },
];

const benchmarkMinimum = {
  passRate: 1,
  structuralScore: 90,
  premiumScore: 85,
} as const;

function section(id: string, family: string, paletteRole: string, props: Record<string, unknown> = {}) {
  return {
    id,
    component: { componentId: `${family}.benchmark-v1`, version: "1.0.0" },
    props: { paletteRole, ...props },
    bindings: {},
    hidden: false,
  };
}

function buildDentalSite(scenario: DentalScenario): Site {
  const primaryAction = { label: scenario.id === "emergency" ? "Call clinic" : "Book appointment", href: "#contact" };
  const site = {
    schemaVersion: SCHEMA_VERSION,
    siteId: `benchmark-${scenario.id}`,
    workspaceId: "generation-benchmark",
    name: scenario.name,
    domain: "clinic" as const,
    subtype: "dental",
    theme: {
      family: scenario.theme,
      modifiers: ["light" as const],
      brand: {
        colors: {
          primary: "#315E62",
          secondary: "#173B40",
          accent: "#C49A64",
          background: "#FFFFFF",
          surface: "#F3F7F6",
          textPrimary: "#102427",
          textSecondary: "#526568",
          border: "#D8E2E0",
          success: "#167A55",
          warning: "#9A6500",
          error: "#B42318",
        },
        typography: { display: "Inter", body: "Inter", ui: "Inter" },
        density: "comfortable" as const,
        shape: "balanced" as const,
        motion: "subtle" as const,
      },
    },
    seoBlueprint: {
      primaryGoal: scenario.focus,
      targetLocations: [scenario.location],
      priorityTopics: scenario.services,
      audiences: ["Dental patients"],
      languages: ["en"],
      localSeo: true,
      servicePages: true,
      locationPages: false,
      blog: false,
    },
    pages: [{
      id: "home",
      path: "/",
      name: "Home",
      sections: [
        section("global-navbar", "navbar", "background", { brandName: scenario.name }),
        section("hero", "hero", "background", {
          eyebrow: `Dental care in ${scenario.location}`,
          heading: scenario.focus,
          body: `Explore ${scenario.services.join(", ").toLowerCase()} with a clear path to contact the clinic.`,
          primaryAction,
        }),
        section("treatments", "services", "surface", {
          heading: "Dental treatments",
          items: scenario.services.map((title) => ({ title, description: `Learn what to expect when discussing ${title.toLowerCase()} with the clinic.` })),
        }),
        section("technology", "features", "background", {
          heading: "Care designed around clarity",
          items: [
            { title: "Clear consultation", description: "Understand suitable next steps before deciding on treatment." },
            { title: "Treatment planning", description: "Discuss the sequence, options and follow-up for your care." },
            { title: "Patient communication", description: "Get practical guidance for appointments and after-care." },
          ],
        }),
        section("proof", "testimonials", "surface", {
          heading: "What patients value",
          body: "Use verified patient feedback here once the clinic supplies approved review content.",
        }),
        section("doctor", "team", "background", {
          heading: "Meet the dental team",
          body: "Clinician credentials and biographies are published only after the clinic provides verified details.",
        }),
        section("appointment", "cta", "accent", {
          heading: "Ready to discuss your dental care?",
          body: "Contact the clinic to request an appointment and confirm availability.",
          primaryAction,
        }),
        section("contact", "contact", "surface", {
          heading: "Contact the clinic",
          body: `Request an appointment with ${scenario.name} in ${scenario.location}.`,
          primaryAction: { label: "Call clinic", href: "tel:+914000000000" },
        }),
        section("global-footer", "footer", "background", { brandName: scenario.name }),
      ],
      seo: {
        title: `${scenario.name} | Dental Care in ${scenario.location}`.slice(0, 70),
        description: `${scenario.focus} in ${scenario.location}. Explore dental services and contact the clinic to request an appointment.`.slice(0, 180),
        canonicalPath: "/",
        indexable: true,
        primaryKeyword: `${scenario.services[0]} ${scenario.location}`,
        structuredDataTypes: ["Dentist", "MedicalClinic"],
      },
    }],
    navigation: [{ label: "Home", href: "/" }],
    integrations: [],
    domains: [],
  };

  return siteSchema.parse(site);
}

test("deterministic dental generation benchmark meets release thresholds", async () => {
  const results = scenarios.map((scenario) => {
    const site = buildDentalSite(scenario);
    const structural = validateWebsite(site, "healthcare-clinic");
    const premium = evaluatePremiumQualityGate(site);
    const passed = structural.ready
      && structural.score >= benchmarkMinimum.structuralScore
      && premium.premiumReady
      && premium.score >= benchmarkMinimum.premiumScore;

    return {
      scenario: scenario.id,
      name: scenario.name,
      focus: scenario.focus,
      passed,
      structural: {
        ready: structural.ready,
        score: structural.score,
        errors: structural.errors.map((issue) => issue.code),
        warnings: structural.warnings.map((issue) => issue.code),
      },
      premium: {
        ready: premium.premiumReady,
        score: premium.score,
        blockers: premium.blockers.map((issue) => issue.code),
        warnings: premium.warnings.map((issue) => issue.code),
        metrics: premium.metrics,
      },
    };
  });

  const passed = results.filter((result) => result.passed).length;
  const passRate = passed / results.length;
  const averageStructuralScore = Math.round(results.reduce((sum, result) => sum + result.structural.score, 0) / results.length);
  const averagePremiumScore = Math.round(results.reduce((sum, result) => sum + result.premium.score, 0) / results.length);
  const summary = {
    generatedAt: new Date().toISOString(),
    benchmark: "dental-generation-v1",
    thresholds: benchmarkMinimum,
    scenarios: results.length,
    passed,
    passRate,
    averageStructuralScore,
    averagePremiumScore,
    results,
  };

  const outputDirectory = path.join(process.cwd(), "test-results", "generation-benchmark");
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(path.join(outputDirectory, "report.json"), JSON.stringify(summary, null, 2), "utf8");

  const rows = results.map((result) => `| ${result.scenario} | ${result.passed ? "PASS" : "FAIL"} | ${result.structural.score} | ${result.premium.score} | ${[...result.structural.errors, ...result.premium.blockers].join(", ") || "—"} |`);
  const markdown = [
    "# MiCirql Dental Generation Benchmark",
    "",
    `- Pass rate: **${Math.round(passRate * 100)}%** (${passed}/${results.length})`,
    `- Average structural score: **${averageStructuralScore}**`,
    `- Average premium score: **${averagePremiumScore}**`,
    `- Required pass rate: **${Math.round(benchmarkMinimum.passRate * 100)}%**`,
    "",
    "| Scenario | Result | Structural | Premium | Blocking issues |",
    "| --- | --- | ---: | ---: | --- |",
    ...rows,
    "",
  ].join("\n");
  await writeFile(path.join(outputDirectory, "summary.md"), markdown, "utf8");

  expect(passRate, JSON.stringify(results.filter((result) => !result.passed), null, 2)).toBeGreaterThanOrEqual(benchmarkMinimum.passRate);
  for (const result of results) {
    expect(result.structural.score, `${result.scenario} structural score`).toBeGreaterThanOrEqual(benchmarkMinimum.structuralScore);
    expect(result.premium.score, `${result.scenario} premium score`).toBeGreaterThanOrEqual(benchmarkMinimum.premiumScore);
  }
});
