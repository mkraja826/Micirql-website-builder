import { siteSchema, type Site } from "@micirql/schema";
import { deriveBrandIntelligence, type BrandIntelligenceProfile } from "@micirql/design-engine";
import { FAMILY_CODES, SECTION_FAMILIES, sectionDesignId, type SectionFamily, type SectionVariant } from "@micirql/sections";
import type { WebsiteComposition } from "./composition-intelligence";
import type { GenerationQualityProfile } from "./generation-quality-intelligence";

const SINGLETON_FAMILIES = new Set<SectionFamily>(["hero", "services", "testimonials", "gallery", "team", "cta", "contact"]);
const SCAFFOLD_COPY = /primary offering|supporting offering|additional offering|point (one|two|three|four|five)|team member|verified proof|image slot|add (a|an|the|another|real|verified)|ready to discuss (home|contact|doctor|cases|services|treatments)|a clear overview of (home|contact|doctor|cases|services|treatments)|explore (home|contact|doctor|cases) and find the right next step/i;

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
      const bucket = buckets.get(family) ?? [];
      if (SINGLETON_FAMILIES.has(family) && bucket.length) {
        const current = bucket[0];
        if (sectionQualityScore(section) > sectionQualityScore(current)) bucket[0] = section;
      } else {
        bucket.push(section);
      }
      buckets.set(family, bucket);
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
  for(const item of tail){if(!result.includes(item)){if(result.length>=max)result.splice(Math.max(1,result.length-1),1);result.push(item);}}
  return result.map(x=>x.s);
}
function weight(f:SectionFamily,q:GenerationQualityProfile){let w=50;if(f==="hero")return 100;if(f==="cta"||f==="contact")w+=q.ctaStrength==="strong"?35:20;if(f==="testimonials"||f==="team"||f==="about")w+=Math.round(q.trustWeight/4);if(f==="gallery")w+=Math.round(q.visualWeight/3);if(f==="features"||f==="process")w+=q.heroEmphasis==="product"?25:5;if(f==="services")w+=q.mobileStrategy==="conversion-first"?20:8;return w;}

function mergeThemeKeepingBrand(site:Site,composition:WebsiteComposition,quality?:GenerationQualityProfile){
  const existingBrand=structuredClone(site.theme.brand);
  const theme=structuredClone(composition.preset.theme);

  theme.brand.colors=existingBrand.colors;
  preserveGeneratedBrandAssets(theme.brand, existingBrand);

  const intelligence=deriveBrandIntelligence({
    industry: [site.domain, site.subtype, composition.preset.id].filter(Boolean).join(" "),
    businessType: `${composition.preset.id} ${composition.preset.name}`,
    audience: site.seoBlueprint.audiences.join(" "),
    ...(existingBrand.logoPresentation?.shape ? { logoShape: existingBrand.logoPresentation.shape } : {}),
  });

  theme.brand.density=intelligence.density;
  theme.brand.shape=intelligence.shape;
  theme.brand.motion=intelligence.motion;
  theme.brand.typography=typographyFor(intelligence.typographyMood, theme.brand.typography);
  theme.brand.intelligence={
    tone:intelligence.tone,
    typographyMood:intelligence.typographyMood,
    buttonStyle:intelligence.buttonStyle,
    imageryStyle:intelligence.imageryStyle,
    recommendations:intelligence.recommendations,
  };

  if(quality){
    if(quality.contentDensity==="compact")theme.brand.density="compact";
    else if(quality.contentDensity==="rich"&&theme.brand.density!=="compact")theme.brand.density="spacious";
    if(quality.sectionRhythm==="cinematic"&&theme.brand.motion!=="none")theme.brand.motion="rich";
    else if(quality.sectionRhythm==="tight"&&theme.brand.motion==="standard")theme.brand.motion="subtle";
  }
  if(site.domain==="clinic"){
    theme.brand.motion="subtle";
    if(theme.brand.density==="compact")theme.brand.density="comfortable";
  }
  return theme;
}

function preserveGeneratedBrandAssets(target:Site["theme"]["brand"],source:Site["theme"]["brand"]){
  if(source.logoAssetId)target.logoAssetId=source.logoAssetId;
  if(source.logoOriginalAssetId)target.logoOriginalAssetId=source.logoOriginalAssetId;
  if(source.logoCleanupAssetId)target.logoCleanupAssetId=source.logoCleanupAssetId;
  if(source.logoPresentation)target.logoPresentation=source.logoPresentation;
  if(source.faviconAssetId)target.faviconAssetId=source.faviconAssetId;
  if(source.faviconStrategy)target.faviconStrategy=source.faviconStrategy;
  if(source.socialImageAssetId)target.socialImageAssetId=source.socialImageAssetId;
  if(source.socialImageStrategy)target.socialImageStrategy=source.socialImageStrategy;
  if(source.history)target.history=source.history;
}

function typographyFor(mood:BrandIntelligenceProfile["typographyMood"],fallback:Site["theme"]["brand"]["typography"]):Site["theme"]["brand"]["typography"]{
  const sans='Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  if(mood==="editorial"||mood==="classic")return{...fallback,display:'Georgia, "Times New Roman", serif',body:sans,ui:sans};
  if(mood==="geometric")return{...fallback,display:'"Avenir Next", Avenir, Montserrat, ui-sans-serif, system-ui, sans-serif',body:sans,ui:sans};
  if(mood==="technical")return{...fallback,display:sans,body:sans,ui:sans,mono:'"SFMono-Regular", Consolas, "Liberation Mono", monospace'};
  return{...fallback,display:sans,body:sans,ui:sans};
}

function sectionQualityScore(section:Site["pages"][number]["sections"][number]){
  const props=section.props??{};
  const values:string[]=[];
  for(const key of ["title","heading","description","body","eyebrow"]){const value=props[key];if(typeof value==="string"&&value.trim())values.push(value.trim());}
  if(Array.isArray(props.items))for(const raw of props.items){if(!raw||typeof raw!=="object")continue;const item=raw as Record<string,unknown>;for(const key of ["title","description"]){const value=item[key];if(typeof value==="string"&&value.trim())values.push(value.trim());}}
  let score=values.join(" ").length;
  for(const value of values)if(SCAFFOLD_COPY.test(value))score-=250;
  if(Array.isArray(props.items)&&props.items.length===0)score-=80;
  return score;
}

function familyFromId(componentId:string):SectionFamily|undefined{const normalized=componentId.toLowerCase();const legacy=SECTION_FAMILIES.find(f=>normalized===`${f}.placeholder`||normalized.startsWith(`${f}.`));if(legacy)return legacy;const upper=componentId.toUpperCase();return SECTION_FAMILIES.find(f=>upper.includes(`-${FAMILY_CODES[f]}-`));}
export function currentVariant(componentId:string):SectionVariant{const match=componentId.match(/-(00[1-5])$/);const value=match?Number(match[1]):1;return value>=1&&value<=5?value as SectionVariant:1;}
