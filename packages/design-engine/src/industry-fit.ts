import type { Site } from "@micirql/schema";
import { FAMILY_CODES, SECTION_FAMILIES, type SectionFamily } from "@micirql/sections";
import { resolveIndustryIntelligence, type IndustryIntelligencePack } from "./industry-intelligence";

const SEMANTIC_TO_FAMILY: Record<string, SectionFamily> = {
  treatments: "services", services: "services", menu: "services", courses: "services", capabilities: "services", listings: "services", categories: "services", "product-grid": "services", "featured-products": "services",
  doctor: "team", faculty: "team", team: "team", leadership: "team", agent: "team",
  technology: "features", expertise: "features", amenities: "features", outcomes: "features", industries: "features", benefits: "features", integrations: "features", "use-cases": "features",
  testimonials: "testimonials", reviews: "testimonials", proof: "testimonials", certifications: "testimonials", "case-studies": "testimonials",
  gallery: "gallery", projects: "gallery", "product-demo": "gallery", "featured-properties": "gallery",
  process: "process", curriculum: "process",
  cta: "cta", reservation: "cta",
  contact: "contact", location: "contact",
  company: "about", story: "about", insights: "about",
  faq: "features", pricing: "services",
};

export type IndustryFitResult = {
  score: number;
  packId?: string;
  packLabel?: string;
  matchedSections: string[];
  missingSections: string[];
  conversionFit: number;
};

export function evaluateIndustryFit(site: Site, industry?: string, subindustry?: string): IndustryFitResult {
  const pack = resolveIndustryIntelligence(industry, subindustry);
  if (!pack) return { score: 90, matchedSections: [], missingSections: [], conversionFit: 90 };

  const home = site.pages.find((page) => page.path === "/") ?? site.pages[0];
  if (!home) return { score: 0, packId: pack.id, packLabel: pack.label, matchedSections: [], missingSections: pack.recommendedSections, conversionFit: 0 };

  const families = new Set(home.sections.filter((section) => !section.hidden).map((section) => familyFromComponentId(section.component.componentId)).filter(Boolean) as SectionFamily[]);
  const matchedSections: string[] = [];
  const missingSections: string[] = [];
  for (const semantic of pack.recommendedSections) {
    const family = SEMANTIC_TO_FAMILY[semantic] ?? semantic as SectionFamily;
    (families.has(family) ? matchedSections : missingSections).push(semantic);
  }

  const coverage = pack.recommendedSections.length ? matchedSections.length / pack.recommendedSections.length : 1;
  const conversionFit = scoreConversionFit(site, pack);
  const trustFit = scoreTrustFit(families, pack);
  const score = clamp(Math.round(coverage * 55 + conversionFit * 0.25 + trustFit * 0.2));

  return { score, packId: pack.id, packLabel: pack.label, matchedSections, missingSections, conversionFit };
}

export function industryPlannerContext(industry?: string, subindustry?: string) {
  const pack = resolveIndustryIntelligence(industry, subindustry);
  if (!pack) return undefined;
  return {
    industryPack: pack.id,
    archetypeId: pack.archetypeId,
    communicationPriorities: pack.priorities,
    recommendedSections: pack.recommendedSections,
    trustSignals: pack.trustSignals,
    preferredCtaPatterns: pack.ctaPatterns,
    seoTopics: pack.seoTopics,
    sectionWritingGuidance: pack.contentPrompts,
    rule: "Use only supplied business facts. These are communication priorities, not permission to invent claims.",
  };
}

function scoreConversionFit(site: Site, pack: IndustryIntelligencePack): number {
  const actions = site.pages.flatMap((page) => page.sections.filter((section) => !section.hidden).flatMap((section) => {
    const props = section.props ?? {};
    return [props.primaryAction, props.secondaryAction].filter(Boolean);
  }));
  if (!actions.length) return 30;
  const preferred = pack.ctaPatterns.map(normalize);
  let best = 55;
  for (const value of actions) {
    if (!value || typeof value !== "object") continue;
    const label = normalize(String((value as Record<string, unknown>).label ?? ""));
    if (!label) continue;
    if (preferred.some((pattern) => label.includes(pattern) || pattern.includes(label))) best = Math.max(best, 100);
    else if (/book|contact|enquire|enroll|enrol|reserve|demo|shop|call|talk|request|start|view/.test(label)) best = Math.max(best, 82);
  }
  return best;
}

function scoreTrustFit(families: Set<SectionFamily>, pack: IndustryIntelligencePack): number {
  const trustFamilies: SectionFamily[] = ["testimonials", "team", "features", "gallery", "about", "contact"];
  const present = trustFamilies.filter((family) => families.has(family)).length;
  const baseline = 50 + present * 8;
  return clamp(baseline + Math.min(10, pack.trustSignals.length * 2));
}

function familyFromComponentId(componentId: string): SectionFamily | undefined {
  const normalized = componentId.toLowerCase();
  const legacy = SECTION_FAMILIES.find((family) => normalized === `${family}.placeholder` || normalized.startsWith(`${family}.`));
  if (legacy) return legacy;
  const upper = componentId.toUpperCase();
  return SECTION_FAMILIES.find((family) => upper.includes(`-${FAMILY_CODES[family]}-`));
}

function normalize(value: string) { return value.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim(); }
function clamp(value: number) { return Math.max(0, Math.min(100, value)); }
