import type { RankedLayout, WebsiteLayoutBlueprint } from "./website-layout-blueprints";

export type StructuralCompetitionDimensions = {
  narrative: number;
  rhythm: number;
  conversion: number;
  responsive: number;
  certification: number;
};

export type StructuralCompetitionResult = RankedLayout & {
  fitScore: number;
  structuralScore: number;
  competitionScore: number;
  dimensions: StructuralCompetitionDimensions;
};

const CONTENT_FAMILIES = new Set(["about", "services", "features", "process", "team", "gallery", "testimonials"]);
const TRUST_FAMILIES = new Set(["about", "team", "testimonials", "features"]);
const DISCOVERY_FAMILIES = new Set(["services", "features", "gallery"]);
const CONVERSION_FAMILIES = new Set(["cta", "contact"]);

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function familyOrder(layout: WebsiteLayoutBlueprint): string[] {
  return layout.sections.map((section) => section.family);
}

function scoreNarrative(layout: WebsiteLayoutBlueprint): number {
  const families = familyOrder(layout);
  let score = 100;
  const hero = families.indexOf("hero");
  const content = families.findIndex((family) => CONTENT_FAMILIES.has(family));
  const trust = families.findIndex((family) => TRUST_FAMILIES.has(family));
  const discovery = families.findIndex((family) => DISCOVERY_FAMILIES.has(family));
  const firstConversion = families.findIndex((family) => CONVERSION_FAMILIES.has(family));

  if (hero < 0) score -= 60;
  else if (hero > 1) score -= 30;
  if (content < 0 || content > 4) score -= 20;
  if (trust < 0 || trust > 5) score -= 15;
  if (discovery < 0 || discovery > 5) score -= 15;
  if (firstConversion >= 0 && firstConversion < Math.max(3, Math.floor(families.length * 0.45))) score -= 20;
  if (families.at(-1) !== "footer") score -= 10;
  return clamp(score);
}

function scoreRhythm(layout: WebsiteLayoutBlueprint): number {
  const families = familyOrder(layout).filter((family) => !["navbar", "footer"].includes(family));
  if (!families.length) return 0;
  let score = 100;
  for (let index = 1; index < families.length; index += 1) {
    if (families[index] === families[index - 1]) score -= 18;
  }
  const dense = new Set(["services", "features", "team", "testimonials", "gallery"]);
  let run = 0;
  for (const family of families) {
    run = dense.has(family) ? run + 1 : 0;
    if (run > 2) score -= 12;
  }
  const uniqueRatio = new Set(families).size / families.length;
  if (uniqueRatio < 0.7) score -= 15;
  if (["alternating", "editorial", "immersive"].includes(layout.design.sectionRhythm)) score += 5;
  return clamp(score);
}

function scoreConversion(layout: WebsiteLayoutBlueprint): number {
  const families = familyOrder(layout);
  const cta = families.lastIndexOf("cta");
  const contact = families.lastIndexOf("contact");
  let score = 100;
  const lateThreshold = Math.floor(families.length * 0.6);
  if (cta < 0 && contact < 0) return 0;
  if (cta >= 0 && cta < lateThreshold) score -= 25;
  if (contact >= 0 && contact < lateThreshold) score -= 20;
  if (cta >= 0 && contact >= 0 && cta > contact) score -= 10;
  if (contact >= 0 && families.at(-1) === "footer" && contact !== families.length - 2) score -= 8;
  return clamp(score);
}

function scoreResponsive(layout: WebsiteLayoutBlueprint): number {
  let score = 100;
  const required = new Set(layout.quality.requiredViewports);
  if (![360, 390, 430, 768, 1024, 1440].every((width) => required.has(width))) score -= 20;
  for (const breakpoint of ["mobile", "tablet", "desktop"] as const) {
    if (!layout.responsive[breakpoint].rules.length) score -= 10;
    if (layout.responsive[breakpoint].sectionOrder.length !== layout.sections.length) score -= 15;
  }
  if (layout.quality.minimumMobileScore < 8.5) score -= 10;
  if (layout.quality.minimumDesktopScore < 8.5) score -= 10;
  return clamp(score);
}

function scoreCertification(layout: WebsiteLayoutBlueprint): number {
  if (layout.status !== "certified") return 0;
  let score = 90;
  if (layout.quality.minimumMobileScore >= 9) score += 5;
  if (layout.quality.minimumDesktopScore >= 9) score += 5;
  return clamp(score);
}

export function scoreStructuralCandidate(layout: WebsiteLayoutBlueprint): { score: number; dimensions: StructuralCompetitionDimensions; reasons: string[] } {
  const dimensions: StructuralCompetitionDimensions = {
    narrative: scoreNarrative(layout),
    rhythm: scoreRhythm(layout),
    conversion: scoreConversion(layout),
    responsive: scoreResponsive(layout),
    certification: scoreCertification(layout),
  };
  const score = clamp(
    dimensions.narrative * 0.3
      + dimensions.rhythm * 0.2
      + dimensions.conversion * 0.2
      + dimensions.responsive * 0.2
      + dimensions.certification * 0.1,
  );
  const reasons = [
    `structural narrative ${dimensions.narrative}/100`,
    `rhythm diversity ${dimensions.rhythm}/100`,
    `conversion placement ${dimensions.conversion}/100`,
    `responsive complexity ${dimensions.responsive}/100`,
    `certification strength ${dimensions.certification}/100`,
  ];
  return { score, dimensions, reasons };
}

export function competeWebsiteLayoutCandidates(candidates: readonly RankedLayout[]): StructuralCompetitionResult[] {
  return candidates
    .map((candidate) => {
      const structural = scoreStructuralCandidate(candidate.layout);
      const competitionScore = clamp(candidate.score * 0.65 + structural.score * 0.35);
      return {
        ...candidate,
        score: competitionScore,
        fitScore: candidate.score,
        structuralScore: structural.score,
        competitionScore,
        dimensions: structural.dimensions,
        reasons: [...candidate.reasons, ...structural.reasons, `candidate competition ${competitionScore}/100`],
      };
    })
    .sort((a, b) => b.competitionScore - a.competitionScore || b.fitScore - a.fitScore || a.layout.id.localeCompare(b.layout.id));
}
