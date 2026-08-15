import { NextRequest, NextResponse } from "next/server";
import { rankDesigns, type DesignPreferenceQuery, type DesignRegistryEntry } from "@micirql/registry";
import { siteSchema, type ThemeFamily } from "@micirql/schema";
import { FAMILY_CODES, SECTION_FAMILIES, seedSectionRegistryEntries, type SectionFamily } from "@micirql/sections";

const EDITABLE_FAMILIES = SECTION_FAMILIES.filter((family) => family !== "navbar" && family !== "footer");
const THEME_FAMILIES: ThemeFamily[] = ["minimalist", "corporate", "luxury", "editorial", "glass", "maximalist", "organic", "futuristic", "playful", "cinematic"];

type Replacement = {
  sectionId: string;
  family: SectionFamily;
  componentId: string;
  version: string;
  displayName: string;
  score: number;
  reasons: string[];
  previewOnly: boolean;
};

type Proposal = {
  id: string;
  label: string;
  theme: ThemeFamily;
  score: number;
  previewOnly: boolean;
  replacements: Replacement[];
};

export async function POST(request: NextRequest) {
  try {
    const auth = request.headers.get("authorization");
    if (!auth?.startsWith("Bearer ")) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
    await verifyUser(auth);

    const body = await request.json() as Record<string, unknown>;
    const site = siteSchema.parse(body.site);
    const pageId = text(body.pageId);
    const startSectionId = text(body.startSectionId);
    const endSectionId = text(body.endSectionId);
    const prompt = text(body.prompt);
    const page = site.pages.find((item) => item.id === pageId);
    if (!page) return NextResponse.json({ error: "Page could not be resolved." }, { status: 400 });

    const startIndex = page.sections.findIndex((item) => item.id === startSectionId);
    const endIndex = page.sections.findIndex((item) => item.id === endSectionId);
    if (startIndex < 0 || endIndex < 0) return NextResponse.json({ error: "Choose a valid section range." }, { status: 400 });
    const from = Math.min(startIndex, endIndex);
    const to = Math.max(startIndex, endIndex);
    const range = page.sections.slice(from, to + 1).map((section) => ({ section, family: familyFromComponent(section.component.componentId) })).filter((item): item is { section: typeof page.sections[number]; family: SectionFamily } => Boolean(item.family && EDITABLE_FAMILIES.includes(item.family)));
    if (range.length < 2) return NextResponse.json({ error: "Select at least two editable sections for coordinated composition." }, { status: 400 });

    const preferences = normalizePreferences(body.preferenceProfile);
    const themes = chooseThemes(prompt, site.theme.family, preferences);
    const proposals = themes.map((theme, index) => composeProposal({ site, page, range, theme, preferences, index })).filter((item): item is Proposal => Boolean(item));
    if (!proposals.length) return NextResponse.json({ error: "No compatible coordinated directions are available for this range yet." }, { status: 409 });

    return NextResponse.json({ proposals });
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Multi-section composition failed." }, { status });
  }
}

function composeProposal({ site, page, range, theme, preferences, index }: {
  site: ReturnType<typeof siteSchema.parse>;
  page: ReturnType<typeof siteSchema.parse>["pages"][number];
  range: Array<{ section: ReturnType<typeof siteSchema.parse>["pages"][number]["sections"][number]; family: SectionFamily }>;
  theme: ThemeFamily;
  preferences?: DesignPreferenceQuery;
  index: number;
}): Proposal | undefined {
  const replacements: Replacement[] = [];
  for (let offset = 0; offset < range.length; offset += 1) {
    const current = range[offset]!;
    const pageIndex = page.sections.findIndex((item) => item.id === current.section.id);
    const previousFamily = offset > 0 ? range[offset - 1]!.family : familyFromComponent(page.sections[pageIndex - 1]?.component.componentId ?? "");
    const nextFamily = offset < range.length - 1 ? range[offset + 1]!.family : familyFromComponent(page.sections[pageIndex + 1]?.component.componentId ?? "");
    const ranked = rankDesigns(seedSectionRegistryEntries, {
      family: current.family,
      theme,
      domain: site.domain,
      modifiers: site.theme.modifiers,
      conversionGoals: goalsForFamily(current.family),
      ...(previousFamily ? { previousFamily } : {}),
      ...(nextFamily ? { nextFamily } : {}),
      ...(preferences ? { preferences: { ...preferences, allowThemeExploration: true } } : {}),
      limit: 4,
    });

    const rankedChoice = ranked.find(({ entry }) => entry.id !== current.section.component.componentId) ?? ranked[0];
    if (rankedChoice) {
      replacements.push({
        sectionId: current.section.id,
        family: current.family,
        componentId: rankedChoice.entry.id,
        version: rankedChoice.entry.version,
        displayName: rankedChoice.entry.displayName,
        score: round(rankedChoice.score),
        reasons: rankedChoice.reasons,
        previewOnly: false,
      });
      continue;
    }

    const fallback = seedSectionRegistryEntries
      .filter((entry) => entry.family === current.family && entry.theme === theme && entry.id !== current.section.component.componentId)
      .sort((a, b) => previewScore(b, site.domain, preferences) - previewScore(a, site.domain, preferences))[0]
      ?? seedSectionRegistryEntries.filter((entry) => entry.family === current.family && entry.id !== current.section.component.componentId)[index % Math.max(1, seedSectionRegistryEntries.filter((entry) => entry.family === current.family && entry.id !== current.section.component.componentId).length)];
    if (!fallback) return undefined;
    replacements.push({
      sectionId: current.section.id,
      family: current.family,
      componentId: fallback.id,
      version: fallback.version,
      displayName: fallback.displayName,
      score: round(previewScore(fallback, site.domain, preferences)),
      reasons: [fallback.theme === theme ? `coordinates with ${theme} direction` : "compatible library direction", "existing content and actions preserved"],
      previewOnly: true,
    });
  }

  const total = replacements.reduce((sum, item) => sum + item.score, 0) / replacements.length;
  return {
    id: `range-${theme}-${index + 1}`,
    label: proposalLabel(theme, index),
    theme,
    score: round(total),
    previewOnly: replacements.some((item) => item.previewOnly),
    replacements,
  };
}

function chooseThemes(prompt: string, current: ThemeFamily, preferences?: DesignPreferenceQuery): ThemeFamily[] {
  const lower = prompt.toLowerCase();
  const requested = THEME_FAMILIES.find((theme) => lower.includes(theme))
    ?? (lower.includes("premium") || lower.includes("lux") ? "luxury" : undefined)
    ?? (lower.includes("bold") ? "maximalist" : undefined)
    ?? (lower.includes("clean") || lower.includes("simple") ? "minimalist" : undefined)
    ?? (lower.includes("dramatic") || lower.includes("cinematic") ? "cinematic" : undefined)
    ?? (lower.includes("modern") || lower.includes("tech") ? "futuristic" : undefined);
  const preferred = preferences?.preferredThemes?.filter((theme): theme is ThemeFamily => THEME_FAMILIES.includes(theme as ThemeFamily)) ?? [];
  const seeds = [requested, preferred[0], current, "editorial" as ThemeFamily, "luxury" as ThemeFamily, "minimalist" as ThemeFamily].filter((item): item is ThemeFamily => Boolean(item));
  return [...new Set(seeds)].slice(0, 3);
}

function proposalLabel(theme: ThemeFamily, index: number) {
  if (index === 0) return `Recommended · ${label(theme)}`;
  if (theme === "minimalist") return "Cleaner direction";
  if (theme === "luxury" || theme === "cinematic") return "More expressive direction";
  return `${label(theme)} direction`;
}

function previewScore(entry: DesignRegistryEntry, domain: keyof DesignRegistryEntry["domainCompatibility"], preferences?: DesignPreferenceQuery) {
  let score = entry.domainCompatibility[domain] ?? 0;
  score += (entry.intelligence?.mobileSuitability ?? entry.quality.mobile) * 0.12;
  if (preferences?.preferredThemes?.includes(entry.theme)) score += 14 * preferences.strength;
  if (preferences?.preferredModifiers?.some((modifier) => entry.modifiers.includes(modifier))) score += 8 * preferences.strength;
  return score;
}

function normalizePreferences(value: unknown): DesignPreferenceQuery | undefined {
  if (!value || typeof value !== "object") return undefined;
  const source = value as Record<string, unknown>;
  const preferredThemes = Array.isArray(source.preferredThemes) ? source.preferredThemes.filter((item): item is DesignRegistryEntry["theme"] => typeof item === "string") : undefined;
  const preferredModifiers = Array.isArray(source.preferredModifiers) ? source.preferredModifiers.filter((item): item is DesignRegistryEntry["modifiers"][number] => typeof item === "string") : undefined;
  const strength = typeof source.confidence === "number" ? Math.max(0, Math.min(source.confidence, 1)) : typeof source.strength === "number" ? Math.max(0, Math.min(source.strength, 1)) : 0;
  return { ...(preferredThemes?.length ? { preferredThemes } : {}), ...(preferredModifiers?.length ? { preferredModifiers } : {}), strength, allowThemeExploration: strength >= 0.35 };
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
function round(value: number) { return Math.round(value * 10) / 10; }
function label(value: string) { return value.charAt(0).toUpperCase() + value.slice(1); }
