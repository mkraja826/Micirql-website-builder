import { workspaceAssetPickerSources, type AssetRecord } from "@micirql/assets";

const DEMO_ASSETS: AssetRecord[] = [
  {
    id: "mi-placeholder-clean-hero",
    source: "micirql-placeholder",
    kind: "image",
    name: "Clean business hero",
    alt: "Modern bright business interior",
    width: 1600,
    height: 1000,
    orientation: "landscape",
    aspectRatio: 1.6,
    focalPoint: { x: 0.5, y: 0.45 },
    domains: ["landing-page", "corporate", "clinic", "hospitality"],
    subtypes: [],
    sectionFamilies: ["hero", "about"],
    themes: ["minimalist", "corporate", "glass"],
    tags: ["clean", "bright", "professional"],
    license: "micirql-owned",
    originalUrl: "/assets/placeholders/clean-hero.svg",
    variants: [],
    active: true,
    createdAt: "2026-08-15T00:00:00.000Z",
  },
  {
    id: "mi-placeholder-service-grid",
    source: "micirql-placeholder",
    kind: "image",
    name: "Service detail",
    alt: "Abstract professional service visual",
    width: 1200,
    height: 900,
    orientation: "landscape",
    aspectRatio: 1.333,
    focalPoint: { x: 0.5, y: 0.5 },
    domains: ["landing-page", "corporate", "construction", "education"],
    subtypes: [],
    sectionFamilies: ["services", "features"],
    themes: ["minimalist", "corporate", "editorial"],
    tags: ["service", "structured", "neutral"],
    license: "micirql-owned",
    originalUrl: "/assets/placeholders/service-grid.svg",
    variants: [],
    active: true,
    createdAt: "2026-08-15T00:00:00.000Z",
  },
  {
    id: "workspace-upload-demo",
    workspaceId: "workspace-demo",
    source: "user-upload",
    kind: "image",
    name: "My uploaded image",
    alt: "User uploaded workspace image",
    width: 1200,
    height: 800,
    orientation: "landscape",
    aspectRatio: 1.5,
    focalPoint: { x: 0.5, y: 0.5 },
    domains: [],
    subtypes: [],
    sectionFamilies: ["hero", "about", "services", "gallery"],
    themes: [],
    tags: ["upload"],
    license: "user-owned",
    originalUrl: "/assets/placeholders/user-upload.svg",
    variants: [],
    active: true,
    createdAt: "2026-08-15T00:00:00.000Z",
  },
];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const workspaceId = url.searchParams.get("workspaceId") ?? "";
  const domain = url.searchParams.get("domain") ?? "";
  const theme = url.searchParams.get("theme") ?? "";
  const family = url.searchParams.get("family") ?? "";
  const source = url.searchParams.get("source") ?? "";
  const query = (url.searchParams.get("q") ?? "").trim().toLowerCase();

  const assets = DEMO_ASSETS
    .filter((asset) => asset.active)
    .filter((asset) => asset.source !== "user-upload" || asset.workspaceId === workspaceId)
    .filter((asset) => !source || asset.source === source)
    .filter((asset) => !query || [asset.name, asset.alt, ...asset.tags].join(" ").toLowerCase().includes(query))
    .map((asset) => ({
      ...asset,
      recommendationScore:
        (family && asset.sectionFamilies.includes(family) ? 40 : 0) +
        (domain && asset.domains.includes(domain as never) ? 30 : 0) +
        (theme && asset.themes.includes(theme as never) ? 20 : 0) +
        (asset.source === "user-upload" ? 10 : 0),
    }))
    .sort((a, b) => b.recommendationScore - a.recommendationScore);

  return Response.json({ sources: workspaceAssetPickerSources(), assets });
}
