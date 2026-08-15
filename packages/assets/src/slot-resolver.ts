import type { Domain, ThemeFamily } from "@micirql/schema";
import type { AssetRecord, AssetSlot } from "./types";
import { needsGeneratedImage, rankAssets, type AssetRegistry } from "./registry";

export type AssetSlotResolutionContext = {
  workspaceId: string;
  domain: Domain;
  subtype?: string;
  theme?: ThemeFamily;
};

export type AssetGenerationRequest = {
  slot: AssetSlot;
  domain: Domain;
  subtype?: string;
  sectionFamily?: string;
  theme?: ThemeFamily;
  purpose: string;
  preferredOrientation?: AssetSlot["preferredOrientation"];
  preferredAspectRatio?: number;
  reason: "NO_MATCH" | "LOW_SCORE";
};

export type ResolvedAssetSlot = {
  slot: AssetSlot;
  asset: AssetRecord;
  score: number;
  source: AssetRecord["source"];
  reasons: string[];
};

export type AssetSlotResolution = {
  resolved: ResolvedAssetSlot[];
  generationRequests: AssetGenerationRequest[];
};

export async function resolveAssetSlots(args: {
  registry: AssetRegistry;
  context: AssetSlotResolutionContext;
  slots: readonly AssetSlot[];
  sectionFamilyBySectionId?: Readonly<Record<string, string>>;
  minimumScore?: number;
}): Promise<AssetSlotResolution> {
  const resolved: ResolvedAssetSlot[] = [];
  const generationRequests: AssetGenerationRequest[] = [];
  const minimumScore = args.minimumScore ?? 75;

  for (const slot of args.slots) {
    const sectionFamily = args.sectionFamilyBySectionId?.[slot.sectionId];
    const candidates = await args.registry.list({
      workspaceId: args.context.workspaceId,
      domain: args.context.domain,
      ...(args.context.subtype ? { subtype: args.context.subtype } : {}),
      ...(sectionFamily ? { sectionFamily } : {}),
      ...(args.context.theme ? { theme: args.context.theme } : {}),
      slot,
      tags: [slot.purpose],
    });
    const ranked = rankAssets(candidates, {
      workspaceId: args.context.workspaceId,
      domain: args.context.domain,
      ...(args.context.subtype ? { subtype: args.context.subtype } : {}),
      ...(sectionFamily ? { sectionFamily } : {}),
      ...(args.context.theme ? { theme: args.context.theme } : {}),
      slot,
      tags: [slot.purpose],
    })[0];

    if (!needsGeneratedImage(ranked, minimumScore) && ranked) {
      resolved.push({
        slot,
        asset: ranked.asset,
        score: ranked.score,
        source: ranked.asset.source,
        reasons: ranked.reasons,
      });
      continue;
    }

    generationRequests.push({
      slot,
      domain: args.context.domain,
      ...(args.context.subtype ? { subtype: args.context.subtype } : {}),
      ...(sectionFamily ? { sectionFamily } : {}),
      ...(args.context.theme ? { theme: args.context.theme } : {}),
      purpose: slot.purpose,
      ...(slot.preferredOrientation ? { preferredOrientation: slot.preferredOrientation } : {}),
      ...(slot.preferredAspectRatio ? { preferredAspectRatio: slot.preferredAspectRatio } : {}),
      reason: ranked ? "LOW_SCORE" : "NO_MATCH",
    });
  }

  return { resolved, generationRequests };
}

export function assetReferenceFor(resolution: ResolvedAssetSlot): {
  assetId: string;
  alt?: string;
  focalPoint: { x: number; y: number };
} {
  return {
    assetId: resolution.asset.id,
    ...(resolution.asset.alt ? { alt: resolution.asset.alt } : {}),
    focalPoint: resolution.asset.focalPoint,
  };
}
