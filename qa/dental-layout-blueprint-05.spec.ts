import { expect, test } from "@playwright/test";
import { SCHEMA_VERSION, siteSchema, type Site } from "@micirql/schema";
import { sectionDesignId, type SectionFamily } from "@micirql/sections";
import { INDUSTRY_DESIGN_PRESETS } from "../apps/builder/app/industry-design-preset-data";
import { runDentalBlueprintCertification } from "./dental-blueprint-qa";

const LAYOUT_ID = "dental-05-digital-dentistry";

function section(id: string, family: SectionFamily, theme: Site["theme"]["family"], props: Record<string, unknown>) {
  return { id, component: { componentId: sectionDesignId(theme, family, 1), version: "1.0.0" }, props, bindings: {}, hidden: false };
}

function sourceSite(): Site {
  const preset = INDUSTRY_DESIGN_PRESETS.find((item) => item.id === "dental-clinic");
  if (!preset) throw new Error("Dental design preset is missing.");
  const theme = structuredClone(preset.theme);
  theme.brand.colors = {
    ...theme.brand.colors,
    primary: "#13796f",
    secondary: "#10282d",
    accent: "#36b89f",
    background: "#f7fbfa",
    surface: "#edf6f4",
    textPrimary: "#10282d",
    textSecondary: "#62777a",
    border: "#cfe1dd",
  };
  theme.brand.typography = { ...theme.brand.typography, display: "Inter", body: "Inter", ui: "Inter" };
  theme.brand.density = "comfortable";
  theme.brand.shape = "balanced";
  theme.brand.motion = "subtle";
  const family = theme.family;

  const sections = [
    section("nav", "navbar", family, {
      title: "Vector Digital Dental",
      description: "Digital dentistry · Hyderabad",
      items: [{ title: "Technology", href: "#technology" }, { title: "Treatments", href: "#services" }, { title: "Workflow", href: "#process" }, { title: "Contact", href: "#contact" }],
      primaryAction: { label: "Book assessment", href: "#contact" },
    }),
    section("hero", "hero", family, {
      eyebrow: "Digital planning. Clearer conversations.",
      title: "Technology that helps patients see the plan before treatment begins",
      description: "A modern dental experience built around digital assessment, structured planning and clear communication from consultation to follow-up.",
      image: { src: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=1500&q=80", alt: "Modern dental treatment room and digital equipment" },
      primaryAction: { label: "Request digital assessment", href: "#contact" },
      secondaryAction: { label: "See the workflow", href: "#process" },
    }),
    section("technology", "features", family, {
      eyebrow: "Digital workflow",
      title: "Use technology only where it improves understanding and precision",
      description: "The final website should describe only the systems the clinic genuinely uses and explain their patient value in plain language.",
      items: [
        { title: "Digital assessment", description: "Present scans or imaging as part of a structured clinical assessment rather than as a technology claim on its own." },
        { title: "Visual treatment planning", description: "Help patients understand findings, possible sequences and the decisions that need to be made." },
        { title: "Coordinated records", description: "Keep relevant clinical information organised across consultation, planning and follow-up." },
        { title: "Clear patient communication", description: "Translate technical information into practical next steps a patient can understand." },
      ],
    }),
    section("services", "services", family, {
      eyebrow: "Treatments",
      title: "Digital tools support the treatment plan — they do not replace it",
      description: "Explore treatment areas where structured assessment and planning may help the clinical team explain options more clearly.",
      items: [
        { title: "Implant planning", description: "Use assessment and imaging information to support consultation-led implant planning." },
        { title: "Clear aligner assessment", description: "Review alignment goals, suitability and expected treatment sequence with the clinician." },
        { title: "Restorative dentistry", description: "Coordinate crowns, bridges and restorative decisions around the clinical findings." },
        { title: "Root canal care", description: "Support diagnosis and treatment planning for teeth affected by pulpal or root concerns." },
        { title: "Smile planning", description: "Use visual planning carefully to discuss proportion, function and realistic aesthetic goals." },
        { title: "Preventive monitoring", description: "Keep routine review information organised so changes can be discussed over time." },
      ],
    }),
    section("process", "process", family, {
      eyebrow: "How the workflow fits together",
      title: "A digital process should still feel simple to the patient",
      description: "The technology stays in the background while the patient sees a clear sequence of decisions and next steps.",
      items: [
        { title: "Assess", description: "Start with the concern, clinical examination and any appropriate records or imaging." },
        { title: "Plan", description: "Review the findings and discuss treatment options, limitations and sequence." },
        { title: "Confirm", description: "Agree on the next step only after the patient understands the proposed plan." },
        { title: "Review", description: "Use follow-up appointments and updated records to monitor progress where appropriate." },
      ],
    }),
    section("doctor", "team", family, {
      eyebrow: "Clinical oversight",
      title: "Technology is useful only when a clinician knows what to do with it",
      description: "Publish verified doctor qualifications, experience and focus areas supplied by the clinic.",
      items: [
        { title: "Lead Dentist", description: "Add the clinician’s verified qualifications, digital workflow experience and treatment interests here.", image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=1000&q=80" },
        { title: "Clinical coordinator", description: "Supports records, appointments and treatment-plan communication." },
        { title: "Patient support", description: "Helps patients with scheduling, preparation and follow-up questions." },
      ],
    }),
    section("proof", "testimonials", family, {
      eyebrow: "Patient clarity",
      title: "The technology matters most when the plan makes sense",
      description: "Only genuine, approved feedback should appear on the published website.",
      items: [{ title: "Verified patient review", description: "Seeing the findings and having the sequence explained clearly made the consultation much easier to understand." }],
    }),
    section("cta", "cta", family, {
      eyebrow: "Next step",
      title: "Start with an assessment, not a technology package",
      description: "Request a consultation and let the clinical team decide which records, scans or planning steps are actually appropriate.",
      primaryAction: { label: "Request assessment", href: "#contact" },
      secondaryAction: { label: "Explore treatments", href: "#services" },
    }),
    section("contact", "contact", family, {
      eyebrow: "Contact",
      title: "Request a digital dental consultation",
      description: "Send your preferred details and the clinic can confirm availability and the most suitable appointment type.",
      formAction: "/api/forms/appointment",
      primaryAction: { label: "Send request", href: "#contact-form" },
    }),
    section("footer", "footer", family, {
      title: "Vector Digital Dental",
      description: "Modern dental planning presented with clinical context, practical explanations and clear next steps.",
      items: [{ title: "Technology", href: "#technology" }, { title: "Treatments", href: "#services" }, { title: "Workflow", href: "#process" }, { title: "Contact", href: "#contact" }],
      primaryAction: { label: "Book assessment", href: "#contact" },
    }),
  ];

  return siteSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    siteId: "dental-blueprint-05",
    workspaceId: "dental-blueprint-certification",
    name: "Vector Digital Dental",
    domain: "clinic",
    subtype: "dental",
    theme,
    seoBlueprint: { primaryGoal: "Book dental assessments", targetLocations: ["Hyderabad"], priorityTopics: ["Digital dentistry", "Implant planning", "Clear aligners"], audiences: ["Dental patients"], languages: ["en"], localSeo: true, servicePages: true, locationPages: false, blog: false },
    pages: [{ id: "home", path: "/", name: "Home", sections, seo: { title: "Vector Digital Dental | Digital Dentistry Hyderabad", description: "Explore digital dental planning and request an assessment.", canonicalPath: "/", indexable: true, structuredDataTypes: ["Dentist"] } }],
    navigation: [{ label: "Home", href: "/" }],
    integrations: [],
    domains: [],
  });
}

test("Dental 05 Digital Dentistry passes curated responsive safety gates", async ({ page }) => {
  await runDentalBlueprintCertification({
    page,
    layoutId: LAYOUT_ID,
    site: sourceSite(),
    outputName: "dental-layout-blueprint-05",
    profile: {
      industry: "dental clinic",
      subindustry: "digital dentistry",
      goals: ["book appointment", "build trust"],
      style_tags: ["technology", "advanced", "modern", "precision"],
      required_capabilities: ["booking", "treatment process", "contact"],
      services: ["implant planning", "clear aligners", "restorative dentistry"],
    },
    mobileCheck: async ({ root, width }) => {
      const composition = await root.evaluate((element) => {
        const copy = element.querySelector(".mi-hero--centered .mi-hero__copy") as HTMLElement | null;
        const media = element.querySelector(".mi-hero--centered .mi-section__media") as HTMLElement | null;
        const actions = element.querySelector(".mi-hero--centered .mi-section__actions") as HTMLElement | null;
        const primary = element.querySelector(".mi-hero--centered .mi-section__action--primary") as HTMLElement | null;
        const featureItems = [...element.querySelectorAll(".mi-features--split .mi-feature-item--list")] as HTMLElement[];
        const processNodes = [...element.querySelectorAll(".mi-process--timeline .mi-process-node")] as HTMLElement[];
        const heroSeparated = Boolean(copy && media && copy.getBoundingClientRect().bottom <= media.getBoundingClientRect().top + 1);
        return {
          copyBeforeMedia: Boolean(copy && media && copy.getBoundingClientRect().top < media.getBoundingClientRect().top),
          heroSeparated,
          primaryWidthRatio: actions && primary ? primary.getBoundingClientRect().width / actions.getBoundingClientRect().width : 0,
          featuresVertical: featureItems.length < 2 || featureItems[1]!.getBoundingClientRect().top > featureItems[0]!.getBoundingClientRect().top,
          processVertical: processNodes.length < 2 || processNodes[1]!.getBoundingClientRect().top > processNodes[0]!.getBoundingClientRect().top,
        };
      });
      expect(composition.copyBeforeMedia, `${width}px hero copy should lead before digital imagery`).toBeTruthy();
      expect(composition.heroSeparated, `${width}px hero media must not overlap the consultation copy`).toBeTruthy();
      expect(composition.primaryWidthRatio, `${width}px assessment CTA should be full-width`).toBeGreaterThan(.82);
      expect(composition.featuresVertical, `${width}px technology items should read vertically`).toBeTruthy();
      expect(composition.processVertical, `${width}px digital workflow should read vertically`).toBeTruthy();
    },
  });
});
