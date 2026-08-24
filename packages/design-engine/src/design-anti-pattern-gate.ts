import type { Site } from "@micirql/schema";

export type DesignAntiPatternSeverity = "warning" | "error";

export type DesignAntiPatternIssue = {
  code: string;
  message: string;
  severity: DesignAntiPatternSeverity;
  penalty: number;
  pageId?: string;
  sectionId?: string;
};

export type DesignAntiPatternResult = {
  ready: boolean;
  score: number;
  penalty: number;
  issues: DesignAntiPatternIssue[];
  metrics: {
    repeatedImageUses: number;
    repeatedActionUses: number;
    cardHeavySections: number;
    repeatedSectionFamilies: number;
    genericHeroCount: number;
  };
};

const MAX_PENALTY = 35;
const CARD_HEAVY_FAMILIES = new Set(["services", "features", "testimonials", "team", "gallery", "proof"]);

/**
 * Deterministic anti-AI-design lint inspired by modern frontend critique workflows.
 * It deliberately inspects structural symptoms rather than aesthetic preference:
 * repeated media, repeated CTAs, card-grid saturation, repetitive section families
 * and low-intent generic heroes. Hard errors reject a candidate; warnings reduce rank.
 */
export function evaluateDesignAntiPatterns(site: Site): DesignAntiPatternResult {
  const issues: DesignAntiPatternIssue[] = [];
  let repeatedImageUses = 0;
  let repeatedActionUses = 0;
  let cardHeavySections = 0;
  let repeatedSectionFamilies = 0;
  let genericHeroCount = 0;

  for (const page of site.pages) {
    const visible = page.sections.filter((section) => !section.hidden);
    const imageOwners = new Map<string, Array<{ sectionId: string }>>();
    const actionCounts = new Map<string, number>();
    let pageCardHeavy = 0;
    let previousFamily = "";

    for (const section of visible) {
      const props = (section.props ?? {}) as Record<string, unknown>;
      const family = familyFromComponentId(section.component.componentId);

      for (const image of collectImageUrls(props)) {
        const normalized = normalizeUrl(image);
        if (!normalized) continue;
        const owners = imageOwners.get(normalized) ?? [];
        owners.push({ sectionId: section.id });
        imageOwners.set(normalized, owners);
      }

      for (const action of collectActions(props)) {
        const key = `${normalize(action.label)}|${normalize(action.href)}`;
        if (!key || key === "|") continue;
        actionCounts.set(key, (actionCounts.get(key) ?? 0) + 1);
      }

      const itemCount = Array.isArray(props.items) ? props.items.length : 0;
      if (CARD_HEAVY_FAMILIES.has(family) && itemCount >= 3) {
        pageCardHeavy++;
        cardHeavySections++;
      }

      if (family && previousFamily === family && !["navbar", "footer"].includes(family)) {
        repeatedSectionFamilies++;
        issues.push(makeIssue(
          "DESIGN_REPEATED_SECTION_FAMILY",
          `Adjacent ${family} sections create repetitive page rhythm.`,
          "warning",
          3,
          page.id,
          section.id,
        ));
      }
      if (family) previousFamily = family;

      if (family === "hero" && looksGenericHero(props)) {
        genericHeroCount++;
        issues.push(makeIssue(
          "DESIGN_GENERIC_HERO",
          "Hero composition relies on generic headline/description/actions without a strong visual or authority signal.",
          "warning",
          5,
          page.id,
          section.id,
        ));
      }
    }

    for (const [url, owners] of imageOwners) {
      if (owners.length <= 1) continue;
      const duplicateCount = owners.length - 1;
      repeatedImageUses += duplicateCount;
      issues.push(makeIssue(
        "DESIGN_REPEATED_IMAGE",
        `The same image is reused ${owners.length} times on one page (${shortUrl(url)}).`,
        owners.length >= 3 ? "error" : "warning",
        owners.length >= 3 ? 10 : 5,
        page.id,
        owners[1]?.sectionId,
      ));
    }

    for (const [key, count] of actionCounts) {
      if (count <= 2) continue;
      repeatedActionUses += count - 2;
      const label = key.split("|")[0] || "CTA";
      issues.push(makeIssue(
        "DESIGN_REPEATED_CTA",
        `The action \"${label}\" is repeated ${count} times on one page, making conversion feel mechanical.`,
        count >= 5 ? "error" : "warning",
        count >= 5 ? 9 : 4,
        page.id,
      ));
    }

    if (pageCardHeavy >= 4) {
      issues.push(makeIssue(
        "DESIGN_CARD_GRID_SATURATION",
        `Page contains ${pageCardHeavy} dense card-style sections; vary composition with editorial, media, proof or split layouts.`,
        pageCardHeavy >= 6 ? "error" : "warning",
        pageCardHeavy >= 6 ? 9 : 5,
        page.id,
      ));
    }
  }

  const deduped = dedupe(issues);
  const rawPenalty = deduped.reduce((sum, issue) => sum + issue.penalty, 0);
  const penalty = Math.min(MAX_PENALTY, rawPenalty);
  const hasError = deduped.some((issue) => issue.severity === "error");

  return {
    ready: !hasError,
    score: Math.max(0, 100 - penalty),
    penalty,
    issues: deduped,
    metrics: { repeatedImageUses, repeatedActionUses, cardHeavySections, repeatedSectionFamilies, genericHeroCount },
  };
}

function looksGenericHero(props: Record<string, unknown>): boolean {
  const hasImage = Boolean(text((props.image as Record<string, unknown> | undefined)?.src)) || collectImageUrls(props).length > 0;
  const eyebrow = text(props.eyebrow);
  const items = Array.isArray(props.items) ? props.items.length : 0;
  const proof = collectStrings(props).some((value) => /award|rating|review|years|specialist|doctor|technology|implant|results|trusted/i.test(value));
  return !hasImage && !eyebrow && items === 0 && !proof;
}

function collectImageUrls(value: unknown, depth = 0, key = ""): string[] {
  if (depth > 5 || value == null) return [];
  if (typeof value === "string") {
    if ((/src|image|photo|avatar|logo/i.test(key) || /^https?:\/\//i.test(value)) && looksLikeImageUrl(value)) return [value.trim()];
    return [];
  }
  if (Array.isArray(value)) return value.flatMap((item) => collectImageUrls(item, depth + 1, key));
  if (typeof value !== "object") return [];
  return Object.entries(value as Record<string, unknown>).flatMap(([childKey, child]) => collectImageUrls(child, depth + 1, childKey));
}

function collectActions(value: unknown, depth = 0): Array<{ label: string; href: string }> {
  if (depth > 5 || value == null) return [];
  if (Array.isArray(value)) return value.flatMap((item) => collectActions(item, depth + 1));
  if (typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  const label = text(record.label) || text(record.title);
  const href = text(record.href);
  const own = label && href ? [{ label, href }] : [];
  return [...own, ...Object.values(record).flatMap((child) => collectActions(child, depth + 1))];
}

function collectStrings(value: unknown, depth = 0): string[] {
  if (depth > 4 || value == null) return [];
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap((item) => collectStrings(item, depth + 1));
  if (typeof value !== "object") return [];
  return Object.values(value as Record<string, unknown>).flatMap((child) => collectStrings(child, depth + 1));
}

function familyFromComponentId(componentId: string): string {
  const value = componentId.toLowerCase();
  const families = ["navbar", "hero", "services", "features", "testimonials", "proof", "team", "gallery", "process", "faq", "cta", "contact", "footer"];
  for (const family of families) {
    const aliases = family === "services" ? ["services", "serv"] : family === "testimonials" ? ["testimonials", "test"] : [family];
    if (aliases.some((alias) => value.includes(alias))) return family;
  }
  return value.split(/[.:/-]/).filter(Boolean)[0] ?? "";
}

function makeIssue(code: string, message: string, severity: DesignAntiPatternSeverity, penalty: number, pageId?: string, sectionId?: string): DesignAntiPatternIssue {
  return { code, message, severity, penalty, ...(pageId ? { pageId } : {}), ...(sectionId ? { sectionId } : {}) };
}

function dedupe(issues: DesignAntiPatternIssue[]): DesignAntiPatternIssue[] {
  const seen = new Set<string>();
  return issues.filter((item) => {
    const key = `${item.code}:${item.pageId ?? ""}:${item.sectionId ?? ""}:${item.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function looksLikeImageUrl(value: string): boolean {
  return /\.(?:avif|gif|jpe?g|png|webp)(?:\?|$)/i.test(value) || /(?:images|image|photos|assets|storage|pexels|unsplash)/i.test(value);
}

function normalizeUrl(value: string): string {
  return value.trim().replace(/[?#].*$/, "").toLowerCase();
}

function shortUrl(value: string): string {
  const parts = value.split("/").filter(Boolean);
  return parts.slice(-2).join("/").slice(0, 72);
}

function text(value: unknown): string { return typeof value === "string" ? value.trim() : ""; }
function normalize(value: string): string { return value.trim().toLowerCase().replace(/\s+/g, " "); }
