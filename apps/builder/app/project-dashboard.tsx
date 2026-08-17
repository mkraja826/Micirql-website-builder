"use client";
import { useEffect,useState } from "react";
import type { SupabaseSession } from "./auth-client";
import { OnboardingGate } from "./onboarding-gate";
import { RechargeCredits } from "./recharge-credits";
import styles from "./project-dashboard.module.css";

type Project={id:string;workspace_id:string;name:string;status:string;published_version_id:string|null;updated_at:string;draft?:{revision:number;updated_at:string}|null;hostname?:{hostname:string;status:string;ssl_status:string}|null};
export function ProjectDashboard({session}:{session:SupabaseSession}){
 const [projects,setProjects]=useState<Project[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(""),[open,setOpen]=useState<Project|null>(null),[busyId,setBusyId]=useState<string|null>(null),[menuId,setMenuId]=useState<string|null>(null);
 const authHeaders=()=>({Authorization:`Bearer ${session.access_token}`});
 async function load(){setLoading(true);try{const r=await fetch("/api/projects",{cache:"no-store",headers:authHeaders()});const p=await r.json();if(!r.ok)throw new Error(p.error??"Could not load projects.");setProjects(p.projects??[]);setError("")}catch(e){setError(e instanceof Error?e.message:"Could not load projects.")}finally{setLoading(false)}}
 useEffect(()=>{void load()},[session.access_token]);
 async function create(){const name=window.prompt("Website name","Untitled website")?.trim();if(!name)return;const r=await fetch("/api/projects",{method:"POST",headers:{...authHeaders(),"content-type":"application/json"},body:JSON.stringify({action:"create",name})});const p=await r.json();if(!r.ok||!p.project){setError(p.error??"Could not create site.");return}setError("");setOpen({...p.project,status:"draft",published_version_id:null,updated_at:new Date().toISOString()})}
 async function rename(project:Project){setMenuId(null);const name=window.prompt("Rename website",project.name)?.trim();if(!name||name===project.name)return;await mutate(project.id,{siteId:project.id,name});}
 async function duplicate(project:Project){setMenuId(null);setBusyId(project.id);try{const r=await fetch("/api/projects",{method:"POST",headers:{...authHeaders(),"content-type":"application/json"},body:JSON.stringify({action:"duplicate",workspaceId:project.workspace_id,siteId:project.id,name:`${project.name} Copy`})});const p=await r.json();if(!r.ok){setError(p.error??"Duplicate failed.");return}setError("");await load()}finally{setBusyId(null)}}
 async function archive(project:Project){setMenuId(null);if(!window.confirm(`Archive “${project.name}”? It will be hidden from your active projects.`))return;await mutate(project.id,{siteId:project.id,archived:true},true)}
 async function remove(project:Project){setMenuId(null);if(!window.confirm(`Permanently delete “${project.name}”? This also removes its drafts, versions, domains and related site data. This cannot be undone.`))return;setBusyId(project.id);try{const r=await fetch("/api/projects",{method:"DELETE",headers:{...authHeaders(),"content-type":"application/json"},body:JSON.stringify({siteId:project.id})});const p=await r.json().catch(()=>({}));if(!r.ok||!p.ok){setError(p.error??"Delete failed.");return}setProjects(current=>current.filter(item=>item.id!==project.id));setError("")}finally{setBusyId(null)}}
 async function mutate(siteId:string,body:Record<string,unknown>,removeAfter=false){setBusyId(siteId);try{const r=await fetch("/api/projects",{method:"PATCH",headers:{...authHeaders(),"content-type":"application/json"},body:JSON.stringify(body)});const p=await r.json();if(!r.ok||!p.project){setError(p.error??"Update failed.");return}setError("");if(removeAfter)setProjects(current=>current.filter(item=>item.id!==siteId));else await load()}finally{setBusyId(null)}}
 function openEnquiries(project:Project){const q=new URLSearchParams({siteId:project.id,name:project.name});window.location.href=`/enquiries?${q.toString()}`}
 function domainLabel(project:Project){if(!project.hostname)return "No custom domain";if(project.hostname.status==="active"&&project.hostname.ssl_status==="active")return project.hostname.hostname;return `${project.hostname.hostname} · ${project.hostname.status}`}
 if(open)return <OnboardingGate session={session} initialWorkspaceId={open.workspace_id} initialSiteId={open.id} onBack={()=>{setOpen(null);void load()}}/>;
 const workspaceId=projects[0]?.workspace_id;
 return <main className={styles.shell} onClick={()=>menuId&&setMenuId(null)}>
  <header className={styles.header}>
   <div className={styles.brandBlock}><img className={styles.brandLogo} src="/assets/micirql-logo.webp" alt="MiCirql"/><div><span className={styles.eyebrow}>Website workspace</span><h1>Your websites</h1><p>Build, manage and publish from one place.</p></div></div>
   <div className={styles.headerActions}>{workspaceId?<RechargeCredits session={session} workspaceId={workspaceId}/>:null}<button className={styles.newButton} onClick={()=>void create()}>+ New website</button></div>
  </header>
  {error?<div className={styles.error}>{error}</div>:null}
  {loading?<div className={styles.empty}>Loading projects…</div>:projects.length?<section className={styles.grid}>{projects.map(p=><article className={styles.card} key={p.id}>
   <button className={styles.preview} onClick={()=>setOpen(p)} aria-label={`Open ${p.name}`}><span>{p.name.slice(0,1).toUpperCase()}</span><em>Open editor</em></button>
   <div className={styles.body}>
    <div className={styles.top}><div className={styles.titleGroup}><h2>{p.name}</h2><p>{domainLabel(p)}</p></div><span className={p.published_version_id?styles.live:styles.draft}>{p.published_version_id?"Live":"Draft"}</span></div>
    <div className={styles.meta}><span>Updated {new Date(p.updated_at).toLocaleDateString()}</span><span>Revision {p.draft?.revision??0}</span></div>
    <div className={styles.primaryActions}>
     <button className={styles.openButton} disabled={busyId===p.id} onClick={()=>setOpen(p)}>Open editor</button>
     <button className={styles.secondaryButton} disabled={busyId===p.id} onClick={()=>openEnquiries(p)}>Enquiries</button>
     <div className={styles.menuWrap} onClick={event=>event.stopPropagation()}><button className={styles.moreButton} aria-label={`More actions for ${p.name}`} aria-expanded={menuId===p.id} onClick={()=>setMenuId(menuId===p.id?null:p.id)}>•••</button>{menuId===p.id?<div className={styles.menu}>
      <button disabled={busyId===p.id} onClick={()=>void rename(p)}>Rename</button>
      <button disabled={busyId===p.id} onClick={()=>void duplicate(p)}>Duplicate</button>
      <button disabled={busyId===p.id} onClick={()=>void archive(p)}>Archive</button>
      <button className={styles.danger} disabled={busyId===p.id} onClick={()=>void remove(p)}>Delete</button>
     </div>:null}</div>
    </div>
   </div>
  </article>)}</section>:<div className={styles.empty}><h2>No websites yet</h2><p>Create your first website to start the guided business discovery flow.</p><button className={styles.newButton} onClick={()=>void create()}>Create website</button></div>}
 </main>
}