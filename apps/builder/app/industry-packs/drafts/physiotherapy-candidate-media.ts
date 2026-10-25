import type { AssetRecord } from "@micirql/assets";
import { siteSchema, type ImageStrategy, type Site } from "@micirql/schema";
import { demoAssetById } from "../../demo-assets";
import type { PhysiotherapyDraftCandidate } from "./physiotherapy-candidate-data";
import {
  PHYSIOTHERAPY_CANDIDATE_MEDIA_ENTRIES,
  PHYSIOTHERAPY_DRAFT_MEDIA_ENTRIES,
  PHYSIOTHERAPY_DRAFT_MEDIA_IDS,
  type PhysiotherapyDraftMediaRole,
} from "./physiotherapy-media-assets";

const ROLE_ORDER: Record<
  ImageStrategy,
  readonly PhysiotherapyDraftMediaRole[]
> = {
  documentary: [
    "clinic-environment",
    "arrival-access",
    "neutral-consultation",
    "independent-movement",
    "inclusive-movement",
    "guided-movement",
    "assessment",
    "equipment-detail",
  ],
  "editorial-crop": [
    "independent-movement",
    "equipment-detail",
    "clinic-environment",
    "assessment",
    "guided-movement",
    "neutral-consultation",
    "inclusive-movement",
    "arrival-access",
  ],
  immersive: [
    "guided-movement",
    "independent-movement",
    "inclusive-movement",
    "clinic-environment",
    "assessment",
    "arrival-access",
    "equipment-detail",
    "neutral-consultation",
  ],
  "product-detail": [
    "equipment-detail",
    "assessment",
    "neutral-consultation",
    "clinic-environment",
    "guided-movement",
    "arrival-access",
    "independent-movement",
    "inclusive-movement",
  ],
  "people-led": [
    "inclusive-movement",
    "guided-movement",
    "independent-movement",
    "assessment",
    "clinic-environment",
    "neutral-consultation",
    "equipment-detail",
    "arrival-access",
  ],
  restrained: [
    "clinic-environment",
    "arrival-access",
    "neutral-consultation",
    "equipment-detail",
    "assessment",
    "independent-movement",
    "guided-movement",
    "inclusive-movement",
  ],
};

const SERVICE_SLOT_RULES = [
  {
    index: 6,
    tags: ["assessment", "mobility-check", "range-of-motion", "posture"],
  },
  {
    index: 7,
    tags: [
      "adaptive-sport",
      "return-to-activity",
      "strength",
      "stationary-bike",
      "balance",
      "standing-stretch",
      "form-guidance",
      "resistance-band",
      "cardio",
      "guided-movement",
    ],
  },
  {
    index: 8,
    tags: [
      "treatment-table",
      "shoulder",
      "forearm",
      "mobility-check",
      "leg-mobility",
      "clinical-setting",
      "clinic",
    ],
  },
  {
    index: 9,
    tags: [
      "mobility",
      "movement",
      "balance",
      "stretch",
      "flexibility",
      "coordination",
      "guided-exercise",
    ],
  },
  {
    index: 10,
    tags: [
      "guided-movement",
      "guided-exercise",
      "form-guidance",
      "movement-cue",
      "planning",
      "consultation",
    ],
  },
] as const;

const PREFERRED_HERO_ASSET_BY_RECIPE: Readonly<Record<string, string>> = {
  "calm-arrival": "mi-physio-modern-clinic-room",
  "local-access": "mi-physio-access-ramp",
  "clinical-notebook": "mi-physio-planning-clipboard",
  "recovery-journal": "mi-physio-intake-notes",
  "step-by-step": "mi-physio-guided-leg-movement",
  "human-pace": "mi-physio-active-aging-stretch",
  "assessment-rings": "mi-physio-shoulder-range-check",
};

const NON_GENERATABLE_CANDIDATE_MEDIA_IDS = new Set([
  // This otherwise useful waiting-room photograph contains prominent Japanese
  // signage. Keep its licensed provenance in the staged pool, but do not place
  // it into a locally generated clinic until locale-aware media selection exists.
  "mi-physio-quiet-waiting-area",
]);

const GENERATABLE_CANDIDATE_MEDIA_ENTRIES =
  PHYSIOTHERAPY_CANDIDATE_MEDIA_ENTRIES.filter(
    (entry) => !NON_GENERATABLE_CANDIDATE_MEDIA_IDS.has(entry.asset.id),
  );

/**
 * Re-art-directs the stable 12-slot reference fixture through the broader
 * 30-image candidate pool. The page-density and no-impersonation rules stay
 * unchanged while each candidate gets a deterministic media story.
 */
export function applyPhysiotherapyCandidateMedia(
  site: Site,
  candidate: Pick<
    PhysiotherapyDraftCandidate,
    "imageStrategy" | "rankSeed" | "recipeId"
  >,
): Site {
  const selection = physiotherapyCandidateMediaSelection(candidate);
  const replacementByReferenceAsset = new Map(
    PHYSIOTHERAPY_DRAFT_MEDIA_IDS.map((assetId, index) => [
      assetId,
      selection[index]!,
    ]),
  );
  const next = structuredClone(site);
  for (const page of next.pages) {
    for (const section of page.sections) {
      section.props = replaceMediaValue(
        section.props,
        replacementByReferenceAsset,
      ) as Record<string, unknown>;
    }
  }
  return siteSchema.parse(next);
}

export function physiotherapyCandidateMediaSelection(
  candidate: Pick<
    PhysiotherapyDraftCandidate,
    "imageStrategy" | "rankSeed" | "recipeId"
  >,
) {
  if (candidate.rankSeed === 1) {
    return PHYSIOTHERAPY_DRAFT_MEDIA_ENTRIES.map((entry) => entry.asset);
  }
  const roles = ROLE_ORDER[candidate.imageStrategy];
  const buckets = new Map(
    roles.map((role, roleIndex) => {
      const entries = GENERATABLE_CANDIDATE_MEDIA_ENTRIES.filter(
        (entry) => entry.role === role,
      );
      const offset = normalizeOffset(
        candidate.rankSeed + roleIndex * 2,
        entries.length,
      );
      return [role, [...entries.slice(offset), ...entries.slice(0, offset)]];
    }),
  );
  const selected: AssetRecord[] = [];
  for (let round = 0; selected.length < 12; round += 1) {
    let added = false;
    for (const role of roles) {
      const entry = buckets.get(role)?.[round];
      if (!entry) continue;
      selected.push(entry.asset);
      added = true;
      if (selected.length === 12) break;
    }
    if (!added) break;
  }
  if (selected.length !== 12) {
    throw new Error(
      `Physiotherapy candidate media selection produced ${selected.length} assets; expected 12.`,
    );
  }

  const preferredHeroAssetId =
    PREFERRED_HERO_ASSET_BY_RECIPE[candidate.recipeId];
  if (preferredHeroAssetId) {
    const preferredHero = GENERATABLE_CANDIDATE_MEDIA_ENTRIES.find(
      (entry) => entry.asset.id === preferredHeroAssetId,
    );
    if (!preferredHero) {
      throw new Error(
        `Missing preferred physiotherapy hero asset ${preferredHeroAssetId}.`,
      );
    }
    const existingIndex = selected.findIndex(
      (asset) => asset.id === preferredHero.asset.id,
    );
    if (existingIndex > 0) {
      const displaced = selected[0]!;
      selected[0] = preferredHero.asset;
      selected[existingIndex] = displaced;
    } else if (existingIndex < 0) {
      selected[0] = preferredHero.asset;
    }
  }

  const protectedServiceSlots = new Set<number>();
  for (const [ruleIndex, rule] of SERVICE_SLOT_RULES.entries()) {
    const candidates = GENERATABLE_CANDIDATE_MEDIA_ENTRIES.filter((entry) =>
      entry.asset.tags.some((tag) =>
        (rule.tags as readonly string[]).includes(tag),
      ),
    );
    const offset = normalizeOffset(
      candidate.rankSeed * 3 + ruleIndex * 5,
      candidates.length,
    );
    const ordered = [
      ...candidates.slice(offset),
      ...candidates.slice(0, offset),
    ];
    const replacement = ordered.find((entry) => {
      const existingIndex = selected.findIndex(
        (asset) => asset.id === entry.asset.id,
      );
      return (
        existingIndex < 0 ||
        existingIndex === rule.index ||
        (existingIndex !== 0 && !protectedServiceSlots.has(existingIndex))
      );
    });
    if (!replacement) {
      throw new Error(
        `Physiotherapy candidate media slot ${rule.index} has no semantically relevant unique asset.`,
      );
    }
    const existingIndex = selected.findIndex(
      (asset) => asset.id === replacement.asset.id,
    );
    if (existingIndex >= 0 && existingIndex !== rule.index) {
      const displaced = selected[rule.index]!;
      selected[rule.index] = replacement.asset;
      selected[existingIndex] = displaced;
    } else {
      selected[rule.index] = replacement.asset;
    }
    protectedServiceSlots.add(rule.index);
  }

  const coverageEntries = [
    GENERATABLE_CANDIDATE_MEDIA_ENTRIES[
      normalizeOffset(
        candidate.rankSeed - 1,
        GENERATABLE_CANDIDATE_MEDIA_ENTRIES.length,
      )
    ]!,
    GENERATABLE_CANDIDATE_MEDIA_ENTRIES[
      GENERATABLE_CANDIDATE_MEDIA_ENTRIES.length -
        10 +
        normalizeOffset(candidate.rankSeed - 1, 10)
    ]!,
  ];
  const coverageSlots = [5, 4, 3, 2, 1, 0] as const;
  const protectedCoverageIds = new Set<string>();
  for (const [index, entry] of coverageEntries.entries()) {
    if (selected.some((asset) => asset.id === entry.asset.id)) continue;
    const replacementIndex = coverageSlots.find(
      (slot) => !protectedCoverageIds.has(selected[slot]!.id),
    );
    if (replacementIndex === undefined) {
      throw new Error(
        "Physiotherapy candidate media coverage exhausted hero slots.",
      );
    }
    selected[replacementIndex] = entry.asset;
    protectedCoverageIds.add(entry.asset.id);
  }
  return selected;
}

function replaceMediaValue(
  value: unknown,
  replacementByReferenceAsset: ReadonlyMap<
    string,
    ReturnType<typeof physiotherapyCandidateMediaSelection>[number]
  >,
): unknown {
  if (Array.isArray(value)) {
    return value.map((item) =>
      replaceMediaValue(item, replacementByReferenceAsset),
    );
  }
  if (!isRecord(value)) return value;
  const assetId = text(value.assetId);
  const replacement = replacementByReferenceAsset.get(assetId);
  if (replacement) return assetReference(replacement.id);
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      replaceMediaValue(item, replacementByReferenceAsset),
    ]),
  );
}

function assetReference(assetId: string) {
  const asset = demoAssetById(assetId);
  if (!asset) throw new Error(`Missing physiotherapy asset ${assetId}.`);
  return {
    assetId: asset.id,
    src: asset.originalUrl,
    alt: asset.alt,
    focalPoint: asset.focalPoint,
    license: asset.license,
    ...(asset.sourceReference
      ? { sourceReference: asset.sourceReference }
      : {}),
  };
}

function normalizeOffset(value: number, length: number) {
  return ((Math.trunc(value) % length) + length) % length;
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
