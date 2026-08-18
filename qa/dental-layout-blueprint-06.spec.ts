import { expect, test } from "@playwright/test";
import { SCHEMA_VERSION, siteSchema, type Site } from "@micirql/schema";
import { sectionDesignId, type SectionFamily } from "@micirql/sections";
import { INDUSTRY_DESIGN_PRESETS } from "../apps/builder/app/industry-design-preset-data";
import { runDentalBlueprintCertification } from "./dental-blueprint-qa";

const LAYOUT_ID = "dental-06-doctor-brand";

function section(id: string, family: SectionFamily, theme: Site["theme"]["family"], props: Record<string, unknown>) {
  return { id, component: { componentId: sectionDesignId(theme, family, 1), version: "1.0.0" }, props, bindings: {}, hidden: false };
}

function sourceSite(): Site {
  const preset = INDUSTRY_DESIGN_PRESETS.find((item) => item.id === "premium-implant-clinic");
  if (!preset) throw new Error("Premium Implant Clinic preset is missing.");
  const theme = structuredClone(preset.theme);
  theme.brand.colors = {
    ...theme.brand.colors,
    primary: "#725f43",
    secondary: "#1f1b17",
    accent: "#b28f62",
    background: "#fcfaf5",
    surface: "#f3eee4",
    textPrimary: "#211e1a",
    textSecondary: "#726b61",
    border: "#ddd4c6",
  };
  theme.brand.typography = { ...theme.brand.typography, display: "Georgia", body: "Inter", ui: "Inter" };
  theme.brand.density = "spacious";
  theme.brand.shape = "balanced";
  theme.brand.motion = "subtle";
  const family = theme.family;

  const sections = [
    section("nav", "navbar", family, {
      title: "Dr Aria Dental Studio",
      description: "Dentistry by Dr Aria · Hyderabad",
      items: [{ title: "About", href: "#doctor" }, { title: "Expertise", href: "#services" }, { title: "Cases", href: "#gallery" }, { title: "Contact", href: "#contact" }],
      primaryAction: { label: "Book consultation", href: "#contact" },
    }),
    section("hero", "hero", family, {
      eyebrow: "Clinician-led dentistry",
      title: "A dental practice shaped around one clear clinical point of view",
      description: "Meet the dentist, understand the treatment philosophy and explore the areas of care where experience, planning and communication matter most.",
      image: { src: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=1500&q=80", alt: "Dentist portrait in a clinical setting" },
      primaryAction: { label: "Request a consultation", href: "#contact" },
      secondaryAction: { label: "Explore expertise", href: "#services" },
    }),
    section("doctor", "team", family, {
      eyebrow: "Meet your dentist",
      title: "Clinical judgement should feel personal, not anonymous",
      description: "This section is designed for verified credentials, focus areas and a concise treatment philosophy supplied directly by the clinician.",
      items: [
        { title: "Dr Aria", description: "Add verified qualifications, years of experience, professional registrations and treatment focus supplied by the practice.", image: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=1200&q=80" },
        { title: "Treatment philosophy", description: "Explain how the clinician approaches diagnosis, planning and patient communication." },
        { title: "Clinical focus", description: "List only genuine focus areas the clinician wants patients to understand before booking." },
      ],
    }),
    section("trust", "testimonials", family, {
      eyebrow: "Professional profile",
      title: "The details patients use to judge clinical credibility",
      description: "Keep credentials short, verified and scannable instead of turning the page into a long biography.",
      items: [
        { title: "Verified qualifications", description: "Professional degrees and registrations supplied by the clinician." },
        { title: "Focused experience", description: "Relevant treatment experience described accurately and without inflated claims." },
        { title: "Clear planning", description: "Treatment options discussed before the patient decides how to proceed." },
        { title: "Continuity of care", description: "Patients know who is responsible for their clinical decisions and follow-up." },
      ],
    }),
    section("services", "services", family, {
      eyebrow: "Areas of expertise",
      title: "Treatment expertise presented through the clinician’s point of view",
      description: "The site should make it easy to understand what the dentist focuses on without making every service look equally important.",
      items: [
        { title: "Implant consultation", description: "Assessment-led planning for patients considering tooth replacement with dental implants." },
        { title: "Restorative dentistry", description: "Treatment planning for damaged, worn or missing teeth with attention to function and longevity." },
        { title: "Cosmetic planning", description: "Discuss aesthetic goals in the context of oral health, proportion and realistic outcomes." },
        { title: "Complex treatment planning", description: "Coordinate multiple clinical needs into a clear sequence patients can understand." },
        { title: "Preventive review", description: "Use ongoing assessment to identify concerns before they become more difficult to manage." },
        { title: "Second-opinion consultation", description: "Review an existing recommendation and clarify the available options before treatment." },
      ],
    }),
    section("gallery", "gallery", family, {
      eyebrow: "Clinical stories",
      title: "Show the work with context, not spectacle",
      description: "Use consented case or clinic photography with concise captions that explain what the patient is actually seeing.",
      items: [
        { title: "Consultation", description: "A clinician-led discussion before treatment decisions are made.", image: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1200&q=80" },
        { title: "Treatment planning", description: "Structured assessment and planning presented in a patient-friendly way.", image: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=1200&q=80" },
        { title: "Clinical environment", description: "Use authentic practice photography where available.", image: "https://images.unsplash.com/photo-1606811971618-4486d14f3f99?auto=format&fit=crop&w=1200&q=80" },
        { title: "Patient communication", description: "Show how the clinical team explains findings and next steps.", image: "https://images.unsplash.com/photo-1609840114035-3c981b782dfe?auto=format&fit=crop&w=1200&q=80" },
      ],
    }),
    section("proof", "testimonials", family, {
      eyebrow: "Patient perspective",
      title: "Trust is stronger when the feedback feels specific",
      description: "Only genuine patient feedback supplied or approved by the practice should be published.",
      items: [{ title: "Verified patient review", description: "I appreciated speaking directly with the dentist about the options and understanding why one plan made more sense for me than another." }],
    }),
    section("cta", "cta", family, {
      eyebrow: "Consultation",
      title: "Start with a conversation about the decision you are trying to make",
      description: "Request a consultation and the practice can confirm the right appointment type and available times.",
      primaryAction: { label: "Request consultation", href: "#contact" },
      secondaryAction: { label: "Call the practice", href: "tel:+910000000000" },
    }),
    section("contact", "contact", family, {
      eyebrow: "Contact",
      title: "Request a consultation with the practice",
      description: "Share your preferred contact details and a short reason for the appointment so the team can respond appropriately.",
      formAction: "/api/forms/appointment",
      primaryAction: { label: "Send request", href: "#contact-form" },
    }),
    section("footer", "footer", family, {
      title: "Dr Aria Dental Studio",
      description: "Clinician-led dental care built around clear planning, verified expertise and direct communication.",
      items: [{ title: "About", href: "#doctor" }, { title: "Expertise", href: "#services" }, { title: "Cases", href: "#gallery" }, { title: "Contact", href: "#contact" }],
      primaryAction: { label: "Book consultation", href: "#contact" },
    }),
  ];

  return siteSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    siteId: "dental-blueprint-06",
    workspaceId: "dental-blueprint-certification",
    name: "Dr Aria Dental Studio",
    domain: "clinic",
    subtype: "dental",
    theme,
    seoBlueprint: { primaryGoal: "Book dentist consultations", targetLocations: ["Hyderabad"], priorityTopics: ["Implant dentistry", "Restorative dentistry", "Cosmetic dentistry"], audiences: ["Dental patients"], languages: ["en"], localSeo: true, servicePages: true, locationPages: false, blog: false },
    pages: [{ id: "home", path: "/", name: "Home", sections, seo: { title: "Dr Aria Dental Studio | Hyderabad Dentist", description: "Meet the clinician, explore treatment expertise and request a consultation.", canonicalPath: "/", indexable: true, structuredDataTypes: ["Dentist"] } }],
    navigation: [{ label: "Home", href: "/" }],
    integrations: [],
    domains: [],
  });
}

test("Dental 06 Doctor Signature passes curated responsive safety gates", async ({ page }) => {
  await runDentalBlueprintCertification({
    page,
    layoutId: LAYOUT_ID,
    site: sourceSite(),
    outputName: "dental-layout-blueprint-06",
    profile: {
      industry: "dental clinic",
      subindustry: "implant dentistry",
      goals: ["build trust", "book appointment"],
      style_tags: ["doctor", "personal-brand", "expert", "editorial"],
      required_capabilities: ["doctor profile", "gallery", "booking"],
      services: ["implant consultation", "restorative dentistry", "cosmetic planning"],
    },
    mobileCheck: async ({ root, width }) => {
      const composition = await root.evaluate((element) => {
        const heroMedia = element.querySelector(".mi-hero--media-first .mi-section__media") as HTMLElement | null;
        const heroCopy = element.querySelector(".mi-hero--media-first .mi-hero__copy") as HTMLElement | null;
        const doctorLead = element.querySelector(".mi-team-card--lead") as HTMLElement | null;
        const doctorImage = doctorLead?.querySelector("img,.mi-team-avatar") as HTMLElement | null;
        const doctorCopy = doctorLead?.querySelector("div:last-child") as HTMLElement | null;
        const galleryCards = [...element.querySelectorAll(".mi-gallery-mosaic .mi-gallery-card")] as HTMLElement[];
        const caption = element.querySelector(".mi-gallery-card figcaption") as HTMLElement | null;
        const proof = element.querySelector(".mi-proof--quote") as HTMLElement | null;
        const cta = element.querySelector(".mi-conv-cta--split") as HTMLElement | null;
        return {
          portraitFirst: Boolean(heroMedia && heroCopy && heroMedia.getBoundingClientRect().top < heroCopy.getBoundingClientRect().top),
          doctorPortraitFirst: Boolean(doctorImage && doctorCopy && doctorImage.getBoundingClientRect().top <= doctorCopy.getBoundingClientRect().top),
          gallerySingleColumn: galleryCards.length < 2 || galleryCards[1]!.getBoundingClientRect().top >= galleryCards[0]!.getBoundingClientRect().bottom - 1,
          captionPosition: caption ? getComputedStyle(caption).position : "missing",
          proofBeforeCta: Boolean(proof && cta && proof.getBoundingClientRect().top < cta.getBoundingClientRect().top),
        };
      });
      expect(composition.portraitFirst, `${width}px clinician portrait must lead the hero`).toBeTruthy();
      expect(composition.doctorPortraitFirst, `${width}px doctor portrait must stay ahead of credentials`).toBeTruthy();
      expect(composition.gallerySingleColumn, `${width}px clinical gallery should be one column`).toBeTruthy();
      expect(composition.captionPosition, `${width}px gallery captions must not overlay images`).toBe("static");
      expect(composition.proofBeforeCta, `${width}px proof should support the booking CTA`).toBeTruthy();
    },
  });
});
