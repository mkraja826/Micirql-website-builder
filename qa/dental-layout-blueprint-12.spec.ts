import { expect, test } from "@playwright/test";
import { SCHEMA_VERSION, siteSchema, type Site } from "@micirql/schema";
import { sectionDesignId, type SectionFamily } from "@micirql/sections";
import { INDUSTRY_DESIGN_PRESETS } from "../apps/builder/app/industry-design-preset-data";
import { runDentalBlueprintCertification } from "./dental-blueprint-qa";

const LAYOUT_ID = "dental-12-wellness-calm";

function section(id: string, family: SectionFamily, theme: Site["theme"]["family"], props: Record<string, unknown>) {
  return { id, component: { componentId: sectionDesignId(theme, family, 1), version: "1.0.0" }, props, bindings: {}, hidden: false };
}

function sourceSite(): Site {
  const preset = INDUSTRY_DESIGN_PRESETS.find((item) => item.id === "dental-clinic");
  if (!preset) throw new Error("Dental design preset is missing.");
  const theme = structuredClone(preset.theme);
  theme.brand.colors = {
    ...theme.brand.colors,
    primary: "#6f816f",
    secondary: "#2f3d35",
    accent: "#a2b58f",
    background: "#fcfbf6",
    surface: "#f1f3eb",
    textPrimary: "#2f3d35",
    textSecondary: "#6f786f",
    border: "#d6ddd2",
  };
  theme.brand.typography = { ...theme.brand.typography, display: "Georgia", body: "Inter", ui: "Inter" };
  theme.brand.density = "spacious";
  theme.brand.shape = "soft";
  theme.brand.motion = "subtle";
  const family = theme.family;

  const sections = [
    section("nav", "navbar", family, {
      title: "Meadow Dental Studio",
      description: "Calm general and cosmetic dentistry · Hyderabad",
      items: [{ title: "Care", href: "#services" }, { title: "Dentist", href: "#doctor" }, { title: "Experience", href: "#proof" }, { title: "Contact", href: "#contact" }],
      primaryAction: { label: "Book a visit", href: "#contact" },
    }),
    section("hero", "hero", family, {
      eyebrow: "Dental care with more room to feel at ease",
      title: "A calmer way to understand your dental care",
      description: "Meet the team, explore common treatment needs and request an appointment in a setting designed around clear explanations, thoughtful pacing and practical reassurance.",
      image: { src: "https://images.unsplash.com/photo-1606811971618-4486d14f3f99?auto=format&fit=crop&w=1500&q=80", alt: "Dentist speaking calmly with a patient" },
      primaryAction: { label: "Request an appointment", href: "#contact" },
      secondaryAction: { label: "Explore care", href: "#services" },
    }),
    section("trust", "testimonials", family, {
      eyebrow: "A more reassuring visit",
      title: "Small practical details can make dental care easier to approach",
      description: "Keep the most useful reassurance visible before asking patients to read detailed treatment information.",
      items: [
        { title: "Clear explanations", description: "Understand why a treatment may be suggested before deciding what to do." },
        { title: "Unhurried planning", description: "Use the consultation to ask questions and review the next step." },
        { title: "Verified clinicians", description: "Publish only professional details supplied and confirmed by the practice." },
        { title: "Simple follow-up", description: "Know who to contact if practical questions come up after a visit." },
      ],
    }),
    section("services", "services", family, {
      eyebrow: "Care",
      title: "Everyday dentistry presented without a crowded treatment menu",
      description: "Start with the dental concern that matters to you. The clinician can then explain the options that may be appropriate after assessment.",
      items: [
        { title: "Dental check-ups", description: "Routine assessment, preventive guidance and review of current concerns." },
        { title: "Restorative care", description: "Discuss fillings, crowns and other options for teeth affected by damage or wear." },
        { title: "Gum care", description: "Assessment and ongoing support for periodontal health." },
        { title: "Root canal care", description: "Clinical assessment and treatment planning for pulpal or root concerns." },
        { title: "Cosmetic consultation", description: "Review aesthetic goals alongside oral health, function and realistic outcomes." },
        { title: "Replacement options", description: "Discuss suitable approaches when one or more teeth are missing." },
      ],
    }),
    section("doctor", "team", family, {
      eyebrow: "Your dentist",
      title: "A calm experience still depends on clear clinical responsibility",
      description: "Use verified names, qualifications, registration details and clinical focus supplied by the practice.",
      items: [
        { title: "Lead Dentist", description: "Add verified professional details, experience and treatment focus supplied by the clinic.", image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=1000&q=80" },
        { title: "Treatment philosophy", description: "Explain how the clinician approaches diagnosis, communication and planning." },
        { title: "Patient support", description: "Keep practical appointment and follow-up help easy to find." },
      ],
    }),
    section("proof", "testimonials", family, {
      eyebrow: "Patient perspective",
      title: "Reassurance is most credible when feedback stays specific",
      description: "The final website should publish only genuine patient feedback supplied or approved by the clinic.",
      items: [{ title: "Verified patient review", description: "The dentist explained each option without rushing me, and I understood what the next appointment was for before I left." }],
    }),
    section("cta", "cta", family, {
      eyebrow: "Ready when you are",
      title: "Start with a conversation about what you need",
      description: "Request an appointment and the clinic can confirm the most suitable type of visit.",
      primaryAction: { label: "Request appointment", href: "#contact" },
      secondaryAction: { label: "Call clinic", href: "tel:+910000000000" },
    }),
    section("contact", "contact", family, {
      eyebrow: "Contact",
      title: "Request an appointment",
      description: "Send the basic details needed for the clinic to respond with suitable options.",
      formAction: "/api/forms/appointment",
      primaryAction: { label: "Send request", href: "#contact-form" },
    }),
    section("footer", "footer", family, {
      title: "Meadow Dental Studio",
      description: "Clear dental care, thoughtful pacing and a simple route to an appointment.",
      items: [{ title: "Care", href: "#services" }, { title: "Dentist", href: "#doctor" }, { title: "Experience", href: "#proof" }, { title: "Contact", href: "#contact" }],
      primaryAction: { label: "Book a visit", href: "#contact" },
    }),
  ];

  return siteSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    siteId: "dental-blueprint-12",
    workspaceId: "dental-blueprint-certification",
    name: "Meadow Dental Studio",
    domain: "clinic",
    subtype: "dental",
    theme,
    seoBlueprint: { primaryGoal: "Book dental appointments", targetLocations: ["Hyderabad"], priorityTopics: ["General dentistry", "Comfortable dental care", "Cosmetic dentistry"], audiences: ["Dental patients"], languages: ["en"], localSeo: true, servicePages: true, locationPages: false, blog: false },
    pages: [{ id: "home", path: "/", name: "Home", sections, seo: { title: "Meadow Dental Studio | Calm Dentistry Hyderabad", description: "Explore clear, comfortable dental care and request an appointment.", canonicalPath: "/", indexable: true, structuredDataTypes: ["Dentist"] } }],
    navigation: [{ label: "Home", href: "/" }],
    integrations: [],
    domains: [],
  });
}

test("Dental 12 Calm Dentistry passes curated responsive safety gates", async ({ page }) => {
  await runDentalBlueprintCertification({
    page,
    layoutId: LAYOUT_ID,
    site: sourceSite(),
    outputName: "dental-layout-blueprint-12",
    profile: {
      industry: "dental clinic",
      subindustry: "general dentistry",
      goals: ["build trust", "book appointment"],
      style_tags: ["calm", "wellness", "natural", "warm"],
      required_capabilities: ["booking", "contact", "team"],
      services: ["dental check-ups", "restorative care", "cosmetic consultation"],
    },
    mobileCheck: async ({ root, width }) => {
      const composition = await root.evaluate((element) => {
        const copy = element.querySelector(".mi-hero--centered .mi-hero__copy") as HTMLElement | null;
        const media = element.querySelector(".mi-hero--centered .mi-section__media") as HTMLElement | null;
        const primary = element.querySelector(".mi-hero--centered .mi-section__action--primary") as HTMLElement | null;
        const actions = element.querySelector(".mi-hero--centered .mi-section__actions") as HTMLElement | null;
        const serviceCards = [...element.querySelectorAll(".mi-services-spotlight .mi-service-item")] as HTMLElement[];
        const teamLead = element.querySelector(".mi-team--featured .mi-team-card--lead") as HTMLElement | null;
        const contact = element.querySelector(".mi-contact-struct--split .mi-contact-split") as HTMLElement | null;
        const contactChildren = contact ? [...contact.children] as HTMLElement[] : [];
        const input = element.querySelector(".mi-contact-form input:not([type='hidden'])") as HTMLElement | null;
        const fixedDecorations = [...element.querySelectorAll("section *")].filter((node) => {
          const style = getComputedStyle(node);
          return style.position === "fixed" && (node as HTMLElement).offsetWidth > 0 && (node as HTMLElement).offsetHeight > 0;
        }).length;
        return {
          copyBeforeMedia: Boolean(copy && media && copy.getBoundingClientRect().top < media.getBoundingClientRect().top),
          primaryWidthRatio: actions && primary ? primary.getBoundingClientRect().width / actions.getBoundingClientRect().width : 0,
          servicesStacked: serviceCards.length < 2 || serviceCards[1]!.getBoundingClientRect().top >= serviceCards[0]!.getBoundingClientRect().bottom - 1,
          teamStacked: Boolean(teamLead && getComputedStyle(teamLead).gridTemplateColumns.split(" ").length <= 1),
          contactStacked: contactChildren.length < 2 || contactChildren[1]!.getBoundingClientRect().top > contactChildren[0]!.getBoundingClientRect().top,
          inputFontSize: input ? parseFloat(getComputedStyle(input).fontSize) : 0,
          fixedDecorations,
        };
      });
      expect(composition.copyBeforeMedia, `${width}px calm hero copy should remain readable before imagery`).toBeTruthy();
      expect(composition.primaryWidthRatio, `${width}px appointment action should be thumb-friendly`).toBeGreaterThan(.82);
      expect(composition.servicesStacked, `${width}px calm treatment cards should stack vertically`).toBeTruthy();
      expect(composition.teamStacked, `${width}px clinician presentation should stack`).toBeTruthy();
      expect(composition.contactStacked, `${width}px contact layout should stack`).toBeTruthy();
      expect(composition.inputFontSize, `${width}px form text should avoid mobile zoom`).toBeGreaterThanOrEqual(16);
      expect(composition.fixedDecorations, `${width}px calm layout should not use fixed decorative elements`).toBe(0);
    },
  });
});
