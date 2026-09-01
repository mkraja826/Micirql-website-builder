"use client";

import { useState } from "react";
import type { ThemeConfig } from "@micirql/schema";
import { ensureFreshSession, readStoredSession } from "./auth-client";
import { analyzeLogoPixels, createTransparentLogoDerivative } from "./logo-pixel-analysis";
import styles from "./brand-kit.module.css";

type Brand = ThemeConfig["brand"];
type HistoryEntry = NonNullable<Brand["history"]>[number];
type ColorPreference = "keep" | "match";

const COLOR_KEYS = ["primary","secondary","accent","background","surface","textPrimary"] as const;
const ALLOWED = new Set(["image/png","image/jpeg","image/webp","image/svg+xml"]);

export function BrandKit({ brand, onChange }: { brand: Brand; onChange(next: Brand): void }) {
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [colorPreference,setColorPreference]=useState<ColorPreference>("keep");
  const presentation = brand.logoPresentation;
  const logo = brand.logoAssetId;
  const favicon = brand.faviconAssetId;
  const social = brand.socialImageAssetId;
  const cleanup = presentation?.cleanupApplied === true;
  const ready = Boolean(logo || favicon || social);
  const history = brand.history ?? [];

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
      setMessage(colorPreference==="match"?"Checking logo palette, favicon and social card…":"Keeping website colors and rebuilding brand assets…");
      const response=await fetch("/api/brand/logo/editor",{method:"POST",headers:{Authorization:`Bearer ${session.access_token}`,"content-type":"application/json"},body:JSON.stringify({workspaceId:project.workspaceId,siteId:project.siteId,fileName:file.name,contentType:file.type,dataUrl,clientAnalysis:clientAnalysis??null,cleanupDataUrl:cleanupDataUrl??null,logoColors,colorPreference,brand})});
      const payload=await response.json() as {ok?:boolean;brand?:Brand;paletteDecision?:"use"|"repair"|"decouple";paletteScore?:number;paletteApplied?:boolean;error?:string};
      if(!response.ok||!payload.brand)throw new Error(payload.error??`Logo replacement failed (${response.status}).`);
      const next=structuredClone(payload.brand);
      next.history=[captureHistory(brand,"logo-replacement"),...history].slice(0,5);
      onChange(next);
      if(colorPreference==="keep")setMessage("Brand updated. Existing website colors were preserved. Saving draft…");
      else{
        const decision=payload.paletteDecision?humanize(payload.paletteDecision):"Checked";
        const score=typeof payload.paletteScore==="number"?` · ${payload.paletteScore}/100`:"";
        const applied=payload.paletteApplied===false?" · existing colors kept for safety":"";
        setMessage(`Brand updated. Palette: ${decision}${score}${applied}. Saving draft…`);
      }
      window.setTimeout(()=>setMessage(""),3600);
    }catch(error){setMessage(error instanceof Error?error.message:"Logo replacement failed.")}finally{setBusy(false)}
  }

  function restoreBrand(entry:HistoryEntry){
    const next=structuredClone(brand);
    applyHistoryEntry(next,entry);
    next.history=[captureHistory(brand,"brand-restore"),...history.filter(item=>item.id!==entry.id)].slice(0,5);
    onChange(next);
    setMessage("Previous Brand Kit restored. Saving draft…");
    window.setTimeout(()=>setMessage(""),3000);
  }

  return <section className={styles.kit} aria-label="Brand Kit">
    <div className={styles.header}>
      <div><span>Brand Kit</span><strong>Your generated brand assets</strong></div>
      <div className={styles.status} role="status" aria-live="polite">{busy?"Working…":ready?"Ready":"Awaiting logo"}</div>
    </div>

    <div className={styles.preference} role="group" aria-labelledby="brand-logo-preference-label">
      <span id="brand-logo-preference-label">When replacing the logo</span>
      <div className={styles.preferenceOptions}>
        <button type="button" className={colorPreference==="keep"?styles.preferenceActive:undefined} aria-pressed={colorPreference==="keep"} onClick={()=>setColorPreference("keep")} disabled={busy}>
          <strong>Keep current colors</strong><small>Change the logo only</small>
        </button>
        <button type="button" className={colorPreference==="match"?styles.preferenceActive:undefined} aria-pressed={colorPreference==="match"} onClick={()=>setColorPreference("match")} disabled={busy}>
          <strong>Match website to logo</strong><small>Use only a safe approved palette</small>
        </button>
      </div>
      <p>MiCirql never forces an unsafe logo palette. If the new colors fail the quality gate, the current professional website colors stay in place.</p>
    </div>

    <div className={styles.actions}>
      <label className={`${styles.replaceButton} ${busy?styles.disabled:""}`}>
        <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" disabled={busy} onChange={event=>{const file=event.target.files?.[0];void replaceLogo(file);event.currentTarget.value=""}}/>
        {busy?"Processing brand…":logo?"Replace logo":"Upload logo"}
      </label>
      <span>MiCirql preserves the original and rebuilds dependent brand assets automatically.</span>
    </div>
    {message?<div className={styles.message} role="status" aria-atomic="true">{message}</div>:null}

    <div className={styles.assetGrid} role="group" aria-label="Logo and favicon previews">
      <div className={styles.asset}>
        <div className={styles.assetLabel}><span>Website logo</span><span>{cleanup?"Cleaned":"Original"}</span></div>
        {logo?<div className={styles.preview}><img src={logo} alt="Website logo preview"/></div>:<div className={styles.empty}>No logo uploaded</div>}
      </div>
      <div className={`${styles.asset} ${styles.favicon}`}>
        <div className={styles.assetLabel}><span>Icon</span></div>
        {favicon?<div className={styles.preview}><img src={favicon} alt="Favicon preview"/></div>:<div className={styles.empty}>—</div>}
      </div>
    </div>

    <div className={styles.social} role="group" aria-labelledby="brand-social-card-label">
      <div className={styles.assetLabel}><span id="brand-social-card-label">Social share card</span><span>1200 × 630</span></div>
      {social?<img src={social} alt="Social share card preview"/>:<div className={styles.socialEmpty}>A branded share card will appear here after generation.</div>}
    </div>

    <div className={styles.palette} role="group" aria-label="Approved website palette">
      {COLOR_KEYS.map(key=><div className={styles.color} key={key} title={`${key}: ${brand.colors[key]}`}>
        <div className={styles.colorSwatch} style={{background:brand.colors[key]}}/>
        <div className={styles.colorMeta}><strong>{humanize(key)}</strong><span>{brand.colors[key]}</span></div>
      </div>)}
    </div>

    <div className={styles.details} role="group" aria-label="Brand asset details">
      <div className={styles.detail}><span>Logo treatment</span><strong>{presentation?humanize(presentation.treatment):"Automatic"}</strong></div>
      <div className={styles.detail}><span>Logo shape</span><strong>{presentation?humanize(presentation.shape):"Not measured"}</strong></div>
      <div className={styles.detail}><span>Background</span><strong>{presentation?.backgroundSignal?humanize(presentation.backgroundSignal):"Not measured"}</strong></div>
      <div className={styles.detail}><span>Favicon</span><strong>{brand.faviconStrategy?humanize(brand.faviconStrategy):favicon?"Generated":"Pending"}</strong></div>
      <div className={styles.detail}><span>Social image</span><strong>{brand.socialImageStrategy?humanize(brand.socialImageStrategy):social?"Generated":"Pending"}</strong></div>
    </div>

    {history.length?<div className={styles.history} role="group" aria-labelledby="brand-history-label">
      <div className={styles.historyHeader}><span id="brand-history-label">Brand history</span><small>Last {history.length} saved {history.length===1?"version":"versions"}</small></div>
      <div className={styles.historyList}>{history.map(entry=><div className={styles.historyItem} key={entry.id}>
        <div className={styles.historyThumb}>{entry.logoAssetId?<img src={entry.logoAssetId} alt="Previous logo"/>:<span>—</span>}</div>
        <div className={styles.historyMeta}><strong>{historyReason(entry.reason)}</strong><span>{formatHistoryDate(entry.createdAt)}</span><div>{[entry.colors.primary,entry.colors.accent,entry.colors.background].map((color,index)=><i key={`${entry.id}-${index}`} style={{background:color}}/>)}</div></div>
        <button type="button" aria-label={`Restore ${historyReason(entry.reason)} from ${formatHistoryDate(entry.createdAt)}`} onClick={()=>restoreBrand(entry)} disabled={busy}>Restore</button>
      </div>)}</div>
    </div>:null}

    <p className={styles.note}>{cleanup?"MiCirql preserved the original upload and uses a cleaned derivative on the website.":"Your original uploaded logo remains preserved. Website colors can change without altering the logo itself."}</p>
  </section>;
}

function captureHistory(brand:Brand,reason:HistoryEntry["reason"]):HistoryEntry{return {id:crypto.randomUUID(),createdAt:new Date().toISOString(),reason,...(brand.logoAssetId?{logoAssetId:brand.logoAssetId}:{}),...(brand.logoOriginalAssetId?{logoOriginalAssetId:brand.logoOriginalAssetId}:{}),...(brand.logoCleanupAssetId?{logoCleanupAssetId:brand.logoCleanupAssetId}:{}),...(brand.faviconAssetId?{faviconAssetId:brand.faviconAssetId}:{}),...(brand.faviconStrategy?{faviconStrategy:brand.faviconStrategy}:{}),...(brand.socialImageAssetId?{socialImageAssetId:brand.socialImageAssetId}:{}),...(brand.socialImageStrategy?{socialImageStrategy:brand.socialImageStrategy}:{}),...(brand.logoPresentation?{logoPresentation:structuredClone(brand.logoPresentation)}:{}),colors:structuredClone(brand.colors)}}
function applyHistoryEntry(target:Brand,entry:HistoryEntry){setOptional(target,"logoAssetId",entry.logoAssetId);setOptional(target,"logoOriginalAssetId",entry.logoOriginalAssetId);setOptional(target,"logoCleanupAssetId",entry.logoCleanupAssetId);setOptional(target,"faviconAssetId",entry.faviconAssetId);setOptional(target,"faviconStrategy",entry.faviconStrategy);setOptional(target,"socialImageAssetId",entry.socialImageAssetId);setOptional(target,"socialImageStrategy",entry.socialImageStrategy);setOptional(target,"logoPresentation",entry.logoPresentation?structuredClone(entry.logoPresentation):undefined);target.colors=structuredClone(entry.colors)}
function setOptional<K extends keyof Brand>(target:Brand,key:K,value:Brand[K]|undefined){if(value===undefined)delete target[key];else target[key]=value}
function historyReason(reason:HistoryEntry["reason"]){if(reason==="logo-replacement")return"Before logo change";if(reason==="brand-restore")return"Before restore";return"Before palette change"}
function formatHistoryDate(value:string){const date=new Date(value);return Number.isNaN(date.getTime())?"Saved version":date.toLocaleString(undefined,{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})}
function activeProject(){if(typeof window==="undefined")return undefined;try{const raw=window.localStorage.getItem("micirql_active_project");if(!raw)return undefined;const value=JSON.parse(raw) as {workspaceId?:unknown;siteId?:unknown};return typeof value.workspaceId==="string"&&typeof value.siteId==="string"?{workspaceId:value.workspaceId,siteId:value.siteId}:undefined}catch{return undefined}}
function fileDataUrl(file:File){return new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>typeof reader.result==="string"?resolve(reader.result):reject(new Error("Could not read logo."));reader.onerror=()=>reject(new Error("Could not read logo."));reader.readAsDataURL(file)})}
function extractBrandColors(file:File){return new Promise<string[]>((resolve)=>{const objectUrl=URL.createObjectURL(file);const image=new Image();image.onload=()=>{try{const canvas=document.createElement("canvas");canvas.width=64;canvas.height=64;const ctx=canvas.getContext("2d",{willReadFrequently:true});if(!ctx){resolve([]);return}ctx.clearRect(0,0,64,64);ctx.drawImage(image,0,0,64,64);const pixels=ctx.getImageData(0,0,64,64).data;const counts=new Map<string,number>();for(let i=0;i<pixels.length;i+=16){const a=pixels[i+3]??0;if(a<120)continue;const r=pixels[i]??0,g=pixels[i+1]??0,b=pixels[i+2]??0;if(r>242&&g>242&&b>242)continue;const q=(v:number)=>Math.max(0,Math.min(255,Math.round(v/32)*32));const color=toHex(q(r),q(g),q(b));counts.set(color,(counts.get(color)??0)+1)}const ranked=[...counts.entries()].sort((a,b)=>b[1]-a[1]).map(([color])=>color);const chosen:string[]=[];for(const color of ranked){if(chosen.every(existing=>colorDistance(existing,color)>72)){chosen.push(color);if(chosen.length===5)break}}resolve(chosen)}catch{resolve([])}finally{URL.revokeObjectURL(objectUrl)}};image.onerror=()=>{URL.revokeObjectURL(objectUrl);resolve([])};image.src=objectUrl})}
function toHex(r:number,g:number,b:number){return `#${[r,g,b].map(v=>v.toString(16).padStart(2,"0")).join("")}`}
function colorDistance(a:string,b:string){const av=[1,3,5].map(i=>parseInt(a.slice(i,i+2),16));const bv=[1,3,5].map(i=>parseInt(b.slice(i,i+2),16));return Math.sqrt(av.reduce((sum,v,i)=>sum+(v-(bv[i]??0))**2,0))}
function humanize(value:string){return value.replace(/-/g," ").replace(/([a-z])([A-Z])/g,"$1 $2").replace(/^./,char=>char.toUpperCase())}
