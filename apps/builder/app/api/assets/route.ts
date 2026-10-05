import { workspaceAssetPickerSources } from "@micirql/assets";
import { DEMO_ASSETS } from "../../demo-assets";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const workspaceId = url.searchParams.get("workspaceId") ?? "";
  const domain = url.searchParams.get("domain") ?? "";
  const theme = url.searchParams.get("theme") ?? "";
  const family = url.searchParams.get("family") ?? "";
  const source = url.searchParams.get("source") ?? "";
  const query = (url.searchParams.get("q") ?? "").trim().toLowerCase();

  const assets = DEMO_ASSETS.filter((asset) => asset.active)
    .filter(
      (asset) =>
        asset.source !== "user-upload" || asset.workspaceId === workspaceId,
    )
    .filter((asset) => !source || asset.source === source)
    .filter(
      (asset) =>
        !query ||
        [asset.name, asset.alt, ...asset.tags]
          .join(" ")
          .toLowerCase()
          .includes(query),
    )
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
