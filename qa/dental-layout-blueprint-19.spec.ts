import { expect, test } from "@playwright/test";
import { SCHEMA_VERSION, siteSchema, type Site } from "@micirql/schema";
import { sectionDesignId, type SectionFamily } from "@micirql/sections";
import { INDUSTRY_DESIGN_PRESETS } from "../apps/builder/app/industry-design-preset-data";
import { runDentalBlueprintCertification } from "./dental-blueprint-qa";

const LAYOUT_ID = "dental-19-minimal-white";

function section(id: string, family: SectionFamily, theme: Site["theme"]["family"], props: Record<string, unknown>) {
  return { id, component: { componentId: sectionDesignId(theme, family, 1), version: "1.0.0" }, props, bindings: {}, hidden: false };
}

function sourceSite(): Site {
  const preset = INDUSTRY_DESIGN_PRESETS.find((item) => item.id === "dental-clinic");
  if (!preset) throw new Error("Dental design preset is missing.");
  const theme = structuredClone(preset.theme);
  theme.brand.colors = {
    ...theme.brand.colors,
    primary: "#315d6d",
    secondary: "#1f2d31",
    accent: "#9ca89d",
    background: "#fcfbf7",
    surface: "#f7f7f3",
    textPrimary: "#1f2d31",
    textSecondary: "#6d787b",
    border: "#d9dddc",
  };
  theme.brand.typography = { ...theme.brand.typography, display: "Georgia", body: "Inter", ui: "Inter" };
  theme.brand.density = "spacious";
  theme.brand.shape = "balanced";
  theme.brand.motion = "subtle";
  const family = theme.family;

  const sections = [
    section("nav", "navbar", family, {
      title: "Stillpoint Dental Studio",
      description: "Restorative, cosmetic and implant dentistry · Hyderabad",
      items: [
        { title: "Care", href: "#services" },
        { title: "Dentist", href: "#doctor" },
        { title: "Studio", href: "#gallery" },
        { title: "Contact", href: "#contact" },
      ],
      primaryAction: { label: "Book consultation", href: "#contact" },
    }),
    section("hero", "hero", family, {
      eyebrow: "Quiet, considered dental care",
      title: "Clear treatment planning with less visual noise",
      description: "A restrained clinic website should help patients understand the dentist, the care available and the next step without surrounding every decision with cards, badges or unnecessary decoration.",
      image: { src: "https://images.unsplash.com/photo-1606811971618-4486d14f3f99?auto=format&fit=crop&w=1500&q=80", alt: "Dentist discussing treatment planning in a calm clinic" },
      primaryAction: { label: "Request consultation", href: "#contact" },
      secondaryAction: { label: "Explore care", href: "#services" },
    }),
    section("services", "services", family, {
      eyebrow: "Care areas",
      title: "A concise guide to the conversations we can start",
      description: "The website introduces areas of care. Individual suitability, diagnosis and treatment recommendations still depend on a clinical assessment.",
      items: [
        { title: "General dentistry", description: "Assessment, preventive care and restorative treatment based on current findings." },
        { title: "Restorative care", description: "Planning for damaged, worn or missing teeth with function and maintenance in mind." },
        { title: "Cosmetic consultation", description: "Discuss appearance goals alongside oral health, function and realistic expectations." },
        { title: "Dental implants", description: "Consultation-led planning for suitable missing-tooth replacement cases." },
        { title: "Root canal care", description: "Assessment and treatment planning for teeth affected by pulpal or root concerns." },
        { title: "Preventive review", description: "Ongoing examination and maintenance planning based on individual needs." },
      ],
    }),
    section("doctor", "team", family, {
      eyebrow: "Your dentist",
      title: "Clinical responsibility should be visible and easy to verify",
      description: "Publish the real clinician name, qualifications, registration and treatment interests supplied directly by the practice.",
      items: [
        { title: "Lead Dentist", description: "Add the verified clinician name, qualifications, registration and relevant treatment focus supplied by the clinic.", image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=1100&q=80" },
        { title: "Assessment first", description: "Recommendations follow examination and any appropriate records rather than website assumptions." },
        { title: "Explain the options", description: "Patients should understand alternatives, limitations and next steps before deciding." },
        { title: "Plan the follow-up", description: "Ongoing review and maintenance are part of the treatment conversation where relevant." },
      ],
    }),
    section("gallery", "gallery", family, {
      eyebrow: "Selected views",
      title: "A few useful images are stronger than a crowded image feed",
      description: "Use authentic clinic, clinician and treatment-environment photography that helps patients understand the practice before they arrive.",
      items: [
        { title: "Consultation space", description: "Show the real environment where treatment conversations take place.", image: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1200&q=80" },
        { title: "Clinical setting", description: "Use genuine practice photography with a factual caption.", image: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=1200&q=80" },
        { title: "Planning", description: "Show real planning or diagnostic workflow only when it reflects the clinic's actual process.", image: "https://images.unsplash.com/photo-1609840114035-3c981b782dfe?auto=format&fit=crop&w=1200&q=80" },
        { title: "Patient experience", description: "Choose imagery that supports practical understanding rather than decorative stock-photo volume.", image: "https://images.unsplash.com/photo-1598256989800-fe5f95da9787?auto=format&fit=crop&w=1200&q=80" },
      ],
    }),
    section("proof", "testimonials", family, {
      eyebrow: "Patient perspective",
      title: "Clarity is part of the experience",
      description: "Use only genuine, approved patient feedback on the published website.",
      items: [{ title: "Verified patient review", description: "The website was simple to understand, and the consultation was the same: the dentist explained what they could see, what needed checking and what the possible next steps were." }],
    }),
    section("cta", "cta", family, {
      eyebrow: "Next step",
      title: "Begin with a consultation, not a predetermined treatment",
      description: "Share what you would like help with and let the clinic confirm the most appropriate appointment type.",
      primaryAction: { label: "Request consultation", href: "#contact" },
      secondaryAction: { label: "Call clinic", href: "tel:+910000000000" },
    }),
    section("contact", "contact", family, {
      eyebrow: "Contact",
      title: "Tell the clinic what you would like to discuss",
      description: "Send your preferred contact details and a short note. The team can reply with suitable appointment options.",
      formAction: "/api/forms/appointment",
      formActionId: "appointment.request",
      primaryAction: { label: "Send consultation request", href: "#enquiry" },
    }),
    section("footer", "footer", family, {
      title: "Stillpoint Dental Studio",
      description: "Quiet, considered dentistry with clear treatment planning and simple appointment access.",
      items: [
        { title: "Care", href: "#services" },
        { title: "Dentist", href: "#doctor" },
        { title: "Studio", href: "#gallery" },
        { title: "Contact", href: "#contact" },
      ],
      primaryAction: { label: "Book consultation", href: "#contact" },
    }),
  ];

  return siteSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    siteId: "dental-blueprint-19",
    workspaceId: "dental-blueprint-certification",
    name: "Stillpoint Dental Studio",
    domain: "clinic",
    subtype: "dental",
    theme,
    seoBlueprint: {
      primaryGoal: "Book dental consultations",
      targetLocations: ["Hyderabad"],
      priorityTopics: ["General dentistry", "Restorative dentistry", "Dental implants", "Cosmetic dentistry"],
      audiences: ["Dental patients seeking consultation-led care"],
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
        title: "Stillpoint Dental Studio | Dentist Hyderabad",
        description: "Explore consultation-led dental care, meet the dentist and request an appointment in Hyderabad.",
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

test("Dental 19 Quiet Precision passes curated responsive safety gates", async ({ page }) => {
  await runDentalBlueprintCertification({
    page,
    layoutId: LAYOUT_ID,
    site: sourceSite(),
    outputName: "dental-layout-blueprint-19",
    profile: {
      industry: "dental clinic",
      subindustry: "general dentistry",
      goals: ["build trust", "book appointment"],
      style_tags: ["minimal", "precision", "quiet", "modern"],
      required_capabilities: ["booking", "contact"],
      services: ["general dentistry", "restorative care", "dental implants", "cosmetic consultation"],
    },
    mobileCheck: async ({ root, width }) => {
      const composition = await root.evaluate((element) => {
        const container = element.querySelector(".mi-hero--editorial .mi-container") as HTMLElement | null;
        const heroCopy = element.querySelector(".mi-hero--editorial .mi-hero__copy") as HTMLElement | null;
        const heroMedia = element.querySelector(".mi-hero--editorial .mi-section__media") as HTMLElement | null;
        const heroTitle = element.querySelector(".mi-hero--editorial .mi-type--display") as HTMLElement | null;
        const serviceCards = [...element.querySelectorAll(".mi-services-spotlight .mi-service-item")] as HTMLElement[];
        const gallery = element.querySelector(".mi-gallery-mosaic") as HTMLElement | null;
        const galleryCards = [...element.querySelectorAll(".mi-gallery-mosaic .mi-gallery-card")] as HTMLElement[];
        const captions = [...element.querySelectorAll(".mi-gallery-mosaic figcaption")] as HTMLElement[];
        const galleryImages = [...element.querySelectorAll(".mi-gallery-mosaic img")] as HTMLElement[];
        const cta = element.querySelector(".mi-conv-cta--split") as HTMLElement | null;
        const contact = element.querySelector(".mi-contact-struct--split") as HTMLElement | null;
        const inputs = [...element.querySelectorAll(".mi-contact-struct--split input, .mi-contact-struct--split textarea, .mi-contact-struct--split select")] as HTMLElement[];
        const containerStyle = container ? getComputedStyle(container) : null;
        const firstImageRect = galleryImages[0]?.getBoundingClientRect();
        const secondImageRect = galleryImages[1]?.getBoundingClientRect();
        return {
          sidePadding: containerStyle ? Math.min(parseFloat(containerStyle.paddingLeft), parseFloat(containerStyle.paddingRight)) : 0,
          copyBeforeMedia: Boolean(heroCopy && heroMedia && heroCopy.getBoundingClientRect().top < heroMedia.getBoundingClientRect().top),
          titleContained: Boolean(heroTitle && heroTitle.scrollWidth <= heroTitle.clientWidth + 1),
          servicesStacked: serviceCards.length < 2 || serviceCards[1]!.getBoundingClientRect().top >= serviceCards[0]!.getBoundingClientRect().bottom - 1,
          galleryOverflow: gallery ? gallery.scrollWidth - gallery.clientWidth : 1,
          galleryStacked: galleryCards.length < 2 || galleryCards[1]!.getBoundingClientRect().top >= galleryCards[0]!.getBoundingClientRect().bottom - 1,
          captionsStatic: captions.every((caption) => getComputedStyle(caption).position === "static"),
          imageRatiosMatch: Boolean(firstImageRect && secondImageRect && Math.abs((firstImageRect.width / firstImageRect.height) - (secondImageRect.width / secondImageRect.height)) < .05),
          ctaBeforeContact: Boolean(cta && contact && cta.getBoundingClientRect().top < contact.getBoundingClientRect().top),
          inputsMobileSafe: inputs.every((input) => parseFloat(getComputedStyle(input).fontSize) >= 16),
        };
      });
      expect(composition.sidePadding, `${width}px content needs at least 18px side padding`).toBeGreaterThanOrEqual(18);
      expect(composition.copyBeforeMedia, `${width}px hero copy should remain in normal flow before imagery`).toBeTruthy();
      expect(composition.titleContained, `${width}px typography must not create horizontal overflow`).toBeTruthy();
      expect(composition.servicesStacked, `${width}px treatment rows should stack`).toBeTruthy();
      expect(composition.galleryOverflow, `${width}px gallery must not scroll sideways`).toBeLessThanOrEqual(1);
      expect(composition.galleryStacked, `${width}px gallery should become a single-column narrative`).toBeTruthy();
      expect(composition.captionsStatic, `${width}px captions should remain below imagery`).toBeTruthy();
      expect(composition.imageRatiosMatch, `${width}px gallery imagery should use a consistent mobile ratio`).toBeTruthy();
      expect(composition.ctaBeforeContact, `${width}px appointment CTA should remain above the contact form`).toBeTruthy();
      expect(composition.inputsMobileSafe, `${width}px form controls should use 16px minimum text`).toBeTruthy();
    },
  });
});
