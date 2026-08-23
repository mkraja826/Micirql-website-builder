import { siteSchema, type Site } from "@micirql/schema";
import { FAMILY_CODES, SECTION_FAMILIES, type SectionFamily } from "@micirql/sections";
import type { MediaExecutionPlan, MediaRequest } from "./media-execution";

/** Writes resolved media into the existing universal section image contract. */
export function applyMediaExecution(site:Site,execution:MediaExecutionPlan):Site{
 const next=structuredClone(site);const queues=group(execution.requests);
 for(const page of next.pages){for(const section of page.sections){const family=familyFromId(section.component.componentId);if(!family)continue;const targeted=queues.get(`${page.path}|${family}`),fallback=queues.get(`*|${family}`);const request=targeted?.shift()??fallback?.shift();if(!request)continue;apply(section.props,request,family);}}
 return siteSchema.parse(next);
}
function apply(props:Record<string,unknown>,request:MediaRequest,family:SectionFamily){
 if(request.source==="none"||!request.asset)return;
 const image={src:request.asset.url,alt:request.alt};
 props.image=image;props.imageSlotMode="section";
 props.imageFit=family==="features"?"contain":"cover";
 props.imageFocalPoint=request.asset.tags.some(tag=>/person|people|team|portrait|face/i.test(tag))||request.desiredAspect==="portrait"?"face-safe":"center";
 const ratio=normalizeRatio(request.desiredAspect??request.asset.aspect);if(ratio)props.imageRatio=ratio;
 if(request.qualifiedAlternates?.length){
  props.qualifiedMediaAlternates=request.qualifiedAlternates.map(({asset,score,reason})=>({
   id:asset.id,url:asset.url,alt:asset.alt??request.alt,tags:[...asset.tags],aspect:asset.aspect,verified:Boolean(asset.verified),
   ...(asset.width?{width:asset.width}:{}),...(asset.height?{height:asset.height}:{}),score,reason,
  }));
 }
 props.mediaSelectionIntent={
  source:request.source,
  desiredAspect:request.desiredAspect,
  preferredTags:[...(request.preferredTags??[])],
  selectedAssetTags:[...request.asset.tags],
  reason:request.reason,
 };
 if(family==="gallery"||family==="team"||family==="features"){
  const items=Array.isArray(props.items)?props.items as Array<Record<string,unknown>>:[];
  const target=items.find(item=>!item.image);
  if(target){
   // Never write the same asset into both the section image and an item image.
   // That manufactured duplicate placements and caused otherwise-valid builds to
   // fail visual-diversity QA. Use a qualified distinct alternate when present;
   // otherwise keep the item unfilled and let the section image carry the visual.
   const alternate=request.qualifiedAlternates?.find(({asset})=>asset.url&&asset.url!==request.asset?.url)?.asset;
   if(alternate?.url){
    target.image=alternate.url;
    props.imageSlotMode="both";
   }
  }
 }
}
function normalizeRatio(value?:string){if(value==="1:1"||value==="4:3"||value==="3:2"||value==="16:9")return value;return value==="wide"?"21:9":value==="portrait"?"4:5":undefined;}
function group(requests:MediaRequest[]){const map=new Map<string,MediaRequest[]>();for(const request of requests){const key=`${request.pagePath??"*"}|${request.family}`;const list=map.get(key)??[];list.push(request);map.set(key,list);}return map;}
function familyFromId(componentId:string):SectionFamily|undefined{const normalized=componentId.toLowerCase();const legacy=SECTION_FAMILIES.find(f=>normalized===`${f}.placeholder`||normalized.startsWith(`${f}.`));if(legacy)return legacy;const upper=componentId.toUpperCase();return SECTION_FAMILIES.find(f=>upper.includes(`-${FAMILY_CODES[f]}-`));}
