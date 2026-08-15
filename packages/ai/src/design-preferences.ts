import type { ThemeFamily, ThemeModifier } from "@micirql/schema";
import type { DesignPreferenceQuery } from "@micirql/registry";

export type LearnedDesignPreferenceProfile = {
  preferredThemeFamily?: string | null;
  preferredDensity?: string | null;
  preferredShape?: string | null;
  preferredMotion?: string | null;
  preferredDisplayFont?: string | null;
  preferredBodyFont?: string | null;
  signalCount?: number | null;
  selectionCount?: number | null;
  likeCount?: number | null;
};

const THEMES = new Set<ThemeFamily>([
  "minimalist", "corporate", "luxury", "editorial", "glass", "maximalist", "organic", "futuristic", "playful", "cinematic",
]);

export function preferenceQueryFromLearnedProfile(profile?: LearnedDesignPreferenceProfile | null): DesignPreferenceQuery | undefined {
  if (!profile) return undefined;
  const signalCount = Math.max(0, Number(profile.signalCount ?? 0));
  if (signalCount === 0) return undefined;

  const preferredThemes: ThemeFamily[] = [];
  if (typeof profile.preferredThemeFamily === "string" && THEMES.has(profile.preferredThemeFamily as ThemeFamily)) {
    preferredThemes.push(profile.preferredThemeFamily as ThemeFamily);
  }

  const preferredModifiers = [shapeModifier(profile.preferredShape), motionModifier(profile.preferredMotion)]
    .filter((value): value is ThemeModifier => Boolean(value));

  // Confidence grows gradually; explicit final selections count more than passive likes.
  const explicit = Math.max(0, Number(profile.selectionCount ?? 0));
  const likes = Math.max(0, Number(profile.likeCount ?? 0));
  const strength = Math.min(1, 0.2 + explicit * 0.35 + likes * 0.08 + Math.min(signalCount, 10) * 0.025);

  const density = normalizeDensity(profile.preferredDensity);
  return {
    ...(preferredThemes.length ? { preferredThemes } : {}),
    ...(preferredModifiers.length ? { preferredModifiers } : {}),
    ...(density ? { preferredContentDensity: density } : {}),
    strength,
    allowThemeExploration: preferredThemes.length > 0 && strength >= 0.45,
  };
}

function normalizeDensity(value?: string | null): "low" | "medium" | "high" | undefined {
  if (!value) return undefined;
  const normalized = value.toLowerCase();
  if (["compact", "dense", "high"].includes(normalized)) return "high";
  if (["spacious", "airy", "low"].includes(normalized)) return "low";
  if (["comfortable", "balanced", "medium"].includes(normalized)) return "medium";
  return undefined;
}

function shapeModifier(value?: string | null): ThemeModifier | undefined {
  if (!value) return undefined;
  const normalized = value.toLowerCase();
  if (normalized.includes("round") || normalized.includes("soft")) return "rounded";
  if (normalized.includes("sharp")) return "sharp";
  return undefined;
}

function motionModifier(value?: string | null): ThemeModifier | undefined {
  if (!value) return undefined;
  const normalized = value.toLowerCase();
  if (normalized.includes("rich")) return "motion-rich";
  if (normalized.includes("subtle")) return "motion-subtle";
  return undefined;
}
