import type { Site } from "@micirql/schema";
import type { WebsiteLayoutBlueprint } from "@micirql/design-engine";

export type ResponsiveCandidateIssue = {
  code: string;
  message: string;
  severity: "warning" | "error";
  viewport: "mobile" | "tablet" | "desktop" | "all";
};

export type ResponsiveCandidateQuality = {
  ready: boolean;
  score: number;
  mobile: number;
  tablet: number;
  desktop: number;
  issues: ResponsiveCandidateIssue[];
};

const REQUIRED_VIEWPORTS = [360, 390, 430, 768, 1024, 1440] as const;

/**
 * Runtime responsive pre-flight for a composed candidate. This complements (rather
 * than replaces) the Playwright rendered evidence gate. It protects mutations and
 * repaired runtime candidates from losing the responsive contracts carried by the
 * certified Dental blueprint before they enter Design Review.
 */
export function evaluateDentalResponsiveCandidate(
  site: Site,
  blueprint: WebsiteLayoutBlueprint,
): ResponsiveCandidateQuality {
  const issues: ResponsiveCandidateIssue[] = [];
  const home = site.pages.find((page) => page.path === "/") ?? site.pages[0];
  if (!home) {
    return {
      ready: false,
      score: 0,
      mobile: 0,
      tablet: 0,
      desktop: 0,
      issues: [{ code: "RESPONSIVE_HOME_MISSING", message: "Homepage is missing.", severity: "error", viewport: "all" }],
    };
  }

  const required = blueprint.quality.requiredViewports ?? [];
  if (!sameNumbers(required, REQUIRED_VIEWPORTS)) {
    issues.push({ code: "RESPONSIVE_VIEWPORT_MATRIX_DRIFT", message: "Certified responsive viewport matrix is incomplete.", severity: "error", viewport: "all" });
  }

  const hardRules = (blueprint.quality.hardRules ?? []).map(normalize);
  for (const rule of [
    "no document-level horizontal overflow",
    "no clipped or overlapping text",
    "no accidental overlays",
    "primary cta remains visible and usable on mobile",
    "all images remain inside their composition bounds",
    "mobile composition must be intentionally reordered rather than desktop merely shrinking",
  ]) {
    if (!hardRules.includes(rule)) {
      issues.push({ code: "RESPONSIVE_HARD_RULE_MISSING", message: `Responsive hard rule missing: ${rule}.`, severity: "error", viewport: "all" });
    }
  }

  const mobileRules = blueprint.responsive.mobile.rules.map(normalize);
  const tabletRules = blueprint.responsive.tablet.rules.map(normalize);
  const desktopRules = blueprint.responsive.desktop.rules.map(normalize);

  if (mobileRules.length < 4) issues.push({ code: "RESPONSIVE_MOBILE_ART_DIRECTION_WEAK", message: "Mobile art direction has fewer than four explicit rules.", severity: "error", viewport: "mobile" });
  if (tabletRules.length < 2) issues.push({ code: "RESPONSIVE_TABLET_ART_DIRECTION_WEAK", message: "Tablet art direction is underspecified.", severity: "warning", viewport: "tablet" });
  if (desktopRules.length < 3) issues.push({ code: "RESPONSIVE_DESKTOP_ART_DIRECTION_WEAK", message: "Desktop composition has fewer than three explicit rules.", severity: "error", viewport: "desktop" });

  if (!mobileRules.some((rule) => /(stack|column|grid|order|width|overflow|overlay|media|image|cta|button|action|spacing|gap)/.test(rule))) {
    issues.push({ code: "RESPONSIVE_MOBILE_GEOMETRY_UNPROTECTED", message: "Mobile rules do not explicitly protect stacking, geometry or CTA behavior.", severity: "error", viewport: "mobile" });
  }
  if (!desktopRules.some((rule) => /(grid|column|split|asym|media|image|hero|layout|composition|width|span|offset|portrait|spread|mosaic|full[- ]bleed|cinematic|photograph|typographic hierarchy|whitespace|content measure)/.test(rule))) {
    issues.push({ code: "RESPONSIVE_DESKTOP_COMPOSITION_UNDEFINED", message: "Desktop rules do not establish a deliberate composition system.", severity: "error", viewport: "desktop" });
  }

  const visible = home.sections.filter((section) => !section.hidden);
  const families = visible.map((section) => family(section.component.componentId));
  if (!families.includes("navbar")) issues.push({ code: "RESPONSIVE_NAVBAR_MISSING", message: "Primary navigation is missing from the homepage.", severity: "error", viewport: "all" });
  if (!families.includes("hero")) issues.push({ code: "RESPONSIVE_HERO_MISSING", message: "Hero is missing from the homepage.", severity: "error", viewport: "all" });
  if (!families.includes("cta") && !families.includes("contact")) issues.push({ code: "RESPONSIVE_CONVERSION_ANCHOR_MISSING", message: "No primary conversion anchor remains in the homepage composition.", severity: "error", viewport: "all" });

  for (const section of visible) {
    const props = (section.props ?? {}) as Record<string, unknown>;
    const sectionMobileRules = stringArray(props.layoutMobileRules).map(normalize);
    if (text(props.layoutBlueprintId) === blueprint.id && sectionMobileRules.length === 0) {
      issues.push({ code: "RESPONSIVE_SECTION_RULES_LOST", message: `Section ${section.id} lost its certified mobile rules after composition/mutation.`, severity: "warning", viewport: "mobile" });
      break;
    }
    if (props.layoutVisualLocked !== true && text(props.layoutBlueprintId) === blueprint.id) {
      issues.push({ code: "RESPONSIVE_VISUAL_LOCK_LOST", message: `Section ${section.id} lost its certified visual lock.`, severity: "error", viewport: "all" });
      break;
    }
  }

  const mobile = viewportScore(issues, "mobile");
  const tablet = viewportScore(issues, "tablet");
  const desktop = viewportScore(issues, "desktop");
  const score = Math.round((mobile * 0.4) + (tablet * 0.2) + (desktop * 0.4));
  const ready = !issues.some((issue) => issue.severity === "error") && mobile >= 85 && tablet >= 80 && desktop >= 85;

  return { ready, score, mobile, tablet, desktop, issues };
}

function viewportScore(issues: ResponsiveCandidateIssue[], viewport: "mobile" | "tablet" | "desktop") {
  let score = 100;
  for (const issue of issues) {
    if (issue.viewport !== "all" && issue.viewport !== viewport) continue;
    score -= issue.severity === "error" ? 18 : 7;
  }
  return Math.max(0, score);
}

function sameNumbers(left: readonly number[], right: readonly number[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function family(componentId: string): string {
  const value = componentId.toLowerCase();
  const aliases: Array<[string, string[]]> = [
    ["navbar", ["navbar", "-nav-"]], ["hero", ["hero", "-hero-"]], ["cta", ["cta", "-cta-"]], ["contact", ["contact", "-cont-"]],
  ];
  for (const [name, values] of aliases) if (values.some((needle) => value.includes(needle))) return name;
  return value.split(/[.:/-]/).filter(Boolean)[0] ?? "";
}

function stringArray(value: unknown): string[] { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []; }
function text(value: unknown): string { return typeof value === "string" ? value.trim() : ""; }
function normalize(value: string): string { return value.trim().toLowerCase().replace(/\s+/g, " "); }
