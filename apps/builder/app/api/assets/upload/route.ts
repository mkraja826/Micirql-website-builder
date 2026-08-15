import type { AssetRecord } from "@micirql/assets";
import { addDemoAsset } from "../../../demo-assets";

const MAX_DATA_URL_LENGTH = 12_000_000;

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
    };

    if (!body.workspaceId || !body.dataUrl || !body.name) {
      return Response.json({ error: "workspaceId, name and image data are required." }, { status: 400 });
    }
    if (!body.dataUrl.startsWith("data:image/")) {
      return Response.json({ error: "Only image uploads are supported." }, { status: 415 });
    }
    if (body.dataUrl.length > MAX_DATA_URL_LENGTH) {
      return Response.json({ error: "Image is too large for the development upload adapter." }, { status: 413 });
    }

    const width = positive(body.width, 1200);
    const height = positive(body.height, 800);
    const ratio = width / height;
    const orientation: AssetRecord["orientation"] = ratio > 2 ? "panoramic" : ratio > 1.08 ? "landscape" : ratio < .92 ? "portrait" : "square";
    const id = `upload-${crypto.randomUUID()}`;
    const asset: AssetRecord = {
      id,
      workspaceId: body.workspaceId,
      source: "user-upload",
      kind: "image",
      name: body.name.slice(0, 120),
      alt: (body.alt ?? "").slice(0, 240),
      width,
      height,
      orientation,
      aspectRatio: ratio,
      focalPoint: { x: .5, y: .5 },
      domains: [],
      subtypes: [],
      sectionFamilies: body.sectionFamily ? [body.sectionFamily] : [],
      themes: [],
      tags: ["upload"],
      license: "user-owned",
      originalUrl: body.dataUrl,
      variants: [],
      active: true,
      createdAt: new Date().toISOString(),
    };

    addDemoAsset(asset);
    return Response.json({ asset }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Upload failed." }, { status: 500 });
  }
}

function positive(value: number | undefined, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.round(value) : fallback;
}
