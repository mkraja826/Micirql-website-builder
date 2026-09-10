import type { MediaCandidate, MediaProvider, MediaSearchIntent, MediaOrientation } from "./schema";

type PexelsPhoto = {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographer_url: string;
  alt: string;
  src: { original: string; large2x?: string; large?: string; landscape?: string; portrait?: string };
};

type PexelsSearchResponse = { photos?: PexelsPhoto[] };

const RETRYABLE = new Set([429, 500, 502, 503, 504, 520, 521, 522, 523, 524, 525, 526, 527]);

export function createPexelsProvider(options?: { apiKey?: string; fetchImpl?: typeof fetch }): MediaProvider {
  const fetchImpl = options?.fetchImpl ?? fetch;
  const apiKey = options?.apiKey?.trim() || process.env.PEXELS_API_KEY?.trim();

  return {
    id: "pexels-stock",
    async search(intent: MediaSearchIntent): Promise<MediaCandidate[]> {
      if (!apiKey) throw new Error("PEXELS_API_KEY is not configured.");
      const orientation = orientationFor(intent.sectionFamily, intent.desiredAspect);
      const query = buildQuery(intent);
      const params = new URLSearchParams({ query, orientation, size: "large", per_page: "24", page: "1" });
      const response = await fetchWithRetry(fetchImpl, `https://api.pexels.com/v1/search?${params}`, { headers: { Authorization: apiKey }, cache: "no-store" });
      if (!response.ok) throw new Error(`Pexels search failed (${response.status}).`);
      const payload = (await response.json()) as PexelsSearchResponse;
      const excluded = new Set(intent.excludedProviderIds ?? []);
      return (payload.photos ?? [])
        .filter((photo) => !excluded.has(String(photo.id)))
        .filter((photo) => photo.width >= 1200 && photo.height >= 800)
        .sort((a, b) => score(a, intent.desiredAspect, orientation, query) - score(b, intent.desiredAspect, orientation, query))
        .slice(0, 8)
        .map((photo) => normalize(photo, intent, query, orientation));
    },
  };
}

function normalize(photo: PexelsPhoto, intent: MediaSearchIntent, query: string, requested: "landscape" | "portrait" | "square"): MediaCandidate {
  const ratio = photo.width / photo.height;
  const orientation: MediaOrientation = ratio > 2 ? "panoramic" : ratio > 1.08 ? "landscape" : ratio < 0.92 ? "portrait" : "square";
  const imageUrl = requested === "portrait" && photo.src.portrait ? photo.src.portrait : requested === "landscape" && photo.src.landscape ? photo.src.landscape : photo.src.large2x || photo.src.large || photo.src.original;
  return {
    provider: "pexels",
    providerId: String(photo.id),
    imageUrl,
    sourcePageUrl: photo.url,
    photographer: photo.photographer,
    photographerUrl: photo.photographer_url,
    alt: photo.alt?.trim() || `${intent.sectionFamily ?? "website"} stock photograph`,
    width: photo.width,
    height: photo.height,
    orientation,
    aspectRatio: ratio,
    focalPoint: focalPointFor(intent.sectionFamily, orientation),
    query,
  };
}

function orientationFor(family?: string, aspect?: string): "landscape" | "portrait" | "square" {
  const value = aspect?.toLowerCase();
  if (value === "portrait" || value === "4:5") return "portrait";
  if (value === "1:1" || value === "square") return "square";
  if (family?.toLowerCase() === "team") return "portrait";
  return "landscape";
}

function focalPointFor(family: string | undefined, orientation: MediaOrientation) {
  const normalized = family?.toLowerCase();
  if (normalized === "team") return { x: 0.5, y: 0.34 };
  if (normalized === "hero") return orientation === "portrait" ? { x: 0.5, y: 0.36 } : { x: 0.56, y: 0.46 };
  if (normalized === "about") return { x: 0.52, y: 0.44 };
  return { x: 0.5, y: 0.5 };
}

function buildQuery(intent: MediaSearchIntent) {
  const cleaned = intent.query.replace(/\b(website|webpage|hero section|section|high quality|4k|8k|generate|image of|photo of|visual role|composition|aspect ratio)\b/gi, " ").replace(/[^a-z0-9\s-]/gi, " ").replace(/\s+/g, " ").trim();
  return [...new Set([...(intent.preferredTags ?? []), intent.industry, intent.sectionFamily, cleaned].filter(Boolean).join(" ").split(/\s+/).filter(Boolean))].slice(0, 24).join(" ") || "professional business interior";
}

function score(photo: PexelsPhoto, desiredAspect: string | undefined, orientation: "landscape" | "portrait" | "square", query: string) {
  const target = desiredAspect === "16:9" ? 16 / 9 : desiredAspect === "4:5" || orientation === "portrait" ? 0.8 : desiredAspect === "1:1" || orientation === "square" ? 1 : 1.5;
  const ratioPenalty = Math.abs(photo.width / photo.height - target) * 1.35;
  const resolutionBonus = Math.min(photo.width * photo.height / 40_000_000, 0.25);
  const alt = photo.alt?.toLowerCase() ?? "";
  const semanticHits = query.toLowerCase().split(/\s+/).filter((term) => term.length >= 4 && alt.includes(term)).length;
  return ratioPenalty - resolutionBonus - Math.min(semanticHits * 0.11, 0.66);
}

async function fetchWithRetry(fetchImpl: typeof fetch, input: string, init: RequestInit) {
  let last: unknown;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetchImpl(input, init);
      if (!RETRYABLE.has(response.status) || attempt === 4) return response;
    } catch (error) {
      last = error;
      if (attempt === 4) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, Math.min(5000, 350 * 2 ** (attempt - 1))));
  }
  throw last instanceof Error ? last : new Error("Pexels request failed.");
}
