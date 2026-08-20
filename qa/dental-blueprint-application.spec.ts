import { expect, test } from "@playwright/test";
import { SCHEMA_VERSION, siteSchema, type Site } from "@micirql/schema";
import { composeWebsite } from "../apps/builder/app/composition-intelligence";
import { applyComposition } from "../apps/builder/app/apply-composition";
import { layoutCoverage } from "../apps/builder/app/apply-layout-blueprint";
import { inferGenerationQuality } from "../apps/builder/app/generation-quality-intelligence";
import { planVisualMedia } from "../apps/builder/app/visual-media-intelligence";
import { applyPremiumQualityCorrection } from "../apps/builder/app/premium-quality-correction";
import { harmonizeExplicitBrandColors, mergeAiPlanningAdvice } from "../apps/builder/app/project-brief-guard";

const profile = {
  industry: "dental clinic",
  subindustry: "general dentistry",
  goals: ["book appointments", "build trust"],
  style_tags: ["clean", "professional"],
  required_capabilities: ["booking", "contact"],
  services: ["checkups", "root canal", "crowns"],
};

function section(id: string, family: string, props: Record<string, unknown> = {}) {
  return {
    id,
    component: { componentId: `${family}.planner-v1`, version: "1.0.0" },
    props,
    bindings: {},
    hidden: false,
  };
}

function buildPlannerCompleteDentalSite(): Site {
  return siteSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    siteId: "blueprint-application-dental",
    workspaceId: "blueprint-application-qa",
    name: "Harbor Dental Care",
    domain: "clinic",
    subtype: "dental",
    theme: {
      family: "minimalist",
      modifiers: ["light"],
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
        density: "comfortable",
        shape: "balanced",
        motion: "subtle",
      },
    },
    seoBlueprint: {
      primaryGoal: "Book dental appointments",
      targetLocations: ["Hyderabad"],
      priorityTopics: ["Preventive dentistry", "Root canal treatment", "Crowns"],
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
        section("global-navbar", "navbar", { brandName: "Harbor Dental Care" }),
        section("hero", "hero", { heading: "Complete dental care with a clear next step", body: "Book a consultation for preventive and restorative dental care.", primaryAction: { label: "Book appointment", href: "#contact" } }),
        section("trust", "testimonials", { heading: "Patient confidence", items: [{ title: "Verified care", description: "Approved patient feedback can be shown here." }] }),
        section("services", "services", { heading: "Treatments", items: [{ title: "Preventive dentistry", description: "Routine care and treatment planning." }, { title: "Root canal treatment", description: "Discuss symptoms and suitable next steps." }] }),
        section("doctor", "team", { heading: "Meet the dental team", items: [{ title: "Dental clinician", description: "Verified credentials are added from clinic-provided information." }] }),
        section("technology", "features", { heading: "Clinical planning", items: [{ title: "Clear consultation", description: "Understand treatment options before deciding." }] }),
        section("proof", "testimonials", { heading: "What patients value", items: [{ title: "Clear communication", description: "Use verified review content supplied by the clinic." }] }),
        section("process", "process", { heading: "What happens next", items: [{ title: "Consult", description: "Discuss your concern and suitable next steps." }, { title: "Plan", description: "Review the recommended treatment sequence." }] }),
        section("gallery", "gallery", { heading: "Clinic gallery", items: [{ title: "Clinic", description: "Clinic-provided imagery." }] }),
        section("cta", "cta", { heading: "Ready to discuss your dental care?", primaryAction: { label: "Book appointment", href: "#contact" } }),
        section("contact", "contact", { heading: "Contact the clinic", primaryAction: { label: "Call clinic", href: "tel:+914000000000" } }),
        section("global-footer", "footer", { brandName: "Harbor Dental Care" }),
      ],
      seo: {
        title: "Harbor Dental Care | Hyderabad",
        description: "Dental care in Hyderabad. Explore treatments and request an appointment.",
        canonicalPath: "/",
        indexable: true,
        primaryKeyword: "dentist Hyderabad",
        structuredDataTypes: ["Dentist", "MedicalClinic"],
      },
    }],
    navigation: [{ label: "Home", href: "/" }],
    integrations: [],
    domains: [],
  });
}

test("a selected certified Dental blueprint survives composition and is actually applied", () => {
  const composition = composeWebsite(profile);
  const candidate = composition.layoutCandidate;
  expect(candidate?.layout.id).toBe("dental-01-clinical-authority");
  expect(candidate?.layout.status).toBe("certified");
  if (!candidate) throw new Error("Dental layout candidate was not selected.");

  const source = buildPlannerCompleteDentalSite();
  expect(layoutCoverage(source, candidate.layout).complete, "QA source must begin with complete blueprint coverage").toBe(true);

  const result = applyComposition(source, composition);
  const home = result.pages.find((page) => page.path === "/") ?? result.pages[0];
  const appliedSections = home?.sections ?? [];

  expect(appliedSections.length).toBe(candidate.layout.sections.length);
  expect(appliedSections.map((section) => section.props.layoutSectionId)).toEqual(candidate.layout.sections.map((section) => section.id));
  for (const section of appliedSections) {
    expect(section.props.layoutBlueprintId).toBe(candidate.layout.id);
    expect(section.props.layoutArchetype).toBe(candidate.layout.archetype);
  }
  expect(layoutCoverage(result, candidate.layout).complete).toBe(true);
});

test("the production planner layout remains the single source of truth through composition and media", () => {
  // This profile naturally ranks Clinical Authority. Deliberately lock a different
  // certified layout to prove downstream systems cannot silently reselect it.
  const composition = composeWebsite(profile, {
    selectedLayoutId: "dental-02-implant-luxury",
    selectedLayoutScore: 94,
    selectedLayoutReasons: ["production planner selection"],
  });
  const candidate = composition.layoutCandidate;
  expect(candidate?.layout.id).toBe("dental-02-implant-luxury");
  expect(candidate?.layout.status).toBe("certified");
  expect(candidate?.reasons).toContain("planner-locked rendered-certified layout");
  if (!candidate) throw new Error("Planner-locked Dental layout was not preserved.");

  const expectedContentFamilies = candidate.layout.sections
    .filter((section) => section.family !== "navbar" && section.family !== "footer")
    .map((section) => section.family);
  expect(composition.sections.map((section) => section.family)).toEqual(expectedContentFamilies);

  const quality = inferGenerationQuality(profile, composition);
  const mediaPlan = planVisualMedia(profile, composition, quality);
  expect(mediaPlan.sections.map((section) => section.family)).toEqual(expectedContentFamilies);

  const source = buildPlannerCompleteDentalSite();
  expect(layoutCoverage(source, candidate.layout).complete).toBe(true);
  const result = applyComposition(source, composition, quality);
  const home = result.pages.find((page) => page.path === "/") ?? result.pages[0];
  expect(home?.sections.map((section) => section.props.layoutBlueprintId)).toEqual(candidate.layout.sections.map(() => candidate.layout.id));
  expect(home?.sections.map((section) => section.props.layoutSectionId)).toEqual(candidate.layout.sections.map((section) => section.id));
});

test("AI planning colors cannot replace the curated Dental palette", () => {
  const brief = {
    workspaceId: "palette-qa-workspace",
    siteId: "palette-qa-site",
    businessName: "Harbor Dental Care",
    industry: "dental",
    subindustry: "general dentistry",
    location: "Hyderabad",
    services: ["checkups", "crowns"],
  };
  const advice = mergeAiPlanningAdvice(brief, {
    brandColors: ["#8A3D21", "#D18A4E", "#FFF3E8"],
    goals: ["book appointments"],
  });

  expect(advice.brandPaletteSource).toBe("curated");
  expect(advice.brandColors).toEqual([]);
  expect(advice.suggestedBrandColors).toEqual(["#8A3D21", "#D18A4E", "#FFF3E8"]);

  const explicit = harmonizeExplicitBrandColors(["#0B3A53", "#F2C14E"], "dental");
  expect(explicit.assessment?.decision).not.toBe("decouple");
  expect(explicit.colors.length).toBeGreaterThan(0);
});

test("Clove-like scaffold headings and generic Dental CTA copy are repaired before premium acceptance", () => {
  const source = buildPlannerCompleteDentalSite();
  const home = source.pages.find((page) => page.path === "/") ?? source.pages[0];
  if (!home) throw new Error("Dental QA home page missing.");

  const hero = home.sections.find((item) => item.id === "hero");
  const services = home.sections.find((item) => item.id === "services");
  const technology = home.sections.find((item) => item.id === "technology");
  const cta = home.sections.find((item) => item.id === "cta");
  if (!hero || !services || !technology || !cta) throw new Error("Dental QA fixture is incomplete.");

  hero.props = { ...hero.props, heading: "Harbor Dental Care: ALL DENTAL RELATED TREATMENTS in Hyderabad", primaryAction: { label: "Get started", href: "#contact" } };
  services.props = { ...services.props, heading: "Home" };
  technology.props = { ...technology.props, heading: "What matters about home" };
  cta.props = { ...cta.props, heading: "Ready to discuss home?" };

  const result = applyPremiumQualityCorrection(source);
  const repairedHome = result.site.pages.find((page) => page.path === "/") ?? result.site.pages[0];
  if (!repairedHome) throw new Error("Repaired Dental home page missing.");

  const repairedHero = repairedHome.sections.find((item) => item.id === "hero");
  const repairedServices = repairedHome.sections.find((item) => item.id === "services");
  const repairedTechnology = repairedHome.sections.find((item) => item.id === "technology");
  const repairedCta = repairedHome.sections.find((item) => item.id === "cta");

  expect(repairedHero?.props.heading).toBe("Dental care in Hyderabad");
  expect((repairedHero?.props.primaryAction as { label?: string } | undefined)?.label).toBe("Book an appointment");
  expect(repairedServices?.props.heading).toBe("Dental treatments and services");
  expect(repairedTechnology?.props.heading).toBe("What to expect from your dental care");
  expect(repairedCta?.props.heading).toBe("Ready to discuss your dental care?");
  expect(result.firstBuild.issues.filter((issue) => issue.code === "SCAFFOLD_COPY")).toHaveLength(0);
});
