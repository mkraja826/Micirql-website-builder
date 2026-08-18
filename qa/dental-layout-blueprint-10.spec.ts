import { expect, test } from "@playwright/test";
import { SCHEMA_VERSION, siteSchema, type Site } from "@micirql/schema";
import { sectionDesignId, type SectionFamily } from "@micirql/sections";
import { INDUSTRY_DESIGN_PRESETS } from "../apps/builder/app/industry-design-preset-data";
import { runDentalBlueprintCertification } from "./dental-blueprint-qa";

const LAYOUT_ID = "dental-10-emergency-trust";

function section(id: string, family: SectionFamily, theme: Site["theme"]["family"], props: Record<string, unknown>) {
  return { id, component: { componentId: sectionDesignId(theme, family, 1), version: "1.0.0" }, props, bindings: {}, hidden: false };
}

function sourceSite(): Site {
  const preset = INDUSTRY_DESIGN_PRESETS.find((item) => item.id === "dental-clinic");
  if (!preset) throw new Error("Dental design preset is missing.");
  const theme = structuredClone(preset.theme);
  theme.brand.colors = {
    ...theme.brand.colors,
    primary: "#167b88",
    secondary: "#15343c",
    accent: "#4ca58a",
    background: "#fbfefe",
    surface: "#edf7f8",
    textPrimary: "#17343b",
    textSecondary: "#62777c",
    border: "#cfe2e4",
  };
  theme.brand.typography = { ...theme.brand.typography, display: "Inter", body: "Inter", ui: "Inter" };
  theme.brand.density = "compact";
  theme.brand.shape = "balanced";
  theme.brand.motion = "none";
  const family = theme.family;

  const sections = [
    section("nav", "navbar", family, {
      title: "Harbour Dental Care",
      description: "Urgent dental appointments · Hyderabad",
      items: [{ title: "Urgent care", href: "#services" }, { title: "What happens next", href: "#process" }, { title: "Dentist", href: "#doctor" }, { title: "Contact", href: "#contact" }],
      primaryAction: { label: "Request urgent appointment", href: "#contact" },
    }),
    section("hero", "hero", family, {
      eyebrow: "Need dental help today?",
      title: "Get in touch quickly and let the clinic guide the next step",
      description: "If you have unexpected dental pain, a damaged tooth or another urgent concern, contact the clinic so the team can understand the problem and confirm the most suitable appointment option.",
      image: { src: "https://images.unsplash.com/photo-1606811971618-4486d14f3f99?auto=format&fit=crop&w=1500&q=80", alt: "Dentist speaking with a patient in a treatment room" },
      primaryAction: { label: "Request urgent appointment", href: "#contact" },
      secondaryAction: { label: "Call clinic", href: "tel:+910000000000" },
    }),
    section("trust", "testimonials", family, {
      eyebrow: "Quick, practical access",
      title: "The information patients need before making contact",
      description: "Keep urgent-care information short, factual and easy to scan.",
      items: [
        { title: "Direct contact", description: "Call or send an appointment request without creating an account." },
        { title: "Clear next step", description: "The clinic can confirm what type of appointment is appropriate after hearing the concern." },
        { title: "Verified team", description: "Publish clinician details only after they are supplied and confirmed by the practice." },
        { title: "Easy directions", description: "Keep contact and location information visible when patients need it quickly." },
      ],
    }),
    section("services", "services", family, {
      eyebrow: "Common urgent concerns",
      title: "Find the concern closest to what you are experiencing",
      description: "These categories help patients explain why they are contacting the clinic; diagnosis and treatment decisions happen during clinical assessment.",
      items: [
        { title: "Unexpected tooth pain", description: "Contact the clinic to describe the symptoms and arrange an appropriate assessment." },
        { title: "Broken or chipped tooth", description: "Request an assessment if a tooth has fractured or been damaged." },
        { title: "Lost filling or crown", description: "Let the clinic know what has come loose or fallen out and when it happened." },
        { title: "Dental injury", description: "Share what happened so the clinic can advise on appointment availability and next steps." },
        { title: "Swelling or tenderness", description: "Contact the clinic with the location, timing and any relevant recent dental treatment." },
        { title: "Post-treatment concern", description: "Get in touch if you have a question or unexpected issue after recent dental care." },
      ],
    }),
    section("process", "process", family, {
      eyebrow: "What happens next",
      title: "A short path from contact to clinical assessment",
      description: "Urgent pages should reduce uncertainty rather than add more reading.",
      items: [
        { title: "Contact the clinic", description: "Call or send the basic details needed for the team to understand the concern." },
        { title: "Confirm the appointment", description: "The clinic confirms timing and the most suitable appointment type." },
        { title: "Attend the assessment", description: "The dentist reviews the concern and explains any relevant treatment options." },
      ],
    }),
    section("doctor", "team", family, {
      eyebrow: "Clinical team",
      title: "Know who will assess the dental concern",
      description: "Use verified names, qualifications and registrations supplied by the practice.",
      items: [
        { title: "Duty Dentist", description: "Add the verified clinician name, qualifications and professional details supplied by the clinic.", image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=1000&q=80" },
        { title: "Clinical support", description: "Supports preparation, chairside care and follow-up instructions." },
        { title: "Patient desk", description: "Helps with appointment availability, contact and directions." },
      ],
    }),
    section("cta", "cta", family, {
      eyebrow: "Need to contact the clinic?",
      title: "Use the fastest option that works for you",
      description: "Call directly or send an appointment request with the basic details needed for a response.",
      primaryAction: { label: "Request urgent appointment", href: "#contact" },
      secondaryAction: { label: "Call clinic", href: "tel:+910000000000" },
    }),
    section("contact", "contact", family, {
      eyebrow: "Contact",
      title: "Request an urgent dental appointment",
      description: "Send your contact details and a short description of the concern so the clinic can respond directly.",
      formAction: "/api/forms/appointment",
      primaryAction: { label: "Send request", href: "#contact-form" },
    }),
    section("footer", "footer", family, {
      title: "Harbour Dental Care",
      description: "Fast access to contact details, urgent appointment requests and clear next steps.",
      items: [{ title: "Urgent care", href: "#services" }, { title: "What happens next", href: "#process" }, { title: "Dentist", href: "#doctor" }, { title: "Contact", href: "#contact" }],
      primaryAction: { label: "Request urgent appointment", href: "#contact" },
    }),
  ];

  return siteSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    siteId: "dental-blueprint-10",
    workspaceId: "dental-blueprint-certification",
    name: "Harbour Dental Care",
    domain: "clinic",
    subtype: "dental",
    theme,
    seoBlueprint: { primaryGoal: "Urgent dental appointment requests", targetLocations: ["Hyderabad"], priorityTopics: ["Urgent dental care", "Dental pain", "Broken tooth"], audiences: ["Dental patients seeking urgent appointments"], languages: ["en"], localSeo: true, servicePages: true, locationPages: false, blog: false },
    pages: [{ id: "home", path: "/", name: "Home", sections, seo: { title: "Harbour Dental Care | Urgent Dental Appointments Hyderabad", description: "Contact the clinic about an urgent dental concern and request an appointment.", canonicalPath: "/", indexable: true, structuredDataTypes: ["Dentist"] } }],
    navigation: [{ label: "Home", href: "/" }],
    integrations: [],
    domains: [],
  });
}

test("Dental 10 Immediate Care passes curated responsive safety gates", async ({ page }) => {
  await runDentalBlueprintCertification({
    page,
    layoutId: LAYOUT_ID,
    site: sourceSite(),
    outputName: "dental-layout-blueprint-10",
    profile: {
      industry: "dental clinic",
      subindustry: "urgent dental care",
      goals: ["urgent contact", "book appointment"],
      style_tags: ["urgent", "direct", "accessible", "reassuring"],
      required_capabilities: ["phone", "booking", "contact"],
      services: ["dental pain", "broken tooth", "lost filling or crown"],
    },
    mobileCheck: async ({ root, width }) => {
      const composition = await root.evaluate((element) => {
        const hero = element.querySelector(".mi-hero--centered") as HTMLElement | null;
        const heroActions = element.querySelector(".mi-hero--centered .mi-section__actions") as HTMLElement | null;
        const heroPrimary = element.querySelector(".mi-hero--centered .mi-section__action--primary") as HTMLElement | null;
        const heroSecondary = element.querySelector(".mi-hero--centered .mi-section__action--secondary") as HTMLElement | null;
        const heroMedia = element.querySelector(".mi-hero--centered .mi-section__media") as HTMLElement | null;
        const trust = element.querySelector(".mi-proof--metrics") as HTMLElement | null;
        const services = element.querySelector(".mi-services--spotlight") as HTMLElement | null;
        const serviceCards = [...element.querySelectorAll(".mi-services-spotlight .mi-service-item")] as HTMLElement[];
        const processNodes = [...element.querySelectorAll(".mi-process--timeline .mi-process-node")] as HTMLElement[];
        const primaryRatio = heroActions && heroPrimary ? heroPrimary.getBoundingClientRect().width / heroActions.getBoundingClientRect().width : 0;
        const secondaryRatio = heroActions && heroSecondary ? heroSecondary.getBoundingClientRect().width / heroActions.getBoundingClientRect().width : 0;
        return {
          primaryHigh: Boolean(hero && heroPrimary && heroPrimary.getBoundingClientRect().bottom - hero.getBoundingClientRect().top < 560),
          bothActionsWide: primaryRatio > .82 && secondaryRatio > .82,
          heroMediaHidden: Boolean(heroMedia && getComputedStyle(heroMedia).display === "none"),
          reassuranceBeforeServices: Boolean(trust && services && trust.getBoundingClientRect().top < services.getBoundingClientRect().top),
          servicesStacked: serviceCards.length < 2 || serviceCards[1]!.getBoundingClientRect().top >= serviceCards[0]!.getBoundingClientRect().bottom - 1,
          processVertical: processNodes.length < 2 || processNodes[1]!.getBoundingClientRect().top > processNodes[0]!.getBoundingClientRect().top,
        };
      });
      expect(composition.primaryHigh, `${width}px urgent appointment control must stay high in the first screen`).toBeTruthy();
      expect(composition.bothActionsWide, `${width}px call and appointment controls should be thumb-friendly`).toBeTruthy();
      expect(composition.heroMediaHidden, `${width}px urgent mobile hero should remove nonessential media`).toBeTruthy();
      expect(composition.reassuranceBeforeServices, `${width}px reassurance should precede detailed urgent concerns`).toBeTruthy();
      expect(composition.servicesStacked, `${width}px urgent concern list should stack vertically`).toBeTruthy();
      expect(composition.processVertical, `${width}px urgent next steps should read vertically`).toBeTruthy();
    },
  });
});
