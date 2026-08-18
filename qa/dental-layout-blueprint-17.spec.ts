import { expect, test } from "@playwright/test";
import { SCHEMA_VERSION, siteSchema, type Site } from "@micirql/schema";
import { sectionDesignId, type SectionFamily } from "@micirql/sections";
import { INDUSTRY_DESIGN_PRESETS } from "../apps/builder/app/industry-design-preset-data";
import { runDentalBlueprintCertification } from "./dental-blueprint-qa";

const LAYOUT_ID = "dental-17-photo-story";

function section(id: string, family: SectionFamily, theme: Site["theme"]["family"], props: Record<string, unknown>) {
  return { id, component: { componentId: sectionDesignId(theme, family, 1), version: "1.0.0" }, props, bindings: {}, hidden: false };
}

function sourceSite(): Site {
  const preset = INDUSTRY_DESIGN_PRESETS.find((item) => item.id === "dental-clinic");
  if (!preset) throw new Error("Dental design preset is missing.");
  const theme = structuredClone(preset.theme);
  theme.brand.colors = {
    ...theme.brand.colors,
    primary: "#71806e",
    secondary: "#26342e",
    accent: "#b49b78",
    background: "#fcfaf5",
    surface: "#f0f3ec",
    textPrimary: "#26342e",
    textSecondary: "#6d756f",
    border: "#d4dbd1",
  };
  theme.brand.typography = { ...theme.brand.typography, display: "Georgia", body: "Inter", ui: "Inter" };
  theme.brand.density = "spacious";
  theme.brand.shape = "soft";
  theme.brand.motion = "subtle";
  const family = theme.family;

  const sections = [
    section("nav", "navbar", family, {
      title: "Willow Dental House",
      description: "Thoughtful dentistry in a calm, contemporary setting · Hyderabad",
      items: [
        { title: "Our space", href: "#gallery" },
        { title: "Dentist", href: "#doctor" },
        { title: "Care", href: "#services" },
        { title: "Contact", href: "#contact" },
      ],
      primaryAction: { label: "Book a visit", href: "#contact" },
    }),
    section("hero", "hero", family, {
      eyebrow: "A clinic experience built around people",
      title: "See the place, meet the people, understand the care",
      description: "A photography-led introduction to the clinic, the dentist and the treatment experience, with the practical information still easy to reach.",
      image: { src: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1700&q=80", alt: "Warm contemporary dental clinic interior" },
      primaryAction: { label: "Request an appointment", href: "#contact" },
      secondaryAction: { label: "Explore the clinic", href: "#gallery" },
    }),
    section("gallery", "gallery", family, {
      eyebrow: "The clinic story",
      title: "A space patients can understand before they arrive",
      description: "Use authentic clinic photography to show the arrival, consultation and treatment environment without turning the page into a decorative image feed.",
      items: [
        { title: "Arrival", description: "Show the real welcome area and what patients can expect when they enter the clinic.", image: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1300&q=80" },
        { title: "Consultation", description: "A private setting for listening, assessment and explaining the available options.", image: "https://images.unsplash.com/photo-1606811971618-4486d14f3f99?auto=format&fit=crop&w=1100&q=80" },
        { title: "Clinical care", description: "Present the real treatment setting with a calm, factual caption.", image: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=1100&q=80" },
        { title: "Planning", description: "Use genuine workspace or technology imagery only when it reflects the actual practice.", image: "https://images.unsplash.com/photo-1609840114035-3c981b782dfe?auto=format&fit=crop&w=1200&q=80" },
        { title: "The details", description: "Small environmental details can support the story without replacing useful clinical information.", image: "https://images.unsplash.com/photo-1598256989800-fe5f95da9787?auto=format&fit=crop&w=1200&q=80" },
      ],
    }),
    section("doctor", "team", family, {
      eyebrow: "Meet your dentist",
      title: "The human relationship should remain stronger than the design",
      description: "Use a real clinician portrait and publish only verified qualifications, registration and treatment interests supplied by the clinic.",
      items: [
        { title: "Lead Dentist", description: "Add the verified clinician name, qualifications, professional registration and treatment focus supplied by the practice.", image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=1200&q=80" },
        { title: "How consultations work", description: "Listen first, assess carefully and explain options before treatment decisions are made." },
        { title: "Continuity of care", description: "Make it clear who remains responsible for the clinical plan and follow-up." },
      ],
    }),
    section("services", "services", family, {
      eyebrow: "Care areas",
      title: "A concise treatment guide for the conversations patients actually need",
      description: "The website helps patients find the right starting point; suitability and recommendations still depend on clinical assessment.",
      items: [
        { title: "General dentistry", description: "Routine assessment, prevention and restorative care based on current findings." },
        { title: "Restorative care", description: "Planning for damaged, worn or missing teeth with function and maintenance in mind." },
        { title: "Cosmetic consultation", description: "Discuss appearance goals alongside oral health, function and realistic outcomes." },
        { title: "Dental implants", description: "Consultation-led planning for suitable missing-tooth replacement cases." },
        { title: "Root canal care", description: "Assessment and treatment planning for teeth affected by pulpal or root concerns." },
        { title: "Preventive review", description: "Ongoing examination and maintenance planning based on individual needs." },
      ],
    }),
    section("proof", "testimonials", family, {
      eyebrow: "Patient perspective",
      title: "The experience should feel as clear as the website looks",
      description: "Use only genuine, approved patient feedback in the published site.",
      items: [{ title: "Verified patient review", description: "I knew what the clinic looked like before I arrived, but the part that mattered most was how clearly the dentist explained the options and gave me time to decide." }],
    }),
    section("cta", "cta", family, {
      eyebrow: "Visit the clinic",
      title: "Start with a conversation, not a commitment",
      description: "Request an appointment and let the clinic confirm the right visit type and available times.",
      primaryAction: { label: "Request appointment", href: "#contact" },
      secondaryAction: { label: "Call clinic", href: "tel:+910000000000" },
    }),
    section("contact", "contact", family, {
      eyebrow: "Contact",
      title: "Tell the clinic what you would like help with",
      description: "Send your preferred details and the team can reply with appropriate appointment options.",
      formAction: "/api/forms/appointment",
      formActionId: "appointment.request",
      primaryAction: { label: "Send appointment request", href: "#enquiry" },
    }),
    section("footer", "footer", family, {
      title: "Willow Dental House",
      description: "A human, photography-led introduction to the clinic, the dentist and the care available.",
      items: [
        { title: "Our space", href: "#gallery" },
        { title: "Dentist", href: "#doctor" },
        { title: "Care", href: "#services" },
        { title: "Contact", href: "#contact" },
      ],
      primaryAction: { label: "Book a visit", href: "#contact" },
    }),
  ];

  return siteSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    siteId: "dental-blueprint-17",
    workspaceId: "dental-blueprint-certification",
    name: "Willow Dental House",
    domain: "clinic",
    subtype: "dental",
    theme,
    seoBlueprint: {
      primaryGoal: "Book dental appointments",
      targetLocations: ["Hyderabad"],
      priorityTopics: ["General dentistry", "Cosmetic dentistry", "Dental implants"],
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
        title: "Willow Dental House | Dentist Hyderabad",
        description: "Explore the clinic, meet the dentist and request a dental appointment in Hyderabad.",
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

test("Dental 17 Clinic Story passes curated responsive safety gates", async ({ page }) => {
  await runDentalBlueprintCertification({
    page,
    layoutId: LAYOUT_ID,
    site: sourceSite(),
    outputName: "dental-layout-blueprint-17",
    profile: {
      industry: "dental clinic",
      subindustry: "general dentistry",
      goals: ["build trust", "book appointment"],
      style_tags: ["story", "photography", "human", "visual"],
      required_capabilities: ["gallery", "booking", "contact"],
      services: ["general dentistry", "cosmetic consultation", "dental implants"],
    },
    mobileCheck: async ({ root, width }) => {
      const composition = await root.evaluate((element) => {
        const nav = element.querySelector(".mi-shell-navbar--floating") as HTMLElement | null;
        const hero = element.querySelector(".mi-hero--immersive") as HTMLElement | null;
        const copy = element.querySelector(".mi-hero--immersive .mi-hero__copy") as HTMLElement | null;
        const actions = element.querySelector(".mi-hero--immersive .mi-section__actions") as HTMLElement | null;
        const primary = element.querySelector(".mi-hero--immersive .mi-section__action--primary") as HTMLElement | null;
        const gallery = element.querySelector(".mi-gallery-mosaic") as HTMLElement | null;
        const cards = [...element.querySelectorAll(".mi-gallery-mosaic .mi-gallery-card")] as HTMLElement[];
        const caption = element.querySelector(".mi-gallery-mosaic .mi-gallery-card figcaption") as HTMLElement | null;
        const services = [...element.querySelectorAll(".mi-services-spotlight .mi-service-item")] as HTMLElement[];
        const contact = element.querySelector(".mi-contact-struct--split .mi-contact-split") as HTMLElement | null;
        const contactChildren = contact ? [...contact.children] as HTMLElement[] : [];
        const heroHeight = hero?.getBoundingClientRect().height ?? 0;
        return {
          navSticky: Boolean(nav && getComputedStyle(nav).position === "sticky"),
          heroViewportRatio: window.innerHeight > 0 ? heroHeight / window.innerHeight : 2,
          copyPanelVisible: Boolean(copy && getComputedStyle(copy).backgroundColor !== "rgba(0, 0, 0, 0)" && getComputedStyle(copy).backgroundColor !== "transparent"),
          primaryWidthRatio: actions && primary ? primary.getBoundingClientRect().width / actions.getBoundingClientRect().width : 0,
          galleryVertical: cards.length < 2 || cards[1]!.getBoundingClientRect().top >= cards[0]!.getBoundingClientRect().bottom - 1,
          galleryOverflow: gallery ? gallery.scrollWidth - gallery.clientWidth : 1,
          captionsStatic: Boolean(caption && getComputedStyle(caption).position === "static"),
          servicesStacked: services.length < 2 || services[1]!.getBoundingClientRect().top >= services[0]!.getBoundingClientRect().bottom - 1,
          contactStacked: contactChildren.length < 2 || contactChildren[1]!.getBoundingClientRect().top > contactChildren[0]!.getBoundingClientRect().top,
        };
      });
      expect(composition.navSticky, `${width}px floating navigation should become a standard sticky bar`).toBeTruthy();
      expect(composition.heroViewportRatio, `${width}px cinematic hero must stay at or below the safe mobile height`).toBeLessThanOrEqual(.72);
      expect(composition.copyPanelVisible, `${width}px immersive copy needs a strong contrast panel`).toBeTruthy();
      expect(composition.primaryWidthRatio, `${width}px appointment action should be thumb-friendly`).toBeGreaterThan(.82);
      expect(composition.galleryVertical, `${width}px gallery should become a single-column narrative`).toBeTruthy();
      expect(composition.galleryOverflow, `${width}px gallery must not create sideways overflow`).toBeLessThanOrEqual(1);
      expect(composition.captionsStatic, `${width}px gallery captions should remain below imagery`).toBeTruthy();
      expect(composition.servicesStacked, `${width}px treatment guide should stack vertically`).toBeTruthy();
      expect(composition.contactStacked, `${width}px contact content should stack`).toBeTruthy();
    },
  });
});
