import type { Site } from "@micirql/schema";

export type AboveFoldIssueCode =
  | "HOME_HERO_MISSING"
  | "HOME_HERO_TOO_LOW"
  | "HERO_TITLE_TOO_LONG"
  | "HERO_TITLE_TOO_SHORT"
  | "HERO_DESCRIPTION_TOO_DENSE"
  | "HERO_PRIMARY_CTA_MISSING"
  | "HERO_PRIMARY_CTA_TOO_LONG"
  | "HERO_IMAGE_MISSING"
  | "HERO_IMAGE_GEOMETRY_UNCLEAR"
  | "NAVIGATION_AFTER_HERO";

export type AboveFoldIssue = {
  code: AboveFoldIssueCode;
  severity: "error" | "warning";
  penalty: number;
  message: string;
};

export type AboveFoldCompositionResult = {
  score: number;
  ready: boolean;
  threshold: number;
  issues: AboveFoldIssue[];
  metrics: {
    heroIndex: number;
    titleWords: number;
    descriptionWords: number;
    primaryCtaWords: number;
    hasHeroImage: boolean;
    imageRatio: string | null;
  };
};

const READY_THRESHOLD = 84;

export function evaluateAboveFoldComposition(site: Site): AboveFoldCompositionResult {
  const issues: AboveFoldIssue[] = [];
  const home = site.pages.find((page) => page.path === "/") ?? site.pages[0];
  if (!home) return emptyFailure("Homepage is missing.");

  const visible = home.sections.filter((section) => !section.hidden);
  const heroIndex = visible.findIndex((section) => family(section.component.componentId) === "hero");
  const hero = heroIndex >= 0 ? visible[heroIndex] : undefined;

  if (!hero) {
    issues.push({ code: "HOME_HERO_MISSING", severity: "error", penalty: 40, message: "Homepage needs a visible hero section." });
    return result(issues, { heroIndex: -1, titleWords: 0, descriptionWords: 0, primaryCtaWords: 0, hasHeroImage: false, imageRatio: null });
  }

  if (heroIndex > 1) issues.push({ code: "HOME_HERO_TOO_LOW", severity: "error", penalty: 22, message: "Homepage hero appears too far below the top of the page." });

  const navIndex = visible.findIndex((section) => family(section.component.componentId) === "nav");
  if (navIndex >= 0 && navIndex > heroIndex) issues.push({ code: "NAVIGATION_AFTER_HERO", severity: "error", penalty: 18, message: "Primary navigation must appear before the homepage hero." });

  const props = (hero.props ?? {}) as Record<string, unknown>;
  const title = stringValue(props.title);
  const description = stringValue(props.description);
  const primaryCta = actionLabel(props.primaryAction);
  const titleWords = words(title);
  const descriptionWords = words(description);
  const primaryCtaWords = words(primaryCta);

  if (titleWords > 12) issues.push({ code: "HERO_TITLE_TOO_LONG", severity: "error", penalty: 16, message: "Hero headline is too long for strong first-screen hierarchy." });
  else if (titleWords > 0 && titleWords < 3) issues.push({ code: "HERO_TITLE_TOO_SHORT", severity: "warning", penalty: 6, message: "Hero headline is too short to communicate a specific value proposition." });

  if (descriptionWords > 42) issues.push({ code: "HERO_DESCRIPTION_TOO_DENSE", severity: "warning", penalty: 10, message: "Hero supporting copy is too dense for above-the-fold scanning." });

  if (!primaryCta) issues.push({ code: "HERO_PRIMARY_CTA_MISSING", severity: "error", penalty: 20, message: "Homepage hero needs a clear primary action." });
  else if (primaryCtaWords > 4) issues.push({ code: "HERO_PRIMARY_CTA_TOO_LONG", severity: "warning", penalty: 7, message: "Hero primary CTA is too wordy for fast scanning." });

  const image = heroImage(props);
  const imageRatio = stringValue(props.imageRatio) ?? objectString(image, "ratio") ?? null;
  const hasHeroImage = Boolean(image);
  if (!hasHeroImage) issues.push({ code: "HERO_IMAGE_MISSING", severity: "warning", penalty: 10, message: "Visual-first hero has no resolved image/media asset." });
  if (hasHeroImage && !imageRatio) issues.push({ code: "HERO_IMAGE_GEOMETRY_UNCLEAR", severity: "warning", penalty: 5, message: "Hero image does not expose an explicit crop/aspect contract." });

  return result(issues, { heroIndex, titleWords, descriptionWords, primaryCtaWords, hasHeroImage, imageRatio });
}

function result(issues: AboveFoldIssue[], metrics: AboveFoldCompositionResult["metrics"]): AboveFoldCompositionResult {
  const score = Math.max(0, Math.min(100, 100 - issues.reduce((sum, issue) => sum + issue.penalty, 0)));
  return { score, ready: !issues.some((issue) => issue.severity === "error") && score >= READY_THRESHOLD, threshold: READY_THRESHOLD, issues, metrics };
}

function emptyFailure(message: string): AboveFoldCompositionResult {
  return result([{ code: "HOME_HERO_MISSING", severity: "error", penalty: 40, message }], { heroIndex: -1, titleWords: 0, descriptionWords: 0, primaryCtaWords: 0, hasHeroImage: false, imageRatio: null });
}

function family(componentId: string): "nav" | "hero" | "other" {
  const normalized = componentId.toUpperCase();
  if (normalized.includes("-NAV-") || normalized.startsWith("NAV.")) return "nav";
  if (normalized.includes("-HERO-") || normalized.startsWith("HERO.")) return "hero";
  return "other";
}

function heroImage(props: Record<string, unknown>): unknown {
  const candidates = [props.image, props.backgroundImage, props.media, props.heroImage];
  return candidates.find((value) => {
    if (typeof value === "string") return Boolean(value.trim());
    if (value && typeof value === "object") return Boolean(objectString(value, "src") || objectString(value, "url"));
    return false;
  });
}

function actionLabel(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  return stringValue((value as Record<string, unknown>).label);
}

function objectString(value: unknown, key: string): string {
  if (!value || typeof value !== "object") return "";
  return stringValue((value as Record<string, unknown>)[key]);
}

function stringValue(value: unknown): string { return typeof value === "string" ? value.trim() : ""; }
function words(value: string): number { return value ? value.split(/\s+/).filter(Boolean).length : 0; }
