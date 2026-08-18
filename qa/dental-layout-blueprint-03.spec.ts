import { expect, test } from "@playwright/test";
import { SCHEMA_VERSION, siteSchema, type Site } from "@micirql/schema";
import { sectionDesignId, type SectionFamily } from "@micirql/sections";
import { INDUSTRY_DESIGN_PRESETS } from "../apps/builder/app/industry-design-preset-data";
import { runDentalBlueprintCertification } from "./dental-blueprint-qa";

const LAYOUT_ID = "dental-03-smile-studio";

function section(id: string, family: SectionFamily, theme: Site["theme"]["family"], props: Record<string, unknown>) {
  return { id, component: { componentId: sectionDesignId(theme, family, 1), version: "1.0.0" }, props, bindings: {}, hidden: false };
}

function sourceSite(): Site {
  const preset = INDUSTRY_DESIGN_PRESETS.find((item) => item.id === "dental-clinic");
  if (!preset) throw new Error("Dental design preset is missing.");
  const theme = structuredClone(preset.theme);
  theme.brand.colors = {
    ...theme.brand.colors,
    primary: "#745d86",
    secondary: "#332d3a",
    accent: "#b9879c",
    background: "#fffaf7",
    surface: "#f5eef5",
    textPrimary: "#302b35",
    textSecondary: "#756d78",
    border: "#e1d7e2",
  };
  theme.brand.typography = { ...theme.brand.typography, display: "Georgia", body: "Inter", ui: "Inter" };
  theme.brand.density = "spacious";
  theme.brand.shape = "soft";

  const family = theme.family;
  const sections = [
    section("nav", "navbar", family, {
      title: "Luma Smile Studio",
      description: "Cosmetic dentistry · Hyderabad",
      items: [{ title: "Smile design", href: "#services" }, { title: "Results", href: "#gallery" }, { title: "Doctor", href: "#doctor" }, { title: "Contact", href: "#contact" }],
      primaryAction: { label: "Book consultation", href: "#contact" },
    }),
    section("hero", "hero", family, {
      eyebrow: "Cosmetic dentistry with a considered approach",
      title: "A smile plan designed to still feel like you",
      description: "Explore cosmetic treatment options, realistic outcomes and a consultation process built around proportion, function and your own goals.",
      image: { src: "https://images.unsplash.com/photo-1609840114035-3c981b782dfe?auto=format&fit=crop&w=1500&q=80", alt: "Cosmetic dental consultation" },
      primaryAction: { label: "Plan my consultation", href: "#contact" },
      secondaryAction: { label: "View smile stories", href: "#gallery" },
    }),
    section("gallery", "gallery", family, {
      eyebrow: "Smile stories",
      title: "Outcome-led storytelling without visual clutter",
      description: "Use consented case photography to explain what changed, why it changed and how the result was planned.",
      items: [
        { title: "Smile design", description: "A balanced treatment story with approved case photography.", image: "https://images.unsplash.com/photo-1606265752439-1f18756aa376?auto=format&fit=crop&w=1200&q=80" },
        { title: "Natural proportion", description: "Show details only when the clinic has verified and approved the case.", image: "https://images.unsplash.com/photo-1606811971618-4486d14f3f99?auto=format&fit=crop&w=1200&q=80" },
        { title: "Consultation", description: "Explain the planning discussion behind the treatment.", image: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1200&q=80" },
        { title: "Finishing details", description: "Keep case captions readable rather than placing critical copy over images.", image: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=1200&q=80" },
        { title: "Confidence", description: "Use authentic patient media only with appropriate consent.", image: "https://images.unsplash.com/photo-1609840114035-3c981b782dfe?auto=format&fit=crop&w=1200&q=80" },
      ],
    }),
    section("services", "services", family, {
      eyebrow: "Treatments",
      title: "Cosmetic options explained before they are recommended",
      description: "The consultation should help patients understand the purpose, limitations and sequencing of each option.",
      items: [
        { title: "Digital smile design", description: "Discuss proportion and visual planning before making treatment decisions." },
        { title: "Veneers", description: "Review suitability, preparation and realistic expectations with the clinician." },
        { title: "Teeth whitening", description: "Understand available whitening options and the expected maintenance." },
        { title: "Composite bonding", description: "Explore conservative reshaping options where clinically appropriate." },
        { title: "Alignment before aesthetics", description: "Some smile plans may benefit from tooth movement before restorative work." },
        { title: "Restorative finishing", description: "Bring function and appearance together within one coordinated plan." },
      ],
    }),
    section("doctor", "team", family, {
      eyebrow: "Your clinician",
      title: "Aesthetic decisions still start with clinical judgement",
      description: "Use verified clinician credentials and treatment philosophy supplied by the practice.",
      items: [
        { title: "Cosmetic Dentist", description: "Add the clinician’s verified qualifications, experience and treatment focus here.", image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=1000&q=80" },
        { title: "Treatment coordinator", description: "Supports consultation scheduling and practical treatment questions." },
        { title: "Clinical support", description: "Helps patients through appointments and follow-up guidance." },
      ],
    }),
    section("proof", "testimonials", family, {
      eyebrow: "Patient perspective",
      title: "The best proof should feel specific and believable",
      description: "Only approved, genuine patient feedback should appear on the final published website.",
      items: [{ title: "Verified patient story", description: "I understood the choices before deciding what I wanted to change, and the final plan still felt natural to me." }],
    }),
    section("process", "process", family, {
      eyebrow: "Your consultation journey",
      title: "From ideas to a considered treatment plan",
      description: "A simple sequence helps cosmetic patients understand how decisions are made before treatment begins.",
      items: [
        { title: "Share your goals", description: "Discuss what you notice and what you would prefer to keep unchanged." },
        { title: "Review suitable options", description: "The clinician assesses health, function, proportion and realistic treatment choices." },
        { title: "Agree on the plan", description: "Confirm sequencing, expectations and next steps before proceeding." },
      ],
    }),
    section("cta", "cta", family, {
      eyebrow: "Next step",
      title: "Start with a conversation, not a treatment package",
      description: "Request a cosmetic consultation and use the appointment to understand the options that may suit your goals.",
      primaryAction: { label: "Request consultation", href: "#contact" },
      secondaryAction: { label: "Explore treatments", href: "#services" },
    }),
    section("contact", "contact", family, {
      eyebrow: "Contact",
      title: "Request a smile consultation",
      description: "Send your preferred contact details and the clinic can confirm appointment availability directly.",
      formAction: "/api/forms/appointment",
      primaryAction: { label: "Send request", href: "#contact-form" },
    }),
    section("footer", "footer", family, {
      title: "Luma Smile Studio",
      description: "Cosmetic dentistry presented with clarity, restraint and realistic treatment planning.",
      items: [{ title: "Smile design", href: "#services" }, { title: "Results", href: "#gallery" }, { title: "Doctor", href: "#doctor" }, { title: "Contact", href: "#contact" }],
      primaryAction: { label: "Book consultation", href: "#contact" },
    }),
  ];

  return siteSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    siteId: "dental-blueprint-03",
    workspaceId: "dental-blueprint-certification",
    name: "Luma Smile Studio",
    domain: "clinic",
    subtype: "dental",
    theme,
    seoBlueprint: { primaryGoal: "Book cosmetic dental consultations", targetLocations: ["Hyderabad"], priorityTopics: ["Cosmetic dentistry", "Smile design", "Veneers"], audiences: ["Cosmetic dental patients"], languages: ["en"], localSeo: true, servicePages: true, locationPages: false, blog: false },
    pages: [{ id: "home", path: "/", name: "Home", sections, seo: { title: "Luma Smile Studio | Cosmetic Dentistry Hyderabad", description: "Explore cosmetic dental options and request a consultation.", canonicalPath: "/", indexable: true, structuredDataTypes: ["Dentist"] } }],
    navigation: [{ label: "Home", href: "/" }],
    integrations: [],
    domains: [],
  });
}

test("Dental 03 Smile Studio passes curated responsive safety gates", async ({ page }) => {
  await runDentalBlueprintCertification({
    page,
    layoutId: LAYOUT_ID,
    site: sourceSite(),
    outputName: "dental-layout-blueprint-03",
    profile: {
      industry: "dental clinic",
      subindustry: "cosmetic dentistry",
      goals: ["cosmetic consultation", "show outcomes"],
      style_tags: ["cosmetic", "visual", "elegant"],
      required_capabilities: ["gallery", "booking"],
      services: ["digital smile design", "veneers", "teeth whitening"],
    },
    mobileCheck: async ({ root, width }) => {
      const mobileComposition = await root.evaluate((element) => {
        const media = element.querySelector(".mi-hero--editorial .mi-section__media") as HTMLElement | null;
        const copy = element.querySelector(".mi-hero--editorial .mi-hero__copy") as HTMLElement | null;
        const caption = element.querySelector(".mi-gallery-card figcaption") as HTMLElement | null;
        const gallery = element.querySelector(".mi-gallery-mosaic") as HTMLElement | null;
        if (!media || !copy || !caption || !gallery) return { imageFirst: false, captionPosition: "missing", galleryOverflow: 1 };
        return {
          imageFirst: media.getBoundingClientRect().top < copy.getBoundingClientRect().top,
          captionPosition: getComputedStyle(caption).position,
          galleryOverflow: gallery.scrollWidth - gallery.clientWidth,
        };
      });
      expect(mobileComposition.imageFirst, `${width}px hero should be image-first`).toBeTruthy();
      expect(mobileComposition.captionPosition, `${width}px gallery captions must leave image overlays`).toBe("static");
      expect(mobileComposition.galleryOverflow, `${width}px gallery must not become a sideways page rail`).toBeLessThanOrEqual(1);
    },
  });
});
