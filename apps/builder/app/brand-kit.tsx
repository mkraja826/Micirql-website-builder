"use client";

import { useState } from "react";
import type { ThemeConfig } from "@micirql/schema";
import { ensureFreshSession, readStoredSession } from "./auth-client";
import { analyzeLogoPixels, createTransparentLogoDerivative } from "./logo-pixel-analysis";
import styles from "./brand-kit.module.css";

type Brand = ThemeConfig["brand"];

const COLOR_KEYS = ["primary","secondary","accent","background","surface","textPrimary"] as const;
const ALLOWED = new Set(["image/png","image/jpeg","image/webp","image/svg+xml"]);

export function BrandKit({ brand, onChange }: { brand: Brand; onChange(next: Brand): void }) {
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const presentation = brand.logoPresentation;
  const logo = brand.logoAssetId;
  const favicon = brand.faviconAssetId;
  const social = brand.socialImageAssetId;
  const cleanup = presentation?.cleanupApplied === true;
  const ready = Boolean(logo || favicon || social);

  async function replaceLogo(file?:File){
    if(!file)return;
    if(file.size>5*1024*1024){setMessage("Logo must be smaller than 5 MB.");return}
    if(!ALLOWED.has(file.type)){setMessage("Use a PNG, JPG, WebP or SVG logo.");return}
    const project=activeProject();
    if(!project){setMessage("Open this site from the Projects screen before replacing its logo.");return}
    const stored=readStoredSession();
    if(!stored){setMessage("Your session has expired. Sign in again to replace the logo.");return}
    setBusy(true);setMessage("Analyzing logo and brand colors…");
    try{
      const session=await ensureFreshSession(stored);
      const dataUrl=await fileDataUrl(file);
      const [clientAnalysis,logoColors]=await Promise.all([analyzeLogoPixels(file),extractBrandColors(file)]);
      const cleanupDataUrl=await createTransparentLogoDerivative(file,clientAnalysis);
      setMessage("Checking palette, favicon and social card…");
      const response=await fetch("/api/brand/logo/editor",{method:"POST",headers:{Authorization:`Bearer ${session.access_token}`,"content-type":"application/json"},body:JSON.stringify({workspaceId:project.workspaceId,siteId:project.siteId,fileName:file.name,contentType:file.type,dataUrl,clientAnalysis:clientAnalysis??null,cleanupDataUrl:cleanupDataUrl??null,logoColors,brand})});
      const payload=await response.json() as {ok?:boolean;brand?:Brand;paletteDecision?:"use"|"repair"|"decouple";paletteScore?:number;error?:string};
      if(!response.ok||!payload.brand)throw new Error(payload.error??`Logo replacement failed (${response.status}).`);
      onChange(payload.brand);
      const decision=payload.paletteDecision?humanize(payload.paletteDecision):"Checked";
      const score=typeof payload.paletteScore==="number"?` · ${payload.paletteScore}/100`:"";
      setMessage(`Brand updated. Palette: ${decision}${score}. Saving draft…`);
      window.setTimeout(()=>setMessage(""),3200);
    }catch(error){setMessage(error instanceof Error?error.message:"Logo replacement failed.")}finally{setBusy(false)}
  }

  return <section className={styles.kit} aria-label="Brand Kit">
    <div className={styles.header}>
      <div><span>Brand Kit</span><strong>Your generated brand assets</strong></div>
      <div className={styles.status}>{busy?"Working…":ready?"Ready":"Awaiting logo"}</div>
    </div>

    <div className={styles.actions}>
      <label className={`${styles.replaceButton} ${busy?styles.disabled:""}`}>
        <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" disabled={busy} onChange={event=>{const file=event.target.files?.[0];void replaceLogo(file);event.currentTarget.value=""}}/>
        {busy?"Processing brand…":logo?"Replace logo":"Upload logo"}
      </label>
      <span>MiCirql preserves the original and rebuilds dependent brand assets automatically.</span>
    </div>
    {message?<div className={styles.message} role="status">{message}</div>:null}

    <div className={styles.assetGrid}>
      <div className={styles.asset}>
        <div className={styles.assetLabel}><span>Website logo</span><span>{cleanup?"Cleaned":"Original"}</span></div>
        {logo?<div className={styles.preview}><img src={logo} alt="Website logo preview"/></div>:<div className={styles.empty}>No logo uploaded</div>}
      </div>
      <div className={`${styles.asset} ${styles.favicon}`}>
        <div className={styles.assetLabel}><span>Icon</span></div>
        {favicon?<div className={styles.preview}><img src={favicon} alt="Favicon preview"/></div>:<div className={styles.empty}>—</div>}
      </div>
    </div>

    <div className={styles.social}>
      <div className={styles.assetLabel}><span>Social share card</span><span>1200 × 630</span></div>
      {social?<img src={social} alt="Social share card preview"/>:<div className={styles.socialEmpty}>A branded share card will appear here after generation.</div>}
    </div>

    <div className={styles.palette} aria-label="Approved website palette">
      {COLOR_KEYS.map(key=><div className={styles.color} key={key} title={`${key}: ${brand.colors[key]}`}>
        <div className={styles.colorSwatch} style={{background:brand.colors[key]}}/>
        <div className={styles.colorMeta}><strong>{humanize(key)}</strong><span>{brand.colors[key]}</span></div>
      </div>)}
    </div>

    <div className={styles.details}>
      <div className={styles.detail}><span>Logo treatment</span><strong>{presentation?humanize(presentation.treatment):"Automatic"}</strong></div>
      <div className={styles.detail}><span>Logo shape</span><strong>{presentation?humanize(presentation.shape):"Not measured"}</strong></div>
      <div className={styles.detail}><span>Background</span><strong>{presentation?.backgroundSignal?humanize(presentation.backgroundSignal):"Not measured"}</strong></div>
      <div className={styles.detail}><span>Favicon</span><strong>{brand.faviconStrategy?humanize(brand.faviconStrategy):favicon?"Generated":"Pending"}</strong></div>
      <div className={styles.detail}><span>Social image</span><strong>{brand.socialImageStrategy?humanize(brand.socialImageStrategy):social?"Generated":"Pending"}</strong></div>
    </div>

    <p className={styles.note}>{cleanup?"MiCirql preserved the original upload and uses a cleaned derivative on the website.":"Your original uploaded logo remains preserved. Website colors can change without altering the logo itself."}</p>
  </section>;
}

function activeProject(){if(typeof window==="undefined")return undefined;try{const raw=window.localStorage.getItem("micirql_active_project");if(!raw)return undefined;const value=JSON.parse(raw) as {workspaceId?:unknown;siteId?:unknown};return typeof value.workspaceId==="string"&&typeof value.siteId==="string"?{workspaceId:value.workspaceId,siteId:value.siteId}:undefined}catch{return undefined}}
function fileDataUrl(file:File){return new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>typeof reader.result==="string"?resolve(reader.result):reject(new Error("Could not read logo."));reader.onerror=()=>reject(new Error("Could not read logo."));reader.readAsDataURL(file)})}
function extractBrandColors(file:File){return new Promise<string[]>((resolve)=>{const objectUrl=URL.createObjectURL(file);const image=new Image();image.onload=()=>{try{const canvas=document.createElement("canvas");canvas.width=64;canvas.height=64;const ctx=canvas.getContext("2d",{willReadFrequently:true});if(!ctx){resolve([]);return}ctx.clearRect(0,0,64,64);ctx.drawImage(image,0,0,64,64);const pixels=ctx.getImageData(0,0,64,64).data;const counts=new Map<string,number>();for(let i=0;i<pixels.length;i+=16){const a=pixels[i+3]??0;if(a<120)continue;const r=pixels[i]??0,g=pixels[i+1]??0,b=pixels[i+2]??0;if(r>242&&g>242&&b>242)continue;const q=(v:number)=>Math.max(0,Math.min(255,Math.round(v/32)*32));const color=toHex(q(r),q(g),q(b));counts.set(color,(counts.get(color)??0)+1)}const ranked=[...counts.entries()].sort((a,b)=>b[1]-a[1]).map(([color])=>color);const chosen:string[]=[];for(const color of ranked){if(chosen.every(existing=>colorDistance(existing,color)>72)){chosen.push(color);if(chosen.length===5)break}}resolve(chosen)}catch{resolve([])}finally{URL.revokeObjectURL(objectUrl)}};image.onerror=()=>{URL.revokeObjectURL(objectUrl);resolve([])};image.src=objectUrl})}
function toHex(r:number,g:number,b:number){return `#${[r,g,b].map(v=>v.toString(16).padStart(2,"0")).join("")}`}
function colorDistance(a:string,b:string){const av=[1,3,5].map(i=>parseInt(a.slice(i,i+2),16));const bv=[1,3,5].map(i=>parseInt(b.slice(i,i+2),16));return Math.sqrt(av.reduce((sum,v,i)=>sum+(v-(bv[i]??0))**2,0))}
function humanize(value:string){return value.replace(/-/g," ").replace(/([a-z])([A-Z])/g,"$1 $2").replace(/^./,char=>char.toUpperCase())}
