import { evaluateFlagshipVisualQuality, evaluatePremiumQualityGate, evaluateWebsiteContent } from "@micirql/design-engine";
import type { Site } from "@micirql/schema";
import { evaluateFirstBuildQuality } from "./first-build-quality";

export type FinalGenerationDimension = {
  id: "flagship-visual" | "premium" | "content" | "typography" | "imagery" | "mobile-structure";
  ready: boolean;
  score: number;
  blockers: string[];
  warnings: string[];
};

export type FinalGenerationAcceptance = {
  ready: boolean;
  score: number;
  dimensions: FinalGenerationDimension[];
  blockers: string[];
  warnings: string[];
  flagshipVisual: ReturnType<typeof evaluateFlagshipVisualQuality>;
  premium: ReturnType<typeof evaluatePremiumQualityGate>;
  firstBuild: ReturnType<typeof evaluateFirstBuildQuality>;
  content: ReturnType<typeof evaluateWebsiteContent>;
};

const DEFAULT_FONT_FAMILIES = new Set([
  "arial",
  "times new roman",
  "times",
  "serif",
  "sans-serif",
]);

export function evaluateFinalGenerationAcceptance(site: Site): FinalGenerationAcceptance {
  const flagshipVisual = evaluateFlagshipVisualQuality(site);
  const premium = evaluatePremiumQualityGate(site);
  const firstBuild = evaluateFirstBuildQuality(site);
  const content = evaluateWebsiteContent(site);

  const flagshipBlockers = flagshipVisual.blockers.map((issue) => `${issue.code}: ${issue.message}`);
  if (flagshipVisual.score < 90) flagshipBlockers.push(`FLAGSHIP_VISUAL_SCORE: Flagship visual score ${flagshipVisual.score} is below 90.`);
  const flagshipWarnings = flagshipVisual.warnings.map((issue) => `${issue.code}: ${issue.message}`);

  const premiumBlockers = [
    ...premium.blockers.map((issue) => `${issue.code}: ${issue.message}`),
    ...firstBuild.issues.filter((issue) => issue.severity === "blocker").map((issue) => `${issue.code}: ${issue.message}`),
  ];
  if (premium.score < 85) premiumBlockers.push(`PREMIUM_SCORE: Premium score ${premium.score} is below 85.`);
  if (firstBuild.score < 88) premiumBlockers.push(`FIRST_BUILD_SCORE: First-build score ${firstBuild.score} is below 88.`);
  const premiumWarnings = [
    ...premium.warnings.map((issue) => `${issue.code}: ${issue.message}`),
    ...firstBuild.issues.filter((issue) => issue.severity === "warning").map((issue) => `${issue.code}: ${issue.message}`),
  ];

  const contentErrors = content.issues.filter((issue) => issue.severity === "error");
  const contentWarnings = content.issues.filter((issue) => issue.severity === "warning");
  const contentBlockers = contentErrors.map((issue) => `${issue.code}: ${issue.message}`);
  if (content.score < 82) contentBlockers.push(`CONTENT_SCORE: Content score ${content.score} is below 82.`);

  const typography = evaluateTypography(site);
  const imagery = evaluateImagery(site);
  const mobile = evaluateMobileStructure(site);

  const dimensions: FinalGenerationDimension[] = [
    {
      id: "flagship-visual",
      ready: flagshipVisual.flagshipReady && flagshipBlockers.length === 0,
      score: flagshipVisual.score,
      blockers: flagshipBlockers,
      warnings: flagshipWarnings,
    },
    {
      id: "premium",
      ready: premium.premiumReady && firstBuild.ready && premiumBlockers.length === 0,
      score: Math.round((premium.score + firstBuild.score) / 2),
      blockers: premiumBlockers,
      warnings: premiumWarnings,
    },
    {
      id: "content",
      ready: contentBlockers.length === 0,
      score: content.score,
      blockers: contentBlockers,
      warnings: contentWarnings.map((issue) => `${issue.code}: ${issue.message}`),
    },
    typography,
    imagery,
    mobile,
  ];

  const blockers = dimensions.flatMap((dimension) => dimension.blockers.map((message) => `${dimension.id}: ${message}`));
  const warnings = dimensions.flatMap((dimension) => dimension.warnings.map((message) => `${dimension.id}: ${message}`));
  const score = Math.round(dimensions.reduce((sum, dimension) => sum + dimension.score, 0) / dimensions.length);

  return {
    ready: dimensions.every((dimension) => dimension.ready) && blockers.length === 0,
    score,
    dimensions,
    blockers,
    warnings,
    flagshipVisual,
    premium,
    firstBuild,
    content,
  };
}

function evaluateTypography(site: Site): FinalGenerationDimension {
  const typography = site.theme.brand.typography;
  const values = [typography.display, typography.body, typography.ui].map((value) => value.trim());
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (values.some((value) => !value)) blockers.push("TYPOGRAPHY_MISSING: Display, body and UI font roles must all be defined.");
  const defaults = values.filter((value) => DEFAULT_FONT_FAMILIES.has(value.toLowerCase()));
  if (defaults.length >= 2) blockers.push("TYPOGRAPHY_DEFAULT_SYSTEM: Multiple font roles still use browser-default typography.");
  else if (defaults.length === 1) warnings.push("TYPOGRAPHY_DEFAULT_ROLE: One typography role still uses a generic browser-default family.");

  const heroHeadings = site.pages.flatMap((page) => page.sections)
    .filter((section) => !section.hidden && familyFromId(section.component.componentId) === "hero")
    .map((section) => firstString(section.props, ["heading", "title"]))
    .filter(Boolean);
  if (heroHeadings.some((heading) => wordCount(heading) > 12)) blockers.push("TYPOGRAPHY_HERO_WRAP_RISK: A hero heading exceeds the premium 12-word geometry budget.");

  const penalty = blockers.length * 22 + warnings.length * 6;
  return { id: "typography", ready: blockers.length === 0, score: Math.max(0, 100 - penalty), blockers, warnings };
}

function evaluateImagery(site: Site): FinalGenerationDimension {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const prominentAssetIds: string[] = [];
  let unresolved = 0;
  let imageRefs = 0;

  for (const page of site.pages) {
    for (const section of page.sections) {
      if (section.hidden) continue;
      const family = familyFromId(section.component.componentId);
      const refs = collectAssetRefs(section.props);
      imageRefs += refs.length;
      unresolved += refs.filter((assetId) => !assetId || assetId.startsWith("pending-") || assetId.startsWith("placeholder-")).length;
      if (["hero", "about", "team", "gallery", "services"].includes(family ?? "")) prominentAssetIds.push(...refs.filter(Boolean));
    }
  }

  if (unresolved > 0) blockers.push(`IMAGERY_UNRESOLVED: ${unresolved} image reference${unresolved === 1 ? " is" : "s are"} unresolved.`);
  const counts = new Map<string, number>();
  for (const id of prominentAssetIds) counts.set(id, (counts.get(id) ?? 0) + 1);
  const repeated = [...counts.entries()].filter(([, count]) => count > 1);
  if (repeated.length > 0) blockers.push(`IMAGERY_DUPLICATE_PROMINENT: ${repeated.length} prominent image${repeated.length === 1 ? " is" : "s are"} reused across major sections.`);
  if (imageRefs === 0) warnings.push("IMAGERY_NONE: No resolved image references were found; this can be intentional for editorial layouts but requires rendered visual review.");

  const penalty = blockers.length * 24 + warnings.length * 5;
  return { id: "imagery", ready: blockers.length === 0, score: Math.max(0, 100 - penalty), blockers, warnings };
}

function evaluateMobileStructure(site: Site): FinalGenerationDimension {
  const blockers: string[] = [];
  const warnings: string[] = [];

  for (const page of site.pages) {
    for (const section of page.sections) {
      if (section.hidden) continue;
      const family = familyFromId(section.component.componentId);
      const heading = firstString(section.props, ["heading", "title"]);
      const body = firstString(section.props, ["body", "description", "summary", "intro", "copy", "text"]);
      const items = Array.isArray(section.props.items) ? section.props.items : [];
      if (family === "hero" && heading && wordCount(heading) > 12) blockers.push(`MOBILE_HERO_HEADING_DENSE: ${page.id}/${section.id} exceeds the hero heading budget.`);
      if (body && wordCount(body) > 42) blockers.push(`MOBILE_BODY_DENSE: ${page.id}/${section.id} exceeds the section body budget.`);
      if (items.length > 8) warnings.push(`MOBILE_ITEM_STACK_LONG: ${page.id}/${section.id} contains ${items.length} items and needs rendered mobile review.`);
      for (const actionKey of ["primaryAction", "secondaryAction"] as const) {
        const action = section.props[actionKey];
        if (!action || typeof action !== "object" || Array.isArray(action)) continue;
        const label = firstString(action as Record<string, unknown>, ["label"]);
        if (label && wordCount(label) > 4) blockers.push(`MOBILE_CTA_WRAP_RISK: ${page.id}/${section.id} has a CTA label above four words.`);
      }
    }
  }

  const penalty = blockers.length * 20 + warnings.length * 4;
  return {
    id: "mobile-structure",
    ready: blockers.length === 0,
    score: Math.max(0, 100 - penalty),
    blockers,
    warnings: [
      ...warnings,
      "RENDERED_MOBILE_REQUIRED: Pixel-level overflow, overlap, crop and touch-target certification remains the responsibility of the rendered visual gate.",
    ],
  };
}

function collectAssetRefs(value: unknown): string[] {
  const refs: string[] = [];
  visit(value, refs);
  return refs;
}

function visit(value: unknown, refs: string[]) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) visit(item, refs);
    return;
  }
  const record = value as Record<string, unknown>;
  if ("assetId" in record) refs.push(typeof record.assetId === "string" ? record.assetId.trim() : "");
  for (const nested of Object.values(record)) visit(nested, refs);
}

function firstString(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function wordCount(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function familyFromId(componentId: string): string | undefined {
  const value = componentId.toLowerCase();
  const families = ["navbar", "hero", "about", "services", "features", "process", "testimonials", "gallery", "team", "pricing", "cta", "contact", "lead-capture", "form", "footer"];
  for (const family of families) if (value === `${family}.placeholder` || value.startsWith(`${family}.`)) return family;
  const codes: Record<string, string> = { nav: "navbar", hero: "hero", about: "about", serv: "services", feat: "features", proc: "process", test: "testimonials", gallery: "gallery", team: "team", pricing: "pricing", cta: "cta", cont: "contact", foot: "footer" };
  for (const [code, family] of Object.entries(codes)) if (value.includes(`-${code}-`)) return family;
  return undefined;
}
