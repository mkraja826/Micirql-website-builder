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
      cleanupDataUrl?: unknown;
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

    const originalBytes = decodeDataUrl(dataUrl, contentType);
    if (!originalBytes) return NextResponse.json({ error: "Invalid logo image data." }, { status: 400 });
    if (originalBytes.length > MAX_BYTES) return NextResponse.json({ error: "Logo must be smaller than 5 MB." }, { status: 413 });

    const fileAnalysis = analyzeLogoFile(Uint8Array.from(originalBytes), contentType);
    const clientAnalysis = contentType === "image/svg+xml" ? undefined : sanitizeClientAnalysis(body.clientAnalysis);
    const effectiveAnalysis = {
      ...((fileAnalysis.width ?? clientAnalysis?.width) ? { width: fileAnalysis.width ?? clientAnalysis?.width } : {}),
      ...((fileAnalysis.height ?? clientAnalysis?.height) ? { height: fileAnalysis.height ?? clientAnalysis?.height } : {}),
      ...(typeof (clientAnalysis?.hasTransparency ?? fileAnalysis.hasTransparency) === "boolean" ? { hasTransparency: clientAnalysis?.hasTransparency ?? fileAnalysis.hasTransparency } : {}),
      ...(typeof (clientAnalysis?.edgeBackgroundRatio ?? fileAnalysis.edgeBackgroundRatio) === "number" ? { edgeBackgroundRatio: clientAnalysis?.edgeBackgroundRatio ?? fileAnalysis.edgeBackgroundRatio } : {}),
      ...((clientAnalysis?.backgroundSignal ?? fileAnalysis.backgroundSignal) ? { backgroundSignal: clientAnalysis?.backgroundSignal ?? fileAnalysis.backgroundSignal } : {}),
      ...(clientAnalysis?.edgeColor ? { edgeColor: clientAnalysis.edgeColor } : {}),
    };
    const recommendation = evaluateLogoUsability({
      ...(effectiveAnalysis.width ? { width: effectiveAnalysis.width } : {}),
      ...(effectiveAnalysis.height ? { height: effectiveAnalysis.height } : {}),
      ...(typeof effectiveAnalysis.hasTransparency === "boolean" ? { hasTransparency: effectiveAnalysis.hasTransparency } : {}),
      ...(typeof effectiveAnalysis.edgeBackgroundRatio === "number" ? { edgeBackgroundRatio: effectiveAnalysis.edgeBackgroundRatio } : {}),
    });

    const { url, key } = supabaseConfig();
    const token = bearerToken(request);
    const originalPath = `${workspaceId}/${siteId}/branding/logo-original-${crypto.randomUUID()}.${extension(contentType)}`;
    await uploadPublicAsset({ url, key, token, path: originalPath, contentType, bytes: originalBytes });
    const originalUrl = publicAssetUrl(url, originalPath);

    let cleanupPath: string | undefined;
    let cleanupUrl: string | undefined;
    if (recommendation.treatment === "cleanup-recommended") {
      const cleanupBytes = decodeCleanupDataUrl(body.cleanupDataUrl);
      if (cleanupBytes && cleanupBytes.length <= MAX_BYTES) {
        cleanupPath = `${workspaceId}/${siteId}/branding/logo-clean-${crypto.randomUUID()}.png`;
        try {
          await uploadPublicAsset({ url, key, token, path: cleanupPath, contentType: "image/png", bytes: cleanupBytes });
          cleanupUrl = publicAssetUrl(url, cleanupPath);
        } catch {
          cleanupPath = undefined;
          cleanupUrl = undefined;
        }
      }
    }

    const cleanupApplied = Boolean(cleanupUrl);
    const activeUrl = cleanupUrl ?? originalUrl;
    const presentation = cleanupApplied
      ? {
          ...recommendation,
          treatment: "direct" as const,
          paddingScale: 1,
          reasons: [...recommendation.reasons, "A transparent cleanup derivative was applied while the original logo was preserved."],
        }
      : recommendation;

    const draft = await getSupabaseDraft(request, workspaceId, siteId);
    if (!draft) throw new Error("Workspace draft could not be loaded to attach the logo.");
    const snapshot = structuredClone(draft.snapshot);
    snapshot.theme.brand.logoAssetId = activeUrl;
    snapshot.theme.brand.logoOriginalAssetId = originalUrl;
    if (cleanupUrl) snapshot.theme.brand.logoCleanupAssetId = cleanupUrl;
    else delete snapshot.theme.brand.logoCleanupAssetId;
    snapshot.theme.brand.logoPresentation = {
      shape: presentation.shape,
      treatment: presentation.treatment,
      navbarMaxHeight: presentation.navbarMaxHeight,
      footerMaxHeight: presentation.footerMaxHeight,
      paddingScale: presentation.paddingScale,
      preserveOriginal: true,
      cleanupApplied,
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

    return NextResponse.json({
      ok: true,
      path: cleanupPath ?? originalPath,
      originalPath,
      cleanupPath,
      url: activeUrl,
      originalUrl,
      cleanupUrl,
      cleanupApplied,
      analysis: effectiveAnalysis,
      recommendation,
      presentation,
    }, { status: 201 });
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

function decodeDataUrl(dataUrl: string, expectedType: string): Buffer | undefined {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match?.[1] || !match[2] || match[1] !== expectedType) return undefined;
  const bytes = Buffer.from(match[2], "base64");
  return bytes.length ? bytes : undefined;
}

function decodeCleanupDataUrl(value: unknown): Buffer | undefined {
  if (typeof value !== "string" || !value.startsWith("data:image/png;base64,")) return undefined;
  return decodeDataUrl(value, "image/png");
}

async function uploadPublicAsset(input: { url: string; key: string; token: string; path: string; contentType: string; bytes: Buffer }) {
  const objectUrl = `${input.url}/storage/v1/object/public-assets/${encodePath(input.path)}`;
  const upload = await fetch(objectUrl, {
    method: "POST",
    headers: {
      apikey: input.key,
      authorization: `Bearer ${input.token}`,
      "content-type": input.contentType,
      "x-upsert": "false",
    },
    body: Uint8Array.from(input.bytes),
    cache: "no-store",
  });
  if (!upload.ok) {
    const detail = await upload.text();
    throw new Error(detail || `Logo upload failed (${upload.status}).`);
  }
}

function publicAssetUrl(baseUrl: string, path: string) {
  return `${baseUrl}/storage/v1/object/public/public-assets/${encodePath(path)}`;
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
