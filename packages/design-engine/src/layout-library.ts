import { DENTAL_LAYOUT_BLUEPRINTS } from "./dental-layout-blueprints";
import { rankWebsiteLayoutCandidates, rankWebsiteLayouts, validateLayoutLibrary, type LayoutSelectionInput, type RankedLayout, type WebsiteLayoutBlueprint } from "./website-layout-blueprints";

export const WEBSITE_LAYOUT_LIBRARY: readonly WebsiteLayoutBlueprint[] = [
  ...DENTAL_LAYOUT_BLUEPRINTS,
];

export function normalizeLayoutIndustry(industry: string): string {
  const normalized = industry.trim().toLowerCase();
  if (/\bdental|dentist|dentistry|orthodont|endodont|implant\b/.test(normalized)) return "dental";
  return normalized.replace(/\s+/g, "-");
}

export function normalizeLayoutSubindustry(value: string | undefined): string | undefined {
  if (!value?.trim()) return undefined;
  const normalized = value.trim().toLowerCase();
  const aliases: Record<string, string> = {
    "general dentistry": "general-dentistry",
    "family dentistry": "general-dentistry",
    "family dental": "general-dentistry",
    "pediatric dentistry": "general-dentistry",
    "emergency dentistry": "general-dentistry",
    "restorative dentistry": "general-dentistry",
    "prosthodontics": "general-dentistry",
    "implant dentistry": "implant-dentistry",
    "dental implants": "implant-dentistry",
    "full arch implants": "implant-dentistry",
    "cosmetic dentistry": "cosmetic-dentistry",
    "smile design": "cosmetic-dentistry",
    "veneers": "cosmetic-dentistry",
    "orthodontics": "orthodontics",
    "clear aligners": "orthodontics",
    "endodontics": "endodontics",
    "root canal": "endodontics",
  };
  return aliases[normalized] ?? normalized.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean))];
}

function normalizeGoals(values: readonly string[] | undefined, context: string): string[] | undefined {
  if (!values?.length && !context) return undefined;
  const result = [...(values ?? [])];
  const text = `${context} ${(values ?? []).join(" ")}`.toLowerCase();

  if (/book|appointment|consult|enquir|schedule/.test(text)) result.push("book appointment", "consultation");
  if (/implant/.test(text) && /book|consult|appointment|enquir/.test(text)) result.push("implant consultation");
  if (/cosmetic|smile design|veneer|whitening/.test(text) && /book|consult|appointment|enquir/.test(text)) result.push("cosmetic consultation");
  if (/trust|credib|reassur|authority|expert/.test(text)) result.push("build trust");
  if (/showcase|portfolio|gallery|before.?after|transform|result|outcome|smile design/.test(text)) result.push("show outcomes");
  if (/urgent|emergency|tooth pain|broken tooth|same.?day|contact clinic|call clinic/.test(text)) result.push("urgent contact", "book appointment");
  if (/learn|education|educational|explain|how it works|treatment process|journey/.test(text)) result.push("explain treatment journey");
  if (/discover|treatment options|services|treatment discovery/.test(text)) result.push("treatment discovery");

  return unique(result);
}

function normalizePriorities(values: readonly string[] | undefined, context: string): string[] | undefined {
  if (!values?.length && !context) return undefined;
  const result = [...(values ?? [])];
  const text = `${context} ${(values ?? []).join(" ")}`.toLowerCase();

  if (/book|appointment|contact|enquir|schedule/.test(text)) result.push("appointment");
  if (/location|map|address|nearby/.test(text)) result.push("location");
  if (/gallery|before.?after|portfolio|smile design|veneer|whitening|rehabilitation|result|outcome/.test(text)) result.push("visual outcomes");
  if (/implant|full arch/.test(text)) result.push("implant expertise");
  if (/treatment process|journey|how it works|planning/.test(text)) result.push("journey", "treatment planning");
  if (/aligner|braces|retainer|orthodont/.test(text)) result.push("treatment options");
  if (/scan|digital|cbct|technology|3d/.test(text)) result.push("technology");
  if (/review|testimonial|rating|social proof/.test(text)) result.push("patient reviews");
  if (/doctor|team|specialist|credential|expert/.test(text)) result.push("doctor trust", "doctor credentials");
  if (/urgent|emergency|tooth pain|broken tooth|same.?day/.test(text)) result.push("pain relief", "appointment");
  if (/comfort|calm|anxiety|gentle/.test(text)) result.push("comfort");
  if (/checkup|crown|bridge|filling|gum care|preventive|restorative/.test(text)) result.push("treatments");

  return unique(result);
}

function normalizeStyles(values: readonly string[] | undefined, context: string): string[] | undefined {
  if (!values?.length && !context) return undefined;
  const result = [...(values ?? [])];
  const text = `${context} ${(values ?? []).join(" ")}`.toLowerCase();

  if (/luxury|elegant/.test(text)) result.push("luxury", "premium", "elegant");
  if (/family|welcoming/.test(text)) result.push("family", "friendly", "approachable");
  if (/professional|clinical/.test(text)) result.push("professional", "clinical");
  if (/clean/.test(text)) result.push("clean");
  if (/visual|photo|gallery|before.?after/.test(text)) result.push("visual", "outcomes");
  if (/modern|advanced|digital/.test(text)) result.push("modern");
  if (/calm|wellness|natural|warm/.test(text)) result.push("calm", "wellness", "warm");
  if (/emergency|urgent/.test(text)) result.push("urgent", "direct", "reassuring");
  if (/bold|campaign/.test(text)) result.push("bold", "campaign");
  if (/educational|education|learn|explain/.test(text)) result.push("evidence");

  return unique(result);
}

export function normalizeLayoutSelectionInput(input: LayoutSelectionInput): LayoutSelectionInput {
  const industry = normalizeLayoutIndustry(input.industry);
  const rawSubindustry = input.subindustryId?.trim() ?? "";
  const subindustryId = normalizeLayoutSubindustry(rawSubindustry);
  const context = [rawSubindustry, ...(input.goals ?? []), ...(input.priorities ?? []), ...(input.styleTags ?? [])].join(" ");
  const dentalContext = industry === "dental" ? context : "";

  const goals = normalizeGoals(input.goals, dentalContext);
  const priorities = normalizePriorities(input.priorities, dentalContext);
  const styleTags = normalizeStyles(input.styleTags, dentalContext);

  return {
    industry,
    ...(subindustryId ? { subindustryId } : {}),
    ...(goals?.length ? { goals } : {}),
    ...(priorities?.length ? { priorities } : {}),
    ...(styleTags?.length ? { styleTags } : {}),
  };
}

export function layoutsForIndustry(industry: string, options: { includeDrafts?: boolean } = {}): WebsiteLayoutBlueprint[] {
  const normalized = normalizeLayoutIndustry(industry);
  return WEBSITE_LAYOUT_LIBRARY.filter((layout) => {
    if (layout.industry !== normalized) return false;
    return options.includeDrafts ? layout.status !== "retired" : layout.status === "certified";
  });
}

export function findWebsiteLayout(id: string): WebsiteLayoutBlueprint | undefined {
  return WEBSITE_LAYOUT_LIBRARY.find((layout) => layout.id === id);
}

/** Production selector: only certified layouts are eligible. */
export function recommendWebsiteLayouts(input: LayoutSelectionInput, limit = 5): RankedLayout[] {
  return rankWebsiteLayouts(WEBSITE_LAYOUT_LIBRARY, normalizeLayoutSelectionInput(input)).slice(0, Math.max(1, limit));
}

/** Internal selector: ranks drafts so they can be implemented and certified in order of fit. */
export function recommendLayoutCandidates(input: LayoutSelectionInput, limit = 5): RankedLayout[] {
  return rankWebsiteLayoutCandidates(WEBSITE_LAYOUT_LIBRARY, normalizeLayoutSelectionInput(input)).slice(0, Math.max(1, limit));
}

/** Internal design workflow: drafts are visible to MiCirql's layout studio before certification. */
export function draftLayoutsForIndustry(industry: string): WebsiteLayoutBlueprint[] {
  return layoutsForIndustry(industry, { includeDrafts: true }).filter((layout) => layout.status === "draft");
}

export const WEBSITE_LAYOUT_LIBRARY_ISSUES = validateLayoutLibrary(WEBSITE_LAYOUT_LIBRARY);
