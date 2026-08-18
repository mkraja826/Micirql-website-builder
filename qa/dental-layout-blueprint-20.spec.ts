import { expect, test } from "@playwright/test";
import { SCHEMA_VERSION, siteSchema, type Site } from "@micirql/schema";
import { sectionDesignId, type SectionFamily } from "@micirql/sections";
import { INDUSTRY_DESIGN_PRESETS } from "../apps/builder/app/industry-design-preset-data";
import { runDentalBlueprintCertification } from "./dental-blueprint-qa";

const LAYOUT_ID = "dental-20-premium-complete";

function section(id: string, family: SectionFamily, theme: Site["theme"]["family"], props: Record<string, unknown>) {
  return { id, component: { componentId: sectionDesignId(theme, family, 1), version: "1.0.0" }, props, bindings: {}, hidden: false };
}

function sourceSite(): Site {
  const preset = INDUSTRY_DESIGN_PRESETS.find((item) => item.id === "dental-clinic");
  if (!preset) throw new Error("Dental design preset is missing.");
  const theme = structuredClone(preset.theme);
  theme.brand.colors = {
    ...theme.brand.colors,
    primary: "#2f7182",
    secondary: "#143746",
    accent: "#8aa28c",
    background: "#fcfbf7",
    surface: "#f3f7f6",
    textPrimary: "#102f3b",
    textSecondary: "#68787d",
    border: "#d2e0df",
  };
  theme.brand.typography = { ...theme.brand.typography, display: "Georgia", body: "Inter", ui: "Inter" };
  theme.brand.density = "comfortable";
  theme.brand.shape = "soft";
  theme.brand.motion = "subtle";
  const family = theme.family;

  const sections = [
    section("nav", "navbar", family, {
      title: "Aster Dental Institute",
      description: "General, implant, cosmetic and orthodontic dentistry · Hyderabad",
      items: [
        { title: "Treatments", href: "#services" },
        { title: "Dentist", href: "#doctor" },
        { title: "Technology", href: "#technology" },
        { title: "Clinic", href: "#gallery" },
        { title: "Contact", href: "#contact" },
      ],
      primaryAction: { label: "Book consultation", href: "#contact" },
    }),
    section("hero", "hero", family, {
      eyebrow: "Complete dental care, clearly explained",
      title: "Specialist thinking with a simpler path to the right dental care",
      description: "Meet the clinician, understand the main care areas and see how assessment, technology and follow-up fit together before requesting an appointment.",
      image: { src: "https://images.unsplash.com/photo-1606811971618-4486d14f3f99?auto=format&fit=crop&w=1600&q=80", alt: "Dentist discussing treatment planning with a patient" },
      primaryAction: { label: "Request consultation", href: "#contact" },
      secondaryAction: { label: "Explore treatments", href: "#services" },
    }),
    section("trust", "testimonials", family, {
      eyebrow: "Clinical standards",
      title: "The essentials patients should be able to verify",
      description: "Use approved factual information from the clinic rather than invented awards, rankings or success percentages.",
      items: [
        { title: "Verified clinician details", description: "Publish confirmed qualifications and professional registration supplied by the practice." },
        { title: "Assessment before recommendation", description: "Treatment options follow examination and appropriate records rather than website assumptions." },
        { title: "Clear treatment choices", description: "Explain alternatives, relevant limitations and next steps before a patient decides." },
        { title: "Follow-up made visible", description: "Show how review and maintenance fit into care where clinically relevant." },
      ],
    }),
    section("services", "services", family, {
      eyebrow: "Treatment discovery",
      title: "Find the right starting point without turning the site into a treatment catalogue",
      description: "These care areas help patients reach the right consultation. Individual suitability and recommendations still depend on clinical assessment.",
      items: [
        { title: "General dentistry", description: "Assessment, prevention and restorative care based on current findings." },
        { title: "Dental implants", description: "Consultation-led planning for suitable missing-tooth replacement cases." },
        { title: "Cosmetic dentistry", description: "Discuss appearance goals alongside oral health, function and realistic outcomes." },
        { title: "Orthodontics", description: "Review alignment goals and the options that may be suitable after assessment." },
        { title: "Root canal care", description: "Assessment and treatment planning for teeth affected by pulpal or root concerns." },
        { title: "Restorative planning", description: "Plan care for damaged, worn or missing teeth with long-term function in mind." },
      ],
    }),
    section("doctor", "team", family, {
      eyebrow: "Clinical leadership",
      title: "Know who is responsible for the diagnosis and treatment plan",
      description: "Use a real clinician portrait and publish only verified qualifications, registration and treatment interests supplied by the practice.",
      items: [
        { title: "Lead Dentist", description: "Add the verified clinician name, qualifications, professional registration and relevant clinical focus supplied by the clinic.", image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=1200&q=80" },
        { title: "Assessment first", description: "Clinical recommendations follow appropriate examination and records." },
        { title: "Options explained", description: "The consultation should make alternatives and limitations understandable." },
        { title: "Continuity of care", description: "Make responsibility for treatment review and follow-up visible." },
      ],
    }),
    section("technology", "features", family, {
      eyebrow: "Planning and technology",
      title: "Use technology where it improves assessment, planning or communication",
      description: "Only describe systems genuinely used by the clinic and connect each one to a practical clinical role.",
      items: [
        { title: "Digital records", description: "Capture appropriate clinical information to support assessment where indicated." },
        { title: "Planning workflow", description: "Bring relevant records together so options and sequence can be discussed more clearly." },
        { title: "Visual communication", description: "Help patients understand findings and proposed next steps before making treatment decisions." },
        { title: "Review and maintenance", description: "Use appropriate records over time to support follow-up where clinically relevant." },
      ],
    }),
    section("gallery", "gallery", family, {
      eyebrow: "Clinic and care",
      title: "Selected images that make the practice easier to understand",
      description: "Use authentic clinic, team or approved clinical imagery. Captions should remain factual and never imply guaranteed outcomes.",
      items: [
        { title: "Consultation", description: "Show the real environment used for treatment conversations.", image: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1300&q=80" },
        { title: "Clinical setting", description: "Use genuine practice photography with a clear descriptive caption.", image: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=1100&q=80" },
        { title: "Planning", description: "Show real planning or diagnostic workflow only when it reflects actual clinic practice.", image: "https://images.unsplash.com/photo-1609840114035-3c981b782dfe?auto=format&fit=crop&w=1100&q=80" },
        { title: "Patient experience", description: "Use imagery that supports practical understanding rather than decoration alone.", image: "https://images.unsplash.com/photo-1598256989800-fe5f95da9787?auto=format&fit=crop&w=1300&q=80" },
      ],
    }),
    section("process", "process", family, {
      eyebrow: "What happens next",
      title: "A clear treatment journey from first conversation to follow-up",
      description: "The exact sequence varies by treatment and patient needs, but the website can make the decision process easier to understand.",
      items: [
        { title: "Consultation", description: "Discuss the reason for the visit, relevant history and what the patient would like help with." },
        { title: "Assessment", description: "Examine the clinical situation and gather appropriate records where indicated." },
        { title: "Options", description: "Explain suitable choices, limitations, sequence and practical considerations." },
        { title: "Care and review", description: "Proceed only after informed agreement, then plan appropriate review and maintenance." },
      ],
    }),
    section("proof", "testimonials", family, {
      eyebrow: "Patient perspective",
      title: "The strongest proof is a clear experience described in a real patient’s own words",
      description: "Replace this certification fixture with genuine, approved patient feedback before publication.",
      items: [
        { title: "Verified patient review", description: "The dentist explained what needed attention, what could wait and the options I could consider. I left understanding the next step rather than feeling pushed into a decision." },
      ],
    }),
    section("cta", "cta", family, {
      eyebrow: "Ready for the next step?",
      title: "Request a consultation and let the clinic confirm the right appointment type",
      description: "Share what you would like help with and the team can respond with appropriate appointment options.",
      primaryAction: { label: "Request consultation", href: "#contact" },
      secondaryAction: { label: "Call clinic", href: "tel:+910000000000" },
    }),
    section("contact", "contact", family, {
      eyebrow: "Contact",
      title: "Tell the clinic what you would like help with",
      description: "Send your preferred contact details and a short reason for the visit. The team can reply with suitable appointment options.",
      formAction: "/api/forms/appointment",
      formActionId: "appointment.request",
      primaryAction: { label: "Send appointment request", href: "#enquiry" },
    }),
    section("footer", "footer", family, {
      title: "Aster Dental Institute",
      description: "Clear treatment discovery, visible clinical responsibility and an easier route to consultation.",
      items: [
        { title: "Treatments", href: "#services" },
        { title: "Dentist", href: "#doctor" },
        { title: "Technology", href: "#technology" },
        { title: "Clinic", href: "#gallery" },
        { title: "Contact", href: "#contact" },
      ],
      primaryAction: { label: "Book consultation", href: "#contact" },
    }),
  ];

  return siteSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    siteId: "dental-blueprint-20",
    workspaceId: "dental-blueprint-certification",
    name: "Aster Dental Institute",
    domain: "clinic",
    subtype: "dental",
    theme,
    seoBlueprint: {
      primaryGoal: "Book dental consultations",
      targetLocations: ["Hyderabad"],
      priorityTopics: ["General dentistry", "Dental implants", "Cosmetic dentistry", "Orthodontics"],
      audiences: ["Dental patients"],
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
        title: "Aster Dental Institute | Dentist Hyderabad",
        description: "Explore dental treatments, clinical planning and request a consultation in Hyderabad.",
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

test("Dental 20 Complete Signature passes flagship responsive safety gates", async ({ page }) => {
  await runDentalBlueprintCertification({
    page,
    layoutId: LAYOUT_ID,
    site: sourceSite(),
    outputName: "dental-layout-blueprint-20",
    profile: {
      industry: "dental clinic",
      subindustry: "general dentistry",
      goals: ["book appointment", "build trust", "treatment discovery"],
      style_tags: ["flagship", "premium", "complete", "balanced"],
      required_capabilities: ["booking", "contact", "gallery", "reviews"],
      services: ["general dentistry", "dental implants", "cosmetic dentistry", "orthodontics"],
    },
    mobileCheck: async ({ root, width }) => {
      const composition = await root.evaluate((element) => {
        const heroCopy = element.querySelector(".mi-hero--split .mi-hero__copy") as HTMLElement | null;
        const heroMedia = element.querySelector(".mi-hero--split .mi-section__media") as HTMLElement | null;
        const heroActions = element.querySelector(".mi-hero--split .mi-section__actions") as HTMLElement | null;
        const heroPrimary = element.querySelector(".mi-hero--split .mi-section__action--primary") as HTMLElement | null;
        const trust = element.querySelector(".mi-proof--metrics") as HTMLElement | null;
        const trustCards = [...element.querySelectorAll(".mi-proof--metrics .mi-proof-metrics article")] as HTMLElement[];
        const serviceCards = [...element.querySelectorAll(".mi-services-spotlight .mi-service-item")] as HTMLElement[];
        const leadDoctor = element.querySelector(".mi-team-card--lead") as HTMLElement | null;
        const doctorSupport = element.querySelector(".mi-team-featured__grid") as HTMLElement | null;
        const technologyHeading = element.querySelector(".mi-features--split .mi-section__heading") as HTMLElement | null;
        const technologyList = element.querySelector(".mi-features--split .mi-features-list") as HTMLElement | null;
        const gallery = element.querySelector(".mi-gallery-mosaic") as HTMLElement | null;
        const galleryCards = [...element.querySelectorAll(".mi-gallery-mosaic .mi-gallery-card")] as HTMLElement[];
        const caption = element.querySelector(".mi-gallery-mosaic figcaption") as HTMLElement | null;
        const processNodes = [...element.querySelectorAll(".mi-process-timeline .mi-process-node")] as HTMLElement[];
        const cta = element.querySelector(".mi-conv-cta--split") as HTMLElement | null;
        const contact = element.querySelector(".mi-contact-struct--split") as HTMLElement | null;
        const contactContent = element.querySelector(".mi-contact-struct--split .mi-contact-split") as HTMLElement | null;
        const contactFields = [...element.querySelectorAll(".mi-contact-struct--split input,.mi-contact-struct--split textarea,.mi-contact-struct--split select")] as HTMLElement[];
        const trustColumns = trustCards.length > 1 && Math.abs(trustCards[0]!.getBoundingClientRect().top - trustCards[1]!.getBoundingClientRect().top) < 2 ? 2 : 1;
        return {
          heroCopyBeforeMedia: Boolean(heroCopy && heroMedia && heroCopy.getBoundingClientRect().bottom <= heroMedia.getBoundingClientRect().top + 1),
          heroPrimaryRatio: heroActions && heroPrimary ? heroPrimary.getBoundingClientRect().width / heroActions.getBoundingClientRect().width : 0,
          trustInline: Boolean(trust && heroMedia && trust.getBoundingClientRect().top >= heroMedia.getBoundingClientRect().bottom - 2),
          trustColumns,
          servicesStacked: serviceCards.length < 2 || serviceCards[1]!.getBoundingClientRect().top >= serviceCards[0]!.getBoundingClientRect().bottom - 1,
          doctorOrdered: Boolean(leadDoctor && doctorSupport && leadDoctor.getBoundingClientRect().bottom <= doctorSupport.getBoundingClientRect().top + 2),
          technologyCopyFirst: Boolean(technologyHeading && technologyList && technologyHeading.getBoundingClientRect().bottom <= technologyList.getBoundingClientRect().top + 2),
          gallerySafe: Boolean(gallery && gallery.scrollWidth <= gallery.clientWidth + 1),
          galleryStacked: galleryCards.length < 2 || galleryCards[1]!.getBoundingClientRect().top >= galleryCards[0]!.getBoundingClientRect().bottom - 1,
          captionStatic: Boolean(caption && getComputedStyle(caption).position === "static"),
          processVertical: processNodes.length < 2 || processNodes[1]!.getBoundingClientRect().top >= processNodes[0]!.getBoundingClientRect().bottom - 1,
          ctaBeforeContact: Boolean(cta && contact && cta.getBoundingClientRect().bottom <= contact.getBoundingClientRect().top + 2),
          conversionRhythm: Boolean(cta && contactContent && contactContent.getBoundingClientRect().top - cta.getBoundingClientRect().bottom >= 56),
          minFieldFont: contactFields.length ? Math.min(...contactFields.map((field) => parseFloat(getComputedStyle(field).fontSize))) : 16,
        };
      });

      expect(composition.heroCopyBeforeMedia, `${width}px hero copy and CTA should precede portrait`).toBeTruthy();
      expect(composition.heroPrimaryRatio, `${width}px primary hero action should be thumb-friendly`).toBeGreaterThan(.82);
      expect(composition.trustInline, `${width}px desktop overlap should become inline mobile proof`).toBeTruthy();
      expect(composition.trustColumns, `${width}px proof facts should use no more than two columns`).toBeLessThanOrEqual(2);
      expect(composition.servicesStacked, `${width}px treatments should stack`).toBeTruthy();
      expect(composition.doctorOrdered, `${width}px lead clinician should precede supporting authority details`).toBeTruthy();
      expect(composition.technologyCopyFirst, `${width}px technology explanation should precede feature details`).toBeTruthy();
      expect(composition.gallerySafe, `${width}px gallery must not create sideways overflow`).toBeTruthy();
      expect(composition.galleryStacked, `${width}px gallery should become a vertical narrative`).toBeTruthy();
      expect(composition.captionStatic, `${width}px gallery captions should remain below images`).toBeTruthy();
      expect(composition.processVertical, `${width}px treatment journey should be vertical`).toBeTruthy();
      expect(composition.ctaBeforeContact, `${width}px conversion should remain above the contact form`).toBeTruthy();
      expect(composition.conversionRhythm, `${width}px CTA and form should retain clear visual separation`).toBeTruthy();
      expect(composition.minFieldFont, `${width}px form controls should avoid mobile zoom`).toBeGreaterThanOrEqual(16);
    },
  });
});
