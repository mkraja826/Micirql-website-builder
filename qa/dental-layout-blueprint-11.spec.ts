import { expect, test } from "@playwright/test";
import { SCHEMA_VERSION, siteSchema, type Site } from "@micirql/schema";
import { sectionDesignId, type SectionFamily } from "@micirql/sections";
import { INDUSTRY_DESIGN_PRESETS } from "../apps/builder/app/industry-design-preset-data";
import { runDentalBlueprintCertification } from "./dental-blueprint-qa";

const LAYOUT_ID = "dental-11-editorial-clinic";

function section(id: string, family: SectionFamily, theme: Site["theme"]["family"], props: Record<string, unknown>) {
  return { id, component: { componentId: sectionDesignId(theme, family, 1), version: "1.0.0" }, props, bindings: {}, hidden: false };
}

function sourceSite(): Site {
  const preset = INDUSTRY_DESIGN_PRESETS.find((item) => item.id === "premium-implant-clinic");
  if (!preset) throw new Error("Premium Implant Clinic preset is missing.");
  const theme = structuredClone(preset.theme);
  theme.brand.colors = {
    ...theme.brand.colors,
    primary: "#6e7561",
    secondary: "#29251f",
    accent: "#a99673",
    background: "#fcfaf5",
    surface: "#f2eee5",
    textPrimary: "#29251f",
    textSecondary: "#746d63",
    border: "#d9d1c3",
  };
  theme.brand.typography = { ...theme.brand.typography, display: "Georgia", body: "Inter", ui: "Inter" };
  theme.brand.density = "spacious";
  theme.brand.shape = "sharp";
  theme.brand.motion = "subtle";
  const family = theme.family;

  const sections = [
    section("nav", "navbar", family, {
      title: "Form Dental House",
      description: "Contemporary dentistry · Hyderabad",
      items: [{ title: "Clinic", href: "#gallery" }, { title: "Doctor", href: "#doctor" }, { title: "Treatments", href: "#services" }, { title: "Contact", href: "#contact" }],
      primaryAction: { label: "Book consultation", href: "#contact" },
    }),
    section("hero", "hero", family, {
      eyebrow: "Dentistry, considered as a whole experience",
      title: "A modern clinic shaped around clarity, craft and calm",
      description: "Explore the space, meet the clinician and understand the treatment areas and technology that support a more considered dental experience.",
      image: { src: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1600&q=80", alt: "Contemporary dental clinic interior" },
      primaryAction: { label: "Request consultation", href: "#contact" },
      secondaryAction: { label: "Explore the clinic", href: "#gallery" },
    }),
    section("gallery", "gallery", family, {
      eyebrow: "The clinic",
      title: "A calm clinical environment with nothing unnecessary in the way",
      description: "Use authentic practice photography to show architecture, treatment spaces and the details that help patients understand where they will be cared for.",
      items: [
        { title: "Consultation room", description: "A private setting for assessment and treatment planning.", image: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1200&q=80" },
        { title: "Clinical space", description: "Show the real treatment environment used by the practice.", image: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=1200&q=80" },
        { title: "Patient welcome", description: "Use practice imagery that accurately reflects the arrival experience.", image: "https://images.unsplash.com/photo-1606811971618-4486d14f3f99?auto=format&fit=crop&w=1200&q=80" },
        { title: "Planning details", description: "Present technology and workspace details only when they belong to the clinic.", image: "https://images.unsplash.com/photo-1609840114035-3c981b782dfe?auto=format&fit=crop&w=1200&q=80" },
        { title: "Quiet clinical design", description: "Architecture supports the story without replacing clinical information.", image: "https://images.unsplash.com/photo-1598256989800-fe5f95da9787?auto=format&fit=crop&w=1200&q=80" },
      ],
    }),
    section("doctor", "team", family, {
      eyebrow: "Clinical direction",
      title: "A practice should still feel anchored by the person making the clinical decisions",
      description: "Publish only verified clinician credentials, registrations and treatment focus supplied by the practice.",
      items: [
        { title: "Lead Dentist", description: "Add verified qualifications, professional registration, experience and clinical interests supplied by the clinic.", image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=1100&q=80" },
        { title: "Approach to planning", description: "Explain how diagnosis, sequencing and patient communication are handled." },
        { title: "Continuity of care", description: "Help patients understand who remains responsible for treatment decisions and follow-up." },
      ],
    }),
    section("services", "services", family, {
      eyebrow: "Treatment areas",
      title: "A concise treatment index instead of a crowded service catalogue",
      description: "Keep the page focused on the practice’s genuine areas of care and let detailed clinical discussion happen during consultation.",
      items: [
        { title: "Restorative dentistry", description: "Assessment and planning for damaged, worn or missing teeth." },
        { title: "Dental implants", description: "Consultation-led replacement planning for suitable missing-tooth cases." },
        { title: "Cosmetic planning", description: "Aesthetic goals considered alongside oral health, function and realistic outcomes." },
        { title: "Root canal care", description: "Diagnosis and treatment planning for teeth affected by pulpal or root concerns." },
        { title: "Preventive review", description: "Routine assessment and maintenance planning based on current findings." },
        { title: "Complex care coordination", description: "Organise multiple treatment needs into a sequence that is easier to understand." },
      ],
    }),
    section("technology", "features", family, {
      eyebrow: "Technology with a purpose",
      title: "Clinical technology should support better decisions, not become the story itself",
      description: "Only describe systems genuinely used by the practice and connect each one to a clear role in assessment, planning or communication.",
      items: [
        { title: "Digital assessment", description: "Use appropriate records to support diagnosis and planning." },
        { title: "Visual communication", description: "Help patients understand findings and proposed treatment sequence." },
        { title: "Coordinated planning", description: "Keep relevant information organised through complex treatment decisions." },
      ],
    }),
    section("proof", "testimonials", family, {
      eyebrow: "Patient perspective",
      title: "Good feedback describes how the experience felt, not just whether someone was happy",
      description: "The final website should use only genuine, approved patient feedback.",
      items: [{ title: "Verified patient review", description: "The clinic felt calm and considered, but what mattered most was that the dentist explained the plan clearly before I decided what to do." }],
    }),
    section("cta", "cta", family, {
      eyebrow: "Visit the practice",
      title: "Start with a consultation and understand the next step clearly",
      description: "Request an appointment and let the clinic confirm the most suitable consultation type.",
      primaryAction: { label: "Request consultation", href: "#contact" },
      secondaryAction: { label: "Call clinic", href: "tel:+910000000000" },
    }),
    section("contact", "contact", family, {
      eyebrow: "Contact",
      title: "Request a consultation",
      description: "Send your preferred details and the clinic can respond directly with appointment options.",
      formAction: "/api/forms/appointment",
      primaryAction: { label: "Send request", href: "#contact-form" },
    }),
    section("footer", "footer", family, {
      title: "Form Dental House",
      description: "Contemporary clinical care presented with clarity and restraint.",
      items: [{ title: "Clinic", href: "#gallery" }, { title: "Doctor", href: "#doctor" }, { title: "Treatments", href: "#services" }, { title: "Contact", href: "#contact" }],
      primaryAction: { label: "Book consultation", href: "#contact" },
    }),
  ];

  return siteSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    siteId: "dental-blueprint-11",
    workspaceId: "dental-blueprint-certification",
    name: "Form Dental House",
    domain: "clinic",
    subtype: "dental",
    theme,
    seoBlueprint: { primaryGoal: "Book dental consultations", targetLocations: ["Hyderabad"], priorityTopics: ["Contemporary dentistry", "Restorative dentistry", "Dental implants"], audiences: ["Dental patients"], languages: ["en"], localSeo: true, servicePages: true, locationPages: false, blog: false },
    pages: [{ id: "home", path: "/", name: "Home", sections, seo: { title: "Form Dental House | Contemporary Dentistry Hyderabad", description: "Explore the clinic, treatment areas and request a consultation.", canonicalPath: "/", indexable: true, structuredDataTypes: ["Dentist"] } }],
    navigation: [{ label: "Home", href: "/" }],
    integrations: [],
    domains: [],
  });
}

test("Dental 11 Dental Journal passes curated responsive safety gates", async ({ page }) => {
  await runDentalBlueprintCertification({
    page,
    layoutId: LAYOUT_ID,
    site: sourceSite(),
    outputName: "dental-layout-blueprint-11",
    profile: {
      industry: "dental clinic",
      subindustry: "premium general dentistry",
      goals: ["build trust", "book appointment"],
      style_tags: ["editorial", "architecture", "photography", "premium"],
      required_capabilities: ["gallery", "booking", "contact"],
      services: ["restorative dentistry", "dental implants", "cosmetic planning"],
    },
    mobileCheck: async ({ root, width }) => {
      const composition = await root.evaluate((element) => {
        const index = element.querySelector(".mi-hero--editorial .mi-hero__index") as HTMLElement | null;
        const copy = element.querySelector(".mi-hero--editorial .mi-hero__copy") as HTMLElement | null;
        const media = element.querySelector(".mi-hero--editorial .mi-section__media") as HTMLElement | null;
        const gallery = element.querySelector(".mi-gallery-mosaic") as HTMLElement | null;
        const cards = [...element.querySelectorAll(".mi-gallery-mosaic .mi-gallery-card")] as HTMLElement[];
        const caption = element.querySelector(".mi-gallery-mosaic .mi-gallery-card figcaption") as HTMLElement | null;
        const contact = element.querySelector(".mi-contact-struct--split .mi-contact-split") as HTMLElement | null;
        const contactChildren = contact ? [...contact.children] as HTMLElement[] : [];
        const rootRect = (element as HTMLElement).getBoundingClientRect();
        return {
          indexContained: Boolean(index && index.getBoundingClientRect().width <= rootRect.width * .4 && index.getBoundingClientRect().right <= rootRect.right + 1),
          copyBeforeMedia: Boolean(copy && media && copy.getBoundingClientRect().top < media.getBoundingClientRect().top),
          galleryVertical: cards.length < 2 || cards[1]!.getBoundingClientRect().top >= cards[0]!.getBoundingClientRect().bottom - 1,
          galleryOverflow: gallery ? gallery.scrollWidth - gallery.clientWidth : 1,
          captionsStatic: Boolean(caption && getComputedStyle(caption).position === "static"),
          contactStacked: contactChildren.length < 2 || contactChildren[1]!.getBoundingClientRect().top > contactChildren[0]!.getBoundingClientRect().top,
          negativeGalleryOffsets: cards.filter((card) => parseFloat(getComputedStyle(card).marginLeft) < 0 || parseFloat(getComputedStyle(card).marginRight) < 0).length,
        };
      });
      expect(composition.indexContained, `${width}px editorial index must stay inside the viewport`).toBeTruthy();
      expect(composition.copyBeforeMedia, `${width}px editorial copy should remain readable before supporting imagery`).toBeTruthy();
      expect(composition.galleryVertical, `${width}px editorial gallery should become a normal vertical story`).toBeTruthy();
      expect(composition.galleryOverflow, `${width}px editorial gallery must not create sideways overflow`).toBeLessThanOrEqual(1);
      expect(composition.captionsStatic, `${width}px gallery captions should stay outside imagery`).toBeTruthy();
      expect(composition.contactStacked, `${width}px contact layout should stack`).toBeTruthy();
      expect(composition.negativeGalleryOffsets, `${width}px mobile gallery must not use negative margins`).toBe(0);
    },
  });
});
