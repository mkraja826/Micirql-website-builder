import { expect, test } from "@playwright/test";
import { SCHEMA_VERSION, siteSchema, type Site } from "@micirql/schema";
import { sectionDesignId, type SectionFamily } from "@micirql/sections";
import { INDUSTRY_DESIGN_PRESETS } from "../apps/builder/app/industry-design-preset-data";
import { runDentalBlueprintCertification } from "./dental-blueprint-qa";

const LAYOUT_ID = "dental-16-multi-specialty";

function section(id: string, family: SectionFamily, theme: Site["theme"]["family"], props: Record<string, unknown>) {
  return { id, component: { componentId: sectionDesignId(theme, family, 1), version: "1.0.0" }, props, bindings: {}, hidden: false };
}

function sourceSite(): Site {
  const preset = INDUSTRY_DESIGN_PRESETS.find((item) => item.id === "dental-clinic");
  if (!preset) throw new Error("Dental design preset is missing.");
  const theme = structuredClone(preset.theme);
  theme.brand.colors = {
    ...theme.brand.colors,
    primary: "#237b8a",
    secondary: "#17343d",
    accent: "#6ba2ba",
    background: "#fbfdfe",
    surface: "#eef6f8",
    textPrimary: "#17343d",
    textSecondary: "#647982",
    border: "#cfe0e5",
  };
  theme.brand.typography = { ...theme.brand.typography, display: "Inter", body: "Inter", ui: "Inter" };
  theme.brand.density = "compact";
  theme.brand.shape = "balanced";
  theme.brand.motion = "subtle";
  const family = theme.family;

  const navigationGroups = [
    {
      label: "Treatments",
      items: [
        { title: "General dentistry", href: "#services" },
        { title: "Dental implants", href: "#services" },
        { title: "Orthodontics", href: "#services" },
        { title: "Root canal care", href: "#services" },
      ],
    },
    {
      label: "Clinical team",
      items: [
        { title: "Lead dentist", href: "#doctor" },
        { title: "Implant clinician", href: "#doctor" },
        { title: "Orthodontic clinician", href: "#doctor" },
      ],
    },
    {
      label: "Patient information",
      items: [
        { title: "Technology", href: "#technology" },
        { title: "How care is coordinated", href: "#process" },
        { title: "Contact and location", href: "#contact" },
      ],
    },
  ];

  const sections = [
    section("nav", "navbar", family, {
      title: "Axis Dental Centre",
      description: "Multi-specialty dentistry · Hyderabad",
      items: [
        { title: "About", href: "#doctor" },
        { title: "Contact", href: "#contact" },
      ],
      navigationGroups,
      primaryAction: { label: "Book appointment", href: "#contact" },
    }),
    section("hero", "hero", family, {
      eyebrow: "One clinic · coordinated dental care",
      title: "Find the right dental team without navigating a crowded clinic website",
      description: "Explore the main treatment groups, understand how specialists coordinate care and request an appointment through one clear clinic pathway.",
      image: { src: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1600&q=80", alt: "Modern multi-specialty dental clinic" },
      primaryAction: { label: "Request appointment", href: "#contact" },
      secondaryAction: { label: "Explore treatment groups", href: "#services" },
    }),
    section("services", "services", family, {
      eyebrow: "Treatment directory",
      title: "Choose the clinical area closest to what you need",
      description: "The clinic can coordinate referrals between clinicians when more than one area of care is involved. Final treatment decisions follow clinical assessment.",
      items: [
        { title: "General and preventive care", description: "Routine assessment, preventive planning and common restorative treatment." },
        { title: "Dental implants", description: "Consultation-led planning for suitable missing-tooth replacement cases." },
        { title: "Orthodontics", description: "Assessment of alignment concerns and appropriate braces or aligner pathways." },
        { title: "Root canal care", description: "Diagnosis and treatment planning for teeth affected by pulpal or root concerns." },
        { title: "Cosmetic dentistry", description: "Discuss appearance goals alongside oral health, function and realistic outcomes." },
        { title: "Restorative dentistry", description: "Plan care for damaged, worn or missing teeth with long-term function in mind." },
        { title: "Gum care", description: "Assessment and maintenance planning for periodontal health where appropriate." },
        { title: "Complex treatment coordination", description: "Sequence multiple clinical needs so patients understand which stage and clinician comes next." },
      ],
    }),
    section("doctor", "team", family, {
      eyebrow: "Clinical team",
      title: "One lead point of responsibility with the right expertise brought in when needed",
      description: "Publish only verified clinician names, qualifications, registrations and treatment focus supplied directly by the practice.",
      items: [
        { title: "Lead Dentist", description: "Coordinates the overall treatment plan and explains when another clinician should become involved.", image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=1100&q=80" },
        { title: "Implant clinician", description: "Add verified implant-related qualifications and experience supplied by the clinic." },
        { title: "Orthodontic clinician", description: "Add verified orthodontic qualifications and professional details supplied by the clinic." },
        { title: "Endodontic clinician", description: "Add verified training and professional details relevant to root canal care." },
      ],
    }),
    section("technology", "features", family, {
      eyebrow: "Shared clinical workflow",
      title: "Technology should help clinicians coordinate information and explain decisions clearly",
      description: "Only describe systems genuinely used by the clinic and connect every technology statement to assessment, planning or communication.",
      items: [
        { title: "Digital records", description: "Keep appropriate clinical records available to support assessment and coordinated planning." },
        { title: "Diagnostic imaging", description: "Use indicated imaging to support clinical decisions and referral between treatment areas." },
        { title: "Visual treatment planning", description: "Help patients understand findings, options and the planned sequence of care." },
        { title: "Shared review points", description: "Coordinate decisions when a case involves more than one clinician or treatment stage." },
      ],
    }),
    section("process", "process", family, {
      eyebrow: "Coordinated care",
      title: "A simple pathway even when treatment involves more than one specialty",
      description: "The exact sequence varies by patient, but responsibility and next steps should remain clear throughout the process.",
      items: [
        { title: "Initial assessment", description: "Start with the clinician or service area most relevant to the current concern." },
        { title: "Coordinate findings", description: "Bring in another clinician when specialist assessment or sequencing is required." },
        { title: "Confirm the plan", description: "Explain the recommended order, alternatives, practical commitments and costs before treatment begins." },
        { title: "Complete treatment stages", description: "Move through the agreed clinical stages with clear ownership of each decision." },
        { title: "Review and maintenance", description: "Return to appropriate review and long-term maintenance after active treatment." },
      ],
    }),
    section("proof", "testimonials", family, {
      eyebrow: "Patient perspective",
      title: "Good coordination should feel simpler to the patient, not more complicated",
      description: "Use only genuine, approved feedback on the published website.",
      items: [{ title: "Verified patient review", description: "I saw more than one clinician, but the sequence was explained clearly and I always knew who was responsible for the next step." }],
    }),
    section("cta", "cta", family, {
      eyebrow: "Not sure which department to choose?",
      title: "Start with one appointment request and let the clinic route it appropriately",
      description: "Share the main reason for your visit and the team can confirm the most suitable consultation type.",
      primaryAction: { label: "Request appointment", href: "#contact" },
      secondaryAction: { label: "Call clinic", href: "tel:+910000000000" },
    }),
    section("contact", "contact", family, {
      eyebrow: "Contact",
      title: "Request an appointment with the multi-specialty team",
      description: "Send your preferred details and the reason for your visit. The clinic can confirm the most suitable clinician and appointment type.",
      formAction: "/api/forms/appointment",
      formActionId: "appointment.request",
      primaryAction: { label: "Send appointment request", href: "#enquiry" },
    }),
    section("footer", "footer", family, {
      title: "Axis Dental Centre",
      description: "Coordinated multi-specialty dental care with clear treatment pathways and one route to booking.",
      items: [{ title: "About", href: "#doctor" }, { title: "Contact", href: "#contact" }],
      navigationGroups,
      primaryAction: { label: "Book appointment", href: "#contact" },
    }),
  ];

  return siteSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    siteId: "dental-blueprint-16",
    workspaceId: "dental-blueprint-certification",
    name: "Axis Dental Centre",
    domain: "clinic",
    subtype: "dental",
    theme,
    seoBlueprint: {
      primaryGoal: "Book dental appointments",
      targetLocations: ["Hyderabad"],
      priorityTopics: ["General dentistry", "Dental implants", "Orthodontics", "Root canal care"],
      audiences: ["Dental patients seeking multi-specialty care"],
      languages: ["en"],
      localSeo: true,
      servicePages: true,
      locationPages: true,
      blog: false,
    },
    pages: [{
      id: "home",
      path: "/",
      name: "Home",
      sections,
      seo: {
        title: "Axis Dental Centre | Multi-Specialty Dentist Hyderabad",
        description: "Explore treatment groups, meet the clinical team and request a coordinated dental appointment.",
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

test("Dental 16 Multi-Specialty Hub passes curated responsive safety gates", async ({ page }) => {
  await runDentalBlueprintCertification({
    page,
    layoutId: LAYOUT_ID,
    site: sourceSite(),
    outputName: "dental-layout-blueprint-16",
    profile: {
      industry: "dental clinic",
      subindustry: "multi-specialty dentistry",
      goals: ["book appointment", "treatment discovery"],
      style_tags: ["multi-specialty", "structured", "professional", "scannable"],
      required_capabilities: ["grouped navigation", "booking", "contact", "treatment taxonomy"],
      services: ["general dentistry", "dental implants", "orthodontics", "root canal care"],
    },
    mobileCheck: async ({ root, width }) => {
      const composition = await root.evaluate((element) => {
        const heroActions = element.querySelector(".mi-hero--centered .mi-section__actions") as HTMLElement | null;
        const heroPrimary = element.querySelector(".mi-hero--centered .mi-section__action--primary") as HTMLElement | null;
        const heroMedia = element.querySelector(".mi-hero--centered .mi-section__media") as HTMLElement | null;
        const mobileGroups = [...element.querySelectorAll(".mi-mobile-nav-group")] as HTMLElement[];
        const serviceGrid = element.querySelector(".mi-services-spotlight") as HTMLElement | null;
        const serviceCards = [...element.querySelectorAll(".mi-services-spotlight .mi-service-item")] as HTMLElement[];
        const teamLead = element.querySelector(".mi-team--featured .mi-team-card--lead") as HTMLElement | null;
        const compactTeam = [...element.querySelectorAll(".mi-team--featured .mi-team-card--compact")] as HTMLElement[];
        const featureItems = [...element.querySelectorAll(".mi-features--split .mi-feature-item--list")] as HTMLElement[];
        const processNodes = [...element.querySelectorAll(".mi-process--timeline .mi-process-node")] as HTMLElement[];
        const contact = element.querySelector(".mi-contact-struct--split .mi-contact-split") as HTMLElement | null;
        const contactChildren = contact ? [...contact.children] as HTMLElement[] : [];
        const overflow = (node: HTMLElement | null) => node ? node.scrollWidth - node.clientWidth : 1;
        return {
          primaryBeforeMedia: Boolean(heroPrimary && heroMedia && heroPrimary.getBoundingClientRect().bottom < heroMedia.getBoundingClientRect().top),
          primaryWidthRatio: heroActions && heroPrimary ? heroPrimary.getBoundingClientRect().width / heroActions.getBoundingClientRect().width : 0,
          groupedMobileNavigation: mobileGroups.length >= 3,
          serviceOverflow: overflow(serviceGrid),
          servicesStacked: serviceCards.length < 2 || serviceCards[1]!.getBoundingClientRect().top >= serviceCards[0]!.getBoundingClientRect().bottom - 1,
          leadBeforeCompactTeam: Boolean(teamLead && compactTeam.length && teamLead.getBoundingClientRect().top < compactTeam[0]!.getBoundingClientRect().top),
          compactTeamVertical: compactTeam.length < 2 || compactTeam[1]!.getBoundingClientRect().top > compactTeam[0]!.getBoundingClientRect().top,
          technologyVertical: featureItems.length < 2 || featureItems[1]!.getBoundingClientRect().top > featureItems[0]!.getBoundingClientRect().top,
          processVertical: processNodes.length < 2 || processNodes[1]!.getBoundingClientRect().top > processNodes[0]!.getBoundingClientRect().top,
          contactStacked: contactChildren.length < 2 || contactChildren[1]!.getBoundingClientRect().top > contactChildren[0]!.getBoundingClientRect().top,
        };
      });
      expect(composition.primaryBeforeMedia, `${width}px appointment action should lead supporting clinic imagery`).toBeTruthy();
      expect(composition.primaryWidthRatio, `${width}px appointment action should be thumb-friendly`).toBeGreaterThan(.82);
      expect(composition.groupedMobileNavigation, `${width}px grouped clinic navigation should remain available in the mobile drawer`).toBeTruthy();
      expect(composition.serviceOverflow, `${width}px treatment taxonomy must not create nested horizontal scrolling`).toBeLessThanOrEqual(1);
      expect(composition.servicesStacked, `${width}px treatment taxonomy should become vertical tap rows`).toBeTruthy();
      expect(composition.leadBeforeCompactTeam, `${width}px lead clinician should remain before the compact specialty team`).toBeTruthy();
      expect(composition.compactTeamVertical, `${width}px specialty clinicians should remain a vertical list`).toBeTruthy();
      expect(composition.technologyVertical, `${width}px shared clinical workflow details should remain vertical`).toBeTruthy();
      expect(composition.processVertical, `${width}px coordinated care journey should read vertically`).toBeTruthy();
      expect(composition.contactStacked, `${width}px appointment contact area should stack`).toBeTruthy();
    },
  });
});
