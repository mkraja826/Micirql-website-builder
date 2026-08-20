import { siteSchema, type Site, type SiteSection } from "@micirql/schema";
import { sectionDesignId, type SectionVariant } from "@micirql/sections";
import type { OnboardingProfile } from "./preset-ranking";
import { isDentalProfileSignal, primaryDentalTreatment, type DentalTreatmentId } from "./dental-specialty";

export type DentalFaqIntelligenceResult = {
  site: Site;
  applied: boolean;
  specialty?: DentalTreatmentId;
  sectionId?: string;
  reason: string;
};

type FaqItem = { title: string; description: string };
type FaqDefinition = { title: string; description: string; items: FaqItem[]; variant: SectionVariant };

const HIGH_CONSIDERATION = new Set<DentalTreatmentId>([
  "implant",
  "cosmetic",
  "orthodontics",
  "endodontics",
  "rehabilitation",
  "crowns",
]);

const FAQ_DEFINITIONS: Record<Exclude<DentalTreatmentId, "general">, FaqDefinition> = {
  implant: {
    title: "Questions about dental implants",
    description: "Clear starting points for understanding assessment, planning, timing and treatment fees before you decide on care.",
    variant: 2,
    items: [
      { title: "How do I know if dental implants may be suitable for me?", description: "Suitability is assessed from your oral health, treatment goals, available bone and relevant health history. Your clinician can explain the appropriate options after an individual assessment." },
      { title: "What does the implant treatment journey usually involve?", description: "Care commonly moves through consultation and assessment, treatment planning, implant placement when appropriate, healing and the final restoration. The sequence can vary according to your clinical needs." },
      { title: "How long can implant treatment take?", description: "Timing varies with the treatment plan, healing and whether any additional procedures are recommended. Your clinician can outline the expected stages for your individual case." },
      { title: "How are implant treatment costs explained?", description: "After assessment, the clinic can provide a treatment plan that sets out the recommended stages and applicable fees so you can review them before proceeding." },
    ],
  },
  cosmetic: {
    title: "Questions about cosmetic dentistry",
    description: "What to consider before choosing veneers, smile-design treatment or another cosmetic dental option.",
    variant: 4,
    items: [
      { title: "How do I know which cosmetic treatment may suit my smile?", description: "The choice depends on your goals, tooth and gum health, bite and the changes you would like to make. A clinical assessment helps determine which options may be appropriate." },
      { title: "Can I review the plan before cosmetic treatment begins?", description: "Planning can include a discussion of your goals, photographs or scans where appropriate, and the proposed changes. Your dentist can explain the planned approach before treatment is confirmed." },
      { title: "How many visits can cosmetic dental treatment take?", description: "The number of visits varies with the treatment selected and the condition of your teeth. Your treatment plan should outline the likely stages and appointments for your case." },
      { title: "How should veneers or other cosmetic restorations be maintained?", description: "Ongoing care depends on the material used, oral health and individual habits. Your dental team can provide maintenance advice and recommend review intervals for your treatment." },
    ],
  },
  orthodontics: {
    title: "Questions about orthodontic treatment",
    description: "Useful information about assessment, aligners or braces, treatment timing and retention.",
    variant: 3,
    items: [
      { title: "How is the right orthodontic option chosen?", description: "Your clinician assesses tooth position, bite, oral health and treatment goals before discussing whether aligners, braces or another approach may be suitable." },
      { title: "How long does orthodontic treatment usually take?", description: "Treatment time varies with the movement required, the chosen appliance and individual response. Your orthodontic plan can provide a more specific estimate after assessment." },
      { title: "Why are review appointments needed during treatment?", description: "Regular reviews allow the clinician to monitor progress, check oral health and make appropriate adjustments to the treatment plan or appliance." },
      { title: "Will I need retainers after orthodontic treatment?", description: "Retention is commonly part of maintaining tooth position after active orthodontic treatment. Your clinician can recommend the type of retainer and wearing schedule for your case." },
    ],
  },
  endodontics: {
    title: "Questions about root canal treatment",
    description: "A practical overview of assessment, treatment stages and follow-up when root canal care is being considered.",
    variant: 1,
    items: [
      { title: "Why might root canal treatment be recommended?", description: "Root canal treatment may be considered when the tissue inside a tooth is inflamed or infected. A dentist or endodontic clinician must assess the tooth to confirm the appropriate treatment." },
      { title: "What does the assessment for root canal treatment involve?", description: "Assessment can include your symptoms, a clinical examination and dental imaging where appropriate. These findings help the clinician diagnose the tooth and discuss treatment options." },
      { title: "How many visits can root canal treatment require?", description: "The number of visits varies with the tooth, the clinical findings and the treatment required. Your clinician can explain the expected stages after examining the tooth." },
      { title: "What follow-up can be needed after root canal treatment?", description: "The tooth may need review and, depending on its condition, a suitable final restoration. Your clinician can explain aftercare and any restorative steps recommended for that tooth." },
    ],
  },
  rehabilitation: {
    title: "Questions about full-mouth rehabilitation",
    description: "How comprehensive treatment is assessed, planned and staged around individual clinical needs.",
    variant: 5,
    items: [
      { title: "What does full-mouth rehabilitation mean?", description: "It is a coordinated treatment approach for multiple dental concerns that may involve teeth, bite, gums or missing teeth. The exact scope is determined only after a comprehensive assessment." },
      { title: "How is a full-mouth treatment plan created?", description: "Planning can include examination, dental imaging or scans where appropriate, bite assessment and discussion of your priorities before the clinician recommends a sequence of care." },
      { title: "Can full-mouth rehabilitation be completed in stages?", description: "Comprehensive care is often organised into clinically appropriate stages. The order and timing depend on your oral health, treatment needs and the procedures included in your plan." },
      { title: "How are timing and fees explained for comprehensive treatment?", description: "After assessment, the clinic can outline the proposed stages, expected appointment sequence and applicable fees so you can review the plan before proceeding." },
    ],
  },
  crowns: {
    title: "Questions about dental crowns",
    description: "What patients commonly want to understand about crown assessment, materials, appointments and ongoing care.",
    variant: 2,
    items: [
      { title: "When might a dental crown be considered?", description: "A crown may be considered when a tooth needs substantial restoration or protection. Your dentist must assess the tooth and discuss suitable treatment options for its condition." },
      { title: "How is the type of crown selected?", description: "Material and design choices depend on the tooth, bite, appearance goals and clinical requirements. Your dentist can explain the options that are appropriate for your case." },
      { title: "How many appointments can a crown require?", description: "The appointment sequence varies with the clinical situation and the restoration workflow used by the clinic. Your treatment plan can explain the expected steps." },
      { title: "How should a crowned tooth be cared for?", description: "Good oral hygiene and appropriate dental reviews remain important around a crowned tooth. Your dental team can advise on cleaning, maintenance and review based on your oral health." },
    ],
  },
};

const DECISION_SUPPORT_FAMILIES = new Set(["services", "features", "about", "process", "testimonials", "gallery", "team"]);
const CONVERSION_FAMILIES = new Set(["cta", "contact", "lead-capture", "form"]);
const TRAILING_CONVERSION_FAMILIES = new Set([...CONVERSION_FAMILIES, "footer"]);

export function applyDentalFaqIntelligence(site: Site, profile: OnboardingProfile): DentalFaqIntelligenceResult {
  if (!isDentalProfileSignal(profile)) return { site, applied: false, reason: "profile-is-not-dental" };

  const specialty = primaryDentalTreatment(profile);
  if (!specialty || !HIGH_CONSIDERATION.has(specialty)) {
    return { site, applied: false, specialty, reason: "no-high-consideration-treatment-signal" };
  }

  const page = site.pages.find((candidate) => candidate.path === "/") ?? site.pages[0];
  if (!page) return { site, applied: false, specialty, reason: "homepage-missing" };
  if (page.sections.some((section) => !section.hidden && familyFromId(section.component.componentId) === "faq")) {
    return { site, applied: false, specialty, reason: "visible-faq-already-present" };
  }

  const visibleFamilies = page.sections.filter((section) => !section.hidden).map((section) => familyFromId(section.component.componentId));
  const hasDecisionSupport = visibleFamilies.some((family) => family && DECISION_SUPPORT_FAMILIES.has(family));
  const hasConversion = visibleFamilies.some((family) => family && CONVERSION_FAMILIES.has(family));
  if (!hasDecisionSupport || !hasConversion) {
    return { site, applied: false, specialty, reason: "page-journey-not-ready-for-faq" };
  }

  const definition = FAQ_DEFINITIONS[specialty as Exclude<DentalTreatmentId, "general">];
  if (!definition) return { site, applied: false, specialty, reason: "faq-definition-missing" };

  const next = structuredClone(site);
  const nextPage = next.pages.find((candidate) => candidate.id === page.id)!;
  const id = uniqueSectionId(nextPage.sections, `faq-dental-${specialty}`);
  const section: SiteSection = {
    id,
    component: { componentId: sectionDesignId(next.theme.family, "faq", definition.variant), version: "1.0.0" },
    props: {
      eyebrow: "Patient questions",
      title: definition.title,
      description: definition.description,
      items: definition.items.map((item) => ({ ...item })),
      faqMode: "single",
      faqSpecialty: specialty,
      faqIntelligenceVersion: 1,
      layoutPurpose: "decision-support",
    },
    bindings: {},
    hidden: false,
  };

  const insertAt = decisionStageInsertionIndex(nextPage.sections);
  nextPage.sections.splice(insertAt, 0, section);
  return {
    site: siteSchema.parse(next),
    applied: true,
    specialty,
    sectionId: id,
    reason: "specialty-faq-added-before-final-conversion",
  };
}

function decisionStageInsertionIndex(sections: SiteSection[]): number {
  const footer = sections.findIndex((section) => familyFromId(section.component.componentId) === "footer");
  const boundary = footer >= 0 ? footer : sections.length;
  let index = boundary;
  while (index > 0) {
    const family = familyFromId(sections[index - 1]!.component.componentId);
    if (!family || !TRAILING_CONVERSION_FAMILIES.has(family)) break;
    index -= 1;
  }
  return index;
}

function uniqueSectionId(sections: SiteSection[], base: string): string {
  const used = new Set(sections.map((section) => section.id));
  if (!used.has(base)) return base;
  let suffix = 2;
  while (used.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

function familyFromId(componentId: string): string | undefined {
  const value = componentId.toLowerCase();
  const legacy = ["navbar", "hero", "about", "services", "features", "process", "testimonials", "gallery", "team", "faq", "cta", "contact", "footer", "lead-capture", "form"];
  for (const family of legacy) if (value === `${family}.placeholder` || value.startsWith(`${family}.`)) return family;
  const codes: Record<string, string> = { nav: "navbar", hero: "hero", about: "about", serv: "services", feat: "features", proc: "process", test: "testimonials", gall: "gallery", team: "team", faq: "faq", cta: "cta", cont: "contact", foot: "footer" };
  for (const [code, family] of Object.entries(codes)) if (value.includes(`-${code}-`)) return family;
  return undefined;
}
