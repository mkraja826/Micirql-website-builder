import { siteSchema, type Site, type SitePage, type SiteSection } from "@micirql/schema";
import { sectionDesignId, type SectionFamily, type SectionVariant } from "@micirql/sections";
import type { OnboardingProfile } from "./preset-ranking";
import { isDentalProfileSignal, requestedDentalTreatments, type DentalTreatmentId } from "./dental-specialty";

export type DentalMultipageArchitectureResult = {
  site: Site;
  applied: boolean;
  treatmentPages: string[];
  contactPage?: string;
  reason: string;
};

type TreatmentPageDefinition = {
  id: Exclude<DentalTreatmentId, "general">;
  name: string;
  slug: string;
  keyword: string;
  hero: string;
  intro: string;
  assessment: Array<{ title: string; description: string }>;
  journey: Array<{ title: string; description: string }>;
  faq: Array<{ title: string; description: string }>;
  faqVariant: SectionVariant;
};

const DEFINITIONS: Record<Exclude<DentalTreatmentId, "general">, TreatmentPageDefinition> = {
  implant: {
    id: "implant",
    name: "Dental Implants",
    slug: "dental-implants",
    keyword: "dental implants",
    hero: "Dental implant care begins with careful assessment and planning",
    intro: "Implant treatment is individual. Your clinician assesses oral health, treatment goals, relevant health history and available bone before recommending an appropriate plan.",
    assessment: [
      { title: "Clinical assessment", description: "Your teeth, gums, bite and treatment goals are reviewed before implant options are discussed." },
      { title: "Imaging and planning", description: "Dental imaging or scans may be recommended where clinically appropriate to support treatment planning." },
      { title: "Personal treatment plan", description: "The proposed stages, timing and applicable fees can be explained after your individual assessment." },
    ],
    journey: [
      { title: "Consultation", description: "Discuss your concerns, goals and relevant health history with the clinical team." },
      { title: "Assessment", description: "Clinical findings and appropriate imaging inform whether implant treatment may be suitable." },
      { title: "Treatment", description: "Recommended procedures are completed according to the agreed clinical plan." },
      { title: "Review", description: "Healing, restoration and ongoing maintenance are reviewed according to your individual needs." },
    ],
    faq: [
      { title: "How is implant suitability assessed?", description: "Suitability depends on individual oral health, available bone, treatment goals and relevant health factors. A clinician must assess you before recommending treatment." },
      { title: "How long can implant treatment take?", description: "Timing varies with the treatment plan, healing and whether additional procedures are recommended. Your clinician can explain the expected stages after assessment." },
      { title: "How are implant fees explained?", description: "After assessment, the clinic can provide a treatment plan outlining recommended stages and applicable fees for you to review before proceeding." },
    ],
    faqVariant: 2,
  },
  cosmetic: {
    id: "cosmetic",
    name: "Cosmetic Dentistry",
    slug: "cosmetic-dentistry",
    keyword: "cosmetic dentistry",
    hero: "Cosmetic dentistry planned around your smile, oral health and goals",
    intro: "Cosmetic treatment should begin with a clinical assessment. Tooth and gum health, bite, appearance goals and appropriate treatment options are considered before a plan is recommended.",
    assessment: [
      { title: "Smile goals", description: "The consultation starts with the changes you would like to explore and the priorities that matter to you." },
      { title: "Clinical foundations", description: "Teeth, gums and bite are assessed so cosmetic options can be considered in the context of oral health." },
      { title: "Planned outcome", description: "Where appropriate, photographs, scans or other planning tools can help explain the proposed treatment approach." },
    ],
    journey: [
      { title: "Consultation", description: "Discuss your concerns and the changes you would like to explore." },
      { title: "Assessment", description: "Your dentist evaluates oral health and the clinical factors relevant to the proposed cosmetic treatment." },
      { title: "Planning", description: "Suitable options, limitations, likely stages and fees are discussed before treatment is confirmed." },
      { title: "Maintenance", description: "Your dental team explains appropriate ongoing care for the treatment provided." },
    ],
    faq: [
      { title: "How is a cosmetic treatment option selected?", description: "The choice depends on your goals, tooth and gum health, bite and clinical findings. Your dentist can explain suitable options after assessment." },
      { title: "Can I review the proposed plan before treatment?", description: "Yes. The consultation and planning stages are an opportunity to discuss the proposed changes, alternatives and relevant limitations before proceeding." },
      { title: "How many appointments may be needed?", description: "The number of visits varies by treatment and clinical need. Your treatment plan can outline the expected appointment sequence for your case." },
    ],
    faqVariant: 4,
  },
  orthodontics: {
    id: "orthodontics",
    name: "Orthodontics",
    slug: "orthodontics",
    keyword: "orthodontic treatment",
    hero: "Orthodontic treatment guided by your bite, tooth position and goals",
    intro: "Orthodontic planning considers tooth position, bite, oral health and treatment goals before aligners, braces or another appropriate option is discussed.",
    assessment: [
      { title: "Bite and alignment", description: "Tooth position and bite relationships are assessed before a treatment approach is recommended." },
      { title: "Records and planning", description: "Photographs, scans or dental imaging may be used where appropriate to support orthodontic planning." },
      { title: "Treatment options", description: "Suitable appliance options, expected stages and retention can be discussed after assessment." },
    ],
    journey: [
      { title: "Orthodontic assessment", description: "Your clinician reviews alignment, bite, oral health and treatment goals." },
      { title: "Treatment planning", description: "Appropriate appliance options and the proposed movement plan are discussed." },
      { title: "Active treatment", description: "Progress is monitored through review appointments and clinically appropriate adjustments." },
      { title: "Retention", description: "A retention plan is recommended to help maintain tooth position after active treatment." },
    ],
    faq: [
      { title: "How is the right orthodontic option chosen?", description: "The recommendation depends on tooth position, bite, oral health, treatment goals and clinical findings after assessment." },
      { title: "How long can orthodontic treatment take?", description: "Treatment time varies with the movement required, appliance and individual response. A more specific estimate can be discussed after assessment." },
      { title: "Why are retainers recommended?", description: "Retention is commonly used to help maintain tooth position after active orthodontic treatment. Your clinician can recommend an appropriate retention plan." },
    ],
    faqVariant: 3,
  },
  endodontics: {
    id: "endodontics",
    name: "Root Canal Treatment",
    slug: "root-canal-treatment",
    keyword: "root canal treatment",
    hero: "Root canal care starts with diagnosis of the individual tooth",
    intro: "Symptoms alone do not determine treatment. A clinical examination and appropriate dental imaging help the clinician diagnose the tooth and discuss suitable treatment options.",
    assessment: [
      { title: "Symptoms and history", description: "Your clinician reviews the history of the tooth, symptoms and relevant previous treatment." },
      { title: "Clinical examination", description: "The tooth and surrounding tissues are examined to identify findings relevant to diagnosis." },
      { title: "Dental imaging", description: "Imaging may be recommended where appropriate to help assess the tooth and surrounding structures." },
    ],
    journey: [
      { title: "Diagnosis", description: "Clinical findings are used to determine whether root canal treatment or another option may be appropriate." },
      { title: "Treatment planning", description: "The clinician explains the proposed treatment, alternatives and expected appointment sequence." },
      { title: "Root canal care", description: "Treatment is completed according to the individual tooth and clinical findings." },
      { title: "Restoration and review", description: "The tooth may require a suitable final restoration and follow-up according to its condition." },
    ],
    faq: [
      { title: "Why might root canal treatment be recommended?", description: "It may be considered when the tissue inside a tooth is inflamed or infected. A clinician must assess the tooth to determine the appropriate treatment." },
      { title: "How many visits can treatment require?", description: "The number of visits varies with the tooth and clinical findings. Your clinician can explain the expected stages after examination." },
      { title: "What may be needed after root canal treatment?", description: "Depending on the tooth, a suitable final restoration and follow-up may be recommended. Your clinician can explain the next restorative steps." },
    ],
    faqVariant: 1,
  },
  rehabilitation: {
    id: "rehabilitation",
    name: "Full-Mouth Rehabilitation",
    slug: "full-mouth-rehabilitation",
    keyword: "full-mouth rehabilitation",
    hero: "Comprehensive dental rehabilitation built from a coordinated clinical plan",
    intro: "Full-mouth rehabilitation can involve several dental concerns and treatment stages. Planning begins with a comprehensive assessment of oral health, bite, function and individual priorities.",
    assessment: [
      { title: "Comprehensive examination", description: "Teeth, gums, bite, existing dental work and missing teeth are reviewed as relevant to your needs." },
      { title: "Records and diagnostics", description: "Appropriate imaging, scans, photographs or bite records may support comprehensive planning." },
      { title: "Staged treatment plan", description: "Recommended treatment can be organised into clinically appropriate stages with timing and fees explained before proceeding." },
    ],
    journey: [
      { title: "Assessment", description: "A comprehensive examination establishes the clinical findings and priorities." },
      { title: "Planning", description: "Treatment options are coordinated into an appropriate sequence based on individual needs." },
      { title: "Staged care", description: "Treatment is completed in the agreed clinical order with review between appropriate stages." },
      { title: "Maintenance", description: "Ongoing care and review are planned around the completed treatment and oral health needs." },
    ],
    faq: [
      { title: "What does full-mouth rehabilitation involve?", description: "It is a coordinated approach to multiple dental concerns. The exact procedures and sequence depend on individual clinical findings." },
      { title: "Can comprehensive treatment be completed in stages?", description: "It is often organised into clinically appropriate stages. The sequence and timing depend on your oral health and treatment needs." },
      { title: "How are timing and fees explained?", description: "After assessment, the proposed stages, expected appointment sequence and applicable fees can be outlined for you to review." },
    ],
    faqVariant: 5,
  },
  crowns: {
    id: "crowns",
    name: "Dental Crowns",
    slug: "dental-crowns",
    keyword: "dental crowns",
    hero: "Dental crowns planned around the condition, function and appearance of the tooth",
    intro: "A crown may be considered when a tooth needs substantial restoration or protection. The tooth, bite and restorative requirements are assessed before an appropriate option is recommended.",
    assessment: [
      { title: "Tooth assessment", description: "The remaining tooth structure, symptoms and existing restorations are evaluated before treatment is recommended." },
      { title: "Bite and function", description: "The way the tooth functions within your bite is considered as part of restorative planning." },
      { title: "Material and design", description: "Appropriate material and design options can be discussed according to clinical needs and appearance goals." },
    ],
    journey: [
      { title: "Examination", description: "Your dentist assesses the tooth and confirms whether a crown or another treatment may be appropriate." },
      { title: "Planning", description: "The proposed restoration, material choices and appointment sequence are explained." },
      { title: "Restoration", description: "The tooth is treated according to the agreed restorative plan." },
      { title: "Review and care", description: "Oral hygiene and review advice are provided for the restored tooth and surrounding tissues." },
    ],
    faq: [
      { title: "When might a dental crown be considered?", description: "A crown may be considered when a tooth needs substantial restoration or protection. Your dentist must assess the tooth before recommending treatment." },
      { title: "How is the crown material selected?", description: "The choice depends on the tooth, bite, appearance goals and clinical requirements. Your dentist can explain suitable options after assessment." },
      { title: "How should a crowned tooth be cared for?", description: "Good oral hygiene and appropriate dental reviews remain important. Your dental team can provide advice based on your oral health and restoration." },
    ],
    faqVariant: 2,
  },
};

export function applyDentalMultipageArchitecture(site: Site, profile: OnboardingProfile): DentalMultipageArchitectureResult {
  if (!isDentalProfileSignal(profile) || site.seoBlueprint.servicePages === false) {
    return { site, applied: false, treatmentPages: [], reason: "service-pages-not-applicable" };
  }

  const requested = [...new Set(requestedDentalTreatments(profile).map((entry) => entry.id))]
    .filter((id): id is Exclude<DentalTreatmentId, "general"> => id !== "general")
    .slice(0, 4);
  if (!requested.length) return { site, applied: false, treatmentPages: [], reason: "no-explicit-treatment-pages" };

  const next = structuredClone(site);
  const home = next.pages.find((page) => page.path === "/") ?? next.pages[0];
  if (!home) return { site, applied: false, treatmentPages: [], reason: "homepage-missing" };

  const treatmentDefinitions = requested.map((id) => DEFINITIONS[id]);
  const treatmentPages: string[] = [];
  for (const definition of treatmentDefinitions) {
    const path = `/treatments/${definition.slug}`;
    if (next.pages.some((page) => page.path === path)) continue;
    next.pages.push(buildTreatmentPage(next, home, definition, path));
    treatmentPages.push(path);
  }

  const contactPath = ensureContactPage(next, home);
  const treatmentLinks = treatmentDefinitions.map((definition) => ({ title: definition.name, href: `/treatments/${definition.slug}` }));
  updateShellNavigation(next, treatmentLinks, contactPath);
  linkHomepageTreatmentCards(home, treatmentDefinitions);
  updateSiteNavigation(next, treatmentDefinitions, contactPath);

  return {
    site: siteSchema.parse(next),
    applied: treatmentPages.length > 0 || Boolean(contactPath),
    treatmentPages,
    contactPage: contactPath,
    reason: treatmentPages.length ? "explicit-treatment-pages-created" : "treatment-pages-already-present",
  };
}

function buildTreatmentPage(site: Site, home: SitePage, definition: TreatmentPageDefinition, path: string): SitePage {
  const nav = shellClone(home, "navbar", `${definition.id}-nav`);
  const footer = shellClone(home, "footer", `${definition.id}-footer`);
  const heroVariant = variantFromComponent(home.sections.find((section) => familyFromId(section.component.componentId) === "hero")?.component.componentId) ?? 1;

  const sections: SiteSection[] = [
    nav ?? makeSection(site, `${definition.id}-nav`, "navbar", 1, { title: site.name, items: [] }),
    makeSection(site, `${definition.id}-hero`, "hero", heroVariant, {
      eyebrow: definition.name,
      title: definition.hero,
      description: definition.intro,
      breadcrumbs: [{ label: "Home", href: "/" }, { label: definition.name, href: path }],
      primaryAction: { label: "Book consultation", href: "/contact" },
      secondaryAction: { label: "View all treatments", href: "/#treatments" },
      imageSlotMode: "section",
      imageRatio: "4:5",
      imageFit: "cover",
      imageFocalPoint: "face-safe",
      treatmentPageId: definition.id,
    }),
    makeSection(site, `${definition.id}-assessment`, "about", 3, {
      eyebrow: "Assessment first",
      title: `How ${definition.name.toLowerCase()} is planned`,
      description: definition.intro,
      items: definition.assessment,
      treatmentPageId: definition.id,
    }),
    makeSection(site, `${definition.id}-journey`, "process", 3, {
      eyebrow: "Treatment journey",
      title: "A clear sequence from consultation to review",
      description: "Your exact treatment sequence is determined by your individual clinical findings and agreed plan.",
      items: definition.journey,
      treatmentPageId: definition.id,
    }),
    makeSection(site, `${definition.id}-faq`, "faq", definition.faqVariant, {
      eyebrow: "Patient questions",
      title: `Questions about ${definition.name.toLowerCase()}`,
      description: "General information to help you prepare for an individual consultation and treatment discussion.",
      items: definition.faq,
      faqMode: "single",
      faqSpecialty: definition.id,
      treatmentPageId: definition.id,
    }),
    makeSection(site, `${definition.id}-cta`, "cta", 3, {
      eyebrow: "Next step",
      title: `Discuss ${definition.name.toLowerCase()} with the clinical team`,
      description: "A consultation is the appropriate starting point for individual assessment, options and a treatment plan.",
      primaryAction: { label: "Book consultation", href: "/contact" },
      secondaryAction: { label: "Back to home", href: "/" },
      treatmentPageId: definition.id,
    }),
    footer ?? makeSection(site, `${definition.id}-footer`, "footer", 1, { title: site.name, items: [] }),
  ];

  return {
    id: uniquePageId(site.pages, `treatment-${definition.id}`),
    path,
    name: definition.name,
    sections,
    seo: {
      title: seoTitle(definition.name, site.name),
      description: seoDescription(definition, site.name),
      canonicalPath: path,
      indexable: true,
      primaryKeyword: definition.keyword,
      structuredDataTypes: ["Organization", "BreadcrumbList"],
    },
  };
}

function ensureContactPage(site: Site, home: SitePage): string {
  const existing = site.pages.find((page) => page.path === "/contact");
  if (existing) return existing.path;
  const contactSource = home.sections.find((section) => familyFromId(section.component.componentId) === "contact");
  const nav = shellClone(home, "navbar", "contact-nav") ?? makeSection(site, "contact-nav", "navbar", 1, { title: site.name, items: [] });
  const footer = shellClone(home, "footer", "contact-footer") ?? makeSection(site, "contact-footer", "footer", 1, { title: site.name, items: [] });
  const contact = contactSource ? structuredClone(contactSource) : makeSection(site, "contact-details", "contact", 2, {
    eyebrow: "Contact",
    title: "Book a dental consultation",
    description: "Contact the clinic to arrange an appointment or ask about the next appropriate step for your dental care.",
  });
  contact.id = "contact-details";
  site.pages.push({
    id: uniquePageId(site.pages, "contact"),
    path: "/contact",
    name: "Contact",
    seo: {
      title: seoTitle("Contact", site.name),
      description: `Contact ${site.name} to request a dental consultation or discuss the next appropriate step for your care.`.slice(0, 180),
      canonicalPath: "/contact",
      indexable: true,
      primaryKeyword: `${site.name} contact`,
      structuredDataTypes: ["Organization", "BreadcrumbList"],
    },
    sections: [
      nav,
      makeSection(site, "contact-hero", "hero", 3, {
        eyebrow: "Contact",
        title: "Arrange your consultation",
        description: "Contact the clinic to request an appointment. The clinical team can explain the appropriate next step for individual assessment and treatment planning.",
        breadcrumbs: [{ label: "Home", href: "/" }, { label: "Contact", href: "/contact" }],
      }),
      contact,
      footer,
    ],
  });
  return "/contact";
}

function linkHomepageTreatmentCards(home: SitePage, definitions: TreatmentPageDefinition[]) {
  const sections = home.sections.filter((section) => familyFromId(section.component.componentId) === "services");
  for (const section of sections) {
    const items = Array.isArray(section.props.items) ? section.props.items : [];
    section.props.items = items.map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return item;
      const record = { ...(item as Record<string, unknown>) };
      const title = text(record.title);
      const definition = definitions.find((candidate) => titleMatchesTreatment(title, candidate));
      return definition ? { ...record, href: `/treatments/${definition.slug}` } : record;
    });
    section.props.sectionAnchor = section.props.sectionAnchor ?? "treatments";
  }
}

function updateShellNavigation(site: Site, treatments: Array<{ title: string; href: string }>, contactPath: string) {
  const primaryItems = [{ title: "Home", href: "/" }, { title: "Contact", href: contactPath }];
  const groups = [{ label: "Treatments", items: treatments }];
  for (const page of site.pages) {
    for (const section of page.sections) {
      const family = familyFromId(section.component.componentId);
      if (family !== "navbar" && family !== "footer") continue;
      section.props.items = primaryItems;
      section.props.navigationGroups = groups;
      if (family === "navbar") section.props.primaryAction = { label: "Book consultation", href: contactPath };
    }
  }
}

function updateSiteNavigation(site: Site, definitions: TreatmentPageDefinition[], contactPath: string) {
  site.navigation = [
    { label: "Home", href: "/" },
    ...definitions.map((definition) => ({ label: definition.name, href: `/treatments/${definition.slug}` })),
    { label: "Contact", href: contactPath },
  ];
}

function makeSection(site: Site, id: string, family: SectionFamily, variant: SectionVariant, props: Record<string, unknown>): SiteSection {
  return {
    id,
    component: { componentId: sectionDesignId(site.theme.family, family, variant), version: "1.0.0" },
    props,
    bindings: {},
    hidden: false,
  };
}

function shellClone(home: SitePage, family: "navbar" | "footer", id: string): SiteSection | undefined {
  const source = home.sections.find((section) => familyFromId(section.component.componentId) === family);
  if (!source) return undefined;
  const clone = structuredClone(source);
  clone.id = id;
  clone.hidden = false;
  return clone;
}

function familyFromId(componentId: string): SectionFamily | undefined {
  const value = componentId.toLowerCase();
  const families: SectionFamily[] = ["navbar", "hero", "about", "services", "features", "process", "testimonials", "gallery", "team", "faq", "pricing", "cta", "contact", "footer"];
  for (const family of families) if (value === `${family}.placeholder` || value.startsWith(`${family}.`)) return family;
  const codes: Partial<Record<SectionFamily, string>> = { navbar: "nav", hero: "hero", about: "about", services: "serv", features: "feat", process: "proc", testimonials: "test", gallery: "gall", team: "team", faq: "faq", pricing: "pricing", cta: "cta", contact: "cont", footer: "foot" };
  return families.find((family) => codes[family] && value.includes(`-${codes[family]}-`));
}

function variantFromComponent(componentId?: string): SectionVariant | undefined {
  const match = componentId?.match(/-(?:HERO|hero)-(\d{3})$/);
  if (!match?.[1]) return undefined;
  const value = Number(match[1]);
  return value >= 1 && value <= 5 ? value as SectionVariant : undefined;
}

function uniquePageId(pages: SitePage[], base: string): string {
  const used = new Set(pages.map((page) => page.id));
  if (!used.has(base)) return base;
  let suffix = 2;
  while (used.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

function titleMatchesTreatment(title: string, definition: TreatmentPageDefinition): boolean {
  const normalized = title.toLowerCase();
  if (definition.id === "implant") return /implant|full[- ]arch|all[- ]on/.test(normalized);
  if (definition.id === "cosmetic") return /cosmetic|veneer|smile/.test(normalized);
  if (definition.id === "orthodontics") return /ortho|aligner|brace/.test(normalized);
  if (definition.id === "endodontics") return /root canal|endo/.test(normalized);
  if (definition.id === "rehabilitation") return /rehabilitation|full[- ]mouth|bite/.test(normalized);
  return /crown|ceramic restoration/.test(normalized);
}

function seoTitle(pageName: string, siteName: string): string {
  const full = `${pageName} | ${siteName}`;
  return full.length <= 70 ? full : pageName.slice(0, 70);
}

function seoDescription(definition: TreatmentPageDefinition, siteName: string): string {
  return `${definition.name} at ${siteName}: assessment-led information about planning, treatment stages and the next step for an individual consultation.`.slice(0, 180);
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
