import { expect, test } from "@playwright/test";
import { SCHEMA_VERSION, siteSchema, type Site } from "@micirql/schema";
import { sectionDesignId, type SectionFamily } from "@micirql/sections";
import { INDUSTRY_DESIGN_PRESETS } from "../apps/builder/app/industry-design-preset-data";
import { runDentalBlueprintCertification } from "./dental-blueprint-qa";

const LAYOUT_ID = "dental-08-boutique-cosmetic";

function section(id: string, family: SectionFamily, theme: Site["theme"]["family"], props: Record<string, unknown>) {
  return { id, component: { componentId: sectionDesignId(theme, family, 1), version: "1.0.0" }, props, bindings: {}, hidden: false };
}

function sourceSite(): Site {
  const preset = INDUSTRY_DESIGN_PRESETS.find((item) => item.id === "dental-clinic");
  if (!preset) throw new Error("Dental design preset is missing.");
  const theme = structuredClone(preset.theme);
  theme.brand.colors = {
    ...theme.brand.colors,
    primary: "#8a687f",
    secondary: "#2d2630",
    accent: "#b78e9f",
    background: "#fffaf7",
    surface: "#f6eff3",
    textPrimary: "#302932",
    textSecondary: "#766d76",
    border: "#e3d8df",
  };
  theme.brand.typography = { ...theme.brand.typography, display: "Georgia", body: "Inter", ui: "Inter" };
  theme.brand.density = "spacious";
  theme.brand.shape = "soft";
  theme.brand.motion = "subtle";
  const family = theme.family;

  const sections = [
    section("nav", "navbar", family, {
      title: "Maison Smile",
      description: "Boutique cosmetic dentistry · Hyderabad",
      items: [{ title: "Smile design", href: "#services" }, { title: "Cases", href: "#gallery" }, { title: "Doctor", href: "#doctor" }, { title: "Contact", href: "#contact" }],
      primaryAction: { label: "Book consultation", href: "#contact" },
    }),
    section("hero", "hero", family, {
      eyebrow: "Boutique cosmetic dentistry",
      title: "Refined smiles, planned with restraint",
      description: "A quieter cosmetic consultation experience focused on proportion, function and natural-looking decisions rather than one-size-fits-all treatment packages.",
      image: { src: "https://images.unsplash.com/photo-1609840114035-3c981b782dfe?auto=format&fit=crop&w=1500&q=80", alt: "Cosmetic dental consultation in a calm studio" },
      primaryAction: { label: "Request consultation", href: "#contact" },
      secondaryAction: { label: "View case stories", href: "#gallery" },
    }),
    section("gallery", "gallery", family, {
      eyebrow: "Case stories",
      title: "Large, quiet imagery with enough space to explain the clinical decisions",
      description: "Use consented case photography and concise captions. The final website should never hide important case information inside image overlays.",
      items: [
        { title: "Natural proportion", description: "A case story focused on proportion and the decisions behind the final result.", image: "https://images.unsplash.com/photo-1606265752439-1f18756aa376?auto=format&fit=crop&w=1300&q=80" },
        { title: "Consultation detail", description: "Explain the planning discussion before showing the treatment outcome.", image: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1100&q=80" },
        { title: "Finishing choices", description: "Use only verified treatment details and approved patient media.", image: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=1100&q=80" },
        { title: "Smile planning", description: "Present visual goals alongside function and clinical suitability.", image: "https://images.unsplash.com/photo-1606811971618-4486d14f3f99?auto=format&fit=crop&w=1300&q=80" },
        { title: "Patient confidence", description: "Keep outcome claims restrained and specific to genuine approved cases.", image: "https://images.unsplash.com/photo-1609840114035-3c981b782dfe?auto=format&fit=crop&w=1300&q=80" },
      ],
    }),
    section("doctor", "team", family, {
      eyebrow: "Clinical direction",
      title: "Cosmetic dentistry still depends on careful clinical judgement",
      description: "Give the treating clinician room to explain verified credentials, experience and a concise approach to aesthetic decision-making.",
      items: [
        { title: "Cosmetic Dentist", description: "Add verified qualifications, experience and treatment focus supplied directly by the practice.", image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=1100&q=80" },
        { title: "Planning philosophy", description: "Prioritise oral health, proportion and realistic outcomes before elective treatment." },
        { title: "Patient communication", description: "Explain trade-offs clearly before the patient chooses how to proceed." },
      ],
    }),
    section("services", "services", family, {
      eyebrow: "Cosmetic options",
      title: "A focused set of treatments, not an overwhelming menu",
      description: "The consultation determines suitability. The website should help patients understand the role of each option without making premature promises.",
      items: [
        { title: "Smile design consultation", description: "Discuss visual goals, function and realistic treatment pathways." },
        { title: "Composite bonding", description: "Explore conservative reshaping options where clinically appropriate." },
        { title: "Veneers", description: "Review preparation, material choices, maintenance and suitability with the clinician." },
        { title: "Teeth whitening", description: "Understand available approaches and the expected maintenance." },
        { title: "Alignment before aesthetics", description: "Consider tooth movement first when it may improve the final restorative plan." },
        { title: "Restorative finishing", description: "Coordinate restorative needs so appearance and function are considered together." },
      ],
    }),
    section("proof", "testimonials", family, {
      eyebrow: "Patient perspective",
      title: "Specific, approved feedback carries more weight than generic praise",
      description: "Publish only genuine patient feedback supplied or approved by the clinic.",
      items: [{ title: "Verified patient story", description: "The consultation felt considered. I understood what could be changed, what should stay natural and why the final plan was recommended." }],
    }),
    section("cta", "cta", family, {
      eyebrow: "Begin with a consultation",
      title: "Discuss the result you want before choosing the treatment",
      description: "Request a cosmetic consultation and let the clinical assessment determine which options are worth considering.",
      primaryAction: { label: "Request consultation", href: "#contact" },
      secondaryAction: { label: "View case stories", href: "#gallery" },
    }),
    section("contact", "contact", family, {
      eyebrow: "Contact",
      title: "Request a private cosmetic consultation",
      description: "Send your preferred contact details and the clinic can respond with suitable appointment options.",
      formAction: "/api/forms/appointment",
      primaryAction: { label: "Send request", href: "#contact-form" },
    }),
    section("footer", "footer", family, {
      title: "Maison Smile",
      description: "Cosmetic dentistry with a quieter, considered point of view.",
      items: [{ title: "Smile design", href: "#services" }, { title: "Cases", href: "#gallery" }, { title: "Doctor", href: "#doctor" }, { title: "Contact", href: "#contact" }],
      primaryAction: { label: "Book consultation", href: "#contact" },
    }),
  ];

  return siteSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    siteId: "dental-blueprint-08",
    workspaceId: "dental-blueprint-certification",
    name: "Maison Smile",
    domain: "clinic",
    subtype: "dental",
    theme,
    seoBlueprint: { primaryGoal: "Book cosmetic dental consultations", targetLocations: ["Hyderabad"], priorityTopics: ["Cosmetic dentistry", "Smile design", "Veneers"], audiences: ["Cosmetic dental patients"], languages: ["en"], localSeo: true, servicePages: true, locationPages: false, blog: false },
    pages: [{ id: "home", path: "/", name: "Home", sections, seo: { title: "Maison Smile | Cosmetic Dentist Hyderabad", description: "Explore cosmetic dental options and request a private consultation.", canonicalPath: "/", indexable: true, structuredDataTypes: ["Dentist"] } }],
    navigation: [{ label: "Home", href: "/" }],
    integrations: [],
    domains: [],
  });
}

test("Dental 08 Boutique Cosmetic passes curated responsive safety gates", async ({ page }) => {
  await runDentalBlueprintCertification({
    page,
    layoutId: LAYOUT_ID,
    site: sourceSite(),
    outputName: "dental-layout-blueprint-08",
    profile: {
      industry: "dental clinic",
      subindustry: "cosmetic dentistry",
      goals: ["cosmetic consultation", "show outcomes"],
      style_tags: ["boutique", "cosmetic", "soft", "premium"],
      required_capabilities: ["gallery", "booking", "contact"],
      services: ["smile design", "composite bonding", "veneers"],
    },
    mobileCheck: async ({ root, width }) => {
      const composition = await root.evaluate((element) => {
        const media = element.querySelector(".mi-hero--editorial .mi-section__media") as HTMLElement | null;
        const copy = element.querySelector(".mi-hero--editorial .mi-hero__copy") as HTMLElement | null;
        const galleryCards = [...element.querySelectorAll(".mi-gallery-mosaic .mi-gallery-card")] as HTMLElement[];
        const caption = element.querySelector(".mi-gallery-card figcaption") as HTMLElement | null;
        const gallery = element.querySelector(".mi-gallery-mosaic") as HTMLElement | null;
        const contact = element.querySelector(".mi-contact-struct--split .mi-contact-split") as HTMLElement | null;
        const actions = element.querySelector(".mi-hero--editorial .mi-section__actions") as HTMLElement | null;
        const primary = element.querySelector(".mi-hero--editorial .mi-section__action--primary") as HTMLElement | null;
        const cardsStacked = galleryCards.length < 2 || galleryCards[1]!.getBoundingClientRect().top >= galleryCards[0]!.getBoundingClientRect().bottom - 1;
        return {
          imageFirst: Boolean(media && copy && media.getBoundingClientRect().top < copy.getBoundingClientRect().top),
          captionPosition: caption ? getComputedStyle(caption).position : "missing",
          galleryOverflow: gallery ? gallery.scrollWidth - gallery.clientWidth : 1,
          cardsStacked,
          contactColumns: contact ? getComputedStyle(contact).gridTemplateColumns.split(" ").filter(Boolean).length : 0,
          primaryWidthRatio: actions && primary ? primary.getBoundingClientRect().width / actions.getBoundingClientRect().width : 0,
        };
      });
      expect(composition.imageFirst, `${width}px boutique hero should lead with portrait imagery`).toBeTruthy();
      expect(composition.captionPosition, `${width}px case captions must remain outside imagery`).toBe("static");
      expect(composition.galleryOverflow, `${width}px case gallery must not become a sideways rail`).toBeLessThanOrEqual(1);
      expect(composition.cardsStacked, `${width}px case stories should stack as one-column mobile storytelling`).toBeTruthy();
      expect(composition.contactColumns, `${width}px contact should use normal one-column document flow`).toBeLessThanOrEqual(1);
      expect(composition.primaryWidthRatio, `${width}px consultation CTA should be thumb-friendly`).toBeGreaterThan(.82);
    },
  });
});
