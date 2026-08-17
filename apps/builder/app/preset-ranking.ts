import { INDUSTRY_DESIGN_PRESETS, type IndustryDesignPreset } from "./industry-design-preset-data";

export type OnboardingProfile = {
  industry?: string | null;
  subindustry?: string | null;
  goals?: string[] | null;
  style_tags?: string[] | null;
  required_capabilities?: string[] | null;
  services?: string[] | null;
};

export type RankedPreset = { preset: IndustryDesignPreset; score: number; reasons: string[] };

export function rankPresets(profile: OnboardingProfile): RankedPreset[] {
  const industry = norm(profile.industry);
  const subindustry = norm(profile.subindustry);
  const goals = norms(profile.goals);
  const styles = norms(profile.style_tags);
  const capabilities = norms(profile.required_capabilities);
  const services = norms(profile.services);
  const text = [industry, subindustry, ...goals, ...styles, ...capabilities, ...services].join(" ");
  const has = (...terms: string[]) => terms.some((term) => text.includes(term));

  return INDUSTRY_DESIGN_PRESETS.map((preset) => {
    let score = 0;
    const reasons: string[] = [];
    const id = preset.id;
    if ((industry.includes("dental") || industry.includes("clinic") || has("dentist", "dentistry")) && (id === "dental-clinic" || id === "premium-implant-clinic")) { score += 80; reasons.push("matches dental/clinic"); }
    if (has("implant", "prosthodont" ) && id === "premium-implant-clinic") { score += 70; reasons.push("implant-focused"); }
    if (has("artist", "fine art", "painter", "painting", "illustrator", "sculptor", "sculpture", "art studio", "commissioned art") && id === "artist") { score += 100; reasons.push("matches artist/portfolio"); }
    if (has("photographer", "photography", "wedding photo", "portrait photo", "photo studio") && id === "photographer") { score += 105; reasons.push("matches photography"); }
    if (has("designer", "design studio", "creative agency", "creative studio", "filmmaker", "film maker", "videographer", "video production", "animation studio") && id === "creative-studio") { score += 100; reasons.push("matches creative studio"); }
    if (has("musician", "music artist", "singer", "band", "dj", "performer", "performing artist", "composer") && id === "musician") { score += 105; reasons.push("matches music/performance"); }
    if ((industry.includes("restaurant") || industry.includes("hospitality") || has("dining", "cafe", "bistro")) && id === "restaurant") { score += 90; reasons.push("matches hospitality"); }
    if ((industry.includes("real estate") || industry.includes("property") || has("realtor", "property")) && id === "real-estate") { score += 90; reasons.push("matches property business"); }
    if ((industry.includes("saas") || industry.includes("software") || has("subscription", "software product")) && id === "saas") { score += 90; reasons.push("matches software/SaaS"); }
    if ((industry.includes("construction") || has("contractor", "construction")) && id === "construction") { score += 90; reasons.push("matches construction"); }
    if ((industry.includes("professional") || industry.includes("corporate") || has("consultant", "consulting")) && id === "corporate") { score += 70; reasons.push("professional-services fit"); }

    if (styles.some(v=>v.includes("premium") || v.includes("luxury")) && ["premium-implant-clinic","artist","photographer"].includes(id)) { score += 20; reasons.push("premium visual direction"); }
    if (styles.some(v=>v.includes("editorial")) && ["artist","photographer","real-estate"].includes(id)) { score += 20; reasons.push("editorial visual direction"); }
    if (styles.some(v=>v.includes("modern") || v.includes("bold") || v.includes("experimental")) && ["creative-studio","musician","saas"].includes(id)) { score += 14; reasons.push("expressive modern direction"); }
    if (styles.some(v=>v.includes("minimal") || v.includes("clean")) && ["artist","photographer","dental-clinic","corporate"].includes(id)) { score += 12; reasons.push("clean visual direction"); }

    if (goals.some(v=>v.includes("book appointment")) && (id === "dental-clinic" || id === "premium-implant-clinic")) score += 12;
    if ((goals.some(v=>v.includes("showcase")) || capabilities.some(v=>v.includes("gallery"))) && ["artist","photographer","creative-studio","musician","premium-implant-clinic","restaurant","real-estate","construction"].includes(id)) { score += 10; reasons.push("portfolio/gallery fit"); }
    if ((goals.some(v=>v.includes("sell")) || has("commission", "prints", "original artwork")) && id === "artist") { score += 12; reasons.push("supports art sales/commissions"); }
    if ((goals.some(v=>v.includes("booking")) || has("booking", "hire me")) && ["photographer","musician","creative-studio"].includes(id)) { score += 10; reasons.push("supports enquiry/booking goal"); }
    if (goals.some(v=>v.includes("build trust")) && ["dental-clinic","premium-implant-clinic","corporate","construction"].includes(id)) score += 8;
    if (score === 0 && id === "corporate") score = 1;
    return { preset, score, reasons };
  }).sort((a,b)=>b.score-a.score || a.preset.name.localeCompare(b.preset.name));
}

function norm(value: unknown) { return typeof value === "string" ? value.trim().toLowerCase() : ""; }
function norms(value: unknown) { return Array.isArray(value) ? value.map(norm).filter(Boolean) : []; }
