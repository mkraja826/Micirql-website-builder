import { expect, test } from "@playwright/test";
import { SCHEMA_VERSION, siteSchema, type Site } from "@micirql/schema";
import { sectionDesignId, type SectionFamily } from "@micirql/sections";
import { INDUSTRY_DESIGN_PRESETS } from "../apps/builder/app/industry-design-preset-data";
import { runDentalBlueprintCertification } from "./dental-blueprint-qa";

const LAYOUT_ID = "dental-15-smile-campaign";

function section(id: string, family: SectionFamily, theme: Site["theme"]["family"], props: Record<string, unknown>) {
  return { id, component: { componentId: sectionDesignId(theme, family, 1), version: "1.0.0" }, props, bindings: {}, hidden: false };
}

function sourceSite(): Site {
  const preset = INDUSTRY_DESIGN_PRESETS.find((item) => item.id === "dental-clinic");
  if (!preset) throw new Error("Dental design preset is missing.");
  const theme = structuredClone(preset.theme);
  theme.brand.colors = {
    ...theme.brand.colors,
    primary: "#7558c9",
    secondary: "#24213a",
    accent: "#55b8aa",
    background: "#fcfbff",
    surface: "#f2edff",
    textPrimary: "#29253c",
    textSecondary: "#6d687c",
    border: "#ddd5f0",
  };
  theme.brand.typography = { ...theme.brand.typography, display: "Inter", body: "Inter", ui: "Inter" };
  theme.brand.density = "comfortable";
  theme.brand.shape = "soft";
  theme.brand.motion = "subtle";
  const family = theme.family;

  const sections = [
    section("nav", "navbar", family, {
      title: "Muse Smile Studio",
      description: "Cosmetic dental consultations · Hyderabad",
      items: [
        { title: "Smile cases", href: "#gallery" },
        { title: "Treatments", href: "#services" },
        { title: "Dentist", href: "#doctor" },
        { title: "Consultation", href: "#contact" },
      ],
      primaryAction: { label: "Book smile consultation", href: "#contact" },
    }),
    section("hero", "hero", family, {
      eyebrow: "Cosmetic dentistry with a consultation-first approach",
      title: "Your new smile starts with a consultation built around you",
      description: "Explore cosmetic treatment questions, review responsibly presented case imagery and request a consultation to discuss health, function, appearance goals and realistic options.",
      image: { src: "https://images.unsplash.com/photo-1606811971618-4486d14f3f99?auto=format&fit=crop&w=1500&q=80", alt: "Patient discussing cosmetic dental goals with a clinician" },
      primaryAction: { label: "Request cosmetic consultation", href: "#contact" },
      secondaryAction: { label: "View smile cases", href: "#gallery" },
    }),
    section("gallery", "gallery", family, {
      eyebrow: "Smile case stories",
      title: "Show outcomes with context instead of turning cases into promises",
      description: "Use only verified, consented patient media. Initial and follow-up images should be clearly labelled and never imply that the same result is guaranteed for another person.",
      items: [
        { title: "Case 01 · Initial view", description: "Placeholder for verified, consented starting imagery with factual case context.", image: "https://images.unsplash.com/photo-1609840114035-3c981b782dfe?auto=format&fit=crop&w=1200&q=80" },
        { title: "Case 01 · Reviewed follow-up", description: "Placeholder for the corresponding approved follow-up image. Outcomes vary by patient.", image: "https://images.unsplash.com/photo-1606811971618-4486d14f3f99?auto=format&fit=crop&w=1200&q=80" },
        { title: "Planning detail", description: "Use appropriate images to explain planning rather than promise a particular finish.", image: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=1200&q=80" },
        { title: "Clinic experience", description: "Authentic practice photography can support the story without replacing clinical information.", image: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1200&q=80" },
        { title: "Consultation-led care", description: "Every visual should point back to assessment, suitability and an individual treatment plan.", image: "https://images.unsplash.com/photo-1598256989800-fe5f95da9787?auto=format&fit=crop&w=1200&q=80" },
      ],
    }),
    section("services", "services", family, {
      eyebrow: "Cosmetic treatment questions",
      title: "Start with the change you want to understand better",
      description: "The consultation determines suitability. The website should explain common cosmetic pathways without recommending treatment before assessment.",
      items: [
        { title: "Smile makeover consultation", description: "Discuss multiple appearance goals and how health, function and sequencing affect the plan." },
        { title: "Veneer consultation", description: "Review whether veneers, alternative restorative options or no treatment may be appropriate." },
        { title: "Teeth whitening", description: "Discuss whitening suitability, expectations and maintenance after oral-health review." },
        { title: "Composite bonding", description: "Explore additive restorative changes where clinically suitable." },
        { title: "Alignment before cosmetic care", description: "Consider orthodontic movement where position affects the safest restorative plan." },
        { title: "Restorative cosmetic planning", description: "Balance appearance goals with structure, bite, maintenance and long-term care." },
      ],
    }),
    section("proof", "testimonials", family, {
      eyebrow: "Patient perspective",
      title: "The strongest proof is a patient who understood the choices",
      description: "Publish only genuine, approved feedback from the clinic.",
      items: [{ title: "Verified cosmetic consultation review", description: "I came in with an idea of what I wanted, but the consultation helped me understand the options, limitations and what would suit my teeth before I chose anything." }],
    }),
    section("doctor", "team", family, {
      eyebrow: "Clinical direction",
      title: "Cosmetic planning still begins with a dentist responsible for the clinical decision",
      description: "Use verified clinician names, qualifications, registrations and treatment interests supplied by the practice.",
      items: [
        { title: "Cosmetic Dentist", description: "Add the verified clinician name, qualifications, registration and relevant experience supplied by the clinic.", image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=1100&q=80" },
        { title: "Planning philosophy", description: "Explain how appearance goals are balanced with health, function and maintainability." },
        { title: "Review and maintenance", description: "Clarify how long-term reviews and maintenance fit into cosmetic treatment decisions." },
      ],
    }),
    section("cta", "cta", family, {
      eyebrow: "Ready to discuss your smile?",
      title: "Start with a cosmetic consultation, not a treatment assumption",
      description: "Share what you would like to change and let the clinic explain the appropriate assessment and possible options.",
      primaryAction: { label: "Request cosmetic consultation", href: "#contact" },
      secondaryAction: { label: "Call clinic", href: "tel:+910000000000" },
    }),
    section("contact", "contact", family, {
      eyebrow: "Consultation",
      title: "Tell the clinic what you would like to discuss",
      description: "Send your preferred contact details and a short note about your goals so the team can confirm the most suitable consultation type.",
      formAction: "/api/forms/appointment",
      formActionId: "appointment.request",
      primaryAction: { label: "Send consultation request", href: "#enquiry" },
    }),
    section("footer", "footer", family, {
      title: "Muse Smile Studio",
      description: "Cosmetic dentistry presented with clear choices, responsible case stories and consultation-first planning.",
      items: [
        { title: "Smile cases", href: "#gallery" },
        { title: "Treatments", href: "#services" },
        { title: "Dentist", href: "#doctor" },
        { title: "Consultation", href: "#contact" },
      ],
      primaryAction: { label: "Book smile consultation", href: "#contact" },
    }),
  ];

  return siteSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    siteId: "dental-blueprint-15",
    workspaceId: "dental-blueprint-certification",
    name: "Muse Smile Studio",
    domain: "clinic",
    subtype: "dental",
    theme,
    seoBlueprint: {
      primaryGoal: "Book cosmetic dental consultations",
      targetLocations: ["Hyderabad"],
      priorityTopics: ["Cosmetic dentistry", "Veneers", "Smile makeover consultation"],
      audiences: ["Cosmetic dental patients"],
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
        title: "Muse Smile Studio | Cosmetic Dentist Hyderabad",
        description: "Explore cosmetic dental options, responsible smile case stories and request a consultation.",
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

test("Dental 15 Smile Campaign passes curated responsive safety gates", async ({ page }) => {
  await runDentalBlueprintCertification({
    page,
    layoutId: LAYOUT_ID,
    site: sourceSite(),
    outputName: "dental-layout-blueprint-15",
    profile: {
      industry: "dental clinic",
      subindustry: "cosmetic dentistry",
      goals: ["cosmetic consultation", "show outcomes"],
      style_tags: ["cosmetic", "bold", "campaign", "conversion"],
      required_capabilities: ["gallery", "booking", "contact"],
      services: ["veneers", "teeth whitening", "composite bonding"],
    },
    mobileCheck: async ({ root, width }) => {
      const composition = await root.evaluate((element) => {
        const heroCopy = element.querySelector(".mi-hero--editorial .mi-hero__copy") as HTMLElement | null;
        const headline = element.querySelector(".mi-hero--editorial .mi-type--display") as HTMLElement | null;
        const heroActions = element.querySelector(".mi-hero--editorial .mi-section__actions") as HTMLElement | null;
        const primary = element.querySelector(".mi-hero--editorial .mi-section__action--primary") as HTMLElement | null;
        const media = element.querySelector(".mi-hero--editorial .mi-section__media") as HTMLElement | null;
        const gallery = element.querySelector(".mi-gallery-mosaic") as HTMLElement | null;
        const cards = [...element.querySelectorAll(".mi-gallery-mosaic .mi-gallery-card")] as HTMLElement[];
        const captions = [...element.querySelectorAll(".mi-gallery-mosaic figcaption")] as HTMLElement[];
        const serviceCards = [...element.querySelectorAll(".mi-services-spotlight .mi-service-item")] as HTMLElement[];
        const proof = element.querySelector(".mi-proof--quote") as HTMLElement | null;
        const doctor = element.querySelector(".mi-team--featured") as HTMLElement | null;
        const contact = element.querySelector(".mi-contact-struct--split .mi-contact-split") as HTMLElement | null;
        const contactChildren = contact ? [...contact.children] as HTMLElement[] : [];
        const words = headline?.textContent?.trim().split(/\s+/).filter(Boolean).length ?? 99;
        return {
          copyBeforeMedia: Boolean(heroCopy && media && heroCopy.getBoundingClientRect().bottom <= media.getBoundingClientRect().top + 1),
          headlineWords: words,
          primaryWidthRatio: heroActions && primary ? primary.getBoundingClientRect().width / heroActions.getBoundingClientRect().width : 0,
          galleryVertical: cards.length < 2 || cards[1]!.getBoundingClientRect().top >= cards[0]!.getBoundingClientRect().bottom - 1,
          galleryOverflow: gallery ? gallery.scrollWidth - gallery.clientWidth : 1,
          captionsStatic: captions.length > 0 && captions.every((caption) => getComputedStyle(caption).position === "static"),
          servicesStacked: serviceCards.length < 2 || serviceCards[1]!.getBoundingClientRect().top >= serviceCards[0]!.getBoundingClientRect().bottom - 1,
          proofBeforeDoctor: Boolean(proof && doctor && proof.getBoundingClientRect().top < doctor.getBoundingClientRect().top),
          contactStacked: contactChildren.length < 2 || contactChildren[1]!.getBoundingClientRect().top > contactChildren[0]!.getBoundingClientRect().top,
        };
      });
      expect(composition.copyBeforeMedia, `${width}px campaign color blocks should stack copy before imagery`).toBeTruthy();
      expect(composition.headlineWords, `${width}px campaign headline should remain concise above the fold`).toBeLessThanOrEqual(11);
      expect(composition.primaryWidthRatio, `${width}px consultation CTA should be thumb-friendly`).toBeGreaterThan(.82);
      expect(composition.galleryVertical, `${width}px smile case gallery should become a vertical story`).toBeTruthy();
      expect(composition.galleryOverflow, `${width}px smile gallery must not create sideways overflow`).toBeLessThanOrEqual(1);
      expect(composition.captionsStatic, `${width}px case captions should remain outside imagery`).toBeTruthy();
      expect(composition.servicesStacked, `${width}px cosmetic treatment cards should stack vertically`).toBeTruthy();
      expect(composition.proofBeforeDoctor, `${width}px proof should lead into clinician trust`).toBeTruthy();
      expect(composition.contactStacked, `${width}px consultation contact should stack`).toBeTruthy();
    },
  });
});
