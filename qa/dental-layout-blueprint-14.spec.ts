import { expect, test } from "@playwright/test";
import { SCHEMA_VERSION, siteSchema, type Site } from "@micirql/schema";
import { sectionDesignId, type SectionFamily } from "@micirql/sections";
import { INDUSTRY_DESIGN_PRESETS } from "../apps/builder/app/industry-design-preset-data";
import { runDentalBlueprintCertification } from "./dental-blueprint-qa";

const LAYOUT_ID = "dental-14-city-clinic";

function section(id: string, family: SectionFamily, theme: Site["theme"]["family"], props: Record<string, unknown>) {
  return { id, component: { componentId: sectionDesignId(theme, family, 1), version: "1.0.0" }, props, bindings: {}, hidden: false };
}

function sourceSite(): Site {
  const preset = INDUSTRY_DESIGN_PRESETS.find((item) => item.id === "dental-clinic");
  if (!preset) throw new Error("Dental design preset is missing.");
  const theme = structuredClone(preset.theme);
  theme.brand.colors = {
    ...theme.brand.colors,
    primary: "#237e8b",
    secondary: "#18333b",
    accent: "#829b78",
    background: "#fbfdfc",
    surface: "#eef2f0",
    textPrimary: "#18333b",
    textSecondary: "#63777c",
    border: "#d0dfdd",
  };
  theme.brand.typography = { ...theme.brand.typography, display: "Inter", body: "Inter", ui: "Inter" };
  theme.brand.density = "comfortable";
  theme.brand.shape = "balanced";
  theme.brand.motion = "subtle";
  const family = theme.family;

  const sections = [
    section("nav", "navbar", family, {
      title: "Metro Dental Studio",
      description: "Modern dentistry near the city centre · Hyderabad",
      items: [
        { title: "Treatments", href: "#services" },
        { title: "Technology", href: "#technology" },
        { title: "Dentist", href: "#doctor" },
        { title: "Location", href: "#contact" },
      ],
      primaryAction: { label: "Book appointment", href: "#contact" },
    }),
    section("hero", "hero", family, {
      eyebrow: "City access · modern care",
      title: "A modern dental clinic designed to fit more easily into the city day",
      description: "Find the clinic, understand the main treatment areas and request an appointment without working through a crowded website first.",
      image: { src: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1500&q=80", alt: "Contemporary dental clinic close to an urban centre" },
      primaryAction: { label: "Request appointment", href: "#contact" },
      secondaryAction: { label: "See treatments", href: "#services" },
    }),
    section("services", "services", family, {
      eyebrow: "Treatment areas",
      title: "Start with the care area closest to what you need",
      description: "The consultation determines what is appropriate. This overview simply helps patients reach the right clinical conversation faster.",
      items: [
        { title: "General dentistry", description: "Routine assessment, preventive care and common restorative treatment." },
        { title: "Dental implants", description: "Consultation-led planning for suitable missing-tooth replacement cases." },
        { title: "Cosmetic planning", description: "Discuss appearance goals alongside oral health, function and realistic outcomes." },
        { title: "Root canal care", description: "Assessment and treatment planning for teeth affected by pulpal or root concerns." },
        { title: "Orthodontic consultation", description: "Review alignment goals and the treatment options that may be appropriate." },
        { title: "Restorative care", description: "Plan treatment for damaged, worn or missing teeth with attention to long-term function." },
      ],
    }),
    section("technology", "features", family, {
      eyebrow: "Modern clinical workflow",
      title: "Technology should make assessment and communication clearer",
      description: "Only describe systems genuinely used by the clinic, and connect every feature to a practical role in diagnosis, planning or communication.",
      items: [
        { title: "Digital records", description: "Use appropriate records and imaging to support clinical assessment where indicated." },
        { title: "Treatment planning", description: "Organise relevant findings so options and sequence are easier to explain." },
        { title: "Visual communication", description: "Help patients understand findings and proposed next steps before making treatment decisions." },
      ],
    }),
    section("doctor", "team", family, {
      eyebrow: "Clinical team",
      title: "Know who is responsible for your treatment decisions",
      description: "Publish verified clinician names, qualifications, registrations and treatment focus supplied directly by the practice.",
      items: [
        { title: "Lead Dentist", description: "Add verified qualifications, registration and clinical interests supplied by the clinic.", image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=1100&q=80" },
        { title: "Clinical support", description: "Supports preparation, chairside care and follow-up guidance." },
        { title: "Patient desk", description: "Helps with appointment timing, directions and practical questions." },
      ],
    }),
    section("proof", "testimonials", family, {
      eyebrow: "Patient perspective",
      title: "Convenience matters most when the clinical explanation is clear too",
      description: "Use only genuine, approved patient feedback on the published website.",
      items: [{ title: "Verified patient review", description: "The clinic was easy to reach, the appointment process was simple and the dentist explained the treatment options clearly before I decided what to do next." }],
    }),
    section("cta", "cta", family, {
      eyebrow: "Plan your visit",
      title: "Request an appointment and let the clinic confirm the right visit type",
      description: "Share the reason for your visit and the team can respond with suitable appointment options.",
      primaryAction: { label: "Request appointment", href: "#contact" },
      secondaryAction: { label: "Call clinic", href: "tel:+910000000000" },
    }),
    section("contact", "contact", family, {
      eyebrow: "Location and contact",
      title: "Request an appointment at the city clinic",
      description: "Add the verified clinic address, access notes and contact details here. Send your preferred details and the team can confirm appointment options directly.",
      formAction: "/api/forms/appointment",
      formActionId: "appointment.request",
      primaryAction: { label: "Send appointment request", href: "#enquiry" },
    }),
    section("footer", "footer", family, {
      title: "Metro Dental Studio",
      description: "Modern dental care with a clear route to treatment information, location and booking.",
      items: [
        { title: "Treatments", href: "#services" },
        { title: "Technology", href: "#technology" },
        { title: "Dentist", href: "#doctor" },
        { title: "Location", href: "#contact" },
      ],
      primaryAction: { label: "Book appointment", href: "#contact" },
    }),
  ];

  return siteSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    siteId: "dental-blueprint-14",
    workspaceId: "dental-blueprint-certification",
    name: "Metro Dental Studio",
    domain: "clinic",
    subtype: "dental",
    theme,
    seoBlueprint: {
      primaryGoal: "Book dental appointments",
      targetLocations: ["Hyderabad"],
      priorityTopics: ["General dentistry", "Dental implants", "Cosmetic dentistry"],
      audiences: ["Urban dental patients"],
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
        title: "Metro Dental Studio | Modern Dentist Hyderabad",
        description: "Explore modern dental care, clinic access and request an appointment in Hyderabad.",
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

test("Dental 14 City Clinic passes curated responsive safety gates", async ({ page }) => {
  await runDentalBlueprintCertification({
    page,
    layoutId: LAYOUT_ID,
    site: sourceSite(),
    outputName: "dental-layout-blueprint-14",
    profile: {
      industry: "dental clinic",
      subindustry: "general dentistry",
      goals: ["book appointment", "build trust"],
      style_tags: ["urban", "modern", "location", "clean"],
      required_capabilities: ["booking", "contact", "location"],
      services: ["general dentistry", "dental implants", "cosmetic planning"],
    },
    mobileCheck: async ({ root, width }) => {
      const composition = await root.evaluate((element) => {
        const nav = element.querySelector(".mi-shell-navbar--floating") as HTMLElement | null;
        const heroActions = element.querySelector(".mi-hero--media-first .mi-section__actions") as HTMLElement | null;
        const primary = element.querySelector(".mi-hero--media-first .mi-section__action--primary") as HTMLElement | null;
        const media = element.querySelector(".mi-hero--media-first .mi-section__media") as HTMLElement | null;
        const mediaImage = element.querySelector(".mi-hero--media-first .mi-section__media img") as HTMLElement | null;
        const serviceCards = [...element.querySelectorAll(".mi-services-spotlight .mi-service-item")] as HTMLElement[];
        const featureItems = [...element.querySelectorAll(".mi-features--split .mi-feature-item--list")] as HTMLElement[];
        const contact = element.querySelector(".mi-contact-struct--split .mi-contact-split") as HTMLElement | null;
        const contactChildren = contact ? [...contact.children] as HTMLElement[] : [];
        const firstSection = element.querySelector("section") as HTMLElement | null;
        const mediaRect = mediaImage?.getBoundingClientRect();
        return {
          navSticky: Boolean(nav && getComputedStyle(nav).position === "sticky"),
          anchorClearance: firstSection ? parseFloat(getComputedStyle(firstSection).scrollMarginTop) : 0,
          primaryBeforeMedia: Boolean(primary && media && primary.getBoundingClientRect().bottom < media.getBoundingClientRect().top),
          primaryWidthRatio: heroActions && primary ? primary.getBoundingClientRect().width / heroActions.getBoundingClientRect().width : 0,
          mediaRatio: mediaRect && mediaRect.height > 0 ? mediaRect.width / mediaRect.height : 0,
          servicesStacked: serviceCards.length < 2 || serviceCards[1]!.getBoundingClientRect().top >= serviceCards[0]!.getBoundingClientRect().bottom - 1,
          technologyVertical: featureItems.length < 2 || featureItems[1]!.getBoundingClientRect().top > featureItems[0]!.getBoundingClientRect().top,
          contactStacked: contactChildren.length < 2 || contactChildren[1]!.getBoundingClientRect().top > contactChildren[0]!.getBoundingClientRect().top,
        };
      });
      expect(composition.navSticky, `${width}px city navigation should remain sticky`).toBeTruthy();
      expect(composition.anchorClearance, `${width}px sections need enough scroll margin to clear sticky navigation`).toBeGreaterThanOrEqual(72);
      expect(composition.primaryBeforeMedia, `${width}px appointment action should lead the location visual`).toBeTruthy();
      expect(composition.primaryWidthRatio, `${width}px primary appointment action should be thumb-friendly`).toBeGreaterThan(.82);
      expect(composition.mediaRatio, `${width}px location visual should keep a safe fixed aspect ratio`).toBeGreaterThan(1.2);
      expect(composition.mediaRatio, `${width}px location visual should keep a safe fixed aspect ratio`).toBeLessThan(1.46);
      expect(composition.servicesStacked, `${width}px treatment cards should stack vertically`).toBeTruthy();
      expect(composition.technologyVertical, `${width}px technology details should remain vertical`).toBeTruthy();
      expect(composition.contactStacked, `${width}px location/contact content should stack`).toBeTruthy();
    },
  });
});
