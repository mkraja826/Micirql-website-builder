import { expect, test } from "@playwright/test";
import { SCHEMA_VERSION, siteSchema, type Site } from "@micirql/schema";
import { findWebsiteLayout } from "@micirql/design-engine";
import { SECTION_FAMILIES, sectionDesignId, type SectionFamily } from "@micirql/sections";
import { INDUSTRY_DESIGN_PRESETS } from "../apps/builder/app/industry-design-preset-data";
import { runDentalBlueprintCertification } from "./dental-blueprint-qa";

type Scenario = {
  layoutId: string;
  presetId: "dental-clinic" | "premium-implant-clinic";
  name: string;
  profile: {
    industry: string;
    subindustry: string;
    goals: string[];
    style_tags: string[];
    required_capabilities: string[];
    services: string[];
  };
};

const scenarios: Scenario[] = [
  {
    layoutId: "dental-01-clinical-authority",
    presetId: "dental-clinic",
    name: "Harbor Dental Care",
    profile: {
      industry: "dental clinic",
      subindustry: "general dentistry",
      goals: ["book appointment", "build trust"],
      style_tags: ["clinical", "clean", "professional"],
      required_capabilities: ["booking", "contact"],
      services: ["preventive dentistry", "restorative care", "root canal care"],
    },
  },
  {
    layoutId: "dental-02-implant-luxury",
    presetId: "premium-implant-clinic",
    name: "Atelier Implant Centre",
    profile: {
      industry: "dental clinic",
      subindustry: "implant dentistry",
      goals: ["implant consultation", "high-value treatment lead"],
      style_tags: ["implant", "luxury", "editorial", "premium"],
      required_capabilities: ["booking", "contact", "treatment process"],
      services: ["single-tooth implants", "implant-supported bridges", "full-arch rehabilitation"],
    },
  },
  {
    layoutId: "dental-03-smile-studio",
    presetId: "dental-clinic",
    name: "Luma Smile Studio",
    profile: {
      industry: "dental clinic",
      subindustry: "cosmetic dentistry",
      goals: ["cosmetic consultation", "show outcomes"],
      style_tags: ["cosmetic", "visual", "elegant"],
      required_capabilities: ["gallery", "booking"],
      services: ["digital smile design", "veneers", "teeth whitening"],
    },
  },
];

const IMAGE = "https://images.unsplash.com/photo-1606811971618-4486d14f3f99?auto=format&fit=crop&w=1200&q=80";
const DOCTOR_IMAGE = "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=1000&q=80";

function familyFrom(value: string): SectionFamily {
  const family = SECTION_FAMILIES.find((candidate) => candidate === value.trim().toLowerCase());
  if (!family) throw new Error(`Unsupported Dental blueprint family: ${value}`);
  return family;
}

function item(index: number, label = "Dental care") {
  return { title: `${label} ${index + 1}`, description: "Clear patient-focused information that stays readable and useful across screen sizes." };
}

function propsFor(family: SectionFamily, name: string, ordinal: number): Record<string, unknown> {
  switch (family) {
    case "navbar":
      return {
        title: name,
        description: "Dentistry · Hyderabad",
        items: [
          { title: "Treatments", href: "#services" },
          { title: "Doctor", href: "#doctor" },
          { title: "Process", href: "#process" },
          { title: "Contact", href: "#contact" },
        ],
        primaryAction: { label: "Book consultation", href: "#contact" },
      };
    case "hero":
      return {
        eyebrow: "Clear dental care in Hyderabad",
        title: "Dental decisions explained with confidence and clarity",
        description: `${name} presents treatment choices, clinical guidance and appointment next steps in a calm, structured experience.`,
        image: { src: IMAGE, alt: "Dental consultation" },
        primaryAction: { label: "Book consultation", href: "#contact" },
        secondaryAction: { label: "Explore treatments", href: "#services" },
      };
    case "about":
      return {
        eyebrow: "About the clinic",
        title: "A patient-first approach to treatment planning",
        description: "Use verified clinical information and a clear explanation of what patients can expect before deciding how to proceed.",
        image: { src: IMAGE, alt: "Dental clinic" },
      };
    case "services":
      return {
        eyebrow: "Treatments",
        title: "Treatment options organised around patient needs",
        description: "Explore common treatment pathways and discuss clinical suitability during a consultation.",
        items: Array.from({ length: 6 }, (_, index) => item(index, "Treatment")),
      };
    case "features":
      return {
        eyebrow: "Clinical confidence",
        title: "Technology and planning that support clearer decisions",
        description: "Explain verified clinic workflows in language patients can understand.",
        items: Array.from({ length: 4 }, (_, index) => item(index, "Clinical feature")),
      };
    case "process":
      return {
        eyebrow: "Your journey",
        title: "A simple path from consultation to the next step",
        description: "Keep the treatment journey sequential, scannable and easy to understand.",
        items: Array.from({ length: 4 }, (_, index) => item(index, "Step")),
      };
    case "testimonials":
      return {
        eyebrow: ordinal === 0 ? "Patient confidence" : "Patient proof",
        title: ordinal === 0 ? "Trust information patients can scan quickly" : "Verified experiences build confidence",
        description: "Only genuine patient feedback should be published on a live clinic website.",
        items: Array.from({ length: 4 }, (_, index) => ({ ...item(index, "Verified review"), author: `Patient ${index + 1}` })),
      };
    case "gallery":
      return {
        eyebrow: "Results and clinic",
        title: "Visual evidence with readable context",
        description: "Use consented, verified photography with captions that remain readable on small screens.",
        items: Array.from({ length: 5 }, (_, index) => ({ ...item(index, "Case story"), image: IMAGE })),
      };
    case "team":
      return {
        eyebrow: "Clinical team",
        title: "Meet the people guiding your care",
        description: "Publish verified clinician qualifications and experience supplied by the practice.",
        items: [
          { title: "Lead Dentist", description: "Verified qualifications and treatment focus belong here.", image: DOCTOR_IMAGE },
          { title: "Clinical support", description: "Supports treatment coordination and patient guidance." },
          { title: "Patient desk", description: "Helps with appointments and practical questions." },
        ],
      };
    case "cta":
      return {
        eyebrow: "Next step",
        title: "Ready to discuss your dental care?",
        description: "Request a consultation and the clinic can confirm the appropriate appointment pathway.",
        primaryAction: { label: "Request consultation", href: "#contact" },
        secondaryAction: { label: "Call clinic", href: "tel:+910000000000" },
      };
    case "contact":
      return {
        eyebrow: "Contact",
        title: "Request an appointment",
        description: "Send your preferred contact details and the clinic can respond with available appointment options.",
        formAction: "/api/forms/appointment",
        primaryAction: { label: "Send request", href: "#contact-form" },
      };
    case "footer":
      return {
        title: name,
        description: "Clear dental information and a simple route to an appointment.",
        items: [
          { title: "Treatments", href: "#services" },
          { title: "Doctor", href: "#doctor" },
          { title: "Contact", href: "#contact" },
        ],
        primaryAction: { label: "Book consultation", href: "#contact" },
      };
  }
}

function sourceSite(scenario: Scenario): Site {
  const layout = findWebsiteLayout(scenario.layoutId);
  if (!layout) throw new Error(`${scenario.layoutId} is missing from the layout library.`);
  const preset = INDUSTRY_DESIGN_PRESETS.find((candidate) => candidate.id === scenario.presetId);
  if (!preset) throw new Error(`${scenario.presetId} design preset is missing.`);
  const familyOrdinals = new Map<SectionFamily, number>();
  const sections = layout.sections.map((layoutSection, index) => {
    const family = familyFrom(layoutSection.family);
    const ordinal = familyOrdinals.get(family) ?? 0;
    familyOrdinals.set(family, ordinal + 1);
    return {
      id: `source-${index + 1}-${layoutSection.id}`,
      component: { componentId: sectionDesignId(preset.theme.family, family, 1), version: "1.0.0" },
      props: propsFor(family, scenario.name, ordinal),
      bindings: {},
      hidden: false,
    };
  });

  return siteSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    siteId: scenario.layoutId,
    workspaceId: "dental-blueprint-certification",
    name: scenario.name,
    domain: "clinic",
    subtype: "dental",
    theme: structuredClone(preset.theme),
    seoBlueprint: {
      primaryGoal: "Book dental consultations",
      targetLocations: ["Hyderabad"],
      priorityTopics: scenario.profile.services,
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
        title: `${scenario.name} | Dental Care`,
        description: `Explore dental care at ${scenario.name} and request a consultation.`,
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

for (const scenario of scenarios) {
  test(`${scenario.layoutId} passes the shared six-viewport certification harness`, async ({ page }) => {
    await runDentalBlueprintCertification({
      page,
      layoutId: scenario.layoutId,
      site: sourceSite(scenario),
      profile: scenario.profile,
      outputName: `dental-layout-blueprint-${scenario.layoutId.slice(7, 9)}`,
      ...(scenario.layoutId === "dental-02-implant-luxury" ? {
        mobileCheck: async ({ root, width }: { root: import("@playwright/test").Locator; width: number }) => {
          const composition = await root.evaluate((element) => {
            const hero = element.querySelector(".mi-hero--immersive") as HTMLElement | null;
            const media = hero?.querySelector(":scope > .mi-section__media") as HTMLElement | null;
            const overlay = hero?.querySelector(".mi-hero__overlay") as HTMLElement | null;
            if (!hero || !media || !overlay) return { separated: false };
            const mediaRect = media.getBoundingClientRect();
            const overlayRect = overlay.getBoundingClientRect();
            return {
              separated: getComputedStyle(media).position === "relative" && getComputedStyle(overlay).position === "relative" && overlayRect.top >= mediaRect.bottom - 2,
            };
          });
          expect(composition.separated, `${width}px implant hero must separate image and copy in normal flow`).toBeTruthy();
        },
      } : {}),
      ...(scenario.layoutId === "dental-03-smile-studio" ? {
        mobileCheck: async ({ root, width }: { root: import("@playwright/test").Locator; width: number }) => {
          const composition = await root.evaluate((element) => {
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
          expect(composition.imageFirst, `${width}px cosmetic hero should remain image-first`).toBeTruthy();
          expect(composition.captionPosition, `${width}px gallery captions must leave image overlays`).toBe("static");
          expect(composition.galleryOverflow, `${width}px gallery must not become a sideways page rail`).toBeLessThanOrEqual(1);
        },
      } : {}),
    });
  });
}
