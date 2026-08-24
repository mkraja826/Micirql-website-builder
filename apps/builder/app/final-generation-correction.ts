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
const AUTHORITY_FAMILIES = new Set(["team", "testimonials", "stats"]);
const DISCOVERY_FAMILIES = new Set(["services", "features", "gallery"]);
const SHELL_FAMILIES = new Set(["navbar", "footer"]);
const MAX_RECOVERY_PASSES = 3;

export function applyFinalGenerationCorrection(site: Site): FinalGenerationCorrection {
  const initial = evaluateFinalGenerationAcceptance(site);
  if (initial.ready) return { site, initial, final: initial, attempted: false, applied: false, repairs: [] };

  let candidate = structuredClone(site);
  const repairs: string[] = [];
  let final = initial;

  for (let pass = 1; pass <= MAX_RECOVERY_PASSES && !final.ready; pass += 1) {
    const beforePass = JSON.stringify(candidate);
    const failed = new Set(final.dimensions.filter((dimension) => !dimension.ready).map((dimension) => dimension.id));
    const passRepairs: string[] = [];

    if (failed.has("content") || failed.has("premium") || failed.has("flagship-visual")) {
      const repaired = repairContentDepth(candidate);
      if (JSON.stringify(repaired) !== JSON.stringify(candidate)) passRepairs.push("content-depth");
      candidate = repaired;
    }

    if (failed.has("flagship-visual")) {
      const flagshipRepairs = repairFlagshipComposition(candidate);
      if (flagshipRepairs > 0) passRepairs.push(`flagship-composition:${flagshipRepairs}`);
    }

    if (failed.has("typography")) {
      if (repairTypography(candidate)) passRepairs.push("typography-system");
    }

    if (failed.has("mobile-structure") || failed.has("typography")) {
      const compacted = compactMobileRiskCopy(candidate);
      if (compacted > 0) passRepairs.push(`mobile-copy:${compacted}`);
    }

    if (failed.has("imagery")) {
      const mediaRepairs = repairImageReferences(candidate);
      if (mediaRepairs > 0) passRepairs.push(`imagery:${mediaRepairs}`);
    }

    candidate = siteSchema.parse(candidate);
    const premiumCorrection = applyPremiumQualityCorrection(candidate);
    candidate = premiumCorrection.site;
    if (premiumCorrection.applied) passRepairs.push("premium-rhythm");

    final = evaluateFinalGenerationAcceptance(candidate);
    const failedAfter = final.dimensions.filter((dimension) => !dimension.ready).map((dimension) => dimension.id);
    repairs.push(`pass-${pass}[${passRepairs.length ? passRepairs.join(",") : "no-change"}]=>${failedAfter.length ? failedAfter.join(",") : "ready"}`);

    // Avoid burning all passes when the correction engine cannot change the candidate.
    if (JSON.stringify(candidate) === beforePass) break;
  }

  const applied = JSON.stringify(candidate) !== JSON.stringify(site);
  return { site: candidate, initial, final, attempted: true, applied, repairs };
}

function repairFlagshipComposition(site: Site): number {
  let changed = 0;

  for (const page of site.pages) {
    const visible = page.sections.filter((section) => !section.hidden);
    if (!visible.length) continue;

    const shellBefore = visible.filter((section) => familyFromId(section.component.componentId) === "navbar");
    const shellAfter = visible.filter((section) => familyFromId(section.component.componentId) === "footer");
    const content = visible.filter((section) => !SHELL_FAMILIES.has(familyFromId(section.component.componentId) ?? ""));
    const hidden = page.sections.filter((section) => section.hidden);
    if (!content.length) continue;

    const heroIndex = content.findIndex((section) => familyFromId(section.component.componentId) === "hero");
    if (heroIndex > 0) {
      const [hero] = content.splice(heroIndex, 1);
      if (hero) {
        content.unshift(hero);
        changed += 1;
      }
    }

    const hero = content[0];
    if (hero && familyFromId(hero.component.componentId) === "hero" && !hasPrimaryAction(hero.props)) {
      const borrowed = findPrimaryAction(content.slice(1));
      if (borrowed) {
        hero.props = { ...hero.props, primaryAction: borrowed };
        changed += 1;
      }
    }

    const reordered = arrangeFlagshipOpening(content);
    if (reordered.changed) changed += reordered.changed;

    const visibleOrdered = [...shellBefore, ...reordered.sections, ...shellAfter];
    const visibleIds = new Set(visibleOrdered.map((section) => section.id));
    const remainingVisible = page.sections.filter((section) => !section.hidden && !visibleIds.has(section.id));
    page.sections = [...visibleOrdered, ...remainingVisible, ...hidden];
  }

  return changed;
}

function arrangeFlagshipOpening(sections: Site["pages"][number]["sections"]): {
  sections: Site["pages"][number]["sections"];
  changed: number;
} {
  if (sections.length < 2) return { sections, changed: 0 };
  const working = [...sections];
  let changed = 0;

  const placeFamily = (targetIndex: number, accepted: Set<string>) => {
    if (targetIndex >= working.length) return;
    const currentFamily = familyFromId(working[targetIndex]!.component.componentId);
    if (currentFamily && accepted.has(currentFamily)) return;
    const foundIndex = working.findIndex((section, index) => index > targetIndex && accepted.has(familyFromId(section.component.componentId) ?? ""));
    if (foundIndex < 0) return;
    const [section] = working.splice(foundIndex, 1);
    if (!section) return;
    working.splice(targetIndex, 0, section);
    changed += 1;
  };

  placeFamily(1, AUTHORITY_FAMILIES);
  placeFamily(2, DISCOVERY_FAMILIES);

  if (working.length >= 4) {
    const used = new Set(working.slice(0, 3).map((section) => familyFromId(section.component.componentId)).filter(Boolean));
    const current = familyFromId(working[3]!.component.componentId);
    if (current && used.has(current)) {
      const foundIndex = working.findIndex((section, index) => index > 3 && !used.has(familyFromId(section.component.componentId)));
      if (foundIndex >= 0) {
        const [section] = working.splice(foundIndex, 1);
        if (section) {
          working.splice(3, 0, section);
          changed += 1;
        }
      }
    }
  }

  return { sections: working, changed };
}

function findPrimaryAction(sections: Site["pages"][number]["sections"]): Record<string, unknown> | undefined {
  for (const section of sections) {
    const action = (section.props as Record<string, unknown>).primaryAction;
    if (!action || typeof action !== "object" || Array.isArray(action)) continue;
    const record = action as Record<string, unknown>;
    const label = typeof record.label === "string" ? record.label.trim() : "";
    const href = typeof record.href === "string" ? record.href.trim() : "";
    const actionId = typeof record.actionId === "string" ? record.actionId.trim() : "";
    if (label && (href || actionId)) return structuredClone(record);
  }
  return undefined;
}

function hasPrimaryAction(props: Record<string, unknown>): boolean {
  const action = props.primaryAction;
  if (!action || typeof action !== "object" || Array.isArray(action)) return false;
  const record = action as Record<string, unknown>;
  const label = typeof record.label === "string" ? record.label.trim() : "";
  const href = typeof record.href === "string" ? record.href.trim() : "";
  const actionId = typeof record.actionId === "string" ? record.actionId.trim() : "";
  return Boolean(label && (href || actionId));
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
  const families = ["navbar", "hero", "about", "services", "features", "process", "testimonials", "gallery", "team", "pricing", "cta", "contact", "lead-capture", "form", "stats", "footer"];
  for (const family of families) if (value === `${family}.placeholder` || value.startsWith(`${family}.`)) return family;
  const codes: Record<string, string> = { nav: "navbar", hero: "hero", about: "about", serv: "services", feat: "features", proc: "process", test: "testimonials", gallery: "gallery", team: "team", pricing: "pricing", cta: "cta", cont: "contact", stats: "stats", foot: "footer" };
  for (const [code, family] of Object.entries(codes)) if (value.includes(`-${code}-`)) return family;
  return undefined;
}

function wordCount(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}
