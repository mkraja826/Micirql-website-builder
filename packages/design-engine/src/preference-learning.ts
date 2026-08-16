import { selectDiverseDesigns, type DesignFingerprint, type DesignScore } from "./design-diversity";

export type PreferenceSignalType = "more_like_this" | "compare" | "regenerate" | "selected";

export type PreferenceSignal = {
  signalType: PreferenceSignalType;
  fingerprint?: Partial<DesignFingerprint>;
  themeFamily?: string | null;
  density?: string | null;
  shape?: string | null;
  typography?: string | null;
};

export type DesignPreferenceProfile = {
  signalCount: number;
  traits: Record<string, number>;
  confidence: number;
};

const SIGNAL_WEIGHT: Record<PreferenceSignalType, number> = {
  selected: 5,
  more_like_this: 3,
  compare: 0.75,
  regenerate: -2.5,
};

/**
 * Converts explicit user interactions into a small deterministic taste profile.
 * We learn traits, never entire sites, so customer content/branding is not reused.
 */
export function buildDesignPreferenceProfile(signals: PreferenceSignal[]): DesignPreferenceProfile {
  const traits: Record<string, number> = {};
  for (const signal of signals) {
    const weight = SIGNAL_WEIGHT[signal.signalType] ?? 0;
    for (const trait of signalTraits(signal)) traits[trait] = (traits[trait] ?? 0) + weight;
  }

  const signalCount = signals.length;
  const confidence = Math.min(1, signalCount / 20);
  return { signalCount, traits, confidence };
}

/** Maximum preference influence is intentionally capped. Quality/readiness still win. */
export function preferenceScoreForDesign(fingerprint: DesignFingerprint, profile?: DesignPreferenceProfile): number {
  if (!profile || profile.signalCount === 0) return 0;
  const traits = fingerprintTraits(fingerprint);
  if (!traits.length) return 0;
  const raw = traits.reduce((sum, trait) => sum + (profile.traits[trait] ?? 0), 0) / traits.length;
  const bounded = Math.max(-12, Math.min(12, raw));
  return bounded * profile.confidence;
}

export function applyPreferenceBias(score: DesignScore, profile?: DesignPreferenceProfile): DesignScore & { preferenceBias: number } {
  const preferenceBias = preferenceScoreForDesign(score.fingerprint, profile);
  return { ...score, total: Math.max(0, Math.min(100, Math.round(score.total + preferenceBias))), preferenceBias };
}

/**
 * Re-ranks an already quality-filtered candidate pool, then re-applies diversity.
 * Preference can influence order but cannot bypass structural/content validation.
 */
export function personalizeDiverseDesigns<T extends { designScore: DesignScore }>(
  candidates: T[],
  profile: DesignPreferenceProfile | undefined,
  limit: number,
): T[] {
  if (!profile || profile.signalCount === 0) return selectDiverseDesigns(candidates, limit);
  const biased = candidates.map((candidate) => ({
    ...candidate,
    designScore: applyPreferenceBias(candidate.designScore, profile),
  })) as T[];
  return selectDiverseDesigns(biased, limit);
}

function signalTraits(signal: PreferenceSignal): string[] {
  const traits: string[] = [];
  if (signal.themeFamily) traits.push(`theme:${signal.themeFamily}`);
  if (signal.density) traits.push(`density:${signal.density}`);
  if (signal.shape) traits.push(`shape:${signal.shape}`);
  if (signal.typography) traits.push(`typography:${signal.typography}`);
  const fp = signal.fingerprint;
  if (fp?.structure) traits.push(...fp.structure.split("|").filter(Boolean).map((value) => `structure:${value}`));
  if (fp?.palette) traits.push(...fp.palette.split("|").filter(Boolean).map((value) => `palette:${value}`));
  if (fp?.typography) traits.push(`typography:${fp.typography}`);
  if (fp?.density) traits.push(`density:${fp.density}`);
  if (fp?.shape) traits.push(`shape:${fp.shape}`);
  if (fp?.modifiers) traits.push(...fp.modifiers.split("|").filter(Boolean).map((value) => `modifier:${value}`));
  return [...new Set(traits)];
}

function fingerprintTraits(fp: DesignFingerprint): string[] {
  return [
    ...fp.structure.split("|").filter(Boolean).map((value) => `structure:${value}`),
    ...fp.palette.split("|").filter(Boolean).map((value) => `palette:${value}`),
    `typography:${fp.typography}`,
    `density:${fp.density}`,
    `shape:${fp.shape}`,
    ...fp.modifiers.split("|").filter(Boolean).map((value) => `modifier:${value}`),
  ];
}
