import type { AssetRecord } from "@micirql/assets";
import { addDemoAsset } from "../../../demo-assets";
import {
  normalizeWorkspaceUploadFailure,
  uploadErrorPayload,
  workspaceUploadFailure,
} from "../../../upload-errors";

const MAX_DATA_URL_LENGTH = 12_000_000;

export async function POST(request: Request) {
  try {
    if (process.env.NODE_ENV === "production") {
      const failure = workspaceUploadFailure("UPLOAD_SERVICE_UNAVAILABLE");
      return Response.json(uploadErrorPayload(failure), {
        status: failure.status,
      });
    }

    const body = (await request.json()) as {
      workspaceId?: string;
      name?: string;
      alt?: string;
      dataUrl?: string;
      width?: number;
      height?: number;
      sectionFamily?: string;
      kind?: "image" | "logo";
    };

    if (!body.workspaceId || !body.dataUrl || !body.name) {
      const failure = workspaceUploadFailure("UPLOAD_INVALID_REQUEST");
      return Response.json(uploadErrorPayload(failure), {
        status: failure.status,
      });
    }
    if (!body.dataUrl.startsWith("data:image/")) {
      const failure = workspaceUploadFailure("UPLOAD_UNSUPPORTED_TYPE");
      return Response.json(uploadErrorPayload(failure), {
        status: failure.status,
      });
    }
    if (body.dataUrl.length > MAX_DATA_URL_LENGTH) {
      const failure = workspaceUploadFailure("UPLOAD_TOO_LARGE");
      return Response.json(uploadErrorPayload(failure), {
        status: failure.status,
      });
    }

    const width = positive(body.width, 1200);
    const height = positive(body.height, 800);
    const ratio = width / height;
    const orientation: AssetRecord["orientation"] =
      ratio > 2
        ? "panoramic"
        : ratio > 1.08
          ? "landscape"
          : ratio < 0.92
            ? "portrait"
            : "square";
    const id = `upload-${crypto.randomUUID()}`;
    const asset: AssetRecord = {
      id,
      workspaceId: body.workspaceId,
      source: "user-upload",
      kind: body.kind === "logo" ? "logo" : "image",
      name: body.name.slice(0, 120),
      alt: (body.alt ?? "").slice(0, 240),
      width,
      height,
      orientation,
      aspectRatio: ratio,
      focalPoint: { x: 0.5, y: 0.5 },
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
    const failure = normalizeWorkspaceUploadFailure(error);
    return Response.json(uploadErrorPayload(failure), {
      status: failure.status,
    });
  }
}

function positive(value: number | undefined, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.round(value)
    : fallback;
}
