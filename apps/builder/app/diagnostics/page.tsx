"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { AuthGate } from "../auth-gate";
import type { SupabaseSession } from "../auth-client";

type Summary = { total:number; success:number; recovered:number; failed:number; fallbackBuilds:number; averageDurationMs:number; averageQualityScore:number|null };
type BuildRow = { id:string; build_id:string; outcome:"success"|"recovered"|"failed"; failed_stage?:string|null; duration_ms:number; provider?:string|null; model?:string|null; fallback_count:number; quality_score?:number|null; recovery_reason?:string|null; created_at:string };

export default function DiagnosticsPage(){return <AuthGate>{(session)=><Diagnostics session={session}/>}</AuthGate>}

function Diagnostics({session}:{session:SupabaseSession}){
 const [summary,setSummary]=useState<Summary>();
 const [builds,setBuilds]=useState<BuildRow[]>([]);
 const [error,setError]=useState("");
 const [loading,setLoading]=useState(true);
 useEffect(()=>{let cancelled=false;(async()=>{try{let project:{workspaceId?:string;siteId?:string}|null=null;try{project=JSON.parse(window.localStorage.getItem("micirql_active_project")||"null")}catch{}if(!project?.workspaceId)throw new Error("Open a website first so MiCirql knows which workspace diagnostics to show.");const q=new URLSearchParams({workspaceId:project.workspaceId,...(project.siteId?{siteId:project.siteId}:{})});const r=await fetch(`/api/admin/build-diagnostics?${q}`,{headers:{Authorization:`Bearer ${session.access_token}`},cache:"no-store"});const p=await r.json();if(!r.ok)throw new Error(p.error??"Could not load diagnostics.");if(!cancelled){setSummary(p.summary);setBuilds(p.builds??[])}}catch(e){if(!cancelled)setError(e instanceof Error?e.message:"Could not load diagnostics.")}finally{if(!cancelled)setLoading(false)}})();return()=>{cancelled=true}},[session.access_token]);
 return <main style={shell}>
  <style>{`@media(max-width:760px){.diagnostic-header{flex-direction:column}.diagnostic-row{grid-template-columns:1fr 1fr!important}.diagnostic-row .wide{grid-column:1/-1!important}}`}</style>
  <header className="diagnostic-header" style={header}><div><span style={eyebrow}>MiCirql admin</span><h1 style={{margin:"4px 0 6px"}}>Build diagnostics</h1><p style={muted}>Generation duration, provider fallbacks, quality scores, recovery reasons and failed stages for the active website.</p></div><button style={button} onClick={()=>location.href="/"}>← Websites</button></header>
  {loading?<section style={panel}>Loading build telemetry…</section>:error?<section style={{...panel,borderColor:"#7f1d1d"}}>{error}</section>:<>
   <section style={stats}>{[
    ["Builds",summary?.total??0],["Successful",summary?.success??0],["Recovered",summary?.recovered??0],["Failed",summary?.failed??0],["Fallbacks",summary?.fallbackBuilds??0],["Avg duration",formatDuration(summary?.averageDurationMs??0)],["Avg quality",summary?.averageQualityScore??"—"]
   ].map(([label,value])=><div key={String(label)} style={stat}><span style={muted}>{label}</span><strong style={{fontSize:24}}>{value}</strong></div>)}</section>
   <section style={panel}><div style={{display:"grid",gap:10}}>{builds.length?builds.map((build)=><article className="diagnostic-row" key={build.id} style={row}><div className="wide"><strong>{new Date(build.created_at).toLocaleString()}</strong><small style={{...muted,display:"block",marginTop:4}}>{build.provider?`${build.provider}${build.model?` / ${build.model}`:""}`:"No provider recorded"}</small></div><span style={pill(build.outcome)}>{build.outcome}</span><span>{formatDuration(build.duration_ms)}</span><span>Q {build.quality_score??"—"}</span><span>{build.fallback_count?`${build.fallback_count} fallback${build.fallback_count===1?"":"s"}`:"No fallback"}</span><div className="wide" style={{gridColumn:"1 / -1",...muted}}>{build.failed_stage?`Failed stage: ${build.failed_stage}. `:""}{build.recovery_reason||"No recovery reason recorded."}</div></article>):<div style={muted}>No build telemetry recorded yet.</div>}</div></section>
  </>}
 </main>
}
function formatDuration(ms:number){if(ms<1000)return `${ms} ms`;return `${(ms/1000).toFixed(ms<10000?1:0)} s`}
function pill(outcome:string):CSSProperties{return{padding:"6px 9px",borderRadius:999,border:"1px solid #3f3f46",fontWeight:800,textTransform:"capitalize",justifySelf:"start",background:outcome==="success"?"#052e16":outcome==="recovered"?"#422006":"#450a0a"}}
const shell:CSSProperties={minHeight:"100vh",background:"#09090b",color:"#f4f4f5",padding:"clamp(16px,4vw,28px)",fontFamily:"Inter,system-ui,sans-serif"};
const header:CSSProperties={maxWidth:1180,margin:"0 auto 22px",display:"flex",justifyContent:"space-between",gap:20,alignItems:"flex-start"};
const eyebrow:CSSProperties={fontSize:12,textTransform:"uppercase",letterSpacing:".14em",color:"#a78bfa",fontWeight:900};
const muted:CSSProperties={color:"#a1a1aa",fontSize:13};
const button:CSSProperties={border:"1px solid #3f3f46",borderRadius:10,background:"#18181b",color:"#fff",padding:"10px 13px",fontWeight:800,cursor:"pointer"};
const stats:CSSProperties={maxWidth:1180,margin:"0 auto 18px",display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10};
const stat:CSSProperties={border:"1px solid #27272a",borderRadius:14,background:"#111113",padding:16,display:"grid",gap:6};
const panel:CSSProperties={maxWidth:1180,margin:"0 auto",border:"1px solid #27272a",borderRadius:16,background:"#111113",padding:16};
const row:CSSProperties={display:"grid",gridTemplateColumns:"minmax(220px,2fr) repeat(4,minmax(90px,1fr))",gap:12,alignItems:"center",padding:"14px 4px",borderBottom:"1px solid #27272a"};
