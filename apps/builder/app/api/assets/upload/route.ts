import type { AssetRecord } from "@micirql/assets";
import { classifyUploadedBusinessAsset } from "../../../uploaded-asset-intelligence";
import { assertWorkspaceAccess, insertAsset, uploadAssetObject } from "../supabase-assets";

const MAX_DATA_URL_LENGTH = 12_000_000;
const DHASH = /^[0-9a-f]{16}$/i;

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      workspaceId?: string;
      name?: string;
      alt?: string;
      dataUrl?: string;
      width?: number;
      height?: number;
      sectionFamily?: string;
      perceptualHash?: string;
    };
    if (!body.workspaceId || !body.dataUrl || !body.name) return Response.json({ error: "workspaceId, name and image data are required." }, { status: 400 });
    if (!body.dataUrl.startsWith("data:image/")) return Response.json({ error: "Only image uploads are supported." }, { status: 415 });
    if (body.dataUrl.length > MAX_DATA_URL_LENGTH) return Response.json({ error: "Image is too large." }, { status: 413 });
    if (body.perceptualHash && !DHASH.test(body.perceptualHash)) return Response.json({ error: "Invalid image perceptual fingerprint." }, { status: 400 });

    await assertWorkspaceAccess(request, body.workspaceId);
    const width = positive(body.width, 1200), height = positive(body.height, 800), ratio = width / height;
    const orientation: AssetRecord["orientation"] = ratio > 2 ? "panoramic" : ratio > 1.08 ? "landscape" : ratio < .92 ? "portrait" : "square";
    const classification = await classifyUploadedBusinessAsset(body.dataUrl, body.name);
    const id = `upload-${crypto.randomUUID()}`;
    const stored = await uploadAssetObject(body.workspaceId, id, body.dataUrl);
    const draft: AssetRecord = {
      id,
      workspaceId: body.workspaceId,
      source: "user-upload",
      kind: "image",
      name: body.name.slice(0, 120),
      alt: (body.alt?.trim() || classification.alt).slice(0, 240),
      width,
      height,
      orientation,
      aspectRatio: ratio,
      focalPoint: { x: .5, y: .5 },
      ...(body.perceptualHash ? { perceptualHash: body.perceptualHash.toLowerCase() } : {}),
      domains: [],
      subtypes: [],
      sectionFamilies: body.sectionFamily ? [body.sectionFamily] : classification.sectionFamilies,
      themes: [],
      tags: classification.tags,
      license: "user-owned",
      sourceReference: `classification:${classification.source}:${classification.category}`,
      originalUrl: stored.url,
      variants: [],
      active: true,
      createdAt: new Date().toISOString(),
    };
    const asset = await insertAsset(draft, stored.key);
    return Response.json({ asset, classification }, { status: 201 });
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 500;
    return Response.json({ error: error instanceof Error ? error.message : "Upload failed." }, { status });
  }
}

function positive(value: number | undefined, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.round(value) : fallback;
}
