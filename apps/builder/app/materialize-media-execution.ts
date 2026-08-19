import type { Site } from "@micirql/schema";
import { FAMILY_CODES, SECTION_FAMILIES, type SectionFamily } from "@micirql/sections";
import type { MediaAsset, MediaExecutionPlan, MediaRequest } from "./media-execution";

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
 const warnings:string[]=[];let generated=0;
 const requests:MediaRequest[]=[];
 for(const assignment of assignments){
  const media=assignment.request;
  if(media.source!=="generated"||!media.generationPrompt||generated>=maxGenerated){requests.push(media);continue;}
  try{
   const response=await fetch(new URL("/api/assets/generate",input.request.url),{
    method:"POST",
    headers:{authorization,"content-type":"application/json"},
    body:JSON.stringify({workspaceId:input.workspaceId,siteId:input.siteId,sectionId:assignment.sectionId,pagePath:assignment.pagePath,family:media.family,domain:input.domain??"general",prompt:media.generationPrompt,desiredAspect:media.desiredAspect,preferredTags:media.preferredTags??[]})
   });
   if(!response.ok){const body=await response.text();throw new Error(body||`Image generation failed (${response.status}).`);}
   const payload=await response.json() as{asset?:{id?:string;originalUrl?:string;url?:string;tags?:string[];alt?:string;aspectRatio?:number;orientation?:string}};
   if(!payload.asset?.id)throw new Error("Generated image asset was not returned.");
   const url=payload.asset.originalUrl??payload.asset.url;if(!url)throw new Error("Generated image URL was not returned.");
   const aspect=aspectFromAsset(payload.asset.aspectRatio,payload.asset.orientation);
   const asset:MediaAsset={id:payload.asset.id,url,source:"generated",tags:[...(payload.asset.tags??[]),media.family,"ai-generated"],...(payload.asset.alt?{alt:payload.asset.alt}:{}),...(aspect?{aspect}:{}),verified:true};
   requests.push({...media,asset,alt:media.alt||payload.asset.alt||`${media.family} supporting visual`,reason:`${media.reason} Generated asset was materialized and persisted.`});generated++;
  }catch(error){warnings.push(`${media.family}: ${error instanceof Error?error.message:"Image generation failed."}`);requests.push(media);}
 }
 return{execution:{...input.execution,requests},generated,warnings};
}

export function generatedMediaBudget(site:Site):number{
 const blueprintId=lockedBlueprintId(site);
 if(!blueprintId)return 2;
 if(blueprintId==="dental-03-smile-studio"||blueprintId==="dental-05-digital-dentistry")return 3;
 if(blueprintId==="dental-02-implant-luxury"||blueprintId==="dental-08-boutique-cosmetic"||blueprintId==="dental-01-clinical-authority")return 2;
 return 2;
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
