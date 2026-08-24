import type { Site } from "@micirql/schema";

export type FlagshipVisualIssue = {
  code: string;
  severity: "blocker" | "warning";
  message: string;
  penalty: number;
  pageId?: string;
  sectionId?: string;
};

export type FlagshipVisualQualityResult = {
  flagshipReady: boolean;
  score: number;
  blockers: FlagshipVisualIssue[];
  warnings: FlagshipVisualIssue[];
  metrics: {
    contentSections: number;
    firstFourFamilies: string[];
    heroHasMedia: boolean;
    heroHasPrimaryAction: boolean;
    heroHeadlineLength: number;
    distinctFamilies: number;
    repeatedFamilyRuns: number;
    sectionsWithMedia: number;
  };
};

const SHELL = new Set(["navbar", "footer"]);
const MEDIA_KEYS = new Set(["image", "imageUrl", "image_url", "media", "photo", "portrait", "backgroundImage", "background_image", "src", "url"]);

export function evaluateFlagshipVisualQuality(site: Site): FlagshipVisualQualityResult {
  const issues: FlagshipVisualIssue[] = [];
  const home = site.pages.find((page) => page.path === "/") ?? site.pages[0];
  if (!home) return finish([blocker("FLAGSHIP_NO_HOME", "A flagship site requires a home page.", 100)], emptyMetrics());

  const visible = home.sections.filter((section) => !section.hidden);
  const content = visible.filter((section) => !SHELL.has(family(section.component.componentId) ?? ""));
  const families = content.map((section) => family(section.component.componentId) ?? "unknown");
  const hero = content.find((section) => family(section.component.componentId) === "hero");
  const firstFourFamilies = families.slice(0, 4);

  if (!hero || content[0] !== hero) issues.push(blocker("FLAGSHIP_HERO_NOT_FIRST", "The first content section must be a deliberate hero composition.", 20, home.id, hero?.id));

  const heroHasMedia = hero ? hasMedia(hero.props) : false;
  const heroHasPrimaryAction = hero ? hasPrimaryAction(hero.props) : false;
  const heroHeadlineLength = hero ? heroHeadline(hero.props).length : 0;

  if (!heroHasMedia) issues.push(blocker("FLAGSHIP_HERO_NO_MEDIA", "Flagship output requires intentional hero media; text-only openings are not accepted.", 18, home.id, hero?.id));
  if (!heroHasPrimaryAction) issues.push(blocker("FLAGSHIP_HERO_NO_PRIMARY_ACTION", "The hero must contain a clear primary conversion action.", 14, home.id, hero?.id));
  if (heroHeadlineLength > 92) issues.push(warning("FLAGSHIP_HERO_HEADLINE_TOO_LONG", "Hero headline is too long for a premium first-screen composition.", 7, home.id, hero?.id));
  if (heroHeadlineLength > 0 && heroHeadlineLength < 18) issues.push(warning("FLAGSHIP_HERO_HEADLINE_TOO_THIN", "Hero headline is too short to establish a distinctive premium proposition.", 4, home.id, hero?.id));

  if (content.length < 7) issues.push(blocker("FLAGSHIP_NARRATIVE_TOO_SHORT", "Flagship home pages need at least seven meaningful content sections.", 16, home.id));
  if (content.length > 10) issues.push(warning("FLAGSHIP_NARRATIVE_TOO_LONG", "Flagship home page is becoming template-heavy; reduce competing sections.", 6, home.id));

  const distinctFamilies = new Set(families.filter((item) => item !== "unknown")).size;
  if (distinctFamilies < 6) issues.push(blocker("FLAGSHIP_LOW_COMPOSITION_DIVERSITY", "The page does not contain enough distinct visual/narrative section families.", 15, home.id));

  const repeatedFamilyRuns = families.reduce((count, item, index) => count + (index > 0 && item === families[index - 1] && item !== "unknown" ? 1 : 0), 0);
  if (repeatedFamilyRuns > 0) issues.push(warning("FLAGSHIP_REPEATED_FAMILY_RUN", "Adjacent sections repeat the same family and weaken page rhythm.", Math.min(10, repeatedFamilyRuns * 4), home.id));

  const sectionsWithMedia = content.filter((section) => hasMedia(section.props)).length;
  if (content.length >= 7 && sectionsWithMedia < 3) issues.push(blocker("FLAGSHIP_MEDIA_TOO_SPARSE", "Premium composition requires meaningful media beyond the hero.", 14, home.id));

  const firstFourDistinct = new Set(firstFourFamilies.filter((item) => item !== "unknown")).size;
  if (firstFourFamilies.length >= 4 && firstFourDistinct < 4) issues.push(warning("FLAGSHIP_WEAK_OPENING_RHYTHM", "The first four sections should each play a different visual/narrative role.", 7, home.id));

  const hasAuthorityEarly = firstFourFamilies.some((item) => item === "team" || item === "testimonials" || item === "stats");
  const hasDiscoveryEarly = firstFourFamilies.some((item) => item === "services" || item === "features" || item === "gallery");
  if (!hasAuthorityEarly) issues.push(warning("FLAGSHIP_AUTHORITY_TOO_LATE", "Move doctor, proof or authority content into the first four content sections.", 6, home.id));
  if (!hasDiscoveryEarly) issues.push(warning("FLAGSHIP_DISCOVERY_TOO_LATE", "Move treatment/service/outcome discovery into the first four content sections.", 6, home.id));

  return finish(issues, {
    contentSections: content.length,
    firstFourFamilies,
    heroHasMedia,
    heroHasPrimaryAction,
    heroHeadlineLength,
    distinctFamilies,
    repeatedFamilyRuns,
    sectionsWithMedia,
  });
}

function finish(issues: FlagshipVisualIssue[], metrics: FlagshipVisualQualityResult["metrics"]): FlagshipVisualQualityResult {
  const blockers = issues.filter((issue) => issue.severity === "blocker");
  const warnings = issues.filter((issue) => issue.severity === "warning");
  const score = Math.max(0, 100 - issues.reduce((sum, issue) => sum + issue.penalty, 0));
  return { flagshipReady: blockers.length === 0 && score >= 90, score, blockers, warnings, metrics };
}

function emptyMetrics(): FlagshipVisualQualityResult["metrics"] {
  return { contentSections: 0, firstFourFamilies: [], heroHasMedia: false, heroHasPrimaryAction: false, heroHeadlineLength: 0, distinctFamilies: 0, repeatedFamilyRuns: 0, sectionsWithMedia: 0 };
}

function blocker(code: string, message: string, penalty: number, pageId?: string, sectionId?: string): FlagshipVisualIssue {
  return { code, severity: "blocker", message, penalty, ...(pageId ? { pageId } : {}), ...(sectionId ? { sectionId } : {}) };
}
function warning(code: string, message: string, penalty: number, pageId?: string, sectionId?: string): FlagshipVisualIssue {
  return { code, severity: "warning", message, penalty, ...(pageId ? { pageId } : {}), ...(sectionId ? { sectionId } : {}) };
}

function family(componentId: string): string | undefined {
  const value = componentId.toLowerCase();
  const families = ["navbar", "hero", "about", "services", "features", "process", "testimonials", "gallery", "portfolio", "team", "pricing", "cta", "contact", "lead-capture", "form", "faq", "stats", "footer"];
  for (const item of families) if (value === `${item}.placeholder` || value.startsWith(`${item}.`)) return item;
  const codes: Record<string, string> = { nav: "navbar", hero: "hero", about: "about", services: "services", features: "features", process: "process", testimonials: "testimonials", gallery: "gallery", team: "team", pricing: "pricing", cta: "cta", contact: "contact", stats: "stats", footer: "footer" };
  for (const [code, item] of Object.entries(codes)) if (value.includes(`-${code}-`)) return item;
  return undefined;
}

function hasPrimaryAction(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  const action = record.primaryAction;
  if (action && typeof action === "object") {
    const a = action as Record<string, unknown>;
    if (typeof a.label === "string" && a.label.trim() && (typeof a.href === "string" || typeof a.actionId === "string")) return true;
  }
  return Object.entries(record).some(([key, item]) => /primary.*(cta|action)|cta.*primary/i.test(key) && typeof item === "string" && item.trim().length > 0);
}

function heroHeadline(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const record = value as Record<string, unknown>;
  for (const key of ["headline", "heading", "title", "eyebrowTitle"]) {
    const item = record[key];
    if (typeof item === "string" && item.trim()) return item.trim();
  }
  return "";
}

function hasMedia(value: unknown, depth = 0): boolean {
  if (depth > 4 || value == null) return false;
  if (typeof value === "string") return /https?:\/\/|\/images?\/|\.(png|jpe?g|webp|avif)(\?|$)/i.test(value);
  if (Array.isArray(value)) return value.some((item) => hasMedia(item, depth + 1));
  if (typeof value !== "object") return false;
  return Object.entries(value as Record<string, unknown>).some(([key, item]) => {
    if (MEDIA_KEYS.has(key) && typeof item === "string" && item.trim()) return true;
    return hasMedia(item, depth + 1);
  });
}
