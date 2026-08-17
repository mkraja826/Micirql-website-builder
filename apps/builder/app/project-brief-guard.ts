import { assessBrandPalette, type BrandPaletteAssessment } from "@micirql/design-engine";

export type LockedProjectBrief = {
  workspaceId: string;
  siteId: string;
  businessName: string;
  industry: string;
  subindustry: string | null;
  location: string | null;
  services: string[];
};

export function lockProjectBrief(input: LockedProjectBrief) {
  return Object.freeze({
    workspaceId: clean(input.workspaceId),
    siteId: clean(input.siteId),
    businessName: clean(input.businessName),
    industry: canonicalIndustry(input.industry),
    subindustry: optional(input.subindustry),
    location: optional(input.location),
    services: input.services.map(clean).filter(Boolean),
  });
}

export function mergeAiPlanningAdvice<T extends {
  industry?: unknown;
  subindustry?: unknown;
  styleTags?: unknown;
  requiredCapabilities?: unknown;
  goals?: unknown;
  brandColors?: unknown;
}>(brief: LockedProjectBrief, advice: T) {
  const locked = lockProjectBrief(brief);
  const proposedColors = hexColors(advice.brandColors);
  const brandPaletteAssessment = proposedColors.length
    ? assessBrandPalette({ logoColors: proposedColors, industry: locked.industry })
    : null;
  return {
    ...advice,
    industry: locked.industry,
    subindustry: locked.subindustry,
    brandColors: brandPaletteAssessment ? paletteForTheme(brandPaletteAssessment) : proposedColors,
    brandPaletteAssessment,
  };
}

export function projectIdentityMatches(
  expected: Pick<LockedProjectBrief, "businessName" | "industry">,
  actual: { businessName?: unknown; industry?: unknown },
): boolean {
  const expectedName = normalize(expected.businessName);
  const actualName = normalize(typeof actual.businessName === "string" ? actual.businessName : "");
  const expectedIndustry = canonicalIndustry(expected.industry);
  const actualIndustry = canonicalIndustry(typeof actual.industry === "string" ? actual.industry : "");
  const nameMatches = !actualName || actualName === expectedName;
  const industryMatches = !actualIndustry || actualIndustry === expectedIndustry;
  return nameMatches && industryMatches;
}

export function canonicalIndustry(value: string): string {
  const text = normalize(value);
  if (/dental|dentist|clinic|medical|health/.test(text)) return "dental";
  if (/restaurant|cafe|dining|hospitality|food/.test(text)) return "restaurant";
  if (/real estate|property|realtor|broker/.test(text)) return "real estate";
  if (/retail|store|shop|e-?commerce/.test(text)) return "retail";
  if (/professional|consult|legal|account|agency/.test(text)) return "professional services";
  return text;
}

function hexColors(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string" && /^#[0-9a-f]{6}$/i.test(item.trim()))
    .map(item => item.trim().toUpperCase())
    .slice(0, 6);
}

function paletteForTheme(assessment: BrandPaletteAssessment): string[] {
  const border = assessment.neutrals[0] === "#FFFFFF" ? "#E5E5E5" : assessment.neutrals[0];
  return [assessment.primary, assessment.accent, assessment.neutrals[1], assessment.secondary, border];
}

function clean(value: string) { return value.trim(); }
function optional(value: string | null) { const cleaned = value?.trim(); return cleaned || null; }
function normalize(value: string) { return value.trim().toLowerCase().replace(/\s+/g, " "); }
