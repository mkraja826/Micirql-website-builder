import { expect, test } from "@playwright/test";
import { SCHEMA_VERSION, siteSchema, type Site } from "@micirql/schema";
import { sectionDesignId, type SectionFamily } from "@micirql/sections";
import { INDUSTRY_DESIGN_PRESETS } from "../apps/builder/app/industry-design-preset-data";
import { runDentalBlueprintCertification } from "./dental-blueprint-qa";

const LAYOUT_ID = "dental-18-proof-first";

function section(id: string, family: SectionFamily, theme: Site["theme"]["family"], props: Record<string, unknown>) {
  return { id, component: { componentId: sectionDesignId(theme, family, 1), version: "1.0.0" }, props, bindings: {}, hidden: false };
}

function sourceSite(): Site {
  const preset = INDUSTRY_DESIGN_PRESETS.find((item) => item.id === "dental-clinic");
  if (!preset) throw new Error("Dental design preset is missing.");
  const theme = structuredClone(preset.theme);
  theme.brand.colors = {
    ...theme.brand.colors,
    primary: "#147c86",
    secondary: "#174153",
    accent: "#63b8b5",
    background: "#fbfefe",
    surface: "#edf7f8",
    textPrimary: "#16373f",
    textSecondary: "#64787e",
    border: "#cce1e3",
  };
  theme.brand.typography = { ...theme.brand.typography, display: "Inter", body: "Inter", ui: "Inter" };
  theme.brand.density = "comfortable";
  theme.brand.shape = "soft";
  theme.brand.motion = "subtle";
  const family = theme.family;

  const sections = [
    section("nav", "navbar", family, {
      title: "ClearTrust Dental Centre",
      description: "General, implant and orthodontic dentistry · Hyderabad",
      items: [
        { title: "Why patients choose us", href: "#trust" },
        { title: "Reviews", href: "#proof" },
        { title: "Treatments", href: "#services" },
        { title: "Dentist", href: "#doctor" },
        { title: "Contact", href: "#contact" },
      ],
      primaryAction: { label: "Book appointment", href: "#contact" },
    }),
    section("hero", "hero", family, {
      eyebrow: "Clarity before treatment",
      title: "See the proof, meet the dentist, then explore your treatment options",
      description: "A trust-first clinic website should make verified credentials, patient feedback and treatment planning standards easy to understand before asking someone to choose a service.",
      image: { src: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1600&q=80", alt: "Modern dental clinic consultation space" },
      primaryAction: { label: "Request appointment", href: "#contact" },
      secondaryAction: { label: "Read patient feedback", href: "#proof" },
    }),
    section("trust", "testimonials", family, {
      eyebrow: "What can be verified",
      title: "Trust should come from information patients can check",
      description: "Use factual reassurance supplied and approved by the clinic rather than unsupported success percentages or invented awards.",
      items: [
        { title: "Verified clinician details", description: "Publish the treating dentist’s confirmed qualifications and professional registration." },
        { title: "Clear treatment planning", description: "Explain what assessment and records are needed before a recommendation is made." },
        { title: "Transparent next steps", description: "Patients should understand options, sequence and follow-up before deciding." },
        { title: "Genuine feedback only", description: "Use approved patient reviews with no fabricated ratings, names or outcomes." },
      ],
    }),
    section("proof", "testimonials", family, {
      eyebrow: "Patient perspective",
      title: "Useful reviews describe the experience patients actually had",
      description: "Replace these certification fixtures with genuine, approved feedback from the practice before publishing.",
      items: [
        { title: "Verified patient review", description: "The dentist explained what they could see, what still needed checking and the options I could consider before I decided anything." },
        { title: "Verified patient review", description: "I appreciated that the appointment felt organised and I understood the next step before leaving the clinic." },
        { title: "Verified patient review", description: "The team answered my practical questions clearly and the treatment discussion did not feel rushed." },
      ],
    }),
    section("services", "services", family, {
      eyebrow: "Treatment areas",
      title: "Explore treatment only after the clinic’s standards are clear",
      description: "These are starting points for consultation. Suitability and recommendations depend on individual clinical assessment.",
      items: [
        { title: "General dentistry", description: "Routine assessment, preventive care and restorative treatment based on current findings." },
        { title: "Dental implants", description: "Consultation-led planning for suitable missing-tooth replacement cases." },
        { title: "Orthodontic consultation", description: "Review alignment concerns and the treatment approaches that may be appropriate." },
        { title: "Root canal care", description: "Assessment and treatment planning for teeth affected by pulpal or root concerns." },
        { title: "Cosmetic planning", description: "Discuss appearance goals alongside oral health, function and realistic expectations." },
        { title: "Restorative care", description: "Plan treatment for damaged, worn or missing teeth with maintenance in mind." },
      ],
    }),
    section("doctor", "team", family, {
      eyebrow: "Clinical responsibility",
      title: "Know who is making the treatment decisions",
      description: "Publish only verified clinician credentials, registration and clinical interests supplied by the practice.",
      items: [
        { title: "Lead Dentist", description: "Add the verified clinician name, qualifications, registration and treatment focus supplied by the clinic.", image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=1100&q=80" },
        { title: "Assessment approach", description: "Explain how diagnosis and treatment planning are handled before recommendations are made." },
        { title: "Continuity of care", description: "Clarify who remains responsible for treatment decisions and follow-up." },
      ],
    }),
    section("technology", "features", family, {
      eyebrow: "Supporting evidence",
      title: "Technology matters when it improves assessment, planning or communication",
      description: "Only describe systems actually used by the clinic, and connect every technology statement to a real clinical purpose.",
      items: [
        { title: "Diagnostic records", description: "Use appropriate records and imaging to support assessment where clinically indicated." },
        { title: "Treatment planning", description: "Bring relevant findings together so options and sequence are easier to explain." },
        { title: "Visual communication", description: "Help patients understand findings and proposed next steps before treatment decisions." },
      ],
    }),
    section("cta", "cta", family, {
      eyebrow: "Ready for the next step?",
      title: "Request an appointment after you have the information you need",
      description: "Tell the clinic what you would like help with and the team can confirm the most suitable visit type.",
      primaryAction: { label: "Request appointment", href: "#contact" },
      secondaryAction: { label: "Call clinic", href: "tel:+910000000000" },
    }),
    section("contact", "contact", family, {
      eyebrow: "Contact",
      title: "Request an appointment",
      description: "Send your preferred details and the clinic can respond directly with appropriate appointment options.",
      formAction: "/api/forms/appointment",
      formActionId: "appointment.request",
      primaryAction: { label: "Send appointment request", href: "#enquiry" },
    }),
    section("footer", "footer", family, {
      title: "ClearTrust Dental Centre",
      description: "Dental care presented with verified information, clear treatment planning and straightforward appointment access.",
      items: [
        { title: "Proof", href: "#proof" },
        { title: "Treatments", href: "#services" },
        { title: "Dentist", href: "#doctor" },
        { title: "Contact", href: "#contact" },
      ],
      primaryAction: { label: "Book appointment", href: "#contact" },
    }),
  ];

  return siteSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    siteId: "dental-blueprint-18",
    workspaceId: "dental-blueprint-certification",
    name: "ClearTrust Dental Centre",
    domain: "clinic",
    subtype: "dental",
    theme,
    seoBlueprint: {
      primaryGoal: "Book dental appointments",
      targetLocations: ["Hyderabad"],
      priorityTopics: ["General dentistry", "Dental implants", "Orthodontics"],
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
      sections,
      seo: {
        title: "ClearTrust Dental Centre | Dentist Hyderabad",
        description: "Review clinic standards, patient feedback, treatment areas and request a dental appointment in Hyderabad.",
        canonicalPath: "/",
        indexable: true,
        structuredDataTypes: ["Dentist"],
      },
    }],
    navigation: [{ label: "Home", href: "/" }],
    integrations: [],
    domains: [],
  });
}

test("Dental 18 Proof First passes curated responsive safety gates", async ({ page }) => {
  await runDentalBlueprintCertification({
    page,
    layoutId: LAYOUT_ID,
    site: sourceSite(),
    outputName: "dental-layout-blueprint-18",
    profile: {
      industry: "dental clinic",
      subindustry: "general dentistry",
      goals: ["build trust", "book appointment"],
      style_tags: ["proof", "reviews", "trust", "professional"],
      required_capabilities: ["reviews", "booking", "contact"],
      services: ["general dentistry", "dental implants", "orthodontics"],
    },
    mobileCheck: async ({ root, width }) => {
      const composition = await root.evaluate((element) => {
        const actions = element.querySelector(".mi-hero--centered .mi-section__actions") as HTMLElement | null;
        const primary = element.querySelector(".mi-hero--centered .mi-section__action--primary") as HTMLElement | null;
        const media = element.querySelector(".mi-hero--centered .mi-section__media") as HTMLElement | null;
        const metrics = element.querySelector(".mi-proof-metrics") as HTMLElement | null;
        const metricCards = [...element.querySelectorAll(".mi-proof-metrics article")] as HTMLElement[];
        const wall = element.querySelector(".mi-proof-wall") as HTMLElement | null;
        const reviews = [...element.querySelectorAll(".mi-proof-wall blockquote")] as HTMLElement[];
        const proof = element.querySelector(".mi-proof--wall") as HTMLElement | null;
        const services = element.querySelector(".mi-services--spotlight") as HTMLElement | null;
        const serviceCards = [...element.querySelectorAll(".mi-services-spotlight .mi-service-item")] as HTMLElement[];
        const cta = element.querySelector(".mi-conv-cta--split") as HTMLElement | null;
        const contact = element.querySelector(".mi-contact-struct--split") as HTMLElement | null;
        const contactGrid = element.querySelector(".mi-contact-struct--split .mi-contact-split") as HTMLElement | null;
        const contactChildren = contactGrid ? [...contactGrid.children] as HTMLElement[] : [];
        const input = element.querySelector(".mi-functional-form input") as HTMLElement | null;
        const columns = metrics ? getComputedStyle(metrics).gridTemplateColumns.trim().split(/\s+/).filter(Boolean).length : 99;
        return {
          primaryBeforeMedia: Boolean(primary && media && primary.getBoundingClientRect().bottom < media.getBoundingClientRect().top),
          primaryWidthRatio: actions && primary ? primary.getBoundingClientRect().width / actions.getBoundingClientRect().width : 0,
          metricColumns: columns,
          metricRowsVisible: metricCards.length < 3 || metricCards[2]!.getBoundingClientRect().top > metricCards[0]!.getBoundingClientRect().top,
          reviewStacked: reviews.length < 2 || reviews[1]!.getBoundingClientRect().top >= reviews[0]!.getBoundingClientRect().bottom - 1,
          reviewOverflow: wall ? wall.scrollWidth - wall.clientWidth : 1,
          proofBeforeServices: Boolean(proof && services && proof.getBoundingClientRect().top < services.getBoundingClientRect().top),
          proofServiceGap: proof && services ? services.getBoundingClientRect().top - proof.getBoundingClientRect().bottom : 999,
          servicesStacked: serviceCards.length < 2 || serviceCards[1]!.getBoundingClientRect().top >= serviceCards[0]!.getBoundingClientRect().bottom - 1,
          ctaBeforeContact: Boolean(cta && contact && cta.getBoundingClientRect().top < contact.getBoundingClientRect().top),
          contactStacked: contactChildren.length < 2 || contactChildren[1]!.getBoundingClientRect().top > contactChildren[0]!.getBoundingClientRect().top,
          inputFontSize: input ? parseFloat(getComputedStyle(input).fontSize) : 0,
        };
      });

      expect(composition.primaryBeforeMedia, `${width}px appointment action should precede supporting hero media`).toBeTruthy();
      expect(composition.primaryWidthRatio, `${width}px primary hero CTA should be thumb-friendly`).toBeGreaterThan(.82);
      expect(composition.metricColumns, `${width}px trust metrics should use at most two columns`).toBeLessThanOrEqual(2);
      expect(composition.metricRowsVisible, `${width}px trust metrics should wrap into readable rows`).toBeTruthy();
      expect(composition.reviewStacked, `${width}px reviews should stack instead of becoming a carousel`).toBeTruthy();
      expect(composition.reviewOverflow, `${width}px review wall must not scroll sideways`).toBeLessThanOrEqual(1);
      expect(composition.proofBeforeServices, `${width}px patient proof must remain before treatment content`).toBeTruthy();
      expect(composition.proofServiceGap, `${width}px proof should flow directly into treatment discovery`).toBeLessThanOrEqual(2);
      expect(composition.servicesStacked, `${width}px treatment content should stack after proof`).toBeTruthy();
      expect(composition.ctaBeforeContact, `${width}px conversion CTA must stay above the contact form`).toBeTruthy();
      expect(composition.contactStacked, `${width}px contact content should stack`).toBeTruthy();
      expect(composition.inputFontSize, `${width}px form fields should avoid mobile browser zoom`).toBeGreaterThanOrEqual(16);
    },
  });
});
