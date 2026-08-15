import { NextRequest, NextResponse } from "next/server";
import { rankDesigns, type DesignPreferenceQuery, type DesignRegistryEntry } from "@micirql/registry";
import { siteSchema } from "@micirql/schema";
import { FAMILY_CODES, SECTION_FAMILIES, seedSectionRegistryEntries, type SectionFamily } from "@micirql/sections";

export type SectionCandidate = {
  componentId: string;
  version: string;
  displayName: string;
  score: number;
  reasons: string[];
  previewOnly: boolean;
  theme: DesignRegistryEntry["theme"];
  modifiers: DesignRegistryEntry["modifiers"];
};

export async function POST(request: NextRequest) {
  try {
    const auth = request.headers.get("authorization");
    if (!auth?.startsWith("Bearer ")) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
    await verifyUser(auth);

    const body = await request.json() as Record<string, unknown>;
    const site = siteSchema.parse(body.site);
    const pageId = text(body.pageId);
    const family = normalizeFamily(body.family);
    if (!family) return NextResponse.json({ error: "A valid section family is required." }, { status: 400 });
    const page = site.pages.find((item) => item.id === pageId) ?? site.pages[0];
    if (!page) return NextResponse.json({ error: "Active page could not be resolved." }, { status: 400 });

    const afterSectionId = optionalText(body.afterSectionId);
    const afterIndex = afterSectionId ? page.sections.findIndex((item) => item.id === afterSectionId) : page.sections.length - 1;
    const previous = afterIndex >= 0 ? page.sections[afterIndex] : undefined;
    const next = afterIndex >= 0 ? page.sections[afterIndex + 1] : page.sections[0];
    const previousFamily = previous ? familyFromComponent(previous.component.componentId) : undefined;
    const nextFamily = next ? familyFromComponent(next.component.componentId) : undefined;
    const preferences = normalizePreferences(body.preferenceProfile);
    const excluded = new Set(stringArray(body.excludeComponentIds));
    const anchorId = optionalText(body.anchorComponentId);
    const anchor = anchorId ? seedSectionRegistryEntries.find((entry) => entry.id === anchorId) : undefined;

    const ranked = rankDesigns(seedSectionRegistryEntries, {
      family,
      theme: site.theme.family,
      domain: site.domain,
      modifiers: site.theme.modifiers,
      conversionGoals: goalsForFamily(family),
      ...(previousFamily ? { previousFamily } : {}),
      ...(nextFamily ? { nextFamily } : {}),
      ...(preferences ? { preferences } : {}),
      limit: 50,
    })
      .filter(({ entry }) => !excluded.has(entry.id))
      .map((item) => ({ ...item, score: item.score + anchorBonus(item.entry, anchor) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    if (ranked.length) {
      return NextResponse.json({ candidates: ranked.map(({ entry, score, reasons }) => candidate(entry, score, anchor ? [...reasons, ...anchorReasons(entry, anchor)] : reasons, false)) });
    }

    const fallback = seedSectionRegistryEntries
      .filter((entry) => entry.family === family && !excluded.has(entry.id))
      .map((entry) => ({ entry, score: previewScore(entry, site.theme.family, site.domain, previousFamily, nextFamily, preferences) + anchorBonus(entry, anchor) }))
      .sort((a, b) => b.score - a.score)
      .filter((item, index, all) => all.findIndex((other) => other.entry.id === item.entry.id) === index)
      .slice(0, 5)
      .map(({ entry, score }) => candidate(entry, score, [...previewReasons(entry, site.theme.family, previousFamily, nextFamily, preferences), ...anchorReasons(entry, anchor)], true));

    return NextResponse.json({ candidates: fallback });
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Section shortlist failed." }, { status });
  }
}

function candidate(entry: DesignRegistryEntry, score: number, reasons: string[], previewOnly: boolean): SectionCandidate {
  return { componentId: entry.id, version: entry.version, displayName: entry.displayName, score: Math.round(score * 10) / 10, reasons: [...new Set(reasons)].slice(0, 4), previewOnly, theme: entry.theme, modifiers: entry.modifiers };
}

function anchorBonus(entry: DesignRegistryEntry, anchor?: DesignRegistryEntry) {
  if (!anchor || entry.id === anchor.id) return 0;
  let score = 0;
  if (entry.theme === anchor.theme) score += 20;
  score += entry.modifiers.filter((modifier) => anchor.modifiers.includes(modifier)).length * 5;
  if (entry.intelligence?.contentDensity === anchor.intelligence?.contentDensity) score += 4;
  if (entry.intelligence?.visualWeight === anchor.intelligence?.visualWeight) score += 4;
  return score;
}

function anchorReasons(entry: DesignRegistryEntry, anchor?: DesignRegistryEntry) {
  if (!anchor || entry.id === anchor.id) return [];
  const reasons: string[] = [];
  if (entry.theme === anchor.theme) reasons.push("similar visual direction");
  if (entry.modifiers.some((modifier) => anchor.modifiers.includes(modifier))) reasons.push("shares styling traits");
  return reasons;
}

function previewScore(entry: DesignRegistryEntry, theme: DesignRegistryEntry["theme"], domain: keyof DesignRegistryEntry["domainCompatibility"], previous?: DesignRegistryEntry["family"], next?: DesignRegistryEntry["family"], preferences?: DesignPreferenceQuery) {
  let score = entry.domainCompatibility[domain] ?? 0;
  score += entry.theme === theme ? 28 : preferences?.preferredThemes?.includes(entry.theme) ? 18 : 0;
  if (previous && entry.intelligence?.idealPredecessors.includes(previous)) score += 12;
  if (next && entry.intelligence?.idealSuccessors.includes(next)) score += 8;
  if (preferences?.preferredModifiers?.some((modifier) => entry.modifiers.includes(modifier))) score += 6;
  score += (entry.intelligence?.mobileSuitability ?? entry.quality.mobile) * 0.08;
  return score;
}

function previewReasons(entry: DesignRegistryEntry, theme: DesignRegistryEntry["theme"], previous?: DesignRegistryEntry["family"], next?: DesignRegistryEntry["family"], preferences?: DesignPreferenceQuery) {
  const reasons: string[] = [];
  if (entry.theme === theme) reasons.push("matches current design direction");
  if (previous && entry.intelligence?.idealPredecessors.includes(previous)) reasons.push(`works after ${previous}`);
  if (next && entry.intelligence?.idealSuccessors.includes(next)) reasons.push(`works before ${next}`);
  if (preferences?.preferredThemes?.includes(entry.theme)) reasons.push("matches learned taste");
  if ((entry.intelligence?.mobileSuitability ?? entry.quality.mobile) >= 95) reasons.push("strong mobile fit");
  return reasons.length ? reasons : ["available library direction"];
}

function normalizePreferences(value: unknown): DesignPreferenceQuery | undefined {
  if (!value || typeof value !== "object") return undefined;
  const source = value as Record<string, unknown>;
  const preferredThemes = Array.isArray(source.preferredThemes) ? source.preferredThemes.filter((item): item is DesignRegistryEntry["theme"] => typeof item === "string") : undefined;
  const preferredModifiers = Array.isArray(source.preferredModifiers) ? source.preferredModifiers.filter((item): item is DesignRegistryEntry["modifiers"][number] => typeof item === "string") : undefined;
  const strength = typeof source.confidence === "number" ? Math.max(0, Math.min(source.confidence, 1)) : typeof source.strength === "number" ? Math.max(0, Math.min(source.strength, 1)) : 0;
  return { ...(preferredThemes?.length ? { preferredThemes } : {}), ...(preferredModifiers?.length ? { preferredModifiers } : {}), strength, allowThemeExploration: strength >= 0.55 };
}

function normalizeFamily(value: unknown): SectionFamily | undefined {
  const candidate = text(value).toLowerCase();
  return SECTION_FAMILIES.find((family) => family === candidate);
}
function familyFromComponent(componentId: string): SectionFamily | undefined {
  const lower = componentId.toLowerCase();
  const legacy = SECTION_FAMILIES.find((family) => lower === `${family}.placeholder` || lower.startsWith(`${family}.`));
  if (legacy) return legacy;
  const upper = componentId.toUpperCase();
  return SECTION_FAMILIES.find((family) => upper.includes(`-${FAMILY_CODES[family]}-`));
}
function goalsForFamily(family: SectionFamily) {
  if (family === "cta" || family === "contact" || family === "hero") return ["lead-generation", "appointments", "sales"];
  if (family === "testimonials" || family === "team" || family === "about") return ["trust", "authority"];
  if (family === "services" || family === "features" || family === "process") return ["education", "discovery", "sales"];
  return [];
}
async function verifyUser(authorization: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase configuration is missing.");
  const response = await fetch(`${url}/auth/v1/user`, { headers: { apikey: key, authorization }, cache: "no-store" });
  if (!response.ok) { const error = new Error("AUTH_REQUIRED") as Error & { status?: number }; error.status = 401; throw error; }
}
function text(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function optionalText(value: unknown) { const result = text(value); return result || undefined; }
function stringArray(value: unknown) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : []; }
