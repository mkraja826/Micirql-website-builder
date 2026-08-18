import { siteSchema, type Site } from "@micirql/schema";
import type { MediaAsset } from "./media-execution";

export type ExactPlacementResult = { site: Site; placed: number; pairedCases: number; unmatched: string[] };

export function applyExactAssetPlacement(site: Site, customerAssets: MediaAsset[]): ExactPlacementResult {
  const next = structuredClone(site);
  const unused = new Map(customerAssets.filter((asset) => asset.source === "customer").map((asset) => [asset.id, asset]));
  let placed = 0;
  let pairedCases = 0;

  for (const page of next.pages) {
    for (const section of page.sections) {
      const family = family(section.component.componentId);
      if (!family || !["team", "services", "gallery"].includes(family)) continue;
      const items = Array.isArray(section.props.items) ? section.props.items as Array<Record<string, unknown>> : [];
      if (!items.length) continue;

      if (family === "gallery") {
        const resultAssets = [...unused.values()].filter((asset) => asset.tags.includes("results"));
        const grouped = caseGroups(resultAssets);
        for (const group of grouped) {
          const before = group.assets.find((asset) => asset.tags.includes("stage:before"));
          const after = group.assets.find((asset) => asset.tags.includes("stage:after"));
          if (before && after) {
            const start = items.findIndex((item) => !item.image);
            if (start >= 0) {
              items[start] = { ...items[start], image: before.url, caseGroup: group.key, caseStage: "before" };
              const second = items.findIndex((item, index) => index > start && !item.image);
              if (second >= 0) items[second] = { ...items[second], image: after.url, caseGroup: group.key, caseStage: "after" };
              else items[start] = { ...items[start], image: after.url, beforeImage: before.url, afterImage: after.url, caseGroup: group.key };
              unused.delete(before.id); unused.delete(after.id); placed += 2; pairedCases++;
            }
          }
        }
      }

      for (let index = 0; index < items.length; index++) {
        const item = items[index]!;
        if (item.image) continue;
        const title = typeof item.title === "string" ? item.title : "";
        const candidates = [...unused.values()].filter((asset) => familyCompatible(asset, family));
        const best = bestExactMatch(title, candidates);
        if (!best) continue;
        items[index] = { ...item, image: best.url, imageAssetId: best.id };
        unused.delete(best.id); placed++;
      }
      section.props.items = items;
    }
  }
  return { site: siteSchema.parse(next), placed, pairedCases, unmatched: [...unused.keys()] };
}

function bestExactMatch(title: string, assets: MediaAsset[]) {
  const titleTokens = tokens(title);
  let best: MediaAsset | undefined;
  let bestScore = 0;
  for (const asset of assets) {
    const haystack = tokens([asset.name ?? "", asset.alt ?? "", ...asset.tags].join(" "));
    let score = 0;
    for (const token of titleTokens) if (haystack.has(token)) score += token.length >= 5 ? 3 : 1;
    if (asset.tags.some((tag) => tag.startsWith("filename:") && [...titleTokens].some((token) => tag.includes(token)))) score += 4;
    if (score > bestScore) { best = asset; bestScore = score; }
  }
  return bestScore >= 3 ? best : undefined;
}

function familyCompatible(asset: MediaAsset, family: string) {
  if (family === "team") return asset.tags.includes("team");
  if (family === "gallery") return asset.tags.includes("results") || asset.tags.includes("gallery");
  if (family === "services") return asset.tags.includes("service") || asset.tags.includes("services") || asset.tags.includes("product");
  return false;
}

function caseGroups(assets: MediaAsset[]) {
  const groups = new Map<string, MediaAsset[]>();
  for (const asset of assets) {
    const tag = asset.tags.find((value) => value.startsWith("case:"));
    if (!tag) continue;
    const key = tag.slice(5);
    const list = groups.get(key) ?? []; list.push(asset); groups.set(key, list);
  }
  return [...groups.entries()].map(([key, groupedAssets]) => ({ key, assets: groupedAssets }));
}
function tokens(value: string) { return new Set(value.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length >= 2 && !["dr","doctor","the","and","for","with","our","clinic","dental"].includes(token))); }
function family(componentId: string) { const id = componentId.toLowerCase(); for (const key of ["team","services","gallery"]) if (id.includes(key) || id.includes(`-${key === "team" ? "TEAM" : key === "services" ? "SERV" : "GALL"}-`.toLowerCase())) return key; return ""; }
