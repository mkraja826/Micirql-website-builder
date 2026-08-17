import { NextRequest, NextResponse } from "next/server";
import { evaluateLogoUsability } from "@micirql/design-engine";
import { getSupabaseDraft, saveSupabaseDraft, supabaseConfig, bearerToken } from "../../drafts/supabase-store";
import { analyzeLogoFile } from "./logo-file-analysis";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]);
const BACKGROUND_SIGNALS = new Set(["transparent", "embedded", "clean-opaque", "unknown"]);

type ClientPixelAnalysis = {
  width?: number;
  height?: number;
  hasTransparency?: boolean;
  edgeBackgroundRatio?: number;
  backgroundSignal?: "transparent" | "embedded" | "clean-opaque" | "unknown";
  edgeColor?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      workspaceId?: string;
      siteId?: string;
      fileName?: string;
      contentType?: string;
      dataUrl?: string;
      clientAnalysis?: unknown;
    };

    const workspaceId = clean(body.workspaceId);
    const siteId = clean(body.siteId);
    const fileName = clean(body.fileName);
    const contentType = clean(body.contentType);
    const dataUrl = clean(body.dataUrl);
    if (!workspaceId || !siteId || !fileName || !contentType || !dataUrl) {
      return NextResponse.json({ error: "workspaceId, siteId, fileName, contentType and dataUrl are required." }, { status: 400 });
    }
    if (!ALLOWED.has(contentType)) return NextResponse.json({ error: "Unsupported logo format." }, { status: 415 });

    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    const detectedType = match?.[1];
    const encoded = match?.[2];
    if (!detectedType || !encoded || detectedType !== contentType) {
      return NextResponse.json({ error: "Invalid logo image data." }, { status: 400 });
    }
    const bytes = Buffer.from(encoded, "base64");
    if (!bytes.length || bytes.length > MAX_BYTES) return NextResponse.json({ error: "Logo must be smaller than 5 MB." }, { status: 413 });

    const fileAnalysis = analyzeLogoFile(Uint8Array.from(bytes), contentType);
    const clientAnalysis = contentType === "image/svg+xml" ? undefined : sanitizeClientAnalysis(body.clientAnalysis);
    const effectiveAnalysis = {
      ...(fileAnalysis.width ?? clientAnalysis?.width ? { width: fileAnalysis.width ?? clientAnalysis?.width } : {}),
      ...(fileAnalysis.height ?? clientAnalysis?.height ? { height: fileAnalysis.height ?? clientAnalysis?.height } : {}),
      ...(typeof (clientAnalysis?.hasTransparency ?? fileAnalysis.hasTransparency) === "boolean" ? { hasTransparency: clientAnalysis?.hasTransparency ?? fileAnalysis.hasTransparency } : {}),
      ...(typeof (clientAnalysis?.edgeBackgroundRatio ?? fileAnalysis.edgeBackgroundRatio) === "number" ? { edgeBackgroundRatio: clientAnalysis?.edgeBackgroundRatio ?? fileAnalysis.edgeBackgroundRatio } : {}),
      ...((clientAnalysis?.backgroundSignal ?? fileAnalysis.backgroundSignal) ? { backgroundSignal: clientAnalysis?.backgroundSignal ?? fileAnalysis.backgroundSignal } : {}),
      ...(clientAnalysis?.edgeColor ? { edgeColor: clientAnalysis.edgeColor } : {}),
    };
    const presentation = evaluateLogoUsability({
      ...(effectiveAnalysis.width ? { width: effectiveAnalysis.width } : {}),
      ...(effectiveAnalysis.height ? { height: effectiveAnalysis.height } : {}),
      ...(typeof effectiveAnalysis.hasTransparency === "boolean" ? { hasTransparency: effectiveAnalysis.hasTransparency } : {}),
      ...(typeof effectiveAnalysis.edgeBackgroundRatio === "number" ? { edgeBackgroundRatio: effectiveAnalysis.edgeBackgroundRatio } : {}),
    });

    const { url, key } = supabaseConfig();
    const token = bearerToken(request);
    const ext = extension(contentType);
    const path = `${workspaceId}/${siteId}/branding/logo-${crypto.randomUUID()}.${ext}`;
    const objectUrl = `${url}/storage/v1/object/public-assets/${encodePath(path)}`;
    const upload = await fetch(objectUrl, {
      method: "POST",
      headers: {
        apikey: key,
        authorization: `Bearer ${token}`,
        "content-type": contentType,
        "x-upsert": "false",
      },
      body: Uint8Array.from(bytes),
      cache: "no-store",
    });
    if (!upload.ok) {
      const detail = await upload.text();
      return NextResponse.json({ error: detail || `Logo upload failed (${upload.status}).` }, { status: upload.status });
    }

    const publicUrl = `${url}/storage/v1/object/public/public-assets/${encodePath(path)}`;
    const draft = await getSupabaseDraft(request, workspaceId, siteId);
    if (!draft) throw new Error("Workspace draft could not be loaded to attach the logo.");
    const snapshot = structuredClone(draft.snapshot);
    snapshot.theme.brand.logoAssetId = publicUrl;
    snapshot.theme.brand.logoPresentation = {
      shape: presentation.shape,
      treatment: presentation.treatment,
      navbarMaxHeight: presentation.navbarMaxHeight,
      footerMaxHeight: presentation.footerMaxHeight,
      paddingScale: presentation.paddingScale,
      preserveOriginal: true,
      ...(effectiveAnalysis.width ? { width: effectiveAnalysis.width } : {}),
      ...(effectiveAnalysis.height ? { height: effectiveAnalysis.height } : {}),
      ...(typeof effectiveAnalysis.hasTransparency === "boolean" ? { hasTransparency: effectiveAnalysis.hasTransparency } : {}),
      ...(typeof effectiveAnalysis.edgeBackgroundRatio === "number" ? { edgeBackgroundRatio: effectiveAnalysis.edgeBackgroundRatio } : {}),
      ...(effectiveAnalysis.backgroundSignal ? { backgroundSignal: effectiveAnalysis.backgroundSignal } : {}),
      ...(effectiveAnalysis.edgeColor ? { edgeColor: effectiveAnalysis.edgeColor } : {}),
      reasons: [
        ...presentation.reasons,
        ...(effectiveAnalysis.backgroundSignal ? [`Background signal: ${effectiveAnalysis.backgroundSignal}${clientAnalysis ? " (pixel sampled)" : ""}.`] : []),
      ],
    };
    await saveSupabaseDraft(request, { snapshot, expectedRevision: draft.revision });

    return NextResponse.json({ ok: true, path, url: publicUrl, analysis: effectiveAnalysis, presentation }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Logo upload failed." }, { status: 500 });
  }
}

function sanitizeClientAnalysis(value: unknown): ClientPixelAnalysis | undefined {
  if (!value || typeof value !== "object") return undefined;
  const source = value as Record<string, unknown>;
  const width = boundedPositive(source.width, 100000);
  const height = boundedPositive(source.height, 100000);
  const ratio = typeof source.edgeBackgroundRatio === "number" && Number.isFinite(source.edgeBackgroundRatio)
    ? Math.max(0, Math.min(1, source.edgeBackgroundRatio))
    : undefined;
  const signal = typeof source.backgroundSignal === "string" && BACKGROUND_SIGNALS.has(source.backgroundSignal)
    ? source.backgroundSignal as ClientPixelAnalysis["backgroundSignal"]
    : undefined;
  const edgeColor = typeof source.edgeColor === "string" && /^#[0-9a-f]{6}$/i.test(source.edgeColor) ? source.edgeColor.toUpperCase() : undefined;
  return {
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
    ...(typeof source.hasTransparency === "boolean" ? { hasTransparency: source.hasTransparency } : {}),
    ...(typeof ratio === "number" ? { edgeBackgroundRatio: ratio } : {}),
    ...(signal ? { backgroundSignal: signal } : {}),
    ...(edgeColor ? { edgeColor } : {}),
  };
}

function boundedPositive(value: unknown, max: number) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 && value <= max ? value : undefined;
}
function clean(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function encodePath(path: string) { return path.split("/").map(encodeURIComponent).join("/"); }
function extension(type: string) {
  if (type === "image/jpeg") return "jpg";
  if (type === "image/svg+xml") return "svg";
  return type.split("/")[1] || "png";
}
