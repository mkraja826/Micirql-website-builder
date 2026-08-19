export type PexelsOrientation = "landscape" | "portrait" | "square";

type PexelsPhoto = {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographer_url: string;
  alt: string;
  src: {
    original: string;
    large2x?: string;
    large?: string;
    landscape?: string;
    portrait?: string;
    medium?: string;
  };
};

type PexelsSearchResponse = { photos?: PexelsPhoto[] };

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 350;
const MAX_DELAY_MS = 5_000;

export function getPexelsApiKey(): string | null {
  return process.env.PEXELS_API_KEY?.trim() || null;
}

export function orientationForSection(family?: string): PexelsOrientation {
  const normalized = family?.trim().toLowerCase() ?? "";
  if (normalized === "team") return "portrait";
  if (normalized === "gallery") return "landscape";
  if (normalized === "hero" || normalized === "about" || normalized === "services") return "landscape";
  return "landscape";
}

export function focalPointForSection(family?: string, orientation?: string): { x: number; y: number } {
  const normalized = family?.trim().toLowerCase() ?? "";
  if (normalized === "team") return { x: 0.5, y: 0.34 };
  if (normalized === "hero") return orientation === "portrait" ? { x: 0.5, y: 0.38 } : { x: 0.56, y: 0.46 };
  if (normalized === "about") return { x: 0.52, y: 0.44 };
  if (normalized === "gallery") return { x: 0.5, y: 0.5 };
  if (normalized === "services" || normalized === "features" || normalized === "process") return { x: 0.5, y: 0.46 };
  return { x: 0.5, y: 0.5 };
}

export async function fetchPexelsImage(input: {
  query: string;
  family?: string;
  domain?: string;
  excludedPhotoIds?: number[];
}) {
  const apiKey = getPexelsApiKey();
  if (!apiKey) throw new Error("PEXELS_API_KEY is not configured.");

  const orientation = orientationForSection(input.family);
  const query = buildSearchQuery(input.query, input.domain, input.family);
  const params = new URLSearchParams({
    query,
    orientation,
    size: "large",
    per_page: "24",
    page: "1",
  });

  const response = await fetchWithRetry(`https://api.pexels.com/v1/search?${params}`, {
    headers: { Authorization: apiKey },
    cache: "no-store",
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Pexels search failed (${response.status}): ${body.slice(0, 300)}`);
  }

  const payload = (await response.json()) as PexelsSearchResponse;
  const photo = chooseBestPhoto(payload.photos ?? [], orientation, query, new Set(input.excludedPhotoIds ?? []));
  if (!photo) throw new Error(`Pexels returned no usable image for: ${query}`);

  const imageUrl = pickImageUrl(photo, orientation);
  const imageResponse = await fetchWithRetry(imageUrl, { cache: "no-store" });
  if (!imageResponse.ok) throw new Error(`Pexels image download failed (${imageResponse.status}).`);
  const bytes = new Uint8Array(await imageResponse.arrayBuffer());
  if (!bytes.byteLength) throw new Error("Pexels returned an empty image.");

  const contentType = imageResponse.headers.get("content-type")?.split(";")[0]?.trim() || "image/jpeg";
  const ratio = photo.width / photo.height;
  const resolvedOrientation = ratio > 2 ? "panoramic" : ratio > 1.08 ? "landscape" : ratio < 0.92 ? "portrait" : "square";

  return {
    bytes,
    contentType,
    width: photo.width,
    height: photo.height,
    orientation: resolvedOrientation as "square" | "portrait" | "landscape" | "panoramic",
    aspectRatio: ratio,
    alt: photo.alt?.trim() || `${input.family ?? "website"} stock photo`,
    photoId: photo.id,
    photoUrl: photo.url,
    photographer: photo.photographer,
    photographerUrl: photo.photographer_url,
    query,
    sourceUrl: imageUrl,
  };
}

async function fetchWithRetry(input: string, init: RequestInit): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(input, init);
      if (!RETRYABLE_STATUS.has(response.status) || attempt === MAX_ATTEMPTS) return response;
      await discardBody(response);
      await sleep(retryDelayMs(response.headers.get("retry-after"), attempt));
    } catch (error) {
      if (!isRetryableNetworkError(error) || attempt === MAX_ATTEMPTS) throw error;
      lastError = error;
      await sleep(retryDelayMs(null, attempt));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Pexels request failed after retries.");
}

function retryDelayMs(retryAfter: string | null, attempt: number): number {
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) return Math.min(MAX_DELAY_MS, Math.round(seconds * 1_000));
    const timestamp = Date.parse(retryAfter);
    if (Number.isFinite(timestamp)) return Math.min(MAX_DELAY_MS, Math.max(0, timestamp - Date.now()));
  }
  return Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** (attempt - 1));
}

function isRetryableNetworkError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "AbortError") return false;
  return error instanceof TypeError || (error instanceof Error && /network|fetch failed|socket|timeout|timed out|connection|econn/i.test(error.message));
}

async function discardBody(response: Response): Promise<void> {
  try { await response.arrayBuffer(); } catch { /* best effort */ }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildSearchQuery(prompt: string, domain?: string, family?: string): string {
  const cleaned = prompt
    .replace(/\b(website|webpage|hero section|section|premium|high quality|4k|8k|ultra realistic|generate|image of|photo of)\b/gi, " ")
    .replace(/[^a-z0-9\s-]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  const normalizedDomain = domain?.trim().toLowerCase() ?? "";
  const normalizedFamily = family?.trim().toLowerCase() ?? "";
  const domainHint = dentalSearchHint(normalizedDomain, normalizedFamily);
  const context = [domainHint, domain, family].filter(Boolean).join(" ");
  const terms = `${context} ${cleaned}`.trim().split(/\s+/).filter(Boolean).slice(0, 16);
  return uniqueTerms(terms).join(" ") || "professional business interior";
}

function dentalSearchHint(domain: string, family: string): string {
  if (!/(dental|dentist|dentistry|clinic)/.test(domain)) return "";
  switch (family) {
    case "hero":
      return "modern dental clinic dentist patient consultation bright interior";
    case "team":
      return "professional dentist portrait dental clinic clinician";
    case "gallery":
      return "modern dental clinic interior treatment room dental equipment";
    case "about":
      return "dentist patient consultation dental clinic care";
    case "services":
      return "dentist dental treatment consultation modern clinic";
    case "features":
      return "digital dentistry dental scanner modern clinic technology";
    case "process":
      return "dentist patient consultation treatment planning dental clinic";
    default:
      return "modern dental clinic professional dentistry";
  }
}

function uniqueTerms(terms: string[]): string[] {
  const seen = new Set<string>();
  return terms.filter((term) => {
    const normalized = term.toLowerCase();
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

function chooseBestPhoto(photos: PexelsPhoto[], orientation: PexelsOrientation, query: string, excludedPhotoIds: Set<number>): PexelsPhoto | null {
  const nonDuplicate = photos.filter((photo) => !excludedPhotoIds.has(photo.id));
  const usable = nonDuplicate.filter((photo) => photo.width >= 1200 && photo.height >= 800);
  const candidates = usable.length ? usable : nonDuplicate;
  if (!candidates.length) return null;

  const target = orientation === "portrait" ? 0.8 : orientation === "square" ? 1 : 1.5;
  const queryTerms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length >= 4 && !["modern", "professional", "bright"].includes(term));

  return [...candidates].sort((a, b) => scorePhoto(a, target, queryTerms) - scorePhoto(b, target, queryTerms))[0] ?? null;
}

function scorePhoto(photo: PexelsPhoto, targetRatio: number, queryTerms: string[]): number {
  const ratio = photo.width / photo.height;
  const ratioPenalty = Math.abs(ratio - targetRatio);
  const resolutionBonus = Math.min(photo.width * photo.height / 40_000_000, 0.25);
  const alt = photo.alt?.toLowerCase() ?? "";
  const semanticHits = queryTerms.reduce((hits, term) => hits + (alt.includes(term) ? 1 : 0), 0);
  const semanticBonus = Math.min(semanticHits * 0.09, 0.45);
  return ratioPenalty - resolutionBonus - semanticBonus;
}

function pickImageUrl(photo: PexelsPhoto, orientation: PexelsOrientation): string {
  if (orientation === "portrait" && photo.src.portrait) return photo.src.portrait;
  if (orientation === "landscape" && photo.src.landscape) return photo.src.landscape;
  return photo.src.large2x || photo.src.large || photo.src.original;
}
