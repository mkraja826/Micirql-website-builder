import { expect, test } from "@playwright/test";
import { SCHEMA_VERSION, siteSchema, type Site } from "@micirql/schema";
import { sectionDesignId, type SectionFamily } from "@micirql/sections";
import { INDUSTRY_DESIGN_PRESETS } from "../apps/builder/app/industry-design-preset-data";
import { runDentalBlueprintCertification } from "./dental-blueprint-qa";

const LAYOUT_ID = "dental-09-ortho-journey";

function section(id: string, family: SectionFamily, theme: Site["theme"]["family"], props: Record<string, unknown>) {
  return { id, component: { componentId: sectionDesignId(theme, family, 1), version: "1.0.0" }, props, bindings: {}, hidden: false };
}

function sourceSite(): Site {
  const preset = INDUSTRY_DESIGN_PRESETS.find((item) => item.id === "dental-clinic");
  if (!preset) throw new Error("Dental design preset is missing.");
  const theme = structuredClone(preset.theme);
  theme.brand.colors = {
    ...theme.brand.colors,
    primary: "#267f91",
    secondary: "#17343b",
    accent: "#62b79a",
    background: "#fbfefe",
    surface: "#edf7f9",
    textPrimary: "#18363d",
    textSecondary: "#647a80",
    border: "#cfe2e6",
  };
  theme.brand.typography = { ...theme.brand.typography, display: "Inter", body: "Inter", ui: "Inter" };
  theme.brand.density = "comfortable";
  theme.brand.shape = "soft";
  theme.brand.motion = "subtle";
  const family = theme.family;

  const sections = [
    section("nav", "navbar", family, {
      title: "Arc Orthodontics",
      description: "Braces and aligner consultations · Hyderabad",
      items: [{ title: "Treatment options", href: "#services" }, { title: "Your journey", href: "#process" }, { title: "Technology", href: "#technology" }, { title: "Contact", href: "#contact" }],
      primaryAction: { label: "Book consultation", href: "#contact" },
    }),
    section("hero", "hero", family, {
      eyebrow: "Orthodontic treatment made easier to understand",
      title: "Choose an alignment plan with a clear view of the journey ahead",
      description: "Compare common orthodontic options, understand how assessment and monitoring fit together, and request a consultation without having to decode technical language first.",
      image: { src: "https://images.unsplash.com/photo-1606811971618-4486d14f3f99?auto=format&fit=crop&w=1500&q=80", alt: "Orthodontic consultation in a bright dental clinic" },
      primaryAction: { label: "Book orthodontic consultation", href: "#contact" },
      secondaryAction: { label: "Compare treatment options", href: "#services" },
    }),
    section("services", "services", family, {
      eyebrow: "Treatment options",
      title: "Start with the option you want to understand better",
      description: "Suitability depends on clinical assessment. The website should help patients compare the purpose of each option before the consultation.",
      items: [
        { title: "Clear aligners", description: "Explore removable alignment treatment and the monitoring required during care." },
        { title: "Fixed braces", description: "Understand how bracket-based treatment may be used to guide tooth movement." },
        { title: "Teen orthodontics", description: "Discuss timing, growth and practical treatment considerations for younger patients." },
        { title: "Adult orthodontics", description: "Review alignment goals alongside restorative, gum and long-term oral-health needs." },
        { title: "Retention", description: "Understand why retention planning is part of maintaining an orthodontic result." },
        { title: "Complex alignment planning", description: "Coordinate more involved movement with other dental treatment when required." },
      ],
    }),
    section("process", "process", family, {
      eyebrow: "Your orthodontic journey",
      title: "A treatment sequence patients can understand before they start",
      description: "Keep the journey visible and sequential so the experience feels planned rather than open-ended.",
      items: [
        { title: "Consultation", description: "Discuss your goals, concerns and relevant dental history." },
        { title: "Assessment and records", description: "Complete the clinical assessment and any appropriate scans, images or records." },
        { title: "Review the plan", description: "Understand the recommended option, expected sequence and practical commitments." },
        { title: "Active treatment", description: "Begin treatment with scheduled monitoring and clear communication about progress." },
        { title: "Retention", description: "Move into the retention phase with instructions for protecting the result." },
      ],
    }),
    section("technology", "features", family, {
      eyebrow: "Digital assessment",
      title: "Scanning should make the plan easier to discuss, not harder to understand",
      description: "Only describe systems genuinely used by the clinic, and connect every technology claim to a practical patient benefit.",
      items: [
        { title: "Digital records", description: "Use appropriate records to support assessment and treatment planning." },
        { title: "Visual planning", description: "Help patients discuss movement goals and treatment sequence with the orthodontic team." },
        { title: "Progress monitoring", description: "Explain how reviews are used to monitor treatment and make clinical decisions." },
      ],
    }),
    section("doctor", "team", family, {
      eyebrow: "Your orthodontic team",
      title: "Know who is guiding the treatment plan",
      description: "Publish verified qualifications, experience and professional details supplied by the clinic.",
      items: [
        { title: "Orthodontic Clinician", description: "Add verified qualifications, registration and orthodontic experience supplied by the practice.", image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=1000&q=80" },
        { title: "Treatment coordinator", description: "Supports scheduling and practical questions during the treatment journey." },
        { title: "Clinical support", description: "Helps with records, appointments and follow-up instructions." },
      ],
    }),
    section("proof", "testimonials", family, {
      eyebrow: "Patient perspective",
      title: "Useful reviews explain the experience, not just the outcome",
      description: "The live site should publish only genuine, approved patient feedback.",
      items: [{ title: "Verified orthodontic review", description: "I understood the stages before starting, and each review appointment made it clear what we were checking next." }],
    }),
    section("cta", "cta", family, {
      eyebrow: "Ready to compare your options?",
      title: "Start with an orthodontic consultation",
      description: "The clinic can assess suitability and explain the treatment pathways that may fit your needs.",
      primaryAction: { label: "Request consultation", href: "#contact" },
      secondaryAction: { label: "See treatment options", href: "#services" },
    }),
    section("contact", "contact", family, {
      eyebrow: "Contact",
      title: "Request an orthodontic consultation",
      description: "Send your preferred contact details and the clinic can confirm available appointment options.",
      formAction: "/api/forms/appointment",
      primaryAction: { label: "Send request", href: "#contact-form" },
    }),
    section("footer", "footer", family, {
      title: "Arc Orthodontics",
      description: "Clear orthodontic options, a visible treatment journey and an easy route to consultation.",
      items: [{ title: "Treatment options", href: "#services" }, { title: "Your journey", href: "#process" }, { title: "Technology", href: "#technology" }, { title: "Contact", href: "#contact" }],
      primaryAction: { label: "Book consultation", href: "#contact" },
    }),
  ];

  return siteSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    siteId: "dental-blueprint-09",
    workspaceId: "dental-blueprint-certification",
    name: "Arc Orthodontics",
    domain: "clinic",
    subtype: "dental",
    theme,
    seoBlueprint: { primaryGoal: "Book orthodontic consultations", targetLocations: ["Hyderabad"], priorityTopics: ["Orthodontics", "Clear aligners", "Braces"], audiences: ["Orthodontic patients"], languages: ["en"], localSeo: true, servicePages: true, locationPages: false, blog: false },
    pages: [{ id: "home", path: "/", name: "Home", sections, seo: { title: "Arc Orthodontics | Braces & Aligners Hyderabad", description: "Compare orthodontic options and request a consultation.", canonicalPath: "/", indexable: true, structuredDataTypes: ["Dentist"] } }],
    navigation: [{ label: "Home", href: "/" }],
    integrations: [],
    domains: [],
  });
}

test("Dental 09 Ortho Journey passes curated responsive safety gates", async ({ page }) => {
  await runDentalBlueprintCertification({
    page,
    layoutId: LAYOUT_ID,
    site: sourceSite(),
    outputName: "dental-layout-blueprint-09",
    profile: {
      industry: "dental clinic",
      subindustry: "orthodontics",
      goals: ["consultation", "explain treatment journey"],
      style_tags: ["orthodontics", "friendly", "journey", "modern"],
      required_capabilities: ["booking", "contact", "treatment comparison"],
      services: ["clear aligners", "fixed braces", "retention"],
    },
    mobileCheck: async ({ root, width }) => {
      const composition = await root.evaluate((element) => {
        const heroActions = element.querySelector(".mi-hero--centered .mi-section__actions") as HTMLElement | null;
        const heroPrimary = element.querySelector(".mi-hero--centered .mi-section__action--primary") as HTMLElement | null;
        const heroMedia = element.querySelector(".mi-hero--centered .mi-section__media") as HTMLElement | null;
        const serviceCards = [...element.querySelectorAll(".mi-services-spotlight .mi-service-item")] as HTMLElement[];
        const processNodes = [...element.querySelectorAll(".mi-process--timeline .mi-process-node")] as HTMLElement[];
        const featureItems = [...element.querySelectorAll(".mi-features--split .mi-feature-item--list")] as HTMLElement[];
        return {
          primaryBeforeMedia: Boolean(heroPrimary && heroMedia && heroPrimary.getBoundingClientRect().bottom < heroMedia.getBoundingClientRect().top),
          primaryWidthRatio: heroActions && heroPrimary ? heroPrimary.getBoundingClientRect().width / heroActions.getBoundingClientRect().width : 0,
          servicesStacked: serviceCards.length < 2 || serviceCards[1]!.getBoundingClientRect().top >= serviceCards[0]!.getBoundingClientRect().bottom - 1,
          processVertical: processNodes.length < 2 || processNodes[1]!.getBoundingClientRect().top > processNodes[0]!.getBoundingClientRect().top,
          technologyVertical: featureItems.length < 2 || featureItems[1]!.getBoundingClientRect().top > featureItems[0]!.getBoundingClientRect().top,
        };
      });
      expect(composition.primaryBeforeMedia, `${width}px consultation CTA should lead supporting imagery`).toBeTruthy();
      expect(composition.primaryWidthRatio, `${width}px consultation CTA should be thumb-friendly`).toBeGreaterThan(.82);
      expect(composition.servicesStacked, `${width}px orthodontic choices should stack vertically`).toBeTruthy();
      expect(composition.processVertical, `${width}px orthodontic journey should read vertically`).toBeTruthy();
      expect(composition.technologyVertical, `${width}px digital assessment details should remain vertical`).toBeTruthy();
    },
  });
});
