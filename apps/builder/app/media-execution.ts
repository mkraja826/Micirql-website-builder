import type { SectionFamily } from "@micirql/sections";
import type { VisualMediaPlan, SectionVisualDecision } from "./visual-media-intelligence";

export type MediaSource="customer"|"library"|"licensed"|"generated"|"none";
export type MediaAsset={id:string;url:string;source:Exclude<MediaSource,"none">;tags:string[];alt?:string;aspect?:string;verified?:boolean};
export type MediaExecutionInput={plan:VisualMediaPlan;customerAssets?:MediaAsset[];libraryAssets?:MediaAsset[];licensedAssets?:MediaAsset[];allowGeneration?:boolean};
export type MediaRequest={family:SectionFamily;source:MediaSource;asset?:MediaAsset;generationPrompt?:string;alt:string;reason:string};
export type MediaExecutionPlan={requests:MediaRequest[];generationCount:number;rules:string[]};

export function executeMediaPlan(input:MediaExecutionInput):MediaExecutionPlan{
 const used=new Set<string>();let generationCount=0;
 const requests=input.plan.sections.map(decision=>{
  if(decision.role==="none")return none(decision,"The visual plan intentionally prefers a text-led section.");
  const pools:[MediaSource,MediaAsset[]][]=[
   ["customer",input.customerAssets??[]],
   ["library",input.libraryAssets??[]],
   ["licensed",input.licensedAssets??[]]
  ];
  for(const[source,assets]of pools){const asset=bestAsset(decision,assets,used);if(asset){used.add(asset.id);return{family:decision.family,source,asset,alt:asset.alt||safeAlt(decision),reason:`Matched ${source} media to ${decision.role} intent.`};}}
  if(input.allowGeneration&&canGenerate(decision)){generationCount++;return{family:decision.family,source:"generated" as const,generationPrompt:prompt(decision),alt:safeAlt(decision),reason:"No truthful reusable asset matched; generation is allowed for this non-claim visual."};}
  return none(decision,"No suitable truthful asset was available, so the section remains image-free.");
 });
 return{requests,generationCount,rules:[...input.plan.rules,"Customer assets always outrank reusable or generated media","Generated media must not depict a real employee, customer, facility, certificate, award or completed project unless supplied as reference","Do not reuse a primary asset across sections","Generation is a fallback, not a default"]};
}
function bestAsset(d:SectionVisualDecision,assets:MediaAsset[],used:Set<string>){let best:MediaAsset|undefined,score=0;for(const a of assets){if(used.has(a.id))continue;const tags=a.tags.map(t=>t.toLowerCase());let s=0;if(tags.includes(d.role))s+=8;for(const word of d.subject.toLowerCase().split(/\W+/).filter(w=>w.length>4))if(tags.some(t=>t.includes(word)))s++;if(a.aspect===d.aspect)s+=2;if(a.verified)s+=1;if(s>score){score=s;best=a;}}return score>=2?best:undefined;}
function canGenerate(d:SectionVisualDecision){return d.role==="abstract"||d.role==="illustration"||d.role==="texture"||d.role==="product-ui";}
function prompt(d:SectionVisualDecision){return `${d.subject}. Visual role: ${d.role}. Composition: ${d.prominence}. Aspect ratio: ${d.aspect}. No text, logos, certificates, awards, identifiable real people, fabricated facilities, fabricated projects or unsupported claims. Avoid ${d.avoid.join(", ")}.`;}
function safeAlt(d:SectionVisualDecision){return d.subject||`${d.family} supporting visual`;}
function none(d:SectionVisualDecision,reason:string):MediaRequest{return{family:d.family,source:"none",alt:"",reason};}
