import type { Domain, ThemeFamily } from "@micirql/schema";
import type { AssetRecord, AssetSlot } from "./types";

export type AssetQuery = {
  workspaceId: string;
  domain: Domain;
  subtype?: string;
  sectionFamily?: string;
  theme?: ThemeFamily;
  slot: AssetSlot;
  tags?: string[];
};

export type RankedAsset = { asset: AssetRecord; score: number; reasons: string[] };

export type AssetRegistry = {
  list(query: AssetQuery): Promise<AssetRecord[]>;
  get(assetId: string): Promise<AssetRecord | undefined>;
};

export async function resolveBestAsset(registry: AssetRegistry, query: AssetQuery): Promise<RankedAsset | undefined> {
  const assets = await registry.list(query);
  return rankAssets(assets, query)[0];
}

export function rankAssets(assets: readonly AssetRecord[], query: AssetQuery): RankedAsset[] {
  return assets
    .filter((asset) => asset.active)
    .filter((asset) => asset.kind === query.slot.requiredKind)
    .filter((asset) => asset.source !== "user-upload" || asset.workspaceId === query.workspaceId)
    .map((asset) => {
      let score = sourceBase(asset.source);
      const reasons = [`source:${asset.source}`];

      if (asset.domains.includes(query.domain)) { score += 20; reasons.push("domain"); }
      if (query.subtype && asset.subtypes.includes(query.subtype)) { score += 12; reasons.push("subtype"); }
      if (query.sectionFamily && asset.sectionFamilies.includes(query.sectionFamily)) { score += 18; reasons.push("section-family"); }
      if (query.theme && asset.themes.includes(query.theme)) { score += 8; reasons.push("theme"); }
      if (query.slot.preferredOrientation && asset.orientation === query.slot.preferredOrientation) { score += 10; reasons.push("orientation"); }
      if (query.slot.preferredAspectRatio) {
        const delta = Math.abs(asset.aspectRatio - query.slot.preferredAspectRatio);
        score += Math.max(0, 10 - delta * 10);
        reasons.push("aspect-ratio");
      }
      const tags = query.tags ?? [];
      const tagMatches = tags.filter((tag) => asset.tags.includes(tag)).length;
      score += Math.min(10, tagMatches * 2);
      if (tagMatches) reasons.push(`tags:${tagMatches}`);

      return { asset, score: Math.round(score * 100) / 100, reasons };
    })
    .sort((a, b) => b.score - a.score);
}

export function needsGeneratedImage(ranked: RankedAsset | undefined, minimumScore = 75): boolean {
  return !ranked || ranked.score < minimumScore;
}

function sourceBase(source: AssetRecord["source"]): number {
  if (source === "user-upload") return 70;
  if (source === "micirql-placeholder") return 45;
  return 20;
}
