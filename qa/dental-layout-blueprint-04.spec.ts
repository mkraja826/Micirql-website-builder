import { expect, test } from "@playwright/test";
import { SCHEMA_VERSION, siteSchema, type Site } from "@micirql/schema";
import { sectionDesignId, type SectionFamily } from "@micirql/sections";
import { INDUSTRY_DESIGN_PRESETS } from "../apps/builder/app/industry-design-preset-data";
import { runDentalBlueprintCertification } from "./dental-blueprint-qa";

const LAYOUT_ID = "dental-04-family-care";

function section(id: string, family: SectionFamily, theme: Site["theme"]["family"], props: Record<string, unknown>) {
  return { id, component: { componentId: sectionDesignId(theme, family, 1), version: "1.0.0" }, props, bindings: {}, hidden: false };
}

function sourceSite(): Site {
  const preset = INDUSTRY_DESIGN_PRESETS.find((item) => item.id === "dental-clinic");
  if (!preset) throw new Error("Dental design preset is missing.");
  const theme = structuredClone(preset.theme);
  theme.brand.colors = {
    ...theme.brand.colors,
    primary: "#167b87",
    secondary: "#224a52",
    accent: "#4da98b",
    background: "#fbfffd",
    surface: "#eef8f6",
    textPrimary: "#19343a",
    textSecondary: "#64797d",
    border: "#d1e4e1",
  };
  theme.brand.typography = { ...theme.brand.typography, display: "Inter", body: "Inter", ui: "Inter" };
  theme.brand.density = "comfortable";
  theme.brand.shape = "soft";
  const family = theme.family;

  const sections = [
    section("nav", "navbar", family, {
      title: "Greenleaf Family Dental",
      description: "Comfortable everyday dentistry · Hyderabad",
      items: [{ title: "Treatments", href: "#services" }, { title: "Your visit", href: "#process" }, { title: "Team", href: "#doctor" }, { title: "Contact", href: "#contact" }],
      primaryAction: { label: "Book appointment", href: "#contact" },
    }),
    section("hero", "hero", family, {
      eyebrow: "Dental care that feels easier to navigate",
      title: "A welcoming clinic for everyday dental decisions",
      description: "From routine check-ups to restorative care, understand what happens next and request an appointment without digging through a complicated website.",
      image: { src: "https://images.unsplash.com/photo-1606811971618-4486d14f3f99?auto=format&fit=crop&w=1500&q=80", alt: "Dentist speaking with a patient in a bright clinic" },
      primaryAction: { label: "Book an appointment", href: "#contact" },
      secondaryAction: { label: "See treatments", href: "#services" },
    }),
    section("trust", "testimonials", family, {
      eyebrow: "Simple, reassuring care",
      title: "The practical things patients want to know first",
      description: "Keep access, planning and communication easy to scan before asking patients to read detailed treatment information.",
      items: [
        { title: "Clear next steps", description: "Know what happens after you request an appointment." },
        { title: "Broad dental care", description: "Explore common preventive and restorative treatment areas." },
        { title: "Easy contact", description: "Reach the clinic without searching through multiple pages." },
        { title: "Patient-friendly planning", description: "Discuss options before deciding how to proceed." },
      ],
    }),
    section("services", "services", family, {
      eyebrow: "Treatments",
      title: "Useful care for the dental needs that come up most often",
      description: "Start with the concern that brought you in. The clinical team can then explain the treatment choices that may be relevant.",
      items: [
        { title: "Dental check-ups", description: "Routine assessment and preventive guidance based on the findings at your visit." },
        { title: "Fillings and restorations", description: "Discuss options for repairing teeth affected by decay, wear or minor damage." },
        { title: "Crowns and bridges", description: "Review restorative options when a tooth needs additional support or replacement." },
        { title: "Root canal care", description: "Assessment and treatment planning for teeth affected by pulpal or root concerns." },
        { title: "Gum care", description: "Evaluation and ongoing support for periodontal health." },
        { title: "Smile and alignment options", description: "Understand cosmetic or alignment choices only after clinical suitability is reviewed." },
      ],
    }),
    section("process", "process", family, {
      eyebrow: "Your visit",
      title: "A straightforward path from enquiry to a plan",
      description: "The website should reduce uncertainty before patients arrive at the clinic.",
      items: [
        { title: "Request a time", description: "Share the reason for your visit and your preferred contact details." },
        { title: "Meet the dental team", description: "Discuss the concern, relevant findings and the options that may suit your needs." },
        { title: "Understand the next step", description: "Review the proposed sequence before deciding how you want to proceed." },
      ],
    }),
    section("doctor", "team", family, {
      eyebrow: "Your dental team",
      title: "Friendly access backed by verified clinical information",
      description: "Publish doctor names, qualifications and focus areas only after the clinic provides verified details.",
      items: [
        { title: "Lead Dentist", description: "Add verified qualifications, experience and treatment interests supplied by the clinic.", image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=1000&q=80" },
        { title: "Clinical support", description: "Supports chairside care, preparation and follow-up guidance." },
        { title: "Patient desk", description: "Helps with appointments, directions and practical questions." },
      ],
    }),
    section("proof", "testimonials", family, {
      eyebrow: "Patient experience",
      title: "Real feedback should sound like real people",
      description: "The published site should only use genuine reviews supplied or approved by the practice.",
      items: [{ title: "Verified patient review", description: "The appointment process was clear, and I knew what the dentist wanted to discuss before deciding on the next treatment step." }],
    }),
    section("cta", "cta", family, {
      eyebrow: "Need an appointment?",
      title: "Tell the clinic what you need help with",
      description: "Request an appointment and the clinic can confirm timing and the most suitable type of visit.",
      primaryAction: { label: "Request appointment", href: "#contact" },
      secondaryAction: { label: "Call the clinic", href: "tel:+910000000000" },
    }),
    section("contact", "contact", family, {
      eyebrow: "Contact",
      title: "Request an appointment",
      description: "Send your preferred details and the clinic can respond directly with available options.",
      formAction: "/api/forms/appointment",
      primaryAction: { label: "Send request", href: "#contact-form" },
    }),
    section("footer", "footer", family, {
      title: "Greenleaf Family Dental",
      description: "Clear everyday dental information and a simple route to an appointment.",
      items: [{ title: "Treatments", href: "#services" }, { title: "Your visit", href: "#process" }, { title: "Team", href: "#doctor" }, { title: "Contact", href: "#contact" }],
      primaryAction: { label: "Book appointment", href: "#contact" },
    }),
  ];

  return siteSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    siteId: "dental-blueprint-04",
    workspaceId: "dental-blueprint-certification",
    name: "Greenleaf Family Dental",
    domain: "clinic",
    subtype: "dental",
    theme,
    seoBlueprint: { primaryGoal: "Book dental appointments", targetLocations: ["Hyderabad"], priorityTopics: ["General dentistry", "Preventive care", "Restorative dentistry"], audiences: ["Dental patients"], languages: ["en"], localSeo: true, servicePages: true, locationPages: false, blog: false },
    pages: [{ id: "home", path: "/", name: "Home", sections, seo: { title: "Greenleaf Family Dental | Hyderabad Dentist", description: "Explore everyday dental care and request an appointment.", canonicalPath: "/", indexable: true, structuredDataTypes: ["Dentist"] } }],
    navigation: [{ label: "Home", href: "/" }],
    integrations: [],
    domains: [],
  });
}

test("Dental 04 Family Care passes curated responsive safety gates", async ({ page }) => {
  await runDentalBlueprintCertification({
    page,
    layoutId: LAYOUT_ID,
    site: sourceSite(),
    outputName: "dental-layout-blueprint-04",
    profile: {
      industry: "dental clinic",
      subindustry: "general dentistry",
      goals: ["book appointment", "build trust"],
      style_tags: ["family", "friendly", "approachable", "bright"],
      required_capabilities: ["booking", "contact", "team"],
      services: ["check-ups", "restorative dentistry", "gum care"],
    },
    mobileCheck: async ({ root, width }) => {
      const composition = await root.evaluate((element) => {
        const copy = element.querySelector(".mi-hero--media-first .mi-hero__copy") as HTMLElement | null;
        const media = element.querySelector(".mi-hero--media-first .mi-section__media") as HTMLElement | null;
        const actions = element.querySelector(".mi-hero--media-first .mi-section__actions") as HTMLElement | null;
        const primary = element.querySelector(".mi-hero--media-first .mi-section__action--primary") as HTMLElement | null;
        const serviceCards = [...element.querySelectorAll(".mi-services-spotlight .mi-service-item")] as HTMLElement[];
        const processNodes = [...element.querySelectorAll(".mi-process--timeline .mi-process-node")] as HTMLElement[];
        return {
          copyBeforeMedia: Boolean(copy && media && copy.getBoundingClientRect().top < media.getBoundingClientRect().top),
          primaryWidthRatio: actions && primary ? primary.getBoundingClientRect().width / actions.getBoundingClientRect().width : 0,
          servicesStacked: serviceCards.length < 2 || serviceCards[1]!.getBoundingClientRect().top >= serviceCards[0]!.getBoundingClientRect().bottom - 1,
          processVertical: processNodes.length < 2 || processNodes[1]!.getBoundingClientRect().top > processNodes[0]!.getBoundingClientRect().top,
        };
      });
      expect(composition.copyBeforeMedia, `${width}px booking copy must lead the hero`).toBeTruthy();
      expect(composition.primaryWidthRatio, `${width}px primary appointment action should be thumb-friendly`).toBeGreaterThan(.82);
      expect(composition.servicesStacked, `${width}px services should stack without a sideways rail`).toBeTruthy();
      expect(composition.processVertical, `${width}px visit journey should read vertically`).toBeTruthy();
    },
  });
});
