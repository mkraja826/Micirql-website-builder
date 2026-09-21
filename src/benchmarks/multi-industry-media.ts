import type { ArtDirection } from "../core/art-direction/schema";
import type { InterpretedBrief } from "../core/brief/schema";
import type { IndustryKnowledge } from "../core/industry/knowledge";
import { resolvePlannedMedia } from "../core/media/director";
import { mediaIntent, planMedia, type MediaRole } from "../core/media/planner";
import { createPexelsProvider } from "../providers/media/pexels";
import type { MediaCandidate } from "../providers/media/schema";

export type ResolvedBenchmarkMedia = Partial<Record<MediaRole, MediaCandidate[]>>;

type BenchmarkMediaInput = {
  brief: InterpretedBrief;
  knowledge: IndustryKnowledge;
  direction: ArtDirection;
  roles?: MediaRole[];
};

const benchmarkMediaCache = new Map<string, Promise<ResolvedBenchmarkMedia>>();

export function resolveMultiIndustryBenchmarkMedia(input: BenchmarkMediaInput): Promise<ResolvedBenchmarkMedia> {
  const cacheKey = JSON.stringify({ brief: input.brief, knowledge: input.knowledge, direction: input.direction, roles: input.roles ?? [] });
  const cached = benchmarkMediaCache.get(cacheKey);
  if (cached) return cached;

  const pending = resolveMultiIndustryBenchmarkMediaUncached(input);
  benchmarkMediaCache.set(cacheKey, pending);
  return pending.catch((error) => {
    benchmarkMediaCache.delete(cacheKey);
    throw error;
  });
}

async function resolveMultiIndustryBenchmarkMediaUncached(input: BenchmarkMediaInput): Promise<ResolvedBenchmarkMedia> {
  if (!process.env.PEXELS_API_KEY?.trim()) return {};

  const plan = planMedia(input);
  const provider = createPexelsProvider();
  const result: ResolvedBenchmarkMedia = {};
  const usedProviderIds: string[] = [];

  for (const intent of plan.intents) {
    try {
      const resolved = await resolvePlannedMedia(
        intent,
        { industry: plan.industry, excludedProviderIds: usedProviderIds },
        provider,
      );
      const candidates = resolved.candidates.slice(0, intent.role === "services" || intent.role === "gallery" ? 3 : 1);
      result[intent.role] = candidates;
      usedProviderIds.push(...candidates.map((candidate) => candidate.providerId));
    } catch (error) {
      console.warn(`Multi-industry ${intent.role} media resolution failed; using neutral fallback.`, error);
      result[intent.role] = [];
    }
  }

  return result;
}

export function benchmarkMediaIntent(input: {
  brief: InterpretedBrief;
  knowledge: IndustryKnowledge;
  direction: ArtDirection;
  role: MediaRole;
}) {
  return mediaIntent(planMedia(input), input.role);
}
