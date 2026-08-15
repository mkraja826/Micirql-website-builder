import type { SitePlan } from "@micirql/schema";
import type { DesignRegistryEntry } from "@micirql/registry";
import type { PlannerModel } from "./planner-adapter";
import { composeSiteFromRegistry, type CompositionResult } from "./composition-engine";

export type DesignDirection = {
  id: string;
  rank: number;
  composition: CompositionResult;
  signature: string;
  diversityScore: number;
};

export type DesignDirectionInput = {
  plan: SitePlan;
  registry: readonly DesignRegistryEntry[];
  model?: PlannerModel;
  visibleCount?: number;
  candidateCount?: number;
  shortlistSize?: number;
};

/**
 * Generates a broad candidate pool, removes near-duplicate compositions, and
 * returns up to 20 distinct directions for user taste selection.
 * Quality/safety filtering remains the registry/composition engine's job;
 * aesthetic preference remains the user's decision.
 */
export async function generateDesignDirections(input: DesignDirectionInput): Promise<DesignDirection[]> {
  const visibleCount = clamp(input.visibleCount ?? 20, 1, 20);
  const candidateCount = clamp(input.candidateCount ?? 60, visibleCount, 100);
  const shortlistSize = clamp(input.shortlistSize ?? 10, 2, 12);

  const pool: CompositionResult[] = [];
  for (let i = 0; i < candidateCount; i += 1) {
    pool.push(await composeSiteFromRegistry({
      plan: input.plan,
      registry: input.registry,
      ...(input.model ? { model: input.model } : {}),
      shortlistSize,
    }));
  }

  const unique = new Map<string, CompositionResult>();
  for (const composition of pool) unique.set(compositionSignature(composition), composition);

  const selected: DesignDirection[] = [];
  const remaining = [...unique.entries()];
  while (remaining.length && selected.length < visibleCount) {
    let bestIndex = 0;
    let bestDiversity = -1;
    for (let i = 0; i < remaining.length; i += 1) {
      const [signature] = remaining[i]!;
      const diversity = selected.length === 0
        ? 1
        : Math.min(...selected.map((item) => signatureDistance(signature, item.signature)));
      if (diversity > bestDiversity) {
        bestDiversity = diversity;
        bestIndex = i;
      }
    }
    const [signature, composition] = remaining.splice(bestIndex, 1)[0]!;
    selected.push({
      id: `direction-${String(selected.length + 1).padStart(2, "0")}`,
      rank: selected.length + 1,
      composition,
      signature,
      diversityScore: Number(bestDiversity.toFixed(3)),
    });
  }

  return selected;
}

export function compositionSignature(composition: CompositionResult): string {
  return composition.pages
    .flatMap((page) => page.sections.map((section) => `${page.path}:${section.family}:${section.componentId}@${section.version}`))
    .join("|");
}

function signatureDistance(a: string, b: string): number {
  const left = new Set(a.split("|"));
  const right = new Set(b.split("|"));
  const union = new Set([...left, ...right]);
  if (!union.size) return 0;
  let shared = 0;
  for (const item of left) if (right.has(item)) shared += 1;
  return 1 - shared / union.size;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}
