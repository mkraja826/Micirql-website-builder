import type { Site } from "@micirql/schema";
import type { VisualMediaPlan, SectionVisualDecision } from "./visual-media-intelligence";
import { FAMILY_CODES, SECTION_FAMILIES, type SectionFamily } from "@micirql/sections";

export type PageMediaContext = {
  subindustry?: string | null;
  services?: string[];
  goals?: string[];
  notes?: string | null;
};

export function planPageMedia(site: Site, industry: string, context: PageMediaContext = {}): VisualMediaPlan {
  const briefText = [industry, context.subindustry, ...(context.services ?? []), ...(context.goals ?? []), context.notes]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const dental = /dental|dentist|clinic|orthodont|endodont|implant|smile design|veneer/.test(briefText);
  const decisions: SectionVisualDecision[] = [];
  for (const page of site.pages) {
    const role = pageRole(page.id, page.path);
    for (const section of page.sections) {
      const family = familyFromId(section.component.componentId);
      if (!family) continue;
      const decision = decidePageVisual(role, page.path, page.name, family, dental, briefText);
      if (decision) decisions.push(decision);
    }
  }
  return {
    style: dental ? "photographic" : "mixed",
    sections: dedupe(decisions),
    rules: [
      "Media intent is page-specific, not copied from the homepage.",
      "The homepage hero image must reinforce the dominant treatment or business intent expressed in the supplied brief.",
      "Doctors and team pages require real or verified portraits; never synthesize staff identities.",
      "Results and gallery pages require supplied or verified case media; never synthesize before-and-after outcomes.",
      "Service-detail pages may use a generic non-identifying contextual hero when no truthful reusable asset exists.",
      "FAQ and Contact pages should remain text-led unless the user explicitly supplies useful imagery.",
    ],
  };
}

function decidePageVisual(role:string,pagePath:string,pageName:string,family:SectionFamily,dental:boolean,briefText:string):SectionVisualDecision|undefined {
  const avoid=["fake staff","fake clinic interiors","synthetic treatment results","unsupported equipment","generic handshake stock photography"];
  if(role==="home"&&family==="hero") {
    if(!dental) return {family,pagePath,role:"hero-photo",prominence:"dominant",aspect:"wide",subject:"Authentic hero imagery that directly reflects the business's primary offering or customer outcome stated in the brief",avoid:[...avoid,"unrelated decorative stock imagery"],preferredTags:["hero","primary-offering"]};
    const dentalHero=dentalHomeHero(briefText);
    return {family,pagePath,role:"hero-photo",prominence:"dominant",aspect:dentalHero.aspect,subject:dentalHero.subject,avoid:[...avoid,...dentalHero.avoid],preferredTags:dentalHero.tags};
  }
  if(role==="contact"||role==="faq") return family==="hero"||family==="contact"||family==="cta"?{family,pagePath,role:"none",prominence:"supporting",aspect:"wide",subject:"Text-led conversion page; no generated image needed",avoid}:undefined;
  if(role==="team") {
    if(family==="team") return {family,pagePath,role:"people",prominence:"dominant",aspect:"portrait",subject:"Verified portraits of the real doctors or team members supplied by the business",avoid:[...avoid,"generated portraits","fictional clinicians"],preferredTags:["verified-team","doctor","portrait"]};
    if(family==="hero") return {family,pagePath,role:"none",prominence:"supporting",aspect:"wide",subject:"Keep the doctors page hero text-led unless verified team photography is supplied",avoid};
  }
  if(role==="gallery") {
    if(family==="gallery") return {family,pagePath,role:"portfolio",prominence:"dominant",aspect:"3:2",subject:"Verified real case, result, portfolio or before-and-after media supplied by the business",avoid:[...avoid,"generated outcomes","fictional before-and-after"],preferredTags:["verified-case","results","gallery"]};
    if(family==="hero") return {family,pagePath,role:"none",prominence:"supporting",aspect:"wide",subject:"Let verified result media carry the page; do not generate a decorative hero",avoid};
  }
  if(role==="service-detail"&&family==="hero") {
    return {family,pagePath,role:dental?"hero-photo":"abstract",prominence:"balanced",aspect:"wide",subject:dental?`Generic non-identifying dental consultation or treatment-planning context relevant to ${pageName}; not the actual clinic, staff or patient`: `Generic non-identifying visual context relevant to ${pageName}`,avoid:[...avoid,"identifiable patient","before-and-after result"],preferredTags:["dental",pageName.toLowerCase(),"service","hero"]};
  }
  if(role==="services"&&family==="services") return {family,pagePath,role:dental?"hero-photo":"portfolio",prominence:"balanced",aspect:"4:3",subject:dental?"Truthful service-specific dental context covering only treatments stated in the brief":"Authentic service imagery matching stated offerings",avoid,preferredTags:["service","treatment"]};
  if(role==="about"&&family==="about") return {family,pagePath,role:"place",prominence:"balanced",aspect:"3:2",subject:"Verified real business environment, founder, team or brand-story media when supplied",avoid:[...avoid,"fabricated premises"],preferredTags:["about","business-environment"]};
  return undefined;
}

function dentalHomeHero(briefText:string): {subject:string;aspect:"portrait"|"wide";avoid:string[];tags:string[]} {
  if(/implant|full[- ]arch|all[- ]on[- ](?:4|6)|prosthodont/.test(briefText)) return {
    subject:"Premium implant consultation or restorative treatment-planning scene with an adult patient and clinician in a calm high-value healthcare setting; focus on consultation confidence and planning rather than a generic smile portrait",
    aspect:"portrait",
    avoid:["generic smiling-patient lifestyle photo","cosmetic-only beauty portrait","visible surgical procedure","implant product brand","claiming specific scanner or guided-surgery technology","before-and-after result"],
    tags:["dental","implant","implant-planning","restorative","consultation","premium","hero"],
  };
  if(/cosmetic dentistry|smile design|smile makeover|veneer/.test(briefText)) return {
    subject:"Luminous natural-smile or cosmetic consultation portrait with soft editorial light and clear smile-design context; authentic confidence without presenting a fabricated treatment outcome",
    aspect:"portrait",
    avoid:["synthetic perfect teeth","before-and-after result","implant-surgery imagery","generic clinic stock"],
    tags:["dental","cosmetic","smile-design","natural-smile","editorial","hero"],
  };
  if(/orthodont|aligner|braces/.test(briefText)) return {
    subject:"Friendly orthodontic consultation with aligner, braces or treatment-planning context, modern and reassuring without implying unsupported equipment ownership",
    aspect:"wide",
    avoid:["fake treatment result","branded aligner product unless supplied","generic unrelated smile stock"],
    tags:["dental","orthodontics","aligner","braces","consultation","hero"],
  };
  if(/endodont|root canal/.test(briefText)) return {
    subject:"Calm precision endodontic consultation or diagnosis-planning context with restrained clinical detail and no graphic procedure imagery",
    aspect:"wide",
    avoid:["graphic procedure","pain imagery","unsupported microscope or equipment claim","generic cosmetic smile portrait"],
    tags:["dental","endodontics","root-canal","precision","consultation","hero"],
  };
  return {
    subject:"Welcoming general dental consultation with natural patient-clinician interaction and clean modern care context; specific to dentistry rather than generic healthcare stock",
    aspect:"wide",
    avoid:["generic hospital imagery","synthetic treatment result","fictional clinic interior"],
    tags:["dental","general-dentistry","consultation","natural","hero"],
  };
}

function pageRole(id:string,path:string){if(path.startsWith("/services/"))return"service-detail";if(id==="services")return"services";if(id==="team")return"team";if(id==="gallery")return"gallery";if(id==="faq")return"faq";if(id==="contact")return"contact";if(id==="about")return"about";return"home";}
function familyFromId(componentId:string):SectionFamily|undefined{const normalized=componentId.toLowerCase();const legacy=SECTION_FAMILIES.find(f=>normalized===`${f}.placeholder`||normalized.startsWith(`${f}.`));if(legacy)return legacy;const upper=componentId.toUpperCase();return SECTION_FAMILIES.find(f=>upper.includes(`-${FAMILY_CODES[f]}-`));}
function dedupe(items:SectionVisualDecision[]){const seen=new Set<string>();return items.filter(item=>{const key=`${item.pagePath}|${item.family}`;if(seen.has(key))return false;seen.add(key);return true;});}
