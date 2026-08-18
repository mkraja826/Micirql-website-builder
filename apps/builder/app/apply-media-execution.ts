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
 props.imageFocalPoint=request.asset.tags.some(tag=>/person|people|team|portrait|face/i.test(tag))?"face-safe":"center";
 const ratio=normalizeRatio(request.asset.aspect);if(ratio)props.imageRatio=ratio;
 if(family==="gallery"||family==="team"||family==="features"){
  const items=Array.isArray(props.items)?props.items as Array<Record<string,unknown>>:[];
  const target=items.find(item=>!item.image);if(target){target.image=request.asset.url;props.imageSlotMode=props.image?"both":"items";}
 }
}
function normalizeRatio(value?:string){if(value==="1:1"||value==="4:3"||value==="3:2"||value==="16:9")return value;return value==="wide"?"21:9":value==="portrait"?"4:5":undefined;}
function group(requests:MediaRequest[]){const map=new Map<string,MediaRequest[]>();for(const request of requests){const key=`${request.pagePath??"*"}|${request.family}`;const list=map.get(key)??[];list.push(request);map.set(key,list);}return map;}
function familyFromId(componentId:string):SectionFamily|undefined{const normalized=componentId.toLowerCase();const legacy=SECTION_FAMILIES.find(f=>normalized===`${f}.placeholder`||normalized.startsWith(`${f}.`));if(legacy)return legacy;const upper=componentId.toUpperCase();return SECTION_FAMILIES.find(f=>upper.includes(`-${FAMILY_CODES[f]}-`));}
