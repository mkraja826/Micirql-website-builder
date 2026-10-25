import {
  siteSchema,
  type BrandInput,
  type BrandProvenance,
  type Site,
} from "@micirql/schema";
import {
  CERTIFIED_SECTION_COMPONENT_VERSION,
  FAMILY_CODES,
  SECTION_FAMILIES,
  sectionDesignId,
  type SectionFamily,
} from "@micirql/sections";
import { applyBrandInput } from "../../brand-provenance";
import {
  RESTAURANT_DRAFT_CANDIDATES,
  type RestaurantDraftCandidate,
} from "./restaurant-candidate-data";
import { applyRestaurantCandidateHomePresentation } from "./restaurant-candidate-home-presentation";
import { applyRestaurantCandidateMedia } from "./restaurant-candidate-media";
import { applyRestaurantDraftContentHygiene } from "./restaurant-content-hygiene";

export type ApplyRestaurantDraftCandidateOptions = {
  brandInput?: BrandInput;
  brandProvenance?: BrandProvenance;
  applyCandidateMedia?: boolean;
};

/**
 * Makes one staged Restaurant candidate renderable while retaining the draft
 * pack's unavailable status and explicit failing certification gate.
 */
export function applyRestaurantDraftCandidate(
  site: Site,
  candidateOrId: RestaurantDraftCandidate | string,
  options: ApplyRestaurantDraftCandidateOptions = {},
): Site {
  if (site.domain !== "restaurant" || site.subtype !== "restaurant") {
    throw new Error(
      "Restaurant draft candidates can only be applied to a restaurant/restaurant scaffold.",
    );
  }
  const candidate = resolveCandidate(candidateOrId);
  const next = structuredClone(site);
  const currentLogoAssetId = next.theme.brand.logoAssetId;
  next.theme = applyBrandInput(
    candidate.theme,
    options.brandInput ?? next.generation?.brandInput,
    options.brandProvenance ?? next.generation?.brandProvenance,
  );
  if (currentLogoAssetId && !next.theme.brand.logoAssetId) {
    next.theme.brand.logoAssetId = currentLogoAssetId;
  }

  for (const page of next.pages) {
    for (const section of page.sections) {
      const family = sectionFamily(section.component.componentId);
      if (!family) continue;
      section.component = {
        componentId: sectionDesignId(
          candidate.theme.family,
          family,
          candidate.variants[family],
        ),
        version: CERTIFIED_SECTION_COMPONENT_VERSION,
      };
    }
    // Candidate choreography is a Home-only art-direction decision. The five
    // inner routes keep the researched menu, arrival, reservation, story and
    // general-enquiry sequence from the factual Restaurant scaffold.
    if (page.path === "/") {
      page.sections = orderSections(page.sections, candidate.sectionOrder);
    }
  }

  next.generation = {
    catalogVersion: candidate.catalogVersion,
    packStatus: "unavailable",
    candidateIds: RESTAURANT_DRAFT_CANDIDATES.map((value) => value.id),
    selectedCandidateId: candidate.id,
    ...(options.brandInput || next.generation?.brandInput
      ? { brandInput: options.brandInput ?? next.generation?.brandInput }
      : {}),
    ...(options.brandProvenance || next.generation?.brandProvenance
      ? {
          brandProvenance:
            options.brandProvenance ?? next.generation?.brandProvenance,
        }
      : {}),
    premiumGate: candidate.gate,
  };

  const parsed = siteSchema.parse(
    applyRestaurantCandidateHomePresentation(next, candidate.id),
  );
  const withMedia =
    options.applyCandidateMedia === false
      ? parsed
      : applyRestaurantCandidateMedia(parsed, candidate);
  return siteSchema.parse(applyRestaurantDraftContentHygiene(withMedia).site);
}

function resolveCandidate(
  candidateOrId: RestaurantDraftCandidate | string,
): RestaurantDraftCandidate {
  const candidateId =
    typeof candidateOrId === "string" ? candidateOrId : candidateOrId.id;
  const candidate = RESTAURANT_DRAFT_CANDIDATES.find(
    (value) => value.id === candidateId,
  );
  if (!candidate) {
    throw new Error(`Unknown Restaurant draft candidate ${candidateId}.`);
  }
  return candidate;
}

function orderSections<T extends Site["pages"][number]["sections"][number]>(
  sections: T[],
  order: readonly SectionFamily[],
): T[] {
  const rank = new Map(order.map((family, index) => [family, index]));
  return sections
    .map((section, originalIndex) => ({
      section,
      originalIndex,
      family: sectionFamily(section.component.componentId),
    }))
    .sort(
      (left, right) =>
        (rank.get(left.family ?? "navbar") ?? 8_000 + left.originalIndex) -
        (rank.get(right.family ?? "navbar") ?? 8_000 + right.originalIndex),
    )
    .map(({ section }) => section);
}

function sectionFamily(componentId: string): SectionFamily | undefined {
  const normalized = componentId.toLowerCase();
  const legacy = SECTION_FAMILIES.find(
    (family) =>
      normalized === `${family}.placeholder` ||
      normalized.startsWith(`${family}.`),
  );
  if (legacy) return legacy;
  const upper = componentId.toUpperCase();
  return SECTION_FAMILIES.find((family) =>
    upper.includes(`-${FAMILY_CODES[family]}-`),
  );
}
