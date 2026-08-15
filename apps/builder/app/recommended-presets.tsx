"use client";

import { INDUSTRY_DESIGN_PRESETS, type IndustryDesignPreset } from "./industry-design-presets";
import styles from "./recommended-presets.module.css";

export type OnboardingProfile = {
  industry?: string | null;
  subindustry?: string | null;
  goals?: string[] | null;
  style_tags?: string[] | null;
  required_capabilities?: string[] | null;
  services?: string[] | null;
};

type RankedPreset = { preset: IndustryDesignPreset; score: number; reasons: string[] };

export function RecommendedPresets({ profile, onApply }: { profile?: OnboardingProfile | null; onApply(preset: IndustryDesignPreset): void }) {
  if (!profile) return null;
  const ranked = rankPresets(profile).slice(0, 3);
  if (!ranked.length) return null;
  return <section className={styles.root}>
    <div className={styles.heading}><span>Recommended for this business</span><small>Based on the saved discovery profile</small></div>
    <div className={styles.grid}>{ranked.map(({preset,reasons},index)=><button type="button" key={preset.id} onClick={()=>onApply(preset)}>
      <div className={styles.badge}>{index===0?"Best match":`#${index+1}`}</div>
      <strong>{preset.name}</strong>
      <small>{reasons.slice(0,2).join(" · ") || preset.description}</small>
    </button>)}</div>
  </section>;
}

export function rankPresets(profile: OnboardingProfile): RankedPreset[] {
  const industry = norm(profile.industry);
  const subindustry = norm(profile.subindustry);
  const goals = norms(profile.goals);
  const styles = norms(profile.style_tags);
  const capabilities = norms(profile.required_capabilities);
  const services = norms(profile.services);
  const text = [industry, subindustry, ...goals, ...styles, ...capabilities, ...services].join(" ");

  return INDUSTRY_DESIGN_PRESETS.map((preset) => {
    let score = 0;
    const reasons: string[] = [];
    const id = preset.id;
    if ((industry.includes("dental") || industry.includes("clinic") || text.includes("dent")) && (id === "dental-clinic" || id === "premium-implant-clinic")) { score += 80; reasons.push("matches dental/clinic"); }
    if ((subindustry.includes("implant") || services.some(v=>v.includes("implant"))) && id === "premium-implant-clinic") { score += 70; reasons.push("implant-focused"); }
    if ((industry.includes("restaurant") || industry.includes("hospitality") || text.includes("dining")) && id === "restaurant") { score += 90; reasons.push("matches hospitality"); }
    if ((industry.includes("real estate") || industry.includes("property") || text.includes("property")) && id === "real-estate") { score += 90; reasons.push("matches property business"); }
    if ((industry.includes("saas") || industry.includes("software") || text.includes("subscription")) && id === "saas") { score += 90; reasons.push("matches software/SaaS"); }
    if ((industry.includes("construction") || text.includes("contractor") || text.includes("construction")) && id === "construction") { score += 90; reasons.push("matches construction"); }
    if ((industry.includes("professional") || industry.includes("corporate") || text.includes("consult")) && id === "corporate") { score += 70; reasons.push("professional-services fit"); }

    if (styles.some(v=>v.includes("premium") || v.includes("luxury")) && id === "premium-implant-clinic") { score += 24; reasons.push("premium visual direction"); }
    if (styles.some(v=>v.includes("editorial")) && id === "real-estate") { score += 18; reasons.push("editorial visual direction"); }
    if (styles.some(v=>v.includes("modern") || v.includes("bold")) && id === "saas") { score += 10; reasons.push("modern visual direction"); }
    if (styles.some(v=>v.includes("minimal") || v.includes("professional")) && (id === "dental-clinic" || id === "corporate")) { score += 10; reasons.push("clean professional style"); }

    if (goals.some(v=>v.includes("book appointment")) && (id === "dental-clinic" || id === "premium-implant-clinic")) score += 12;
    if (capabilities.some(v=>v.includes("gallery")) && ["premium-implant-clinic","restaurant","real-estate","construction"].includes(id)) score += 8;
    if (goals.some(v=>v.includes("build trust")) && ["dental-clinic","premium-implant-clinic","corporate","construction"].includes(id)) score += 8;
    if (score === 0 && id === "corporate") score = 1;
    return { preset, score, reasons };
  }).sort((a,b)=>b.score-a.score || a.preset.name.localeCompare(b.preset.name));
}

function norm(value: unknown) { return typeof value === "string" ? value.trim().toLowerCase() : ""; }
function norms(value: unknown) { return Array.isArray(value) ? value.map(norm).filter(Boolean) : []; }
