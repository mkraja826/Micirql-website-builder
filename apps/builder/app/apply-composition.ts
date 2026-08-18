import { siteSchema, type Site } from "@micirql/schema";
import { deriveBrandIntelligence, type BrandIntelligenceProfile } from "@micirql/design-engine";
import { FAMILY_CODES, SECTION_FAMILIES, sectionDesignId, type SectionFamily, type SectionVariant } from "@micirql/sections";
import type { WebsiteComposition } from "./composition-intelligence";
import type { GenerationQualityProfile } from "./generation-quality-intelligence";
import { applyPremiumCorrectivePass } from "./premium-corrective-pass";
import { applyWebsiteLayoutBlueprint, layoutCoverage } from "./apply-layout-blueprint";

const SINGLETON_FAMILIES = new Set<SectionFamily>(["hero", "services", "testimonials", "gallery", "team", "cta", "contact"]);
const ITEM_CONTENT_FAMILIES = new Set<SectionFamily>(["services", "features", "process", "testimonials", "gallery", "team"]);
const SCAFFOLD_COPY = /primary offering|supporting offering|additional offering|point (one|two|three|four|five)|team member|verified proof|image slot|add (a|an|the|another|real|verified)|ready to discuss (home|contact|doctor|cases|services|treatments)|a clear overview of (home|contact|doctor|cases|services|treatments)|explore (home|contact|doctor|cases) and find the right next step/i;

type SiteSection = Site["pages"][number]["sections"][number];
type PaletteRole = "background" | "surface" | "primary" | "secondary" | "accent";

export function applyComposition(site: Site, composition: WebsiteComposition, quality?: GenerationQualityProfile): Site {
  const next = structuredClone(site);
  next.theme = mergeThemeKeepingBrand(next, composition, quality);
  const candidate = composition.layoutCandidate;

  // A complete certified full-site blueprint is more authoritative than the
  // generic composition pass. Check coverage before generic family filtering or
  // singleton de-duplication can discard a section the blueprint explicitly
  // requires (for example separate trust and proof testimonial blocks).
  if (candidate?.layout.status === "certified") {
    const layoutReady = structuredClone(next);
    for (const page of layoutReady.pages) {
      if (!page.sections.length) continue;
      page.sections = applyIndustryPresentation(page.sections, composition);
    }
    const preparedSite = siteSchema.parse(layoutReady);
    const coverage = layoutCoverage(preparedSite, candidate.layout);
    if (coverage.complete) {
      const laidOutSite = applyWebsiteLayoutBlueprint(preparedSite, candidate.layout);
      return applyPremiumCorrectivePass(laidOutSite).site;
    }
  }

  for (const page of next.pages) {
    if (!page.sections.length) continue;
    const buckets = new Map<SectionFamily, typeof page.sections>(), shellStart:typeof page.sections=[], shellEnd:typeof page.sections=[], unknown:typeof page.sections=[];
    for (const section of page.sections) {
      const family = familyFromId(section.component.componentId);
      if (!family) { unknown.push(section); continue; }
      if (family === "navbar") { shellStart.push(section); continue; }
      if (family === "footer") { shellEnd.push(section); continue; }
      const bucket = buckets.get(family) ?? [];
      if (SINGLETON_FAMILIES.has(family) && bucket.length) { const current=bucket[0]; if(current&&sectionQualityScore(section)>sectionQualityScore(current))bucket[0]=section; }
      else bucket.push(section);
      buckets.set(family,bucket);
    }
    const decisions=quality?prioritize(composition.sections,quality):composition.sections,ordered:typeof page.sections=[];
    for(const decision of decisions){const bucket=buckets.get(decision.family);if(!bucket?.length)continue;for(const section of bucket){section.component={componentId:sectionDesignId(composition.preset.theme.family,decision.family,decision.variant),version:section.component.version};ordered.push(section);}buckets.delete(decision.family);}
    const composed=[...shellStart,...ordered.filter(section=>!isScaffoldSection(section)),...unknown.filter(section=>!isScaffoldSection(section)),...shellEnd];
    page.sections=applyIndustryPresentation(composed,composition);
  }
  const composedSite = siteSchema.parse(next);
  const correctedSite = applyPremiumCorrectivePass(composedSite).site;
  if (candidate?.layout.status === "certified") {
    const coverage = layoutCoverage(correctedSite, candidate.layout);
    if (coverage.complete) return applyWebsiteLayoutBlueprint(correctedSite, candidate.layout);
  }
  return correctedSite;
}

function applyIndustryPresentation(sections:SiteSection[],composition:WebsiteComposition):SiteSection[]{
  const selection=composition.industryPack;
  if(!selection)return sections;
  let contentIndex=0;
  return sections.map(section=>{
    const family=familyFromId(section.component.componentId);
    if(!family)return section;
    if(family==="navbar"||family==="footer")return section;
    const next=structuredClone(section);
    const role=surfaceRole(selection.pack.id,family,contentIndex++);
    next.props={...next.props,paletteRole:role,cardPaletteRole:cardRole(role),ctaPaletteRole:ctaRole(family,role),...imagePresentation(next,family,selection.pack.id)};
    return next;
  });
}

function surfaceRole(packId:string,family:SectionFamily,index:number):PaletteRole{
  if(family==="cta")return"primary";
  if(packId==="dental"){
    if(family==="hero")return"background";
    if(family==="services"||family==="testimonials"||family==="contact")return"background";
    if(family==="features"&&index>1)return"secondary";
    return index%2===0?"background":"surface";
  }
  if(packId==="real-estate"){
    if(family==="hero")return"primary";
    if(family==="gallery")return"background";
    if(family==="testimonials"||family==="contact")return"surface";
    if(family==="features")return"background";
    return index%3===0?"background":"surface";
  }
  return index%2===0?"background":"surface";
}

function cardRole(sectionRole:PaletteRole):PaletteRole{
  if(sectionRole==="primary"||sectionRole==="secondary"||sectionRole==="accent")return"surface";
  return sectionRole==="background"?"surface":"background";
}

function ctaRole(family:SectionFamily,sectionRole:PaletteRole):PaletteRole{
  if(family==="cta")return"accent";
  if(sectionRole==="primary"||sectionRole==="secondary")return"accent";
  return"primary";
}

function imagePresentation(section:SiteSection,family:SectionFamily,packId:string):Record<string,unknown>{
  const props=section.props??{};
  const hasSectionImage=isImageObject(props.image);
  const items=Array.isArray(props.items)?props.items:[];
  const allItemImages=items.length>0&&items.every(item=>isRecord(item)&&typeof item.image==="string"&&item.image.trim().length>0);
  if(family==="hero"&&hasSectionImage)return{imageSlotMode:"section",imageRatio:packId==="real-estate"?"16:9":"4:3",imageFit:"cover",imageFocalPoint:"face-safe"};
  if((family==="gallery"||family==="team"||family==="services")&&allItemImages)return{imageSlotMode:"items",itemImageRatio:family==="team"?"4:5":packId==="real-estate"?"3:2":"4:3",imageFit:"cover",imageFocalPoint:family==="team"?"face-safe":"center"};
  return{};
}

function isImageObject(value:unknown):boolean{return isRecord(value)&&typeof value.src==="string"&&value.src.trim().length>0;}
function isRecord(value:unknown):value is Record<string,unknown>{return Boolean(value)&&typeof value==="object"&&!Array.isArray(value);}

function prioritize(sections:WebsiteComposition["sections"],q:GenerationQualityProfile){const weighted=sections.map((s,index)=>({s,index,weight:weight(s.family,q)})),hero=weighted.find(x=>x.s.family==="hero"),tail=weighted.filter(x=>x.s.family==="cta"||x.s.family==="contact"),middle=weighted.filter(x=>x!==hero&&!tail.includes(x)).sort((a,b)=>b.weight-a.weight||a.index-b.index),max=Math.max(3,q.maxPrimarySections),result=[...(hero?[hero]:[]),...middle,...tail].slice(0,max);for(const item of tail){if(!result.includes(item)){if(result.length>=max)result.splice(Math.max(1,result.length-1),1);result.push(item);}}return result.map(x=>x.s);}
function weight(f:SectionFamily,q:GenerationQualityProfile){let w=50;if(f==="hero")return 100;if(f==="cta"||f==="contact")w+=q.ctaStrength==="strong"?35:20;if(f==="testimonials"||f==="team"||f==="about")w+=Math.round(q.trustWeight/4);if(f==="gallery")w+=Math.round(q.visualWeight/3);if(f==="features"||f==="process")w+=q.heroEmphasis==="product"?25:5;if(f==="services")w+=q.mobileStrategy==="conversion-first"?20:8;return w;}

function mergeThemeKeepingBrand(site:Site,composition:WebsiteComposition,quality?:GenerationQualityProfile){
  const existingBrand=structuredClone(site.theme.brand),theme=structuredClone(composition.preset.theme);
  theme.brand.colors=existingBrand.colors;preserveGeneratedBrandAssets(theme.brand,existingBrand);
  const intelligence=deriveBrandIntelligence({industry:[site.domain,site.subtype,composition.preset.id].filter(Boolean).join(" "),businessType:`${composition.preset.id} ${composition.preset.name}`,audience:site.seoBlueprint.audiences.join(" "),...(existingBrand.logoPresentation?.shape?{logoShape:existingBrand.logoPresentation.shape}:{})});
  theme.brand.density=intelligence.density;theme.brand.shape=intelligence.shape;theme.brand.motion=intelligence.motion;theme.brand.typography=typographyFor(intelligence.typographyMood,theme.brand.typography);
  theme.brand.intelligence={tone:intelligence.tone,typographyMood:intelligence.typographyMood,buttonStyle:intelligence.buttonStyle,imageryStyle:intelligence.imageryStyle,recommendations:intelligence.recommendations};
  const selection=composition.industryPack;
  if(selection){
    const p=selection.palette.colors,old=theme.brand.colors;
    theme.brand.colors={primary:p.primary,secondary:p.secondary,accent:p.accent,background:p.surfaceAlt,surface:p.surface,textPrimary:p.text,textSecondary:p.mutedText,border:p.border,success:old.success,warning:old.warning,error:old.error};
    theme.brand.typography={...theme.brand.typography,display:selection.typography.display,body:selection.typography.body,ui:selection.typography.ui};
    theme.brand.intelligence={...theme.brand.intelligence,recommendations:[...selection.reasons,...(selection.subindustry?.imageryProfile??[]),...selection.pack.mobileRules].slice(0,12)};
  }
  if(quality){if(quality.contentDensity==="compact")theme.brand.density="compact";else if(quality.contentDensity==="rich"&&theme.brand.density!=="compact")theme.brand.density="spacious";if(quality.sectionRhythm==="cinematic"&&theme.brand.motion!=="none")theme.brand.motion="rich";else if(quality.sectionRhythm==="tight"&&theme.brand.motion==="standard")theme.brand.motion="subtle";}
  if(site.domain==="clinic"){theme.brand.motion="subtle";if(theme.brand.density==="compact")theme.brand.density="comfortable";const surface=theme.brand.colors.surface.toLowerCase();if(surface==="#171717"||surface==="#111111"||surface==="#000000")theme.brand.colors.surface="#F4F8FA";}
  return theme;
}

function preserveGeneratedBrandAssets(target:Site["theme"]["brand"],source:Site["theme"]["brand"]){if(source.logoAssetId)target.logoAssetId=source.logoAssetId;if(source.logoOriginalAssetId)target.logoOriginalAssetId=source.logoOriginalAssetId;if(source.logoCleanupAssetId)target.logoCleanupAssetId=source.logoCleanupAssetId;if(source.logoPresentation)target.logoPresentation=source.logoPresentation;if(source.faviconAssetId)target.faviconAssetId=source.faviconAssetId;if(source.faviconStrategy)target.faviconStrategy=source.faviconStrategy;if(source.socialImageAssetId)target.socialImageAssetId=source.socialImageAssetId;if(source.socialImageStrategy)target.socialImageStrategy=source.socialImageStrategy;if(source.history)target.history=source.history;}
function typographyFor(mood:BrandIntelligenceProfile["typographyMood"],fallback:Site["theme"]["brand"]["typography"]):Site["theme"]["brand"]["typography"]{const sans='Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';if(mood==="editorial"||mood==="classic")return{...fallback,display:'Georgia, "Times New Roman", serif',body:sans,ui:sans};if(mood==="geometric")return{...fallback,display:'"Avenir Next", Avenir, Montserrat, ui-sans-serif, system-ui, sans-serif',body:sans,ui:sans};if(mood==="technical")return{...fallback,display:sans,body:sans,ui:sans,mono:'"SFMono-Regular", Consolas, "Liberation Mono", monospace'};return{...fallback,display:sans,body:sans,ui:sans};}
function sectionQualityScore(section:SiteSection){const props=section.props??{},values=sectionTextValues(section);let score=values.join(" ").length;for(const value of values)if(SCAFFOLD_COPY.test(value))score-=250;if(Array.isArray(props.items)&&props.items.length===0)score-=80;return score;}
function isScaffoldSection(section:SiteSection){const family=familyFromId(section.component.componentId);if(family==="navbar"||family==="footer"||family==="contact")return false;const props=section.props??{};if(family&&ITEM_CONTENT_FAMILIES.has(family)&&(!Array.isArray(props.items)||props.items.length===0))return true;return sectionTextValues(section).some(value=>SCAFFOLD_COPY.test(value));}
function sectionTextValues(section:SiteSection){const props=section.props??{},values:string[]=[];for(const key of ["title","heading","description","body","eyebrow"]){const value=props[key];if(typeof value==="string"&&value.trim())values.push(value.trim());}if(Array.isArray(props.items))for(const raw of props.items){if(!raw||typeof raw!=="object")continue;const item=raw as Record<string,unknown>;for(const key of ["title","description"]){const value=item[key];if(typeof value==="string"&&value.trim())values.push(value.trim());}}return values;}
function familyFromId(componentId:string):SectionFamily|undefined{const normalized=componentId.toLowerCase(),legacy=SECTION_FAMILIES.find(f=>normalized===`${f}.placeholder`||normalized.startsWith(`${f}.`));if(legacy)return legacy;const upper=componentId.toUpperCase();return SECTION_FAMILIES.find(f=>upper.includes(`-${FAMILY_CODES[f]}-`));}
export function currentVariant(componentId:string):SectionVariant{const match=componentId.match(/-(00[1-5])$/),value=match?Number(match[1]):1;return value>=1&&value<=5?value as SectionVariant:1;}
