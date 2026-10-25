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
  PHYSIOTHERAPY_DRAFT_CANDIDATES,
  type PhysiotherapyDraftCandidate,
} from "./physiotherapy-candidate-data";
import { applyPhysiotherapyCandidateMedia } from "./physiotherapy-candidate-media";

export type ApplyPhysiotherapyDraftCandidateOptions = {
  brandInput?: BrandInput;
  brandProvenance?: BrandProvenance;
  applyCandidateMedia?: boolean;
};

/**
 * Makes one staged candidate renderable while retaining an unavailable pack
 * status and its explicit failing certification gate.
 */
export function applyPhysiotherapyDraftCandidate(
  site: Site,
  candidateOrId: PhysiotherapyDraftCandidate | string,
  options: ApplyPhysiotherapyDraftCandidateOptions = {},
): Site {
  if (site.domain !== "clinic" || site.subtype !== "physiotherapy") {
    throw new Error(
      "Physiotherapy draft candidates can only be applied to a clinic/physiotherapy scaffold.",
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
    // Candidate choreography is a Home-page art-direction decision. Inner
    // pages retain the researched pack anatomy so a visual recipe cannot move
    // evidence, suitability guidance, or the appointment form out of the
    // intended conversion sequence.
    if (page.path === "/") {
      page.sections = orderSections(page.sections, candidate.sectionOrder);
    }
  }

  next.generation = {
    catalogVersion: candidate.catalogVersion,
    packStatus: "unavailable",
    candidateIds: PHYSIOTHERAPY_DRAFT_CANDIDATES.map((value) => value.id),
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
  const parsed = siteSchema.parse(next);
  return options.applyCandidateMedia === false
    ? parsed
    : applyPhysiotherapyCandidateMedia(parsed, candidate);
}

function resolveCandidate(
  candidateOrId: PhysiotherapyDraftCandidate | string,
): PhysiotherapyDraftCandidate {
  const candidateId =
    typeof candidateOrId === "string" ? candidateOrId : candidateOrId.id;
  const candidate = PHYSIOTHERAPY_DRAFT_CANDIDATES.find(
    (value) => value.id === candidateId,
  );
  if (!candidate) {
    throw new Error(`Unknown Physiotherapy draft candidate ${candidateId}.`);
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
