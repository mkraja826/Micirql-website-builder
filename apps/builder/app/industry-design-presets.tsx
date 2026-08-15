"use client";

import type { ThemeConfig } from "@micirql/schema";
import type { SectionFamily, SectionVariant } from "@micirql/sections";
import { useOnboardingProfile } from "./onboarding-profile-context";
import styles from "./industry-design-presets.module.css";

export type IndustryDesignPreset = {
  id: string;
  name: string;
  description: string;
  theme: ThemeConfig;
  variants: Partial<Record<SectionFamily, SectionVariant>>;
};

const baseColors = { success: "#168a4a", warning: "#ad6a00", error: "#c93636" };

export const INDUSTRY_DESIGN_PRESETS: IndustryDesignPreset[] = [
  { id:"dental-clinic", name:"Dental Clinic", description:"Clean, reassuring and conversion-focused for general dentistry.", theme:{ family:"minimalist", modifiers:["light","rounded","photography-led"], brand:{ colors:{primary:"#0f766e",secondary:"#164e63",accent:"#14b8a6",background:"#f8fffe",surface:"#edf9f7",textPrimary:"#102a2a",textSecondary:"#527070",border:"#cfe3df",...baseColors}, typography:{display:"Inter",body:"Inter",ui:"Inter"}, density:"comfortable",shape:"soft",motion:"subtle"}}, variants:{hero:2,services:3,testimonials:2,gallery:3,cta:2,contact:2}},
  { id:"premium-implant-clinic", name:"Premium Implant Clinic", description:"High-trust, premium presentation for implant-led practices.", theme:{ family:"luxury", modifiers:["light","photography-led","motion-subtle"], brand:{ colors:{primary:"#8b6b35",secondary:"#15120e",accent:"#c4a266",background:"#fffdf9",surface:"#f6f1e8",textPrimary:"#1c1812",textSecondary:"#746a5c",border:"#ded3c0",...baseColors}, typography:{display:"Georgia",body:"Inter",ui:"Inter"},density:"spacious",shape:"balanced",motion:"subtle"}}, variants:{hero:5,about:4,services:2,process:4,testimonials:4,gallery:5,cta:3,contact:2}},
  { id:"restaurant", name:"Restaurant", description:"Warm, image-led layouts for menus, ambience and reservations.", theme:{ family:"organic",modifiers:["photography-led","texture-grain","rounded"],brand:{colors:{primary:"#8a3d21",secondary:"#342319",accent:"#d18a4e",background:"#fffaf3",surface:"#f5eadc",textPrimary:"#2d2119",textSecondary:"#776354",border:"#dfd0be",...baseColors},typography:{display:"Georgia",body:"Arial",ui:"Arial"},density:"comfortable",shape:"soft",motion:"standard"}},variants:{hero:5,about:2,services:4,gallery:5,testimonials:3,cta:2,contact:3}},
  { id:"real-estate", name:"Real Estate", description:"Editorial property presentation with strong listing imagery.", theme:{family:"editorial",modifiers:["light","photography-led","sharp"],brand:{colors:{primary:"#25364a",secondary:"#0f1720",accent:"#b58a55",background:"#fbfaf7",surface:"#f0eee9",textPrimary:"#14191f",textSecondary:"#65707a",border:"#d8d7d2",...baseColors},typography:{display:"Georgia",body:"Inter",ui:"Inter"},density:"spacious",shape:"sharp",motion:"subtle"}},variants:{hero:4,features:2,gallery:5,process:2,testimonials:4,cta:3,contact:2}},
  { id:"saas", name:"SaaS", description:"Crisp product-led presentation for software and subscriptions.",theme:{family:"futuristic",modifiers:["gradient","rounded","motion-rich"],brand:{colors:{primary:"#6d5dfc",secondary:"#111827",accent:"#22d3ee",background:"#f8faff",surface:"#eef2ff",textPrimary:"#111827",textSecondary:"#667085",border:"#d9def2",...baseColors},typography:{display:"Inter",body:"Inter",ui:"Inter"},density:"comfortable",shape:"soft",motion:"rich"}},variants:{hero:2,features:3,process:2,testimonials:2,cta:5,contact:1}},
  { id:"corporate", name:"Corporate", description:"Conservative, structured and professional for established firms.",theme:{family:"corporate",modifiers:["light","sharp","motion-subtle"],brand:{colors:{primary:"#1f4b7a",secondary:"#17212b",accent:"#4d7ba8",background:"#ffffff",surface:"#f4f6f8",textPrimary:"#17212b",textSecondary:"#687481",border:"#d9dee4",...baseColors},typography:{display:"Arial",body:"Arial",ui:"Arial"},density:"compact",shape:"sharp",motion:"subtle"}},variants:{hero:2,about:2,services:2,process:1,testimonials:1,cta:2,contact:1}},
  { id:"construction", name:"Construction", description:"Strong geometric layouts for capability, projects and trust signals.",theme:{family:"maximalist",modifiers:["geometric","sharp","photography-led"],brand:{colors:{primary:"#d97706",secondary:"#1f2937",accent:"#f59e0b",background:"#fffdf8",surface:"#f5f1e8",textPrimary:"#1c232b",textSecondary:"#69727c",border:"#d9d3c8",...baseColors},typography:{display:"Arial",body:"Arial",ui:"Arial"},density:"comfortable",shape:"sharp",motion:"standard"}},variants:{hero:5,about:3,services:3,process:4,gallery:4,testimonials:2,cta:4,contact:2}},
];

export function IndustryDesignPresets({ onApply }: { onApply(preset: IndustryDesignPreset): void }) {
  const profile = useOnboardingProfile();
  const recommendations = profile ? rankPresets(profile).slice(0,3) : [];
  const recommendedIds = new Set(recommendations.map(item=>item.preset.id));
  return <section className={styles.root}>
    {recommendations.length ? <div className={styles.recommended}>
      <div className={styles.recommendationHeading}><span>Recommended for your business</span><small>Based on your discovery brief</small></div>
      <div className={styles.recommendationGrid}>{recommendations.map((item,index)=><button type="button" key={item.preset.id} onClick={()=>onApply(item.preset)}>
        <em>{index===0?"Best match":`#${index+1}`}</em><strong>{item.preset.name}</strong><small>{item.reasons.slice(0,2).join(" · ") || item.preset.description}</small>
      </button>)}</div>
    </div> : null}
    <span className={styles.label}>{recommendations.length?"All presets":"Industry presets"}</span>
    <div className={styles.grid}>
      {INDUSTRY_DESIGN_PRESETS.map((preset)=><button type="button" key={preset.id} className={recommendedIds.has(preset.id)?styles.recommendedItem:undefined} onClick={()=>onApply(preset)}><strong>{preset.name}</strong><small>{preset.description}</small></button>)}
    </div>
  </section>;
}

type Profile = { industry?:string|null; subindustry?:string|null; goals?:string[]|null; style_tags?:string[]|null; required_capabilities?:string[]|null; services?:string[]|null };
function rankPresets(profile: Profile) {
  const industry=norm(profile.industry), subindustry=norm(profile.subindustry), goals=norms(profile.goals), visual=norms(profile.style_tags), capabilities=norms(profile.required_capabilities), services=norms(profile.services);
  const text=[industry,subindustry,...goals,...visual,...capabilities,...services].join(" ");
  return INDUSTRY_DESIGN_PRESETS.map(preset=>{let score=0;const reasons:string[]=[];const id=preset.id;
    if((industry.includes("dental")||industry.includes("clinic")||text.includes("dent"))&&(id==="dental-clinic"||id==="premium-implant-clinic")){score+=80;reasons.push("dental/clinic match")}
    if((subindustry.includes("implant")||services.some(v=>v.includes("implant")))&&id==="premium-implant-clinic"){score+=70;reasons.push("implant-focused")}
    if((industry.includes("restaurant")||industry.includes("hospitality")||text.includes("dining"))&&id==="restaurant"){score+=90;reasons.push("hospitality match")}
    if((industry.includes("real estate")||industry.includes("property")||text.includes("property"))&&id==="real-estate"){score+=90;reasons.push("property-business match")}
    if((industry.includes("saas")||industry.includes("software")||text.includes("subscription"))&&id==="saas"){score+=90;reasons.push("software/SaaS match")}
    if((industry.includes("construction")||text.includes("contractor")||text.includes("construction"))&&id==="construction"){score+=90;reasons.push("construction match")}
    if((industry.includes("professional")||industry.includes("corporate")||text.includes("consult"))&&id==="corporate"){score+=70;reasons.push("professional-services fit")}
    if(visual.some(v=>v.includes("premium")||v.includes("luxury"))&&id==="premium-implant-clinic"){score+=24;reasons.push("premium direction")}
    if(visual.some(v=>v.includes("editorial"))&&id==="real-estate"){score+=18;reasons.push("editorial direction")}
    if(visual.some(v=>v.includes("modern")||v.includes("bold"))&&id==="saas"){score+=10;reasons.push("modern direction")}
    if(visual.some(v=>v.includes("minimal")||v.includes("professional"))&&(id==="dental-clinic"||id==="corporate")){score+=10;reasons.push("clean professional style")}
    if(goals.some(v=>v.includes("book appointment"))&&(id==="dental-clinic"||id==="premium-implant-clinic"))score+=12;
    if(capabilities.some(v=>v.includes("gallery"))&&["premium-implant-clinic","restaurant","real-estate","construction"].includes(id))score+=8;
    if(goals.some(v=>v.includes("build trust"))&&["dental-clinic","premium-implant-clinic","corporate","construction"].includes(id))score+=8;
    if(score===0&&id==="corporate")score=1;
    return{preset,score,reasons};
  }).sort((a,b)=>b.score-a.score||a.preset.name.localeCompare(b.preset.name));
}
function norm(value:unknown){return typeof value==="string"?value.trim().toLowerCase():""}
function norms(value:unknown){return Array.isArray(value)?value.map(norm).filter(Boolean):[]}
