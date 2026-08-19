import type { SectionFamily } from "@micirql/sections";
import type { VisualMediaPlan, SectionVisualDecision } from "./visual-media-intelligence";

export type MediaSource="customer"|"library"|"licensed"|"generated"|"none";
export type MediaAsset={id:string;name?:string;url:string;source:Exclude<MediaSource,"none">;tags:string[];alt?:string;aspect?:string;verified?:boolean};
export type MediaExecutionInput={plan:VisualMediaPlan;customerAssets?:MediaAsset[];libraryAssets?:MediaAsset[];licensedAssets?:MediaAsset[];allowGeneration?:boolean};
export type MediaRequest={family:SectionFamily;pagePath?:string;source:MediaSource;asset?:MediaAsset;generationPrompt?:string;alt:string;reason:string};
export type MediaExecutionPlan={requests:MediaRequest[];generationCount:number;rules:string[]};

export function executeMediaPlan(input:MediaExecutionInput):MediaExecutionPlan{
 const used=new Set<string>();let generationCount=0;
 const requests=input.plan.sections.map(decision=>{
  if(decision.role==="none")return none(decision,"The visual plan intentionally prefers a text-led section.");
  const identityMedia=requiresCustomerIdentityMedia(decision);
  const pools:[MediaSource,MediaAsset[]][]=identityMedia
   ? [["customer",input.customerAssets??[]]]
   : [["customer",input.customerAssets??[]],["library",input.libraryAssets??[]],["licensed",input.licensedAssets??[]]];
  for(const[source,assets]of pools){const asset=bestAsset(decision,assets,used);if(asset){used.add(asset.id);return{family:decision.family,...(decision.pagePath?{pagePath:decision.pagePath}:{}),source,asset,alt:asset.alt||safeAlt(decision),reason:`Matched ${source} media to ${decision.role} intent${decision.preferredTags?.length?" using certified tags":""}.`};}}
  if(identityMedia)return none(decision,"Team and leadership identity media must come from customer-supplied assets; reusable stock cannot represent the business's real people.");
  if(input.allowGeneration&&canGenerate(decision)){generationCount++;return{family:decision.family,...(decision.pagePath?{pagePath:decision.pagePath}:{}),source:"generated" as const,generationPrompt:prompt(decision),alt:safeAlt(decision),reason:"No truthful reusable asset matched; generation is allowed for this non-claim visual."};}
  return none(decision,"No suitable truthful asset was available, so the section remains image-free.");
 });
 return{requests,generationCount,rules:[...input.plan.rules,"Customer assets always outrank reusable or generated media","Team and leadership portraits are identity-bearing media and must be customer supplied","Certified industry tags strongly influence reusable-media ranking","First-build AI media generation is currently restricted to explicitly Dental visual contexts","Generated media must not depict a real employee, customer, facility, certificate, award or completed project unless supplied as reference","A generated Dental hero is generic editorial context only and must never be presented as the clinic, its staff, a real patient or a treatment result","Do not reuse a primary asset across sections","Generation is a fallback, not a default"]};
}
function requiresCustomerIdentityMedia(d:SectionVisualDecision){return d.family==="team"||d.role==="people";}
function bestAsset(d:SectionVisualDecision,assets:MediaAsset[],used:Set<string>){
 let best:MediaAsset|undefined,score=0;
 for(const a of assets){
  if(used.has(a.id))continue;
  const tags=a.tags.map(t=>t.toLowerCase());let s=0;
  if(tags.includes(d.role))s+=8;
  for(const preferred of d.preferredTags??[]){const key=preferred.toLowerCase();if(tags.includes(key))s+=6;else if(tags.some(t=>t.includes(key)||key.includes(t)))s+=3;}
  for(const word of d.subject.toLowerCase().split(/\W+/).filter(w=>w.length>4))if(tags.some(t=>t.includes(word)))s++;
  if(a.aspect===d.aspect)s+=2;
  if(a.verified)s+=1;
  if(s>score){score=s;best=a;}
 }
 return score>=2?best:undefined;
}
function canGenerate(d:SectionVisualDecision){
 const subject=d.subject.toLowerCase();
 const tags=(d.preferredTags??[]).join(" ").toLowerCase();
 const dental=/dental|dentist|dentistry|orthodont|endodont|implant|smile-design|root-canal/.test(`${subject} ${tags}`);
 if(!dental)return false;
 if(d.role==="abstract"||d.role==="illustration"||d.role==="texture"||d.role==="product-ui")return true;
 if(d.family!=="hero"||d.role!=="hero-photo")return false;
 const explicitlyGeneric=/generic|non-identifying|avoid identifiable|no synthetic|without dramatic/.test(subject);
 return explicitlyGeneric;
}
function prompt(d:SectionVisualDecision){
 const tags=d.preferredTags?.length?` Preferred certified cues: ${d.preferredTags.join(", ")}.`:"";
 const dentalHero=d.family==="hero"&&d.role==="hero-photo"&&/dental|dentist|dentistry|orthodont|endodont|implant|smile-design|root-canal/i.test(`${d.subject} ${(d.preferredTags??[]).join(" ")}`);
 const safeDental=dentalHero?" This is generic editorial dental context only, not the actual clinic. Any people must be fictional, non-identifying and unbranded. Do not show signage, uniforms or interiors that imply they belong to the business. Do not show before-and-after results or a guaranteed outcome.":"";
 return `${d.subject}.${tags}${safeDental} Visual role: ${d.role}. Composition: ${d.prominence}. Aspect ratio: ${d.aspect}. No text, logos, certificates, awards, identifiable real people, fabricated facilities, fabricated projects or unsupported claims. Avoid ${d.avoid.join(", ")}.`;
}
function safeAlt(d:SectionVisualDecision){return d.subject||`${d.family} supporting visual`;}
function none(d:SectionVisualDecision,reason:string):MediaRequest{return{family:d.family,...(d.pagePath?{pagePath:d.pagePath}:{}),source:"none",alt:"",reason};}
