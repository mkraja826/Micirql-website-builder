import { NextRequest, NextResponse } from "next/server";
import { brandTokensSchema } from "@micirql/schema";
import { assessBrandPalette, evaluateFaviconStrategy, evaluateLogoUsability } from "@micirql/design-engine";
import { bearerToken, getSupabaseDraft, supabaseConfig } from "../../../drafts/supabase-store";
import { generateAndUploadSocialCard } from "../../../onboarding/social-card";
import { analyzeLogoFile } from "../logo-file-analysis";

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_FAVICON_BYTES = 1024 * 1024;
const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]);
const BACKGROUND_SIGNALS = new Set(["transparent", "embedded", "clean-opaque", "unknown"]);
const FAVICON_STRATEGIES = new Set(["reuse-logo", "derive-symbol"]);

type ClientPixelAnalysis = {
  width?: number;
  height?: number;
  hasTransparency?: boolean;
  edgeBackgroundRatio?: number;
  backgroundSignal?: "transparent" | "embedded" | "clean-opaque" | "unknown";
  edgeColor?: string;
  faviconDataUrl?: string;
  faviconStrategy?: "reuse-logo" | "derive-symbol";
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
      logoColors?: unknown;
      colorPreference?: unknown;
      brand?: unknown;
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

    const draft = await getSupabaseDraft(request, workspaceId, siteId);
    if (!draft) return NextResponse.json({ error: "Workspace draft could not be loaded." }, { status: 404 });
    const baseBrand = body.brand ? brandTokensSchema.parse(body.brand) : draft.snapshot.theme.brand;
    const logoColors = sanitizeLogoColors(body.logoColors);
    const colorPreference = body.colorPreference === "match" ? "match" : "keep";
    const paletteAssessment = assessBrandPalette({ logoColors });
    const paletteApplied = colorPreference === "match" && paletteAssessment.decision !== "decouple";
    const approvedColors = paletteApplied
      ? colorsFromAssessment(baseBrand.colors, paletteAssessment)
      : baseBrand.colors;

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

    let cleanupUrl: string | undefined;
    if (recommendation.treatment === "cleanup-recommended") {
      const cleanupBytes = decodeCleanupDataUrl(body.cleanupDataUrl);
      if (cleanupBytes && cleanupBytes.length <= MAX_BYTES) {
        const cleanupPath = `${workspaceId}/${siteId}/branding/logo-clean-${crypto.randomUUID()}.png`;
        try {
          await uploadPublicAsset({ url, key, token, path: cleanupPath, contentType: "image/png", bytes: cleanupBytes });
          cleanupUrl = publicAssetUrl(url, cleanupPath);
        } catch {}
      }
    }

    const cleanupApplied = Boolean(cleanupUrl);
    const activeUrl = cleanupUrl ?? originalUrl;
    const presentation = cleanupApplied
      ? { ...recommendation, treatment: "direct" as const, paddingScale: 1, reasons: [...recommendation.reasons, "A transparent cleanup derivative was applied while the original logo was preserved."] }
      : recommendation;

    const faviconDecision = evaluateFaviconStrategy({
      logoShape: presentation.shape,
      ...(effectiveAnalysis.width ? { width: effectiveAnalysis.width } : {}),
      ...(effectiveAnalysis.height ? { height: effectiveAnalysis.height } : {}),
      hasTransparency: cleanupApplied || effectiveAnalysis.hasTransparency === true,
      cleanupApplied,
      businessName: draft.snapshot.name,
    });
    const faviconCandidate = decodeFaviconDataUrl(clientAnalysis?.faviconDataUrl);
    let faviconUrl: string;
    let faviconStrategy: "reuse-logo" | "derive-symbol" | "initial-mark";
    if (faviconCandidate && clientAnalysis?.faviconStrategy && FAVICON_STRATEGIES.has(clientAnalysis.faviconStrategy)) {
      const faviconPath = `${workspaceId}/${siteId}/branding/favicon-${crypto.randomUUID()}.png`;
      await uploadPublicAsset({ url, key, token, path: faviconPath, contentType: "image/png", bytes: faviconCandidate });
      faviconUrl = publicAssetUrl(url, faviconPath);
      faviconStrategy = clientAnalysis.faviconStrategy;
    } else if (faviconDecision.strategy === "reuse-logo") {
      faviconUrl = activeUrl;
      faviconStrategy = "reuse-logo";
    } else {
      const faviconPath = `${workspaceId}/${siteId}/branding/favicon-${crypto.randomUUID()}.svg`;
      const svgBytes = Buffer.from(initialFaviconSvg(draft.snapshot.name, approvedColors.primary), "utf8");
      await uploadPublicAsset({ url, key, token, path: faviconPath, contentType: "image/svg+xml", bytes: svgBytes });
      faviconUrl = publicAssetUrl(url, faviconPath);
      faviconStrategy = "initial-mark";
    }

    const paletteReason = colorPreference === "keep"
      ? "Website colors preserved by user preference."
      : paletteAssessment.decision === "decouple"
        ? "Logo palette was rejected by the quality gate, so existing website colors were preserved."
        : `Logo palette ${paletteAssessment.decision} decision applied (${paletteAssessment.score}/100).`;

    const nextBrand = brandTokensSchema.parse({
      ...baseBrand,
      colors: approvedColors,
      logoAssetId: activeUrl,
      logoOriginalAssetId: originalUrl,
      ...(cleanupUrl ? { logoCleanupAssetId: cleanupUrl } : { logoCleanupAssetId: undefined }),
      faviconAssetId: faviconUrl,
      faviconStrategy,
      logoPresentation: {
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
          paletteReason,
          `Favicon strategy: ${faviconStrategy}.`,
        ],
      },
    });

    const socialSite = structuredClone(draft.snapshot);
    socialSite.theme.brand = nextBrand;
    const social = await generateAndUploadSocialCard({ site: socialSite, supabaseUrl: url, supabaseKey: key, authorization: `Bearer ${token}` });
    const brand = brandTokensSchema.parse({ ...nextBrand, socialImageAssetId: social.url, socialImageStrategy: "generated-card" });

    return NextResponse.json({
      ok: true,
      brand,
      logoUrl: activeUrl,
      faviconUrl,
      socialImageUrl: social.url,
      cleanupApplied,
      colorPreference,
      paletteApplied,
      paletteDecision: paletteAssessment.decision,
      paletteScore: paletteAssessment.score,
      paletteReasons: paletteAssessment.reasons,
    }, { status: 201 });
  } catch (error) {
    const status = typeof (error as { status?: unknown })?.status === "number" ? Number((error as { status?: number }).status) : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Brand replacement failed." }, { status });
  }
}

function sanitizeLogoColors(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string" && /^#[0-9a-f]{6}$/i.test(item.trim()))
    .map((item) => item.trim().toUpperCase())
    .slice(0, 6);
}

function colorsFromAssessment(base: ReturnType<typeof brandTokensSchema.parse>["colors"], assessment: ReturnType<typeof assessBrandPalette>) {
  const lightBackground = assessment.neutrals[0];
  const darkText = assessment.neutrals[1];
  return {
    ...base,
    primary: assessment.primary,
    secondary: assessment.secondary,
    accent: assessment.accent,
    background: lightBackground,
    surface: assessment.decision === "repair" ? "#FAFAF8" : "#F7F7F5",
    textPrimary: darkText,
    textSecondary: "#5F6368",
    border: "#DFE1E5",
  };
}

function sanitizeClientAnalysis(value: unknown): ClientPixelAnalysis | undefined {
  if (!value || typeof value !== "object") return undefined;
  const source = value as Record<string, unknown>;
  const width = boundedPositive(source.width, 100000);
  const height = boundedPositive(source.height, 100000);
  const ratio = typeof source.edgeBackgroundRatio === "number" && Number.isFinite(source.edgeBackgroundRatio) ? Math.max(0, Math.min(1, source.edgeBackgroundRatio)) : undefined;
  const signal = typeof source.backgroundSignal === "string" && BACKGROUND_SIGNALS.has(source.backgroundSignal) ? source.backgroundSignal as ClientPixelAnalysis["backgroundSignal"] : undefined;
  const edgeColor = typeof source.edgeColor === "string" && /^#[0-9a-f]{6}$/i.test(source.edgeColor) ? source.edgeColor.toUpperCase() : undefined;
  const faviconDataUrl = typeof source.faviconDataUrl === "string" && source.faviconDataUrl.startsWith("data:image/png;base64,") ? source.faviconDataUrl : undefined;
  const faviconStrategy = typeof source.faviconStrategy === "string" && FAVICON_STRATEGIES.has(source.faviconStrategy) ? source.faviconStrategy as ClientPixelAnalysis["faviconStrategy"] : undefined;
  return { ...(width ? { width } : {}), ...(height ? { height } : {}), ...(typeof source.hasTransparency === "boolean" ? { hasTransparency: source.hasTransparency } : {}), ...(typeof ratio === "number" ? { edgeBackgroundRatio: ratio } : {}), ...(signal ? { backgroundSignal: signal } : {}), ...(edgeColor ? { edgeColor } : {}), ...(faviconDataUrl ? { faviconDataUrl } : {}), ...(faviconStrategy ? { faviconStrategy } : {}) };
}
function decodeDataUrl(dataUrl: string, expectedType: string) { const match=dataUrl.match(/^data:([^;]+);base64,(.+)$/); if(!match?.[1]||!match[2]||match[1]!==expectedType)return undefined; const bytes=Buffer.from(match[2],"base64"); return bytes.length?bytes:undefined; }
function decodeCleanupDataUrl(value: unknown) { return typeof value === "string" && value.startsWith("data:image/png;base64,") ? decodeDataUrl(value,"image/png") : undefined; }
function decodeFaviconDataUrl(value?: string) { const bytes=value?decodeDataUrl(value,"image/png"):undefined; return bytes&&bytes.length<=MAX_FAVICON_BYTES?bytes:undefined; }
async function uploadPublicAsset(input:{url:string;key:string;token:string;path:string;contentType:string;bytes:Buffer}){const response=await fetch(`${input.url}/storage/v1/object/public-assets/${encodePath(input.path)}`,{method:"POST",headers:{apikey:input.key,authorization:`Bearer ${input.token}`,"content-type":input.contentType,"x-upsert":"false"},body:Uint8Array.from(input.bytes),cache:"no-store"});if(!response.ok)throw new Error((await response.text())||`Brand asset upload failed (${response.status}).`)}
function initialFaviconSvg(name:string,primary:string){const initial=name.trim().match(/[\p{L}\p{N}]/u)?.[0]?.toUpperCase()??"M";const bg=/^#[0-9a-f]{6}$/i.test(primary)?primary:"#6D5EF5";return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><rect width="256" height="256" rx="52" fill="${bg}"/><text x="128" y="142" text-anchor="middle" dominant-baseline="middle" font-family="Arial,Helvetica,sans-serif" font-size="142" font-weight="700" fill="${contrastFor(bg)}">${escapeXml(initial)}</text></svg>`}
function contrastFor(color:string){const hex=color.slice(1);if(!/^[0-9a-f]{6}$/i.test(hex))return"#FFFFFF";const r=parseInt(hex.slice(0,2),16),g=parseInt(hex.slice(2,4),16),b=parseInt(hex.slice(4,6),16);return(0.2126*r+0.7152*g+0.0722*b)/255>0.58?"#111111":"#FFFFFF"}
function escapeXml(value:string){return value.replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&apos;"}[char]??char))}
function publicAssetUrl(baseUrl:string,path:string){return `${baseUrl}/storage/v1/object/public/public-assets/${encodePath(path)}`}
function boundedPositive(value:unknown,max:number){return typeof value==="number"&&Number.isFinite(value)&&value>0&&value<=max?value:undefined}
function clean(value:unknown){return typeof value==="string"?value.trim():""}
function encodePath(path:string){return path.split("/").map(encodeURIComponent).join("/")}
function extension(type:string){if(type==="image/jpeg")return"jpg";if(type==="image/svg+xml")return"svg";return type.split("/")[1]||"png"}
