import type { SectionFamily } from "@micirql/sections";
import type { VisualMediaPlan, SectionVisualDecision, VisualAspect } from "./visual-media-intelligence";

export type MediaSource="customer"|"library"|"licensed"|"generated"|"none";
export type MediaAsset={id:string;name?:string;url:string;source:Exclude<MediaSource,"none">;tags:string[];alt?:string;aspect?:string;verified?:boolean};
export type MediaExecutionInput={plan:VisualMediaPlan;customerAssets?:MediaAsset[];libraryAssets?:MediaAsset[];licensedAssets?:MediaAsset[];allowGeneration?:boolean};
export type MediaRequest={family:SectionFamily;pagePath?:string;source:MediaSource;asset?:MediaAsset;generationPrompt?:string;desiredAspect?:VisualAspect;preferredTags?:string[];alt:string;reason:string};
export type MediaExecutionPlan={requests:MediaRequest[];generationCount:number;rules:string[]};

type VisualSignature={tokens:Set<string>;aspect?:string};

export function executeMediaPlan(input:MediaExecutionInput):MediaExecutionPlan{
 const usedIds=new Set<string>(),usedUrls=new Set<string>(),usedSignatures:VisualSignature[]=[];let generationCount=0;
 const requests=input.plan.sections.map((decision,index)=>{
  if(decision.role==="none")return none(decision,"The visual plan intentionally prefers a text-led section.");
  const customerOnly=requiresCustomerIdentityMedia(decision)||requiresCustomerEvidenceMedia(decision);
  const pools:[MediaSource,MediaAsset[]][]=customerOnly
   ? [["customer",input.customerAssets??[]]]
   : [["customer",input.customerAssets??[]],["library",input.libraryAssets??[]],["licensed",input.licensedAssets??[]]];
  for(const[source,assets]of pools){
   const asset=bestAsset(decision,assets,usedIds,usedUrls,usedSignatures);
   if(asset){
    usedIds.add(asset.id);usedUrls.add(asset.url);usedSignatures.push(visualSignature(asset));
    return{family:decision.family,...(decision.pagePath?{pagePath:decision.pagePath}:{}),source,asset,desiredAspect:decision.aspect,...(decision.preferredTags?.length?{preferredTags:[...decision.preferredTags]}:{}),alt:asset.alt||safeAlt(decision),reason:`Matched ${source} media to ${decision.role} intent${decision.preferredTags?.length?" using certified tags":""} with blueprint crop fitness and cross-site diversity scoring.`};
   }
  }
  if(customerOnly)return none(decision,requiresCustomerIdentityMedia(decision)?"Team and leadership identity media must come from customer-supplied assets; reusable stock cannot represent the business's real people.":"Clinic-specific or outcome-bearing evidence must come from customer-supplied assets; reusable stock cannot stand in for the real business.");
  if(input.allowGeneration&&canGenerate(decision)){generationCount++;return{family:decision.family,...(decision.pagePath?{pagePath:decision.pagePath}:{}),source:"generated" as const,generationPrompt:prompt(decision,index),desiredAspect:decision.aspect,...(decision.preferredTags?.length?{preferredTags:[...decision.preferredTags]}:{}),alt:safeAlt(decision),reason:"No truthful and visually distinct reusable asset matched; generation is allowed for this non-claim visual."};}
  return none(decision,"No suitable truthful and visually distinct asset was available, so the section remains image-free.");
 });
 return{requests,generationCount,rules:[...input.plan.rules,"Customer assets always outrank reusable or generated media","Team and leadership portraits are identity-bearing media and must be customer supplied","Clinic-specific interiors, verified cases and treatment-result evidence must be customer supplied","Certified industry tags strongly influence reusable-media ranking","Blueprint aspect ratio is a strong ranking signal and survives into final section cropping","Duplicate asset IDs and duplicate asset URLs are blocked across primary sections","Reusable media is scored against previously selected visual signatures to avoid near-duplicate subjects, poses and compositions","Highly similar stock/library images are rejected when a more distinct option is available","Generated media prompts deliberately vary composition by section role instead of repeating the hero look","Dental blueprint support imagery may be generated only when the subject is generic, non-identifying and non-claim","Synthetic before-and-after outcomes, real-team stand-ins, fabricated clinic interiors, fabricated equipment ownership and credentials are never allowed","Do not reuse a primary asset across sections","Generation is a fallback, not a default"]};
}
function requiresCustomerIdentityMedia(d:SectionVisualDecision){return d.family==="team"||d.role==="people";}
function requiresCustomerEvidenceMedia(d:SectionVisualDecision){
 const context=`${d.subject} ${(d.preferredTags??[]).join(" ")}`.toLowerCase();
 if(d.family==="about"&&d.role==="place"&&/verified|supplied by the business|real clinic|clinic interior|reception|treatment room|real team environment/.test(context))return true;
 if(d.family==="gallery"&&d.role==="portfolio"&&/verified|case media|before[- ]?and[- ]?after|before[- ]?after|treatment result|patient outcome|actual clinic|real clinic/.test(context))return true;
 return false;
}
function bestAsset(d:SectionVisualDecision,assets:MediaAsset[],usedIds:Set<string>,usedUrls:Set<string>,usedSignatures:VisualSignature[]){
 let best:MediaAsset|undefined,score=-Infinity;
 for(const a of assets){
  if(usedIds.has(a.id)||usedUrls.has(a.url))continue;
  const tags=a.tags.map(t=>t.toLowerCase());let s=0;
  if(tags.includes(d.role))s+=8;
  for(const preferred of d.preferredTags??[]){const key=preferred.toLowerCase();if(tags.includes(key))s+=6;else if(tags.some(t=>t.includes(key)||key.includes(t)))s+=3;}
  for(const word of d.subject.toLowerCase().split(/\W+/).filter(w=>w.length>4))if(tags.some(t=>t.includes(word)))s++;
  s+=aspectScore(a.aspect,d.aspect);
  if(a.verified)s+=1;
  const similarity=maxVisualSimilarity(visualSignature(a),usedSignatures);
  if(a.source!=="customer"&&similarity>=.78)continue;
  s-=Math.round(similarity*14);
  if(s>score){score=s;best=a;}
 }
 return score>=2?best:undefined;
}
function visualSignature(asset:MediaAsset):VisualSignature{
 const generic=new Set(["dental","dentistry","dentist","clinic","healthcare","medical","image","photo","photography","hero","services","service","about","gallery","team","wide","portrait","landscape","4:3","3:2","16:9","1:1"]);
 const raw=[...asset.tags,asset.name??"",asset.alt??""].join(" ").toLowerCase().split(/[^a-z0-9-]+/).filter(token=>token.length>=4&&!generic.has(token));
 return{tokens:new Set(raw),aspect:asset.aspect};
}
function maxVisualSimilarity(signature:VisualSignature,used:VisualSignature[]){let max=0;for(const prior of used)max=Math.max(max,signatureSimilarity(signature,prior));return max;}
function signatureSimilarity(a:VisualSignature,b:VisualSignature){
 if(!a.tokens.size||!b.tokens.size)return a.aspect&&b.aspect&&a.aspect===b.aspect?0.12:0;
 let intersection=0;for(const token of a.tokens)if(b.tokens.has(token))intersection++;
 const union=new Set([...a.tokens,...b.tokens]).size;
 const lexical=union?intersection/union:0;
 const aspectBoost=a.aspect&&b.aspect&&a.aspect===b.aspect?0.08:0;
 return Math.min(1,lexical+aspectBoost);
}
function aspectScore(assetAspect:string|undefined,desired:VisualAspect){
 if(!assetAspect)return 0;
 if(assetAspect===desired)return 10;
 const wide=new Set(["wide","16:9","3:2"]),portrait=new Set(["portrait"]),squareish=new Set(["1:1","4:3"]);
 if(wide.has(desired)&&wide.has(assetAspect))return 4;
 if(squareish.has(desired)&&squareish.has(assetAspect))return 3;
 if(portrait.has(desired)&&portrait.has(assetAspect))return 4;
 if((portrait.has(desired)&&wide.has(assetAspect))||(wide.has(desired)&&portrait.has(assetAspect)))return-8;
 return-2;
}
export function canGenerate(d:SectionVisualDecision){
 const subject=d.subject.toLowerCase();
 const tags=(d.preferredTags??[]).join(" ").toLowerCase();
 const context=`${subject} ${tags}`;
 const dental=/dental|dentist|dentistry|orthodont|endodont|implant|smile-design|root-canal|scanner|scanning|restorative/.test(context);
 if(!dental)return false;
 if(requiresCustomerIdentityMedia(d)||requiresCustomerEvidenceMedia(d))return false;
 if(/before[- ]?and[- ]?after|before[- ]?after|treatment result|patient outcome|real patient|verified case|actual clinic|clinic interior supplied|real clinic|specific equipment|credentials/.test(context))return false;
 if(d.role==="abstract"||d.role==="illustration"||d.role==="texture"||d.role==="product-ui")return true;
 const safeGeneric=/generic|non-identifying|context|concept|without|avoid implying|no synthetic|calm|non-graphic|truthful|supporting visual/.test(subject);
 if(!safeGeneric)return false;
 if(d.family==="hero"&&d.role==="hero-photo")return true;
 if(d.family==="features"&&(d.role==="illustration"||d.role==="hero-photo"))return true;
 if(d.family==="process"&&d.role==="process")return true;
 if(d.family==="services"&&d.role==="hero-photo")return true;
 if(d.family==="about"&&d.role==="place")return /generic|non-identifying|context|concept/.test(subject)&&!/clinic interior|reception|treatment room|real team environment/.test(subject);
 if(d.family==="gallery"&&d.role==="portfolio")return /otherwise|context|consultation|planning/.test(subject)&&!/before[- ]?and[- ]?after|before[- ]?after|verified case|outcome/.test(subject);
 return false;
}
function prompt(d:SectionVisualDecision,index:number){
 const tags=d.preferredTags?.length?` Preferred certified cues: ${d.preferredTags.join(", ")}.`:"";
 const dental=/dental|dentist|dentistry|orthodont|endodont|implant|smile-design|root-canal|scanner|scanning|restorative/i.test(`${d.subject} ${(d.preferredTags??[]).join(" ")}`);
 const safeDental=dental?" This is generic editorial dental context only, not the actual clinic. Any people must be fictional, non-identifying and unbranded. Do not show signage, uniforms or interiors that imply they belong to the business. Do not show before-and-after results, a guaranteed outcome, credentials or equipment ownership claims.":"";
 const diversity=diversityDirection(d,index);
 return `${d.subject}.${tags}${safeDental} ${diversity} Visual role: ${d.role}. Composition: ${d.prominence}. Aspect ratio: ${d.aspect}. No text, logos, certificates, awards, identifiable real people, fabricated facilities, fabricated projects or unsupported claims. Avoid ${d.avoid.join(", ")}.`;
}
function diversityDirection(d:SectionVisualDecision,index:number){
 if(d.family==="hero")return"Use a singular campaign-style composition with intentional negative space; do not reuse this framing elsewhere on the site.";
 if(d.family==="services")return index%2?"Use tighter treatment-detail framing with hands/tools secondary and no hero-style portrait pose.":"Use an oblique consultation/detail composition that is visibly different from the hero.";
 if(d.family==="process")return"Use documentary sequence framing or over-shoulder planning detail, not a posed portrait.";
 if(d.family==="features")return"Use macro technical/detail framing or interface-led composition, not another dentist-patient portrait.";
 if(d.family==="gallery")return"Use a distinct evidence/detail composition with a different camera distance and subject emphasis from earlier sections.";
 if(d.family==="cta")return"Use abstract atmosphere or texture only; avoid repeating people or clinic scenes already used above.";
 return"Choose a camera distance, subject emphasis and composition that is visibly different from earlier primary visuals.";
}
function safeAlt(d:SectionVisualDecision){return d.subject||`${d.family} supporting visual`;}
function none(d:SectionVisualDecision,reason:string):MediaRequest{return{family:d.family,...(d.pagePath?{pagePath:d.pagePath}:{}),source:"none",desiredAspect:d.aspect,...(d.preferredTags?.length?{preferredTags:[...d.preferredTags]}:{}),alt:"",reason};}
