import type { Site } from "@micirql/schema";
import type { OnboardingProfile } from "./preset-ranking";

export type DentalContentIssue = {
  code: string;
  severity: "error" | "warning";
  message: string;
  pageId?: string;
  sectionId?: string;
  path?: string;
};

export type DentalContentQualityResult = {
  score: number;
  issues: DentalContentIssue[];
};

const TREATMENT_TERMS: Array<{ id: string; pattern: RegExp }> = [
  { id: "implant", pattern: /\bimplant(?:s| dentistry)?\b|full[- ]arch|all[- ]on[- ](?:4|6)/i },
  { id: "cosmetic", pattern: /cosmetic dentistry|smile design|smile makeover|veneer(?:s)?/i },
  { id: "rehabilitation", pattern: /full[- ]mouth rehabilitation|mouth rehabilitation|bite rehabilitation/i },
  { id: "crowns", pattern: /\bcrown(?:s)?\b|ceramic restoration/i },
  { id: "orthodontics", pattern: /orthodont|aligner|braces/i },
  { id: "endodontics", pattern: /root canal|endodont/i },
];

const CLINICAL_PROCESS_TERMS = /consultation|assessment|scan|imaging|planning|treatment plan|review|follow[- ]up/i;
const PROOF_TERMS = /before.?after|case|result|testimonial|patient stor|doctor|dentist|clinician/i;
const ACTION_TERMS = /book|consultation|appointment|whatsapp|call|check availability|request/i;
const GENERIC_DENTAL_HEADLINES = [
  /^your smile, our priority$/i,
  /^a healthier smile starts here$/i,
  /^dentistry you can trust$/i,
  /^care designed around you$/i,
  /^modern dentistry for everyone$/i,
];

export function evaluateDentalContentQuality(site: Site, profile: OnboardingProfile): DentalContentQualityResult {
  const issues: DentalContentIssue[] = [];
  const text = siteText(site);
  const requested = requestedTreatments(profile);

  for (const treatment of requested.slice(0, 5)) {
    if (!treatment.pattern.test(text)) {
      issues.push({
        code: "MISSING_REQUESTED_TREATMENT",
        severity: treatment.id === "implant" || treatment.id === "cosmetic" ? "error" : "warning",
        message: `Generated dental copy does not visibly represent the requested ${treatment.id.replace(/-/g, " ")} treatment focus.`,
      });
    }
  }

  const homepage = site.pages.find((page) => page.path === "/") ?? site.pages[0];
  if (homepage) {
    const visible = homepage.sections.filter((section) => !section.hidden);
    const hero = visible.find((section) => family(section.component.componentId) === "hero");
    const heroTitle = value(hero?.props?.title);
    const heroDescription = value(hero?.props?.description);
    const heroCopy = `${heroTitle} ${heroDescription}`;

    if (!heroTitle) {
      issues.push({ code: "DENTAL_HERO_MISSING", severity: "error", message: "Dental homepage needs a specific hero headline.", pageId: homepage.id, sectionId: hero?.id, path: "title" });
    } else {
      if (GENERIC_DENTAL_HEADLINES.some((pattern) => pattern.test(heroTitle))) {
        issues.push({ code: "GENERIC_DENTAL_HERO", severity: "error", message: "Dental hero headline is generic and does not communicate the clinic's treatment focus.", pageId: homepage.id, sectionId: hero?.id, path: "title" });
      }
      if (requested.length && !requested.some((treatment) => treatment.pattern.test(heroCopy))) {
        issues.push({ code: "HERO_MISSES_PRIMARY_TREATMENT", severity: "warning", message: "Homepage hero should mention or clearly imply one of the clinic's primary requested treatments.", pageId: homepage.id, sectionId: hero?.id, path: "title" });
      }
    }

    const homepageText = visible.map((section) => sectionText(section.props)).join(" ");
    if (!CLINICAL_PROCESS_TERMS.test(homepageText)) issues.push({ code: "MISSING_CLINICAL_PROCESS_LANGUAGE", severity: "warning", message: "Dental homepage does not explain a credible consultation, assessment, planning or follow-up process.", pageId: homepage.id });
    if (!PROOF_TERMS.test(homepageText)) issues.push({ code: "MISSING_DENTAL_PROOF_LANGUAGE", severity: "warning", message: "Dental homepage lacks proof-oriented language such as doctor authority, cases, outcomes or patient evidence.", pageId: homepage.id });

    const ctaLabels = visible.flatMap((section) => {
      const props = section.props ?? {};
      return [actionLabel(props.primaryAction), actionLabel(props.secondaryAction)].filter(Boolean) as string[];
    });
    if (!ctaLabels.some((label) => ACTION_TERMS.test(label))) {
      issues.push({ code: "DENTAL_CTA_TOO_GENERIC", severity: "error", message: "Dental website needs at least one clinic-specific next step such as Book consultation, Book appointment, WhatsApp us or Check availability.", pageId: homepage.id });
    }
  }

  const errors = issues.filter((issue) => issue.severity === "error").length;
  const warnings = issues.filter((issue) => issue.severity === "warning").length;
  return { score: Math.max(0, 100 - errors * 18 - warnings * 5), issues };
}

function requestedTreatments(profile: OnboardingProfile) {
  const input = [profile.industry, profile.subindustry, ...(profile.services ?? []), ...(profile.goals ?? []), profile.notes].filter(Boolean).join(" ");
  return TREATMENT_TERMS.filter((term) => term.pattern.test(input));
}

function siteText(site: Site) {
  return site.pages.flatMap((page) => page.sections.filter((section) => !section.hidden).map((section) => sectionText(section.props))).join(" ");
}

function sectionText(props: Record<string, unknown> | undefined): string {
  if (!props) return "";
  const parts = [value(props.title), value(props.eyebrow), value(props.description), actionLabel(props.primaryAction), actionLabel(props.secondaryAction)];
  if (Array.isArray(props.items)) for (const item of props.items) if (item && typeof item === "object") parts.push(value((item as Record<string, unknown>).title), value((item as Record<string, unknown>).description));
  return parts.filter(Boolean).join(" ");
}

function actionLabel(action: unknown): string {
  if (!action || typeof action !== "object") return "";
  return value((action as Record<string, unknown>).label);
}

function value(input: unknown): string {
  return typeof input === "string" ? input.trim() : "";
}

function family(componentId: string): string | undefined {
  const id = componentId.toLowerCase();
  if (id.startsWith("hero." ) || id.includes("-hero-")) return "hero";
  return undefined;
}
