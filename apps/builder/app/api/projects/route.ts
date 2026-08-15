import { NextRequest, NextResponse } from "next/server";
import { authenticatedUserId, getSupabaseDraft, saveSupabaseDraft, supabaseConfig, supabaseHeaders } from "../drafts/supabase-store";

export async function GET(request: NextRequest) {
  try {
    const { url } = supabaseConfig(); const headers = supabaseHeaders(request);
    const memberships = await getJson<Array<{workspace_id:string}>>(`${url}/rest/v1/workspace_members?select=workspace_id&order=created_at.asc`, headers);
    const workspaceIds = memberships.map(x=>x.workspace_id);
    if (!workspaceIds.length) return NextResponse.json({projects:[]});
    const ids = workspaceIds.join(",");
    const sites = await getJson<Array<{id:string;workspace_id:string;name:string;status:string;published_version_id:string|null;created_at:string;updated_at:string}>>(`${url}/rest/v1/sites?workspace_id=in.(${ids})&status=neq.archived&select=id,workspace_id,name,status,published_version_id,created_at,updated_at&order=updated_at.desc`, headers);
    const siteIds = sites.map(s=>s.id);
    const hosts = siteIds.length ? await getJson<Array<{site_id:string;hostname:string;status:string;ssl_status:string;is_primary:boolean}>>(`${url}/rest/v1/site_hostnames?site_id=in.(${siteIds.join(",")})&select=site_id,hostname,status,ssl_status,is_primary`, headers) : [];
    const drafts = siteIds.length ? await getJson<Array<{site_id:string;revision:number;updated_at:string}>>(`${url}/rest/v1/workspace_drafts?site_id=in.(${siteIds.join(",")})&select=site_id,revision,updated_at`, headers) : [];
    return NextResponse.json({projects:sites.map(site=>({ ...site, draft:drafts.find(d=>d.site_id===site.id)??null, hostname:hosts.find(h=>h.site_id===site.id&&h.is_primary)??hosts.find(h=>h.site_id===site.id)??null }))});
  } catch (e) { return fail(e); }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string,unknown>; const action = text(body.action)||"create";
    const { url } = supabaseConfig(); const headers = supabaseHeaders(request);
    if (action === "create") {
      const workspaceId = text(body.workspaceId) || (await getJson<Array<{workspace_id:string}>>(`${url}/rest/v1/workspace_members?select=workspace_id&order=created_at.asc&limit=1`,headers))[0]?.workspace_id;
      if (!workspaceId) throw new Error("No workspace available.");
      const rows = await writeJson<Array<{id:string;workspace_id:string;name:string}>>(`${url}/rest/v1/sites?select=id,workspace_id,name`,headers,"POST",{workspace_id:workspaceId,name:text(body.name)||"Untitled website",status:"draft"},true);
      return NextResponse.json({project:rows[0]});
    }
    if (action === "duplicate") {
      const workspaceId=text(body.workspaceId), siteId=text(body.siteId); if(!workspaceId||!siteId) throw new Error("workspaceId and siteId are required.");
      const source=await getSupabaseDraft(request,workspaceId,siteId); if(!source) throw new Error("Source draft not found.");
      const rows=await writeJson<Array<{id:string;workspace_id:string;name:string}>>(`${url}/rest/v1/sites?select=id,workspace_id,name`,headers,"POST",{workspace_id:workspaceId,name:text(body.name)||`${source.snapshot.name} Copy`,status:"draft"},true);
      const created=rows[0]; if(!created) throw new Error("Duplicate site creation failed.");
      const snapshot={...source.snapshot,siteId:created.id,workspaceId,name:created.name,domain:`${source.snapshot.domain}-copy`};
      await saveSupabaseDraft(request,{snapshot,expectedRevision:0,updatedBy:authenticatedUserId(request)});
      return NextResponse.json({project:created});
    }
    throw new Error("Unsupported action.");
  } catch(e){ return fail(e); }
}

export async function PATCH(request: NextRequest) {
  try { const body=await request.json() as Record<string,unknown>; const siteId=text(body.siteId); if(!siteId) throw new Error("siteId is required."); const {url}=supabaseConfig(); const headers=supabaseHeaders(request); const patch:Record<string,unknown>={updated_at:new Date().toISOString()}; if(text(body.name)) patch.name=text(body.name); if(body.archived===true) patch.status="archived"; const rows=await writeJson<unknown[]>(`${url}/rest/v1/sites?id=eq.${siteId}&select=*`,headers,"PATCH",patch,true); return NextResponse.json({project:rows[0]??null}); } catch(e){ return fail(e); }
}

function text(v:unknown){return typeof v==="string"?v.trim():""}
async function getJson<T>(url:string,headers:Record<string,string>):Promise<T>{const r=await fetch(url,{headers,cache:"no-store"});if(!r.ok)throw new Error(`Supabase request failed (${r.status}).`);return r.json() as Promise<T>}
async function writeJson<T>(url:string,headers:Record<string,string>,method:string,body:unknown,representation=false):Promise<T>{const r=await fetch(url,{method,headers:{...headers,...(representation?{Prefer:"return=representation"}:{})},body:JSON.stringify(body),cache:"no-store"});if(!r.ok)throw new Error(`Supabase write failed (${r.status}).`);return r.json() as Promise<T>}
function fail(e:unknown){return NextResponse.json({error:e instanceof Error?e.message:"Project request failed."},{status:(e as Error&{status?:number}).status??500})}
