import { NextRequest, NextResponse } from "next/server";
import { siteSchema, type Site } from "@micirql/schema";
import { groundSiteContent, propagateEditedGlobalShell, type GroundingFacts } from "@micirql/design-engine";
import { repairContentDepth } from "../../content-depth-repair";
import { getSupabaseDraft, saveSupabaseDraft, supabaseConfig, supabaseHeaders, usesSupabaseDraftStore, type DraftRecord } from "./supabase-store";
import { resolveOrBootstrapDraft } from "./bootstrap-context";

type DraftGlobal = typeof globalThis & { __micirqlDrafts?: Map<string, DraftRecord> };
const globalDrafts = globalThis as DraftGlobal;
const drafts = globalDrafts.__micirqlDrafts ?? new Map<string, DraftRecord>();
globalDrafts.__micirqlDrafts = drafts;
function key(workspaceId:string,siteId:string){return `${workspaceId}:${siteId}`}
const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function withContentDepth(record: DraftRecord): DraftRecord {
 return { ...record, snapshot: repairContentDepth(record.snapshot) };
}

export async function GET(request:NextRequest){
 let workspaceId=request.nextUrl.searchParams.get("workspaceId")?.trim();let siteId=request.nextUrl.searchParams.get("siteId")?.trim();
 const activeWorkspace=request.headers.get("x-micirql-workspace-id")?.trim();const activeSite=request.headers.get("x-micirql-site-id")?.trim();
 if((!workspaceId||!UUID_RE.test(workspaceId))&&activeWorkspace&&UUID_RE.test(activeWorkspace))workspaceId=activeWorkspace;
 if((!siteId||!UUID_RE.test(siteId))&&activeSite&&UUID_RE.test(activeSite))siteId=activeSite;
 if(!workspaceId||!siteId)return NextResponse.json({error:"workspaceId and siteId are required"},{status:400});
 try{if(usesSupabaseDraftStore()){let record:DraftRecord|undefined;if(UUID_RE.test(workspaceId)&&UUID_RE.test(siteId))record=await getSupabaseDraft(request,workspaceId,siteId);if(!record)record=await resolveOrBootstrapDraft(request,workspaceId,siteId);if(!record)return NextResponse.json({found:false},{status:404});return NextResponse.json({found:true,draft:withContentDepth(record)})}const record=drafts.get(key(workspaceId,siteId));if(!record)return NextResponse.json({found:false},{status:404});return NextResponse.json({found:true,draft:withContentDepth(record)})}catch(error){const status=(error as Error&{status?:number}).status??500;return NextResponse.json({error:error instanceof Error?error.message:"Draft load failed"},{status})}}

export async function PUT(request:NextRequest){
 let body:unknown;
 try{body=await request.json()}catch{return NextResponse.json({error:"Invalid JSON"},{status:400})}
 if(!body||typeof body!=="object")return NextResponse.json({error:"Invalid request"},{status:400});
 const input=body as Record<string,unknown>;
 const expectedRevision=Number(input.expectedRevision);
 const updatedBy=typeof input.updatedBy==="string"&&input.updatedBy.trim()?input.updatedBy.trim():"workspace-user";
 if(!Number.isInteger(expectedRevision)||expectedRevision<0)return NextResponse.json({error:"expectedRevision must be a non-negative integer"},{status:400});
 let snapshot:Site;
 try{snapshot=repairContentDepth(siteSchema.parse(input.snapshot))}catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Invalid Site Schema"},{status:422})}
 try{
  if(usesSupabaseDraftStore()){
   const current=await getSupabaseDraft(request,snapshot.workspaceId,snapshot.siteId);
   snapshot=propagateEditedGlobalShell(snapshot,current?.snapshot);
   const groundingFacts=await loadGroundingFacts(request,snapshot);
   const grounding=groundSiteContent(snapshot,groundingFacts);
   if(!grounding.grounded){
    return NextResponse.json({
     error:"CONTENT_GROUNDING_NOT_READY",
     code:"CONTENT_GROUNDING_NOT_READY",
     message:"This edit contains a factual claim that was not supplied in the saved business brief.",
     grounding:{grounded:false,issues:grounding.issues},
    },{status:422});
   }
   const effectiveRevision=updatedBy==="first-build-review"&&current?current.revision:expectedRevision;
   const draft=await saveSupabaseDraft(request,{snapshot,expectedRevision:effectiveRevision,updatedBy});
   return NextResponse.json({draft:withContentDepth(draft)});
  }
  const draftKey=key(snapshot.workspaceId,snapshot.siteId);
  const current=drafts.get(draftKey);
  const currentRevision=current?.revision??0;
  const effectiveRevision=updatedBy==="first-build-review"?currentRevision:expectedRevision;
  if(currentRevision!==effectiveRevision)return NextResponse.json({error:"REVISION_CONFLICT",currentRevision,draft:current},{status:409});
  snapshot=propagateEditedGlobalShell(snapshot,current?.snapshot);
  const next:DraftRecord={workspaceId:snapshot.workspaceId,siteId:snapshot.siteId,revision:currentRevision+1,snapshot,updatedAt:new Date().toISOString(),updatedBy};
  drafts.set(draftKey,next);
  return NextResponse.json({draft:withContentDepth(next)});
 }catch(error){
  const message=error instanceof Error?error.message:"Draft save failed";
  const status=message==="REVISION_CONFLICT"?409:((error as Error&{status?:number}).status??500);
  let current:DraftRecord|undefined;
  if(status===409&&usesSupabaseDraftStore()){try{current=await getSupabaseDraft(request,snapshot.workspaceId,snapshot.siteId)}catch{}}
  return NextResponse.json({error:message,draft:current?withContentDepth(current):undefined},{status});
 }
}

async function loadGroundingFacts(request: NextRequest, site: Site): Promise<GroundingFacts> {
 const cfg=supabaseConfig();
 const query=new URLSearchParams({workspace_id:`eq.${site.workspaceId}`,site_id:`eq.${site.siteId}`,select:"business_name,industry,subindustry,location,services,goals,notes",limit:"1"});
 const response=await fetch(`${cfg.url}/rest/v1/business_onboarding_profiles?${query}`,{headers:supabaseHeaders(request),cache:"no-store"});
 if(!response.ok)throw new Error(`Grounding profile lookup failed (${response.status}).`);
 const rows=await response.json() as Array<Record<string,unknown>>;
 const profile=rows[0]??{};
 const notes=text(profile.notes)||null;
 const locked=lockedFactsFromNotes(notes);
 const industry=text(profile.industry)||site.subtype;
 return {
  businessName:text(profile.business_name)||site.name,
  ...(industry?{industry}:{}),
  subindustry:text(profile.subindustry)||site.subtype||null,
  location:text(profile.location)||site.seoBlueprint.targetLocations[0]||null,
  services:list(profile.services).length?list(profile.services):site.seoBlueprint.priorityTopics,
  goals:list(profile.goals),
  notes,
  people:locked.people,
  credentials:locked.credentials,
  proofClaims:locked.proofClaims,
  prices:locked.prices,
 };
}

function lockedFactsFromNotes(notes:string|null):Required<Pick<GroundingFacts,"people"|"credentials"|"proofClaims"|"prices">> {
 if(!notes)return{people:[],credentials:[],proofClaims:[],prices:[]};
 return{people:labelledFacts(notes,"People/team"),credentials:labelledFacts(notes,"Credentials"),proofClaims:labelledFacts(notes,"Claims/statistics/guarantees"),prices:labelledFacts(notes,"Prices")};
}
function labelledFacts(notes:string,label:string){const escaped=label.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");const match=notes.match(new RegExp(`^${escaped}:\\s*(.+)$`,"im"));const raw=match?.[1]?.trim();if(!raw||raw.toLowerCase()==="not supplied")return[];return raw.split("|").map(item=>item.trim()).filter(Boolean).slice(0,48)}
function text(value:unknown){return typeof value==="string"?value.trim():""}
function list(value:unknown){if(Array.isArray(value))return value.map(text).filter(Boolean);if(typeof value==="string")return value.split(",").map(item=>item.trim()).filter(Boolean);return[]}