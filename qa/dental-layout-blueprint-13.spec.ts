import { expect, test } from "@playwright/test";
import { SCHEMA_VERSION, siteSchema, type Site } from "@micirql/schema";
import { sectionDesignId, type SectionFamily } from "@micirql/sections";
import { INDUSTRY_DESIGN_PRESETS } from "../apps/builder/app/industry-design-preset-data";
import { runDentalBlueprintCertification } from "./dental-blueprint-qa";

const LAYOUT_ID = "dental-13-implant-results";

function section(id: string, family: SectionFamily, theme: Site["theme"]["family"], props: Record<string, unknown>) {
  return { id, component: { componentId: sectionDesignId(theme, family, 1), version: "1.0.0" }, props, bindings: {}, hidden: false };
}

function sourceSite(): Site {
  const preset = INDUSTRY_DESIGN_PRESETS.find((item) => item.id === "premium-implant-clinic");
  if (!preset) throw new Error("Premium Implant Clinic preset is missing.");
  const theme = structuredClone(preset.theme);
  theme.brand.colors = {
    ...theme.brand.colors,
    primary: "#247a68",
    secondary: "#15313a",
    accent: "#78aa8b",
    background: "#fbfdfc",
    surface: "#edf5f1",
    textPrimary: "#15342f",
    textSecondary: "#637871",
    border: "#cfe0da",
  };
  theme.brand.typography = { ...theme.brand.typography, display: "Inter", body: "Inter", ui: "Inter" };
  theme.brand.density = "comfortable";
  theme.brand.shape = "balanced";
  theme.brand.motion = "subtle";
  const family = theme.family;

  const sections = [
    section("nav", "navbar", family, {
      title: "Foundry Implant Centre",
      description: "Implant consultations and restorative planning · Hyderabad",
      items: [{ title: "Cases", href: "#gallery" }, { title: "Implant options", href: "#services" }, { title: "Planning", href: "#technology" }, { title: "Contact", href: "#contact" }],
      primaryAction: { label: "Book implant consultation", href: "#contact" },
    }),
    section("hero", "hero", family, {
      eyebrow: "Implant planning with visible evidence",
      title: "Understand the implant plan, the evidence and the sequence before treatment begins",
      description: "A consultation-led implant website should make clinical planning easier to understand without promising a particular result or turning technology into a substitute for diagnosis.",
      image: { src: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=1500&q=80", alt: "Dental clinician reviewing treatment planning information" },
      primaryAction: { label: "Request implant consultation", href: "#contact" },
      secondaryAction: { label: "Review the planning process", href: "#process" },
    }),
    section("trust", "testimonials", family, {
      eyebrow: "Evidence before claims",
      title: "What patients should be able to verify before deciding",
      description: "Use this section for factual reassurance rather than unsupported success statistics.",
      items: [
        { title: "Verified clinician", description: "Publish qualifications and registrations supplied by the practice." },
        { title: "Clear assessment", description: "Explain what information is reviewed before an implant recommendation is made." },
        { title: "Consented case media", description: "Show case imagery only when consent, provenance and context are confirmed." },
        { title: "No guaranteed outcomes", description: "Explain that treatment suitability and results vary by patient and clinical findings." },
      ],
    }),
    section("gallery", "gallery", family, {
      eyebrow: "Clinical case presentation",
      title: "Case evidence should be labelled, paired and shown without visual tricks",
      description: "The published site should use only verified, consented case media. Initial and follow-up views should use consistent framing where possible and always include appropriate context.",
      items: [
        { title: "Case 01 · Initial presentation", description: "Placeholder for verified, consented initial case imagery. Replace with the clinic’s approved media and factual case context.", image: "https://images.unsplash.com/photo-1609840114035-3c981b782dfe?auto=format&fit=crop&w=1200&q=80" },
        { title: "Case 01 · Reviewed follow-up", description: "Placeholder for the matching verified follow-up view. Outcomes vary and must not be presented as guaranteed.", image: "https://images.unsplash.com/photo-1606811971618-4486d14f3f99?auto=format&fit=crop&w=1200&q=80" },
        { title: "Planning view", description: "Use real planning or diagnostic imagery only when the clinic confirms the source and relevance.", image: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=1200&q=80" },
        { title: "Restorative review", description: "Add concise, factual context so patients understand what the image is intended to demonstrate.", image: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1200&q=80" },
      ],
    }),
    section("services", "services", family, {
      eyebrow: "Implant treatment pathways",
      title: "Explore the treatment question closest to your situation",
      description: "Suitability depends on clinical assessment. The website should explain possible pathways without making a treatment recommendation before consultation.",
      items: [
        { title: "Single-tooth replacement", description: "Discuss options for replacing one missing tooth after assessment of the site and surrounding structures." },
        { title: "Multiple missing teeth", description: "Review implant-supported and non-implant alternatives where several teeth are absent." },
        { title: "Full-arch consultation", description: "Assess more extensive tooth replacement needs and explain the possible treatment sequence." },
        { title: "Implant restoration review", description: "Evaluate existing implant crowns or restorations when maintenance or replacement is being considered." },
        { title: "Bone and site assessment", description: "Explain when additional assessment may be needed before implant placement is considered." },
        { title: "Second-opinion planning", description: "Review an existing recommendation and clarify the options, limitations and next steps." },
      ],
    }),
    section("technology", "features", family, {
      eyebrow: "Planning technology",
      title: "Technology earns its place only when it improves the clinical decision",
      description: "Describe only systems actually used by the clinic and connect every technology statement to assessment, planning or communication.",
      items: [
        { title: "Diagnostic records", description: "Use appropriate records and imaging to support clinical assessment where indicated." },
        { title: "Treatment planning", description: "Bring relevant findings together so the clinician can explain possible sequences and limitations." },
        { title: "Patient communication", description: "Use visual information to help patients understand what is being proposed and why." },
      ],
    }),
    section("process", "process", family, {
      eyebrow: "Implant journey",
      title: "A visible treatment sequence reduces uncertainty",
      description: "The actual sequence varies by case, but patients should understand the decision points before committing to treatment.",
      items: [
        { title: "Consultation and assessment", description: "Discuss the missing-tooth concern, health history and relevant clinical findings." },
        { title: "Records and planning", description: "Complete any appropriate records or imaging and review the available treatment pathways." },
        { title: "Confirm the treatment plan", description: "Discuss benefits, limitations, alternatives, timing and costs before proceeding." },
        { title: "Treatment and restoration", description: "Complete the agreed clinical stages according to the individual treatment plan." },
        { title: "Review and maintenance", description: "Continue with appropriate review, hygiene and maintenance guidance after treatment." },
      ],
    }),
    section("doctor", "team", family, {
      eyebrow: "Clinical responsibility",
      title: "Know who is making the implant treatment decisions",
      description: "Publish verified clinician credentials, registrations and implant-related experience supplied directly by the practice.",
      items: [
        { title: "Implant Clinician", description: "Add the verified clinician name, qualifications, registration and relevant experience supplied by the clinic.", image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=1000&q=80" },
        { title: "Restorative planning", description: "Explain how the final tooth replacement is considered as part of the overall treatment plan." },
        { title: "Maintenance planning", description: "Clarify how ongoing review and hygiene support fit into long-term implant care." },
      ],
    }),
    section("proof", "testimonials", family, {
      eyebrow: "Patient perspective",
      title: "Useful feedback explains the decision-making experience",
      description: "Only genuine, approved patient feedback belongs on the published website.",
      items: [{ title: "Verified patient review", description: "The consultation helped me understand the sequence, the alternatives and what information the dentist still needed before I made a decision." }],
    }),
    section("cta", "cta", family, {
      eyebrow: "Considering dental implants?",
      title: "Start with an assessment, not an assumption",
      description: "Request an implant consultation so the clinic can review your situation and explain the relevant options.",
      primaryAction: { label: "Request implant consultation", href: "#contact" },
      secondaryAction: { label: "Call clinic", href: "tel:+910000000000" },
    }),
    section("contact", "contact", family, {
      eyebrow: "Contact",
      title: "Request an implant consultation",
      description: "Send your preferred details and a short description of what you would like assessed.",
      formAction: "/api/forms/appointment",
      primaryAction: { label: "Send request", href: "#contact-form" },
    }),
    section("footer", "footer", family, {
      title: "Foundry Implant Centre",
      description: "Implant planning presented with evidence, clinical context and clear next steps.",
      items: [{ title: "Cases", href: "#gallery" }, { title: "Implant options", href: "#services" }, { title: "Planning", href: "#technology" }, { title: "Contact", href: "#contact" }],
      primaryAction: { label: "Book implant consultation", href: "#contact" },
    }),
  ];

  return siteSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    siteId: "dental-blueprint-13",
    workspaceId: "dental-blueprint-certification",
    name: "Foundry Implant Centre",
    domain: "clinic",
    subtype: "dental",
    theme,
    seoBlueprint: { primaryGoal: "Book implant consultations", targetLocations: ["Hyderabad"], priorityTopics: ["Dental implants", "Implant consultation", "Implant treatment planning"], audiences: ["Patients considering dental implants"], languages: ["en"], localSeo: true, servicePages: true, locationPages: false, blog: false },
    pages: [{ id: "home", path: "/", name: "Home", sections, seo: { title: "Foundry Implant Centre | Implant Consultations Hyderabad", description: "Understand implant treatment pathways, clinical planning and request a consultation.", canonicalPath: "/", indexable: true, structuredDataTypes: ["Dentist"] } }],
    navigation: [{ label: "Home", href: "/" }],
    integrations: [],
    domains: [],
  });
}

test("Dental 13 Implant Results passes curated responsive safety gates", async ({ page }) => {
  await runDentalBlueprintCertification({
    page,
    layoutId: LAYOUT_ID,
    site: sourceSite(),
    outputName: "dental-layout-blueprint-13",
    profile: {
      industry: "dental clinic",
      subindustry: "implant dentistry",
      goals: ["implant consultation", "show outcomes"],
      style_tags: ["implant", "results", "evidence", "advanced"],
      required_capabilities: ["case gallery", "booking", "contact"],
      services: ["single tooth implant", "multiple missing teeth", "full arch consultation"],
    },
    mobileCheck: async ({ root, width }) => {
      const composition = await root.evaluate((element) => {
        const heroCopy = element.querySelector(".mi-hero--media-first .mi-hero__copy") as HTMLElement | null;
        const heroMedia = element.querySelector(".mi-hero--media-first .mi-section__media") as HTMLElement | null;
        const heroActions = element.querySelector(".mi-hero--media-first .mi-section__actions") as HTMLElement | null;
        const heroPrimary = element.querySelector(".mi-hero--media-first .mi-section__action--primary") as HTMLElement | null;
        const metricItems = [...element.querySelectorAll(".mi-proof--metrics .mi-proof-metrics article")] as HTMLElement[];
        const gallery = element.querySelector(".mi-gallery-mosaic") as HTMLElement | null;
        const galleryCards = [...element.querySelectorAll(".mi-gallery-mosaic .mi-gallery-card")] as HTMLElement[];
        const captions = [...element.querySelectorAll(".mi-gallery-mosaic .mi-gallery-card figcaption")] as HTMLElement[];
        const processNodes = [...element.querySelectorAll(".mi-process--timeline .mi-process-node")] as HTMLElement[];
        const contact = element.querySelector(".mi-contact-struct--split .mi-contact-split") as HTMLElement | null;
        const contactChildren = contact ? [...contact.children] as HTMLElement[] : [];
        const metricThirdStartsNewRow = metricItems.length < 3 || metricItems[2]!.getBoundingClientRect().top > metricItems[0]!.getBoundingClientRect().top + 1;
        return {
          copyBeforeMedia: Boolean(heroCopy && heroMedia && heroCopy.getBoundingClientRect().bottom <= heroMedia.getBoundingClientRect().top + 2),
          primaryWidthRatio: heroActions && heroPrimary ? heroPrimary.getBoundingClientRect().width / heroActions.getBoundingClientRect().width : 0,
          metricsMaxTwoColumns: metricThirdStartsNewRow,
          galleryVertical: galleryCards.length < 2 || galleryCards[1]!.getBoundingClientRect().top >= galleryCards[0]!.getBoundingClientRect().bottom - 1,
          galleryOverflow: gallery ? gallery.scrollWidth - gallery.clientWidth : 1,
          captionsStatic: captions.length > 0 && captions.every((caption) => getComputedStyle(caption).position === "static"),
          noNegativeGalleryOffsets: galleryCards.every((card) => parseFloat(getComputedStyle(card).marginLeft) >= 0 && parseFloat(getComputedStyle(card).marginRight) >= 0),
          processVertical: processNodes.length < 2 || processNodes[1]!.getBoundingClientRect().top > processNodes[0]!.getBoundingClientRect().top,
          contactStacked: contactChildren.length < 2 || contactChildren[1]!.getBoundingClientRect().top > contactChildren[0]!.getBoundingClientRect().top,
        };
      });
      expect(composition.copyBeforeMedia, `${width}px implant decision copy should lead supporting evidence media`).toBeTruthy();
      expect(composition.primaryWidthRatio, `${width}px implant consultation CTA should be thumb-friendly`).toBeGreaterThan(.82);
      expect(composition.metricsMaxTwoColumns, `${width}px evidence facts should use no more than two columns`).toBeTruthy();
      expect(composition.galleryVertical, `${width}px implant case evidence should become a vertical story`).toBeTruthy();
      expect(composition.galleryOverflow, `${width}px implant evidence gallery must not scroll sideways`).toBeLessThanOrEqual(1);
      expect(composition.captionsStatic, `${width}px evidence labels must stay outside the imagery`).toBeTruthy();
      expect(composition.noNegativeGalleryOffsets, `${width}px evidence cards must not use negative mobile offsets`).toBeTruthy();
      expect(composition.processVertical, `${width}px implant treatment journey should read vertically`).toBeTruthy();
      expect(composition.contactStacked, `${width}px implant contact layout should stack`).toBeTruthy();
    },
  });
});
