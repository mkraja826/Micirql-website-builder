import { siteSchema, type Site } from "@micirql/schema";
import { repairContentDepth } from "./content-depth-repair";
import { applyPremiumQualityCorrection } from "./premium-quality-correction";
import { evaluateFinalGenerationAcceptance, type FinalGenerationAcceptance } from "./final-generation-acceptance";

export type FinalGenerationCorrection = {
  site: Site;
  initial: FinalGenerationAcceptance;
  final: FinalGenerationAcceptance;
  attempted: boolean;
  applied: boolean;
  repairs: string[];
};

const DEFAULT_FONT_FAMILIES = new Set(["arial", "times new roman", "times", "serif", "sans-serif"]);
const PROMINENT_FAMILIES = new Set(["hero", "about", "team", "gallery", "services"]);

export function applyFinalGenerationCorrection(site: Site): FinalGenerationCorrection {
  const initial = evaluateFinalGenerationAcceptance(site);
  if (initial.ready) return { site, initial, final: initial, attempted: false, applied: false, repairs: [] };

  let candidate = structuredClone(site);
  const repairs: string[] = [];
  const failed = new Set(initial.dimensions.filter((dimension) => !dimension.ready).map((dimension) => dimension.id));

  if (failed.has("content") || failed.has("premium")) {
    const repaired = repairContentDepth(candidate);
    if (JSON.stringify(repaired) !== JSON.stringify(candidate)) repairs.push("content-depth");
    candidate = repaired;
  }

  if (failed.has("typography")) {
    if (repairTypography(candidate)) repairs.push("typography-system");
  }

  if (failed.has("mobile-structure") || failed.has("typography")) {
    const compacted = compactMobileRiskCopy(candidate);
    if (compacted > 0) repairs.push(`mobile-copy:${compacted}`);
  }

  if (failed.has("imagery")) {
    const mediaRepairs = repairImageReferences(candidate);
    if (mediaRepairs > 0) repairs.push(`imagery:${mediaRepairs}`);
  }

  candidate = siteSchema.parse(candidate);
  const premiumCorrection = applyPremiumQualityCorrection(candidate);
  candidate = premiumCorrection.site;
  if (premiumCorrection.applied) repairs.push("premium-rhythm");

  const final = evaluateFinalGenerationAcceptance(candidate);
  const applied = JSON.stringify(candidate) !== JSON.stringify(site);
  return { site: candidate, initial, final, attempted: true, applied, repairs };
}

function repairTypography(site: Site): boolean {
  const typography = site.theme.brand.typography;
  const roles = [typography.display, typography.body, typography.ui].map((value) => value.trim());
  const needsRepair = roles.some((value) => !value) || roles.filter((value) => DEFAULT_FONT_FAMILIES.has(value.toLowerCase())).length > 0;
  if (!needsRepair) return false;
  typography.display = "Manrope";
  typography.body = "Inter";
  typography.ui = "Inter";
  return true;
}

function compactMobileRiskCopy(site: Site): number {
  let changed = 0;
  for (const page of site.pages) {
    for (const section of page.sections) {
      if (section.hidden) continue;
      const family = familyFromId(section.component.componentId);
      const props = section.props as Record<string, unknown>;
      if (family === "hero") {
        changed += compactStringField(props, "heading", 12);
        changed += compactStringField(props, "title", 12);
      }
      for (const key of ["body", "description", "summary", "intro", "copy", "text"] as const) {
        changed += compactStringField(props, key, 42);
      }
      for (const key of ["primaryAction", "secondaryAction"] as const) {
        const action = props[key];
        if (!action || typeof action !== "object" || Array.isArray(action)) continue;
        const record = action as Record<string, unknown>;
        const label = typeof record.label === "string" ? record.label.trim() : "";
        if (wordCount(label) <= 4) continue;
        record.label = compactActionLabel(label);
        changed += 1;
      }
      section.props = props;
    }
  }
  return changed;
}

function compactStringField(record: Record<string, unknown>, key: string, maxWords: number): number {
  const value = record[key];
  if (typeof value !== "string") return 0;
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return 0;
  const clipped = words.slice(0, maxWords).join(" ").replace(/[,:;\-–—]+$/, "");
  record[key] = /[.!?]$/.test(clipped) ? clipped : `${clipped}.`;
  return 1;
}

function compactActionLabel(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (/appointment|book/.test(normalized)) return "Book appointment";
  if (/consult/.test(normalized)) return "Request consultation";
  if (/quote|estimate/.test(normalized)) return "Request quote";
  if (/contact|talk|speak|call/.test(normalized)) return "Contact us";
  return value.trim().split(/\s+/).slice(0, 4).join(" ");
}

function repairImageReferences(site: Site): number {
  const seenProminent = new Set<string>();
  let changed = 0;
  for (const page of site.pages) {
    for (const section of page.sections) {
      if (section.hidden) continue;
      const prominent = PROMINENT_FAMILIES.has(familyFromId(section.component.componentId) ?? "");
      changed += scrubAssetRefs(section.props, prominent ? seenProminent : undefined);
    }
  }
  return changed;
}

function scrubAssetRefs(value: unknown, seenProminent?: Set<string>): number {
  if (!value || typeof value !== "object") return 0;
  if (Array.isArray(value)) return value.reduce((sum, item) => sum + scrubAssetRefs(item, seenProminent), 0);
  const record = value as Record<string, unknown>;
  let changed = 0;
  if ("assetId" in record) {
    const assetId = typeof record.assetId === "string" ? record.assetId.trim() : "";
    const unresolved = !assetId || assetId.startsWith("pending-") || assetId.startsWith("placeholder-");
    const duplicate = Boolean(assetId && seenProminent?.has(assetId));
    if (unresolved || duplicate) {
      delete record.assetId;
      changed += 1;
    } else if (assetId && seenProminent) {
      seenProminent.add(assetId);
    }
  }
  for (const nested of Object.values(record)) changed += scrubAssetRefs(nested, seenProminent);
  return changed;
}

function familyFromId(componentId: string): string | undefined {
  const value = componentId.toLowerCase();
  const families = ["navbar", "hero", "about", "services", "features", "process", "testimonials", "gallery", "team", "pricing", "cta", "contact", "lead-capture", "form", "footer"];
  for (const family of families) if (value === `${family}.placeholder` || value.startsWith(`${family}.`)) return family;
  const codes: Record<string, string> = { nav: "navbar", hero: "hero", about: "about", serv: "services", feat: "features", proc: "process", test: "testimonials", gallery: "gallery", team: "team", pricing: "pricing", cta: "cta", cont: "contact", foot: "footer" };
  for (const [code, family] of Object.entries(codes)) if (value.includes(`-${code}-`)) return family;
  return undefined;
}

function wordCount(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}
