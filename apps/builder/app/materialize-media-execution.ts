import type { Site } from "@micirql/schema";
import { FAMILY_CODES, SECTION_FAMILIES, type SectionFamily } from "@micirql/sections";
import type { MediaAsset, MediaExecutionPlan, MediaRequest } from "./media-execution";
import { createPexelsAsset } from "./pexels-asset-service";

export type MediaMaterializationResult={execution:MediaExecutionPlan;generated:number;warnings:string[]};

export async function materializeGeneratedMedia(input:{
 request:Request;
 site:Site;
 execution:MediaExecutionPlan;
 workspaceId:string;
 siteId:string;
 domain?:string;
 maxGenerated?:number;
}):Promise<MediaMaterializationResult>{
 const requestedCap=Math.max(0,Math.min(input.maxGenerated??2,4));
 const blueprintCap=generatedMediaBudget(input.site);
 // Legacy callers still pass maxGenerated:1. Treat that as the old default floor
 // rather than allowing it to collapse visual-first certified layouts to one image.
 const maxGenerated=Math.max(requestedCap,blueprintCap);
 const authorization=input.request.headers.get("authorization");
 if(!authorization||maxGenerated===0)return{execution:input.execution,generated:0,warnings:authorization?[]:["Generated media could not be materialized because authorization was unavailable."]};
 const assignments=assignSections(input.site,input.execution.requests);
 const selectedGenerationIndexes=selectGeneratedMediaIndexes(input.site,assignments.map(item=>item.request),maxGenerated);
 const warnings:string[]=[];let generated=0;
 const requests:MediaRequest[]=[];
 for(let index=0;index<assignments.length;index++){
  const assignment=assignments[index]!;
  const media=assignment.request;
  if(media.source!=="generated"||!media.generationPrompt||!selectedGenerationIndexes.has(index)){requests.push(media);continue;}
  try{
   const payload=await createPexelsAsset(input.request,{
    workspaceId:input.workspaceId,
    siteId:input.siteId,
    sectionId:assignment.sectionId,
    pagePath:assignment.pagePath,
    family:media.family,
    domain:input.domain??"general",
    prompt:media.generationPrompt,
    ...(media.desiredAspect?{desiredAspect:media.desiredAspect}:{}),
    ...(media.preferredTags?.length?{preferredTags:media.preferredTags}:{}),
   });
   const persisted=payload.asset;
   const url=persisted.originalUrl;
   if(!url)throw new Error("Generated image URL was not returned.");
   const aspect=aspectFromAsset(persisted.aspectRatio,persisted.orientation);
   const asset:MediaAsset={id:persisted.id,url,source:"generated",tags:[...(persisted.tags??[]),media.family,"ai-generated"],...(persisted.alt?{alt:persisted.alt}:{}),...(aspect?{aspect}:{}),verified:true};
   requests.push({...media,asset,alt:media.alt||persisted.alt||`${media.family} supporting visual`,reason:`${media.reason} Generated asset was materialized and persisted.`});generated++;
  }catch(error){warnings.push(`${media.family}: ${error instanceof Error?error.message:"Image generation failed."}`);requests.push(media);}
 }
 return{execution:{...input.execution,requests},generated,warnings};
}

const FLAGSHIP_DENTAL_BLUEPRINTS=new Set([
 "dental-01-clinical-authority",
 "dental-02-implant-luxury",
 "dental-03-smile-studio",
 "dental-05-digital-dentistry",
 "dental-08-boutique-cosmetic",
]);

export function generatedMediaBudget(site:Site):number{
 const blueprintId=lockedBlueprintId(site);
 if(!blueprintId)return 2;
 // The flagship visual gate requires meaningful media in at least three major
 // home-page sections. Reusable/customer media may satisfy part of that budget,
 // but the generation fallback must be capable of filling three distinct slots.
 if(FLAGSHIP_DENTAL_BLUEPRINTS.has(blueprintId))return 3;
 return 2;
}

const BLUEPRINT_MEDIA_PRIORITY:Record<string,SectionFamily[]>={
 "dental-01-clinical-authority":["hero","features","process","services","about","gallery"],
 "dental-02-implant-luxury":["hero","process","features","services","about","gallery"],
 "dental-03-smile-studio":["hero","gallery","services","process","features","about"],
 "dental-05-digital-dentistry":["hero","features","process","services","about","gallery"],
 "dental-08-boutique-cosmetic":["hero","gallery","services","process","features","about"],
};

export function generatedMediaPriority(site:Site):SectionFamily[]{
 const blueprintId=lockedBlueprintId(site);
 return blueprintId&&BLUEPRINT_MEDIA_PRIORITY[blueprintId]
  ? [...BLUEPRINT_MEDIA_PRIORITY[blueprintId]!]
  : ["hero","features","gallery","about","process","services"];
}

export function selectGeneratedMediaIndexes(site:Site,requests:MediaRequest[],limit:number):Set<number>{
 const cap=Math.max(0,Math.floor(limit));
 if(cap===0)return new Set();
 const priority=generatedMediaPriority(site);
 const rank=new Map(priority.map((family,index)=>[family,index]));
 const eligible=requests
  .map((request,index)=>({request,index}))
  .filter(({request})=>request.source==="generated"&&Boolean(request.generationPrompt))
  .sort((a,b)=>(rank.get(a.request.family)??99)-(rank.get(b.request.family)??99)||a.index-b.index)
  .slice(0,cap)
  .map(item=>item.index);
 return new Set(eligible);
}

function lockedBlueprintId(site:Site):string|undefined{
 for(const page of site.pages){
  for(const section of page.sections){
   const value=section.props.layoutBlueprintId;
   if(section.props.layoutVisualLock===true&&typeof value==="string"&&value.trim())return value.trim();
  }
 }
 return undefined;
}

type Assignment={request:MediaRequest;pagePath:string;sectionId:string};
function assignSections(site:Site,requests:MediaRequest[]):Assignment[]{
 const queues=new Map<string,Array<{pagePath:string;sectionId:string}>>();
 for(const page of site.pages){for(const section of page.sections){const family=familyFromId(section.component.componentId);if(!family)continue;const keys=[`${page.path}|${family}`,`*|${family}`];for(const key of keys){const queue=queues.get(key)??[];queue.push({pagePath:page.path,sectionId:section.id});queues.set(key,queue);}}}
 return requests.map((request,index)=>{const key=`${request.pagePath??"*"}|${request.family}`;const target=queues.get(key)?.shift()??queues.get(`*|${request.family}`)?.shift();return{request,pagePath:target?.pagePath??request.pagePath??"/",sectionId:target?.sectionId??`${request.family}-${index}`};});
}
function familyFromId(componentId:string):SectionFamily|undefined{const normalized=componentId.toLowerCase();const legacy=SECTION_FAMILIES.find(f=>normalized===`${f}.placeholder`||normalized.startsWith(`${f}.`));if(legacy)return legacy;const upper=componentId.toUpperCase();return SECTION_FAMILIES.find(f=>upper.includes(`-${FAMILY_CODES[f]}-`));}
function aspectFromAsset(ratio?:number,orientation?:string){if(typeof ratio==="number"&&Number.isFinite(ratio)){if(ratio>1.9)return"wide";if(ratio>1.42)return"3:2";if(ratio>1.15)return"4:3";if(ratio<.82)return"portrait";return"1:1";}if(orientation==="portrait")return"portrait";if(orientation==="panoramic")return"wide";if(orientation==="landscape")return"3:2";return undefined;}
