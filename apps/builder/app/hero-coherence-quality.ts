import type { Site } from "@micirql/schema";
import type { MediaExecutionPlan } from "./media-execution";
import type { OnboardingProfile } from "./preset-ranking";

export type HeroCoherenceIssue = {
  code: string;
  severity: "error" | "warning";
  message: string;
};

export type HeroCoherenceResult = {
  score: number;
  issues: HeroCoherenceIssue[];
  primaryIntent: string | null;
};

const ACTION = /book|consult|appointment|whatsapp|call|availability|request/i;

export function evaluateHeroCoherence(site: Site, media: MediaExecutionPlan | null, profile: OnboardingProfile): HeroCoherenceResult {
  const issues: HeroCoherenceIssue[] = [];
  const intent = primaryIntent(profile);
  const home = site.pages.find((page) => page.path === "/") ?? site.pages[0];
  const hero = home?.sections.find((section) => !section.hidden && heroFamily(section.component.componentId));
  const title = firstText(hero?.props, ["heading", "title"]);
  const description = firstText(hero?.props, ["body", "description"]);
  const copy = `${title} ${description}`.toLowerCase();
  const ctas = [actionLabel(hero?.props?.primaryAction), actionLabel(hero?.props?.secondaryAction)].filter(Boolean);
  const heroMedia = media?.requests.find((request) => request.family === "hero" && (request.pagePath === "/" || !request.pagePath));
  const mediaText = [heroMedia?.generationPrompt, heroMedia?.asset?.name, heroMedia?.asset?.alt, ...(heroMedia?.asset?.tags ?? []), ...(heroMedia?.preferredTags ?? [])].filter(Boolean).join(" ").toLowerCase();

  if (!hero || !title) issues.push({ code: "HERO_COHERENCE_MISSING_HERO", severity: "error", message: "Homepage hero must contain a clear headline." });
  if (intent && !intent.pattern.test(copy)) issues.push({ code: "HERO_COPY_MISSES_PRIMARY_INTENT", severity: "error", message: `Hero copy does not clearly reinforce the primary ${intent.label} intent.` });
  if (intent && heroMedia && heroMedia.source !== "none" && !intent.pattern.test(mediaText)) issues.push({ code: "HERO_MEDIA_MISSES_PRIMARY_INTENT", severity: "error", message: `Hero media intent does not reinforce the primary ${intent.label} story.` });
  if (intent?.id === "implant" && /cosmetic|beauty|smile[- ]portrait|natural[- ]smile/.test(mediaText) && !/implant|restorative|implant-planning/.test(mediaText)) issues.push({ code: "HERO_MEDIA_CONFLICTS_WITH_IMPLANT_COPY", severity: "error", message: "Implant-led hero is paired with cosmetic/smile-led media intent." });
  if (intent?.id === "cosmetic" && /root-canal|endodont|implant-surgery|surgical/.test(mediaText)) issues.push({ code: "HERO_MEDIA_CONFLICTS_WITH_COSMETIC_COPY", severity: "error", message: "Cosmetic-led hero is paired with unrelated surgical/endodontic media intent." });
  if (ctas.length === 0 || !ctas.some((label) => ACTION.test(label))) issues.push({ code: "HERO_CTA_MISALIGNED", severity: "warning", message: "Hero needs a concrete consultation or appointment next step." });
  if (heroMedia?.source === "none") issues.push({ code: "HERO_MEDIA_ABSENT", severity: "warning", message: "The selected first-screen composition expects hero media but no matching media was selected." });

  const errors = issues.filter((issue) => issue.severity === "error").length;
  const warnings = issues.filter((issue) => issue.severity === "warning").length;
  return { score: Math.max(0, 100 - errors * 22 - warnings * 6), issues, primaryIntent: intent?.id ?? null };
}

function primaryIntent(profile: OnboardingProfile): { id: string; label: string; pattern: RegExp } | null {
  const value = [profile.industry, profile.subindustry, ...(profile.services ?? []), ...(profile.goals ?? []), profile.notes].filter(Boolean).join(" ").toLowerCase();
  if (/implant|full[- ]arch|all[- ]on[- ](?:4|6)|prosthodont/.test(value)) return { id: "implant", label: "implant", pattern: /implant|full[- ]arch|all[- ]on[- ](?:4|6)|restorative|implant-planning/i };
  if (/cosmetic dentistry|smile design|smile makeover|veneer/.test(value)) return { id: "cosmetic", label: "cosmetic dentistry", pattern: /cosmetic|smile design|smile makeover|veneer|natural-smile/i };
  if (/orthodont|aligner|braces/.test(value)) return { id: "orthodontics", label: "orthodontic", pattern: /orthodont|aligner|braces/i };
  if (/endodont|root canal/.test(value)) return { id: "endodontics", label: "endodontic", pattern: /endodont|root canal|root-canal/i };
  return null;
}

function heroFamily(componentId: string): boolean {
  const value = componentId.toLowerCase();
  return value.startsWith("hero.") || value.includes("-hero-");
}

function actionLabel(action: unknown): string {
  if (!action || typeof action !== "object") return "";
  return text((action as Record<string, unknown>).label);
}

function firstText(props: Record<string, unknown> | undefined, keys: string[]): string {
  if (!props) return "";
  for (const key of keys) {
    const value = text(props[key]);
    if (value) return value;
  }
  return "";
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
