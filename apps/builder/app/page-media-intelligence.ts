import type { Site } from "@micirql/schema";
import type { VisualMediaPlan, SectionVisualDecision } from "./visual-media-intelligence";
import { FAMILY_CODES, SECTION_FAMILIES, type SectionFamily } from "@micirql/sections";

export function planPageMedia(site: Site, industry: string): VisualMediaPlan {
  const dental = /dental|dentist|clinic|orthodont|endodont|implant/i.test(industry);
  const decisions: SectionVisualDecision[] = [];
  for (const page of site.pages) {
    const role = pageRole(page.id, page.path);
    for (const section of page.sections) {
      const family = familyFromId(section.component.componentId);
      if (!family) continue;
      const decision = decidePageVisual(role, page.path, page.name, family, dental);
      if (decision) decisions.push(decision);
    }
  }
  return {
    style: dental ? "photographic" : "mixed",
    sections: dedupe(decisions),
    rules: [
      "Media intent is page-specific, not copied from the homepage.",
      "Doctors and team pages require real or verified portraits; never synthesize staff identities.",
      "Results and gallery pages require supplied or verified case media; never synthesize before-and-after outcomes.",
      "Service-detail pages may use a generic non-identifying contextual hero when no truthful reusable asset exists.",
      "FAQ and Contact pages should remain text-led unless the user explicitly supplies useful imagery.",
    ],
  };
}

function decidePageVisual(role:string,pagePath:string,pageName:string,family:SectionFamily,dental:boolean):SectionVisualDecision|undefined {
  const avoid=["fake staff","fake clinic interiors","synthetic treatment results","unsupported equipment","generic handshake stock photography"];
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

function pageRole(id:string,path:string){if(path.startsWith("/services/"))return"service-detail";if(id==="services")return"services";if(id==="team")return"team";if(id==="gallery")return"gallery";if(id==="faq")return"faq";if(id==="contact")return"contact";if(id==="about")return"about";return"home";}
function familyFromId(componentId:string):SectionFamily|undefined{const normalized=componentId.toLowerCase();const legacy=SECTION_FAMILIES.find(f=>normalized===`${f}.placeholder`||normalized.startsWith(`${f}.`));if(legacy)return legacy;const upper=componentId.toUpperCase();return SECTION_FAMILIES.find(f=>upper.includes(`-${FAMILY_CODES[f]}-`));}
function dedupe(items:SectionVisualDecision[]){const seen=new Set<string>();return items.filter(item=>{const key=`${item.pagePath}|${item.family}`;if(seen.has(key))return false;seen.add(key);return true;});}
