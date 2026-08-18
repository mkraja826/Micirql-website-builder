import { expect, test } from "@playwright/test";
import { SCHEMA_VERSION, siteSchema, type Site } from "@micirql/schema";
import { sectionDesignId, type SectionFamily } from "@micirql/sections";
import { INDUSTRY_DESIGN_PRESETS } from "../apps/builder/app/industry-design-preset-data";
import { runDentalBlueprintCertification } from "./dental-blueprint-qa";

const LAYOUT_ID = "dental-02-implant-luxury";

function section(id: string, family: SectionFamily, variant: 1 | 2 | 3 | 4 | 5, theme: Site["theme"]["family"], props: Record<string, unknown>) {
  return { id, component: { componentId: sectionDesignId(theme, family, variant), version: "1.0.0" }, props, bindings: {}, hidden: false };
}

function sourceSite(): Site {
  const preset = INDUSTRY_DESIGN_PRESETS.find((item) => item.id === "premium-implant-clinic");
  if (!preset) throw new Error("Premium Implant Clinic preset is missing.");
  const theme = preset.theme.family;
  const sections = [
    section("nav", "navbar", 1, theme, {
      title: "Atelier Implant Centre",
      description: "Implant dentistry · Hyderabad",
      items: [{ title: "Implants", href: "#services" }, { title: "Doctor", href: "#doctor" }, { title: "Process", href: "#process" }, { title: "Contact", href: "#contact" }],
      primaryAction: { label: "Private consultation", href: "#contact" },
    }),
    section("hero", "hero", 1, theme, {
      eyebrow: "Advanced implant dentistry",
      title: "Implant care shaped around precision and confidence",
      description: "A specialist-led consultation experience for patients considering single implants, full-arch rehabilitation and complex restorative planning.",
      image: { src: "https://images.unsplash.com/photo-1606811971618-4486d14f3f99?auto=format&fit=crop&w=1600&q=80", alt: "Dental clinician preparing for an implant consultation" },
      primaryAction: { label: "Request consultation", href: "#contact" },
      secondaryAction: { label: "Explore implant care", href: "#services" },
    }),
    section("doctor", "team", 1, theme, {
      eyebrow: "Clinical leadership",
      title: "A consultation led by expertise",
      description: "Verified qualifications, implant focus areas and clinical experience belong here once supplied by the practice.",
      items: [
        { title: "Implant clinician", description: "Present verified training, treatment focus and experience without unsupported claims.", image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=1200&q=80" },
        { title: "Treatment planning", description: "Structured assessment and discussion before treatment decisions are made." },
        { title: "Patient coordination", description: "Clear appointment, preparation and follow-up communication." },
      ],
    }),
    section("services", "services", 1, theme, {
      eyebrow: "Implant treatments",
      title: "Focused options for replacing missing teeth",
      description: "Use consultation and clinical assessment to understand which implant pathway may be relevant to your situation.",
      items: [
        { title: "Single-tooth implants", description: "A consultation-led option for an individual missing tooth." },
        { title: "Implant-supported bridges", description: "Planning for several missing teeth where an implant-supported restoration may be considered." },
        { title: "Full-arch rehabilitation", description: "Complex treatment planning for patients exploring fixed full-arch replacement options." },
        { title: "Implant restoration", description: "Assessment of implant crowns and restorative components." },
      ],
    }),
    section("technology", "features", 1, theme, {
      eyebrow: "Planning confidence",
      title: "Technology used to support clearer decisions",
      description: "Publish only scanning, imaging and planning tools that the clinic has verified it uses.",
      items: [
        { title: "Digital assessment", description: "Explain verified diagnostic workflows in patient-friendly language." },
        { title: "Treatment visualisation", description: "Use verified planning information to help patients understand proposed next steps." },
        { title: "Restorative coordination", description: "Present the clinical workflow from implant planning through restoration." },
      ],
    }),
    section("process", "process", 1, theme, {
      eyebrow: "The implant journey",
      title: "A measured path from consultation to restoration",
      description: "Keep the treatment journey sequential and easy to scan on every screen size.",
      items: [
        { title: "Consultation", description: "Discuss concerns, goals, history and the assessment required before treatment planning." },
        { title: "Clinical planning", description: "Review findings and the proposed treatment sequence with the clinician." },
        { title: "Treatment", description: "Proceed only after the clinic has explained the agreed clinical plan and practical requirements." },
        { title: "Restoration and review", description: "Complete the restorative phase and follow the clinic’s review schedule." },
      ],
    }),
    section("proof", "testimonials", 1, theme, {
      eyebrow: "Patient experience",
      title: "Confidence should come from verified experience",
      description: "Only genuine, approved patient feedback should appear on the published site.",
      items: [{ title: "Verified implant patient", description: "Replace this QA fixture with a genuine approved patient review before publishing." }],
    }),
    section("cta", "cta", 1, theme, {
      eyebrow: "Private consultation",
      title: "Discuss your implant options with the clinical team",
      description: "Request a consultation and the clinic can confirm availability and the appropriate assessment pathway.",
      primaryAction: { label: "Request consultation", href: "#contact" },
      secondaryAction: { label: "Call clinic", href: "tel:+910000000000" },
    }),
    section("contact", "contact", 1, theme, {
      eyebrow: "Contact",
      title: "Request an implant consultation",
      description: "Send your details and the clinic can respond with available consultation times and preparation information.",
      formAction: "/api/forms/implant-consultation",
      primaryAction: { label: "Send request", href: "#contact-form" },
    }),
    section("footer", "footer", 1, theme, {
      title: "Atelier Implant Centre",
      description: "Specialist-led implant consultations presented with clarity, restraint and verified clinical information.",
      items: [{ title: "Implants", href: "#services" }, { title: "Doctor", href: "#doctor" }, { title: "Process", href: "#process" }, { title: "Contact", href: "#contact" }],
    }),
  ];

  return siteSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    siteId: "dental-blueprint-02",
    workspaceId: "dental-blueprint-certification",
    name: "Atelier Implant Centre",
    domain: "clinic",
    subtype: "dental",
    theme: preset.theme,
    seoBlueprint: { primaryGoal: "Book implant consultations", targetLocations: ["Hyderabad"], priorityTopics: ["Dental implants", "Implant consultation"], audiences: ["Implant patients"], languages: ["en"], localSeo: true, servicePages: true, locationPages: false, blog: false },
    pages: [{ id: "home", path: "/", name: "Home", sections, seo: { title: "Atelier Implant Centre | Implant Dentistry", description: "Explore implant consultation pathways and request an appointment.", canonicalPath: "/", indexable: true, structuredDataTypes: ["Dentist"] } }],
    navigation: [{ label: "Home", href: "/" }],
    integrations: [],
    domains: [],
  });
}

test("Dental 02 Implant Atelier passes curated responsive safety gates", async ({ page }) => {
  await runDentalBlueprintCertification({
    page,
    layoutId: LAYOUT_ID,
    site: sourceSite(),
    outputName: "dental-layout-blueprint-02",
    profile: {
      industry: "dental clinic",
      subindustry: "implant dentistry",
      goals: ["implant consultation", "high-value treatment lead"],
      style_tags: ["implant", "luxury", "editorial", "premium"],
      required_capabilities: ["booking", "contact", "treatment process"],
      services: ["single-tooth implants", "implant-supported bridges", "full-arch rehabilitation"],
    },
    mobileCheck: async ({ root, width }) => {
      const separated = await root.evaluate((element) => {
        const hero = element.querySelector(".mi-hero--immersive") as HTMLElement | null;
        const media = hero?.querySelector(":scope > .mi-section__media") as HTMLElement | null;
        const overlay = hero?.querySelector(".mi-hero__overlay") as HTMLElement | null;
        if (!hero || !media || !overlay) return false;
        const mediaRect = media.getBoundingClientRect();
        const overlayRect = overlay.getBoundingClientRect();
        return getComputedStyle(media).position === "relative" && getComputedStyle(overlay).position === "relative" && overlayRect.top >= mediaRect.bottom - 2;
      });
      expect(separated, `${width}px mobile hero must use image and copy as separate normal-flow regions`).toBeTruthy();
    },
  });
});
