import { siteSchema, type Site } from "@micirql/schema";
import { FAMILY_CODES, SECTION_FAMILIES, sectionDesignId, type SectionFamily, type SectionVariant } from "@micirql/sections";
import type { WebsiteComposition } from "./composition-intelligence";
import type { GenerationQualityProfile } from "./generation-quality-intelligence";

/** Applies composition and quality decisions without inventing content/components. */
export function applyComposition(site: Site, composition: WebsiteComposition, quality?: GenerationQualityProfile): Site {
  const next = structuredClone(site);
  next.theme = mergeThemeKeepingBrand(next, composition, quality);
  for (const page of next.pages) {
    if (!page.sections.length) continue;
    const buckets = new Map<SectionFamily, typeof page.sections>();
    const unknown: typeof page.sections = [];
    for (const section of page.sections) {
      const family = familyFromId(section.component.componentId);
      if (!family) { unknown.push(section); continue; }
      const bucket = buckets.get(family) ?? []; bucket.push(section); buckets.set(family, bucket);
    }
    const decisions = quality ? prioritize(composition.sections, quality) : composition.sections;
    const ordered: typeof page.sections = [];
    for (const decision of decisions) {
      const bucket = buckets.get(decision.family); if (!bucket?.length) continue;
      for (const section of bucket) {
        section.component={componentId:sectionDesignId(composition.preset.theme.family,decision.family,decision.variant),version:section.component.version};
        ordered.push(section);
      }
      buckets.delete(decision.family);
    }
    // Quality may deliberately shorten the primary narrative. Never delete generated
    // content: remaining sections are retained after the primary conversion story.
    for (const sections of buckets.values()) ordered.push(...sections);
    ordered.push(...unknown);
    page.sections=ordered;
  }
  return siteSchema.parse(next);
}

function prioritize(sections:WebsiteComposition["sections"],q:GenerationQualityProfile){
  const weighted=sections.map((s,index)=>({s,index,weight:weight(s.family,q)}));
  const hero=weighted.find(x=>x.s.family==="hero");
  const tail=weighted.filter(x=>x.s.family==="cta"||x.s.family==="contact");
  const middle=weighted.filter(x=>x!==hero&&!tail.includes(x)).sort((a,b)=>b.weight-a.weight||a.index-b.index);
  const max=Math.max(3,q.maxPrimarySections);const result=[...(hero?[hero]:[]),...middle,...tail].slice(0,max);
  // Preserve final CTA/contact when present even on compact pages.
  for(const item of tail){if(!result.includes(item)){if(result.length>=max)result.splice(Math.max(1,result.length-1),1);result.push(item);}}
  return result.map(x=>x.s);
}
function weight(f:SectionFamily,q:GenerationQualityProfile){let w=50;if(f==="hero")return 100;if(f==="cta"||f==="contact")w+=q.ctaStrength==="strong"?35:20;if(f==="testimonials"||f==="team"||f==="about")w+=Math.round(q.trustWeight/4);if(f==="gallery")w+=Math.round(q.visualWeight/3);if(f==="features"||f==="process")w+=q.heroEmphasis==="product"?25:5;if(f==="services")w+=q.mobileStrategy==="conversion-first"?20:8;return w;}
function mergeThemeKeepingBrand(site:Site,composition:WebsiteComposition,quality?:GenerationQualityProfile){const existingColors=structuredClone(site.theme.brand.colors);const theme=structuredClone(composition.preset.theme);theme.brand.colors=existingColors;if(quality){theme.density=quality.contentDensity==="compact"?"compact":quality.contentDensity==="rich"?"spacious":"comfortable";theme.motion=quality.sectionRhythm==="cinematic"?"rich":quality.sectionRhythm==="tight"?"subtle":theme.motion;}return theme;}
function familyFromId(componentId:string):SectionFamily|undefined{const normalized=componentId.toLowerCase();const legacy=SECTION_FAMILIES.find(f=>normalized===`${f}.placeholder`||normalized.startsWith(`${f}.`));if(legacy)return legacy;const upper=componentId.toUpperCase();return SECTION_FAMILIES.find(f=>upper.includes(`-${FAMILY_CODES[f]}-`));}
export function currentVariant(componentId:string):SectionVariant{const match=componentId.match(/-(00[1-5])$/);const value=match?Number(match[1]):1;return value>=1&&value<=5?value as SectionVariant:1;}
