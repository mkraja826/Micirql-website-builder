import type { AssetRecord } from "@micirql/assets";
import { deleteAssetAndObject, insertAsset, uploadAssetBinary } from "../../assets/supabase-assets";
import { fetchPexelsImage, focalPointForSection, getPexelsApiKey } from "../../../pexels-stock-image";

const HEALTH_WORKSPACE_ID = "00000000-0000-0000-0000-00000000beef";

export async function GET(request: Request) {
  let healthAssetId: string | null = null;
  let storageKey: string | null = null;
  try {
    assertLibraryAdmin(request);
    if (!getPexelsApiKey()) {
      return Response.json(
        { ok: false, code: "PEXELS_NOT_CONFIGURED", error: "Pexels API is not configured in the Builder runtime." },
        { status: 503 },
      );
    }

    const result = await fetchPexelsImage({
      query: "dental implant consultation modern dental clinic",
      family: "hero",
      domain: "dental",
      desiredAspect: "16:9",
      preferredTags: ["implant", "clinical", "consultation"],
      excludedPhotoIds: [],
    });

    if (!result.photoId || !result.bytes.byteLength || !result.width || !result.height) {
      throw new Error("Pexels returned an incomplete runtime image result.");
    }

    healthAssetId = `pexels-health-${crypto.randomUUID()}`;
    const stored = await uploadAssetBinary(HEALTH_WORKSPACE_ID, healthAssetId, result.bytes, result.contentType);
    storageKey = stored.key;

    const asset: AssetRecord = {
      id: healthAssetId,
      workspaceId: HEALTH_WORKSPACE_ID,
      source: "licensed-stock",
      kind: "image",
      name: `Pexels runtime health photo ${result.photoId}`,
      alt: result.alt,
      width: result.width,
      height: result.height,
      orientation: result.orientation,
      aspectRatio: result.aspectRatio,
      focalPoint: focalPointForSection("hero", result.orientation, "16:9"),
      domains: [],
      subtypes: [],
      sectionFamilies: ["hero"],
      themes: [],
      tags: ["pexels", "licensed-stock", "runtime-health", "dental", "implant"],
      license: "licensed",
      sourceReference: `pexels:${result.photoId}|${result.photoUrl}|${result.photographer}|${result.photographerUrl}`,
      originalUrl: stored.url,
      variants: [],
      active: false,
      createdAt: new Date().toISOString(),
    };

    const persisted = await insertAsset(asset, stored.key);
    if (persisted.id !== healthAssetId || persisted.source !== "licensed-stock" || persisted.originalUrl !== stored.url) {
      throw new Error("Pexels asset registry round-trip did not preserve the expected asset metadata.");
    }

    const publicResponse = await fetch(stored.url, { cache: "no-store" });
    if (!publicResponse.ok) throw new Error(`Stored Pexels image was not publicly readable (${publicResponse.status}).`);
    const publicBytes = (await publicResponse.arrayBuffer()).byteLength;
    if (!publicBytes) throw new Error("Stored Pexels image public URL returned an empty body.");

    await deleteAssetAndObject(healthAssetId, stored.key);
    storageKey = null;

    return Response.json({
      ok: true,
      provider: "pexels",
      photoId: result.photoId,
      query: result.query,
      contentType: result.contentType,
      sourceBytes: result.bytes.byteLength,
      storedBytes: publicBytes,
      width: result.width,
      height: result.height,
      orientation: result.orientation,
      aspectRatio: result.aspectRatio,
      photographer: result.photographer,
      storage: { bucket: "public-assets", uploaded: true, publiclyReadable: true },
      registry: { inserted: true, source: persisted.source, license: persisted.license },
      cleanup: { completed: true },
    });
  } catch (error) {
    let cleanupError: string | null = null;
    if (healthAssetId && storageKey) {
      try {
        await deleteAssetAndObject(healthAssetId, storageKey);
      } catch (cleanup) {
        cleanupError = cleanup instanceof Error ? cleanup.message : "Health-check cleanup failed.";
      }
    }
    const status = (error as Error & { status?: number }).status ?? 500;
    return Response.json(
      {
        ok: false,
        code: "PEXELS_RUNTIME_HEALTH_FAILED",
        error: error instanceof Error ? error.message : "Pexels runtime health check failed.",
        cleanupError,
      },
      { status },
    );
  }
}

function assertLibraryAdmin(request: Request) {
  const expected = process.env.MICIRQL_LIBRARY_ADMIN_TOKEN;
  if (!expected) {
    const error = new Error("Dental media library admin token is not configured.") as Error & { status?: number };
    error.status = 503;
    throw error;
  }
  const provided = request.headers.get("x-micirql-library-token");
  if (!provided || provided !== expected) {
    const error = new Error("FORBIDDEN") as Error & { status?: number };
    error.status = 403;
    throw error;
  }
}
