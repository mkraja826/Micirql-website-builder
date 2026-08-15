import type { Domain, ThemeFamily } from "@micirql/schema";
import type { AssetOrientation } from "./types";

export type PlaceholderPurpose =
  | "hero"
  | "service-card"
  | "feature-card"
  | "gallery"
  | "team-profile"
  | "location"
  | "testimonial-avatar"
  | "background"
  | "case-study"
  | "content-editorial"
  | "cta"
  | "logo-mark";

export type PlaceholderVariantRequirement = {
  orientation: AssetOrientation;
  aspectRatio: number;
  minWidth: number;
  minHeight: number;
  minimumCount: number;
};

export type PlaceholderCatalogRequirement = {
  purpose: PlaceholderPurpose;
  sectionFamilies: string[];
  variants: PlaceholderVariantRequirement[];
  themes?: ThemeFamily[];
  notes?: string[];
};

export type DomainPlaceholderCatalog = {
  domain: Domain;
  requirements: PlaceholderCatalogRequirement[];
};

const HERO_VARIANTS: PlaceholderVariantRequirement[] = [
  { orientation: "landscape", aspectRatio: 16 / 9, minWidth: 1600, minHeight: 900, minimumCount: 8 },
  { orientation: "portrait", aspectRatio: 4 / 5, minWidth: 960, minHeight: 1200, minimumCount: 4 },
  { orientation: "panoramic", aspectRatio: 21 / 9, minWidth: 1680, minHeight: 720, minimumCount: 4 },
];

const CARD_VARIANTS: PlaceholderVariantRequirement[] = [
  { orientation: "landscape", aspectRatio: 4 / 3, minWidth: 1200, minHeight: 900, minimumCount: 12 },
  { orientation: "square", aspectRatio: 1, minWidth: 900, minHeight: 900, minimumCount: 8 },
];

const GALLERY_VARIANTS: PlaceholderVariantRequirement[] = [
  { orientation: "landscape", aspectRatio: 3 / 2, minWidth: 1500, minHeight: 1000, minimumCount: 12 },
  { orientation: "portrait", aspectRatio: 4 / 5, minWidth: 1000, minHeight: 1250, minimumCount: 8 },
  { orientation: "square", aspectRatio: 1, minWidth: 1000, minHeight: 1000, minimumCount: 8 },
];

const PROFILE_VARIANTS: PlaceholderVariantRequirement[] = [
  { orientation: "portrait", aspectRatio: 4 / 5, minWidth: 800, minHeight: 1000, minimumCount: 10 },
  { orientation: "square", aspectRatio: 1, minWidth: 800, minHeight: 800, minimumCount: 6 },
];

const LOCATION_VARIANTS: PlaceholderVariantRequirement[] = [
  { orientation: "landscape", aspectRatio: 16 / 9, minWidth: 1400, minHeight: 788, minimumCount: 6 },
  { orientation: "landscape", aspectRatio: 4 / 3, minWidth: 1200, minHeight: 900, minimumCount: 6 },
];

const BACKGROUND_VARIANTS: PlaceholderVariantRequirement[] = [
  { orientation: "panoramic", aspectRatio: 21 / 9, minWidth: 1920, minHeight: 823, minimumCount: 6 },
  { orientation: "landscape", aspectRatio: 16 / 9, minWidth: 1920, minHeight: 1080, minimumCount: 6 },
];

const AVATAR_VARIANTS: PlaceholderVariantRequirement[] = [
  { orientation: "square", aspectRatio: 1, minWidth: 512, minHeight: 512, minimumCount: 12 },
];

const COMMON_REQUIREMENTS: PlaceholderCatalogRequirement[] = [
  { purpose: "hero", sectionFamilies: ["hero"], variants: HERO_VARIANTS },
  { purpose: "service-card", sectionFamilies: ["services", "features"], variants: CARD_VARIANTS },
  { purpose: "gallery", sectionFamilies: ["gallery", "portfolio", "showcase"], variants: GALLERY_VARIANTS },
  { purpose: "team-profile", sectionFamilies: ["team", "doctor", "faculty", "about"], variants: PROFILE_VARIANTS },
  { purpose: "location", sectionFamilies: ["location", "contact", "map"], variants: LOCATION_VARIANTS },
  { purpose: "testimonial-avatar", sectionFamilies: ["testimonials", "reviews"], variants: AVATAR_VARIANTS },
  { purpose: "background", sectionFamilies: ["hero", "cta", "banner"], variants: BACKGROUND_VARIANTS },
  { purpose: "cta", sectionFamilies: ["cta", "lead-capture"], variants: CARD_VARIANTS },
];

const domainSpecific: Record<Domain, PlaceholderCatalogRequirement[]> = {
  clinic: [
    { purpose: "case-study", sectionFamilies: ["cases", "before-after"], variants: GALLERY_VARIANTS, notes: ["No fabricated patient results or clinical before/after claims."] },
    { purpose: "content-editorial", sectionFamilies: ["blog", "education"], variants: CARD_VARIANTS },
  ],
  "landing-page": [
    { purpose: "feature-card", sectionFamilies: ["features", "benefits"], variants: CARD_VARIANTS },
  ],
  "real-estate": [
    { purpose: "case-study", sectionFamilies: ["properties", "projects", "listings"], variants: GALLERY_VARIANTS, notes: ["Placeholders must not imply real inventory or availability."] },
  ],
  restaurant: [
    { purpose: "content-editorial", sectionFamilies: ["menu", "food", "story"], variants: GALLERY_VARIANTS },
  ],
  corporate: [
    { purpose: "content-editorial", sectionFamilies: ["industries", "insights", "about"], variants: CARD_VARIANTS },
  ],
  saas: [
    { purpose: "feature-card", sectionFamilies: ["features", "product", "integrations"], variants: CARD_VARIANTS },
  ],
  portfolio: [
    { purpose: "case-study", sectionFamilies: ["projects", "portfolio", "work"], variants: GALLERY_VARIANTS },
  ],
  construction: [
    { purpose: "case-study", sectionFamilies: ["projects", "work", "case-studies"], variants: GALLERY_VARIANTS },
  ],
  education: [
    { purpose: "content-editorial", sectionFamilies: ["courses", "programs", "learning"], variants: CARD_VARIANTS },
  ],
  hospitality: [
    { purpose: "case-study", sectionFamilies: ["rooms", "property", "amenities", "experiences"], variants: GALLERY_VARIANTS, notes: ["Placeholders must not imply actual room availability or included amenities."] },
  ],
};

export const PLACEHOLDER_CATALOG: DomainPlaceholderCatalog[] = (Object.keys(domainSpecific) as Domain[]).map((domain) => ({
  domain,
  requirements: [...COMMON_REQUIREMENTS, ...domainSpecific[domain]],
}));

export function placeholderCatalogForDomain(domain: Domain): DomainPlaceholderCatalog {
  const catalog = PLACEHOLDER_CATALOG.find((item) => item.domain === domain);
  if (!catalog) throw new Error(`No placeholder catalog exists for domain ${domain}.`);
  return catalog;
}

export function minimumPlaceholderCount(domain: Domain): number {
  return placeholderCatalogForDomain(domain).requirements.reduce(
    (total, requirement) => total + requirement.variants.reduce((sum, variant) => sum + variant.minimumCount, 0),
    0,
  );
}

export function catalogCoverageTarget(): Record<Domain, number> {
  return Object.fromEntries(PLACEHOLDER_CATALOG.map((item) => [item.domain, minimumPlaceholderCount(item.domain)])) as Record<Domain, number>;
}
