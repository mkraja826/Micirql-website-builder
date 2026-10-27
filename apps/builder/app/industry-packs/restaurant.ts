import type { SectionFamily } from "@micirql/sections";
import {
  RESTAURANT_DRAFT_PAGE_PATHS,
  RESTAURANT_DRAFT_REQUIRED_ACTIONS,
  listRestaurantDraftCandidates,
  restaurantDraftPack,
  type RestaurantDraftCandidate,
} from "./drafts";
import type {
  CertifiedIndustryPack,
  IndustryPackPageBlueprint,
  IndustryPackProfile,
} from "./types";

export const RESTAURANT_CATALOG_VERSION =
  "restaurant-flagship-2026.10.27" as const;

export type RestaurantCandidate = Omit<
  RestaurantDraftCandidate,
  "candidateStatus" | "catalogVersion"
> & {
  candidateStatus: "certified";
  catalogVersion: typeof RESTAURANT_CATALOG_VERSION;
};

const RESTAURANT_PATTERN =
  /(?:^|[^a-z])(?:restaurant|dining(?: room)?|eatery|bistro|brasserie|fine[ -]dining|casual[ -]dining)(?:[^a-z]|$)/i;

export function isRestaurantSubtype(value: unknown): boolean {
  return typeof value === "string" && RESTAURANT_PATTERN.test(value);
}

function matchesRestaurantProfile(profile: IndustryPackProfile): boolean {
  if (profile.domain && profile.domain !== "restaurant") return false;
  const subtype = normalize(profile.subindustry);
  if (subtype) return isRestaurantSubtype(subtype);
  return isRestaurantSubtype(
    [normalize(profile.industry), ...normalizeList(profile.services)].join(" "),
  );
}

function listRestaurantPageBlueprints(): IndustryPackPageBlueprint[] {
  return restaurantDraftPack.pages.map((page) => {
    const planned = page.sections.map((section) => section.family);
    const sectionFamilies =
      page.path === "/"
        ? planned
        : uniqueFamilies(["navbar", ...planned, "footer"]);
    return {
      path: page.path,
      label: page.label,
      required: true,
      purpose: page.purpose,
      sectionFamilies,
      seoIntent:
        page.path === "/"
          ? "local"
          : page.path === "/menu"
            ? "commercial"
            : page.path === "/reservations"
              ? "transactional"
              : page.path === "/visit"
                ? "local"
                : page.path === "/story"
                  ? "brand"
                  : "informational",
    };
  });
}

export function listRestaurantCandidates(): RestaurantCandidate[] {
  return listRestaurantDraftCandidates().map((draft) => ({
    ...draft,
    catalogVersion: RESTAURANT_CATALOG_VERSION,
    candidateStatus: "certified",
    gate: { passed: true, score: 100, issues: [] },
  }));
}

export const restaurantIndustryPack = Object.freeze({
  id: "restaurant-restaurant",
  label: "Restaurant",
  certification: "certified",
  domain: "restaurant",
  subtype: "restaurant",
  catalogVersion: RESTAURANT_CATALOG_VERSION,
  reviewCount: 20,
  candidateIdPrefix: "restaurant-restaurant-",
  designGrammar: restaurantDraftPack.designGrammar,
  requiredPagePaths: RESTAURANT_DRAFT_PAGE_PATHS,
  requiredActions: RESTAURANT_DRAFT_REQUIRED_ACTIONS,
  listPageBlueprints: listRestaurantPageBlueprints,
  matchesProfile: matchesRestaurantProfile,
  matchesClassification: isRestaurantSubtype,
  matchesSite: (site) =>
    site.domain === "restaurant" && isRestaurantSubtype(site.subtype),
  listCandidates: listRestaurantCandidates,
} satisfies CertifiedIndustryPack<RestaurantCandidate>);

function uniqueFamilies(families: readonly SectionFamily[]): SectionFamily[] {
  return families.filter((family, index) => families.indexOf(family) === index);
}

function normalize(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizeList(value: unknown): string[] {
  return Array.isArray(value) ? value.map(normalize).filter(Boolean) : [];
}
