import type {
  CompositionGateReport,
  Domain,
  ImageStrategy,
  PaletteStrategy,
  ThemeConfig,
  TypographyStrategy,
  WebsiteArchetype,
} from "@micirql/schema";
import type { SectionFamily, SectionVariant } from "@micirql/sections";

/**
 * The normalized subset of an onboarding brief used to select a certified
 * industry pack. Pack matchers must treat missing fields as unknown rather
 * than borrowing content or candidates from another industry.
 */
export type IndustryPackProfile = {
  domain?: Domain | null;
  industry?: unknown;
  subindustry?: unknown;
  services?: unknown;
};

export type IndustryPackSiteIdentity = {
  domain: Domain;
  subtype?: string | null;
};

/**
 * Pack-owned page anatomy. Domain packs remain useful as broad planning
 * defaults, but a certified subtype must own its exact visitor journey so a
 * Physiotherapy site cannot inherit Dental routes such as `/doctors` or
 * `/services` merely because both use the `clinic` domain.
 */
export type IndustryPackPageBlueprint = {
  path: string;
  label: string;
  required: boolean;
  purpose: string;
  sectionFamilies: readonly SectionFamily[];
  seoIntent: "commercial" | "transactional" | "informational" | "local" | "brand";
};

/**
 * A pack may reuse accessible primitives, but it must own an industry-specific
 * visual thesis. Registry integrity compares the resulting candidates across
 * packs so a new industry cannot ship as a palette-only dental clone.
 */
export type IndustryDesignGrammar = {
  id: string;
  visualThesis: string;
  sharedLayer: "primitives-only";
  motifs: readonly string[];
  disallowedReuse: readonly (
    | "candidate-signature"
    | "page-section-sequence"
    | "hero-composition"
    | "palette-only-variation"
  )[];
  maximumCrossIndustrySimilarity: number;
  maximumWithinIndustrySimilarity: number;
};

/**
 * Candidate-owned visual identity derived from the composition itself. These
 * fields describe recognisable layout and storytelling choices; IDs, names,
 * descriptions and palette swaps are deliberately insufficient on their own.
 */
export type CandidateVisualIdentity = {
  id: string;
  visualThesis: string;
  heroComposition: string;
  openingRhythm: readonly SectionFamily[];
  conversionJourney: readonly SectionFamily[];
  surfaceLanguage: readonly string[];
  signatureMotifs: readonly string[];
};

/**
 * Common candidate identity needed by the registry. The concrete pack keeps
 * ownership of its richer candidate type and renderer-specific metadata.
 */
export type IndustryPackCandidate = {
  id: string;
  catalogVersion: string;
  recipeId: string;
  visualIdentity: CandidateVisualIdentity;
  name: string;
  description: string;
  domain: Domain;
  subtype: string;
  archetype: WebsiteArchetype;
  theme: ThemeConfig;
  variants: Record<SectionFamily, SectionVariant>;
  sectionOrder: SectionFamily[];
  paletteStrategy: PaletteStrategy;
  typographyStrategy: TypographyStrategy;
  imageStrategy: ImageStrategy;
  styleTags: string[];
  rankSeed: number;
  requiredPagePaths: readonly string[];
  requiredActions: readonly string[];
  gate: CompositionGateReport;
};

/**
 * Compatibility-safe boundary for one independently certified industry pack.
 * Adding a pack to the registry is intentionally separate from defining it:
 * an unfinished pack cannot become available to production by accident.
 */
export type CertifiedIndustryPack<
  TCandidate extends IndustryPackCandidate = IndustryPackCandidate,
> = {
  id: string;
  label: string;
  certification: "certified";
  domain: Domain;
  subtype: string;
  catalogVersion: string;
  reviewCount: number;
  candidateIdPrefix: string;
  designGrammar: IndustryDesignGrammar;
  requiredPagePaths: readonly string[];
  requiredActions: readonly string[];
  listPageBlueprints(): IndustryPackPageBlueprint[];
  matchesProfile(profile: IndustryPackProfile): boolean;
  matchesClassification(value: unknown): boolean;
  matchesSite(site: IndustryPackSiteIdentity): boolean;
  listCandidates(): TCandidate[];
};
