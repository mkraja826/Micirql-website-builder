import { expect, test } from "@playwright/test";
import { SCHEMA_VERSION, siteSchema, type Site } from "@micirql/schema";
import { sectionDesignId, type SectionFamily } from "@micirql/sections";
import { INDUSTRY_DESIGN_PRESETS } from "../apps/builder/app/industry-design-preset-data";
import { runDentalBlueprintCertification } from "./dental-blueprint-qa";

const LAYOUT_ID = "dental-07-conversion-engine";

function section(id: string, family: SectionFamily, theme: Site["theme"]["family"], props: Record<string, unknown>) {
  return { id, component: { componentId: sectionDesignId(theme, family, 1), version: "1.0.0" }, props, bindings: {}, hidden: false };
}

function sourceSite(): Site {
  const preset = INDUSTRY_DESIGN_PRESETS.find((item) => item.id === "dental-clinic");
  if (!preset) throw new Error("Dental design preset is missing.");
  const theme = structuredClone(preset.theme);
  theme.brand.colors = {
    ...theme.brand.colors,
    primary: "#147c88",
    secondary: "#163842",
    accent: "#43a98e",
    background: "#fbfefe",
    surface: "#edf7f7",
    textPrimary: "#15343c",
    textSecondary: "#61777c",
    border: "#cfe2e4",
  };
  theme.brand.typography = { ...theme.brand.typography, display: "Inter", body: "Inter", ui: "Inter" };
  theme.brand.density = "compact";
  theme.brand.shape = "balanced";
  theme.brand.motion = "subtle";
  const family = theme.family;

  const sections = [
    section("nav", "navbar", family, {
      title: "Northline Dental",
      description: "Appointments and consultations · Hyderabad",
      items: [{ title: "Treatments", href: "#services" }, { title: "Reviews", href: "#proof" }, { title: "Doctor", href: "#doctor" }, { title: "Contact", href: "#contact" }],
      primaryAction: { label: "Book appointment", href: "#contact" },
    }),
    section("hero", "hero", family, {
      eyebrow: "Appointments available",
      title: "Get clear answers about your dental treatment before deciding what comes next",
      description: "Tell us what you need help with, review the relevant treatment options and request a consultation without navigating a complicated clinic website.",
      image: { src: "https://images.unsplash.com/photo-1606811971618-4486d14f3f99?auto=format&fit=crop&w=1500&q=80", alt: "Dental consultation in a modern clinic" },
      primaryAction: { label: "Request appointment", href: "#contact" },
      secondaryAction: { label: "Call clinic", href: "tel:+910000000000" },
    }),
    section("trust", "testimonials", family, {
      eyebrow: "Why patients contact us",
      title: "The information that matters before you book",
      description: "Keep practical reassurance visible before detailed treatment content.",
      items: [
        { title: "Clear options", description: "Understand the possible next steps before treatment begins." },
        { title: "Direct booking", description: "Request a consultation without unnecessary account creation." },
        { title: "Verified clinicians", description: "Publish only credentials supplied and confirmed by the clinic." },
        { title: "Useful follow-up", description: "Know who to contact when practical questions come up." },
      ],
    }),
    section("services", "services", family, {
      eyebrow: "Common reasons to visit",
      title: "Find the treatment area closest to your concern",
      description: "The consultation determines what is appropriate; the website simply helps patients reach the right conversation faster.",
      items: [
        { title: "Dental implants", description: "Consultation-led replacement planning for missing teeth." },
        { title: "Root canal care", description: "Assessment for teeth affected by pulpal or root concerns." },
        { title: "Crowns and bridges", description: "Restorative options for damaged or missing teeth." },
        { title: "Gum care", description: "Evaluation and ongoing periodontal support." },
        { title: "Cosmetic consultation", description: "Review aesthetic goals alongside oral health and function." },
        { title: "Routine dentistry", description: "Check-ups, preventive care and common restorative needs." },
      ],
    }),
    section("proof", "testimonials", family, {
      eyebrow: "Patient experience",
      title: "Specific feedback is more useful than generic praise",
      description: "Only genuine reviews supplied or approved by the clinic belong on the published website.",
      items: [{ title: "Verified patient review", description: "I knew what the consultation was for, what my options were and what I needed to decide next." }],
    }),
    section("process", "process", family, {
      eyebrow: "What happens next",
      title: "A short route from enquiry to a clear treatment decision",
      description: "Conversion should reduce uncertainty, not pressure patients into choosing treatment too early.",
      items: [
        { title: "Tell us the concern", description: "Share the reason for your visit and preferred contact details." },
        { title: "Attend the consultation", description: "Review findings and treatment options with the clinician." },
        { title: "Choose the next step", description: "Proceed only after the proposed plan is understood." },
      ],
    }),
    section("doctor", "team", family, {
      eyebrow: "Clinical team",
      title: "Know who is responsible for your treatment decisions",
      description: "Use verified clinician details and keep supporting-team information concise.",
      items: [
        { title: "Lead Dentist", description: "Add verified qualifications, registrations and treatment focus supplied by the clinic.", image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=1000&q=80" },
        { title: "Clinical support", description: "Supports treatment preparation and follow-up guidance." },
        { title: "Patient desk", description: "Helps with appointment availability and practical questions." },
      ],
    }),
    section("cta", "cta", family, {
      eyebrow: "Ready for the next step?",
      title: "Request a consultation and let the clinic confirm the right appointment type",
      description: "You do not need to diagnose the problem yourself before getting in touch.",
      primaryAction: { label: "Request appointment", href: "#contact" },
      secondaryAction: { label: "Call clinic", href: "tel:+910000000000" },
    }),
    section("contact", "contact", family, {
      eyebrow: "Contact",
      title: "Tell us how the clinic should reach you",
      description: "Send the basic details needed to respond with suitable appointment options.",
      formAction: "/api/forms/appointment",
      primaryAction: { label: "Send request", href: "#contact-form" },
    }),
    section("footer", "footer", family, {
      title: "Northline Dental",
      description: "Need an appointment? Start with a clear consultation request.",
      items: [{ title: "Treatments", href: "#services" }, { title: "Reviews", href: "#proof" }, { title: "Doctor", href: "#doctor" }, { title: "Contact", href: "#contact" }],
      primaryAction: { label: "Book appointment", href: "#contact" },
    }),
  ];

  return siteSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    siteId: "dental-blueprint-07",
    workspaceId: "dental-blueprint-certification",
    name: "Northline Dental",
    domain: "clinic",
    subtype: "dental",
    theme,
    seoBlueprint: { primaryGoal: "Book dental consultations", targetLocations: ["Hyderabad"], priorityTopics: ["Dental consultations", "Dental implants", "General dentistry"], audiences: ["Dental patients"], languages: ["en"], localSeo: true, servicePages: true, locationPages: false, blog: false },
    pages: [{ id: "home", path: "/", name: "Home", sections, seo: { title: "Northline Dental | Dental Appointments Hyderabad", description: "Explore dental treatment areas and request a consultation.", canonicalPath: "/", indexable: true, structuredDataTypes: ["Dentist"] } }],
    navigation: [{ label: "Home", href: "/" }],
    integrations: [],
    domains: [],
  });
}

test("Dental 07 Consultation Engine passes curated responsive safety gates", async ({ page }) => {
  await runDentalBlueprintCertification({
    page,
    layoutId: LAYOUT_ID,
    site: sourceSite(),
    outputName: "dental-layout-blueprint-07",
    profile: {
      industry: "dental clinic",
      subindustry: "general dentistry",
      goals: ["book appointment", "consultation"],
      style_tags: ["conversion", "lead-generation", "direct", "trust"],
      required_capabilities: ["booking", "contact", "reviews"],
      services: ["dental implants", "root canal care", "routine dentistry"],
    },
    mobileCheck: async ({ root, width }) => {
      const composition = await root.evaluate((element) => {
        const hero = element.querySelector(".mi-hero--centered") as HTMLElement | null;
        const primary = element.querySelector(".mi-hero--centered .mi-section__action--primary") as HTMLElement | null;
        const media = element.querySelector(".mi-hero--centered .mi-section__media") as HTMLElement | null;
        const trust = element.querySelector(".mi-proof--metrics") as HTMLElement | null;
        const services = element.querySelector(".mi-services--spotlight") as HTMLElement | null;
        const serviceCards = [...element.querySelectorAll(".mi-services--spotlight .mi-service-item")] as HTMLElement[];
        const processNodes = [...element.querySelectorAll(".mi-process--timeline .mi-process-node")] as HTMLElement[];
        const actions = element.querySelector(".mi-hero--centered .mi-section__actions") as HTMLElement | null;
        return {
          primaryBeforeMedia: Boolean(primary && media && primary.getBoundingClientRect().bottom < media.getBoundingClientRect().top),
          primaryWidthRatio: actions && primary ? primary.getBoundingClientRect().width / actions.getBoundingClientRect().width : 0,
          proofBeforeServices: Boolean(trust && services && trust.getBoundingClientRect().top < services.getBoundingClientRect().top),
          heroCompact: Boolean(hero && primary && primary.getBoundingClientRect().bottom - hero.getBoundingClientRect().top < 620),
          servicesStacked: serviceCards.length < 2 || serviceCards[1]!.getBoundingClientRect().top >= serviceCards[0]!.getBoundingClientRect().bottom - 1,
          processVertical: processNodes.length < 2 || processNodes[1]!.getBoundingClientRect().top > processNodes[0]!.getBoundingClientRect().top,
        };
      });
      expect(composition.primaryBeforeMedia, `${width}px appointment CTA must appear before supporting hero media`).toBeTruthy();
      expect(composition.primaryWidthRatio, `${width}px appointment CTA should use most of the available width`).toBeGreaterThan(.82);
      expect(composition.proofBeforeServices, `${width}px reassurance must appear before treatment detail`).toBeTruthy();
      expect(composition.heroCompact, `${width}px primary conversion must remain high in the mobile hero`).toBeTruthy();
      expect(composition.servicesStacked, `${width}px treatment cards should stack vertically`).toBeTruthy();
      expect(composition.processVertical, `${width}px next-step process should read vertically`).toBeTruthy();
    },
  });
});
