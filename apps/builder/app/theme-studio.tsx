"use client";

import type { ThemeConfig } from "@micirql/schema";
import { BrandKit } from "./brand-kit";
import styles from "./theme-studio.module.css";

const FAMILIES: ThemeConfig["family"][] = ["minimalist","corporate","luxury","editorial","glass","maximalist","organic","futuristic","playful","cinematic"];
const DENSITIES: ThemeConfig["brand"]["density"][] = ["compact","comfortable","spacious"];
const SHAPES: ThemeConfig["brand"]["shape"][] = ["sharp","balanced","soft"];
const MOTIONS: ThemeConfig["brand"]["motion"][] = ["none","subtle","standard","rich"];

const PALETTES = [
  { id:"violet", name:"Violet", colors:{primary:"#6d5dfc",secondary:"#171717",accent:"#8b7fff",background:"#ffffff",surface:"#f5f5f7",textPrimary:"#111111",textSecondary:"#65656b",border:"#dddde3",success:"#168a4a",warning:"#ad6a00",error:"#c93636"}},
  { id:"clinic", name:"Clinic", colors:{primary:"#0f766e",secondary:"#164e63",accent:"#14b8a6",background:"#f8fffe",surface:"#edf9f7",textPrimary:"#102a2a",textSecondary:"#527070",border:"#cfe3df",success:"#15803d",warning:"#a16207",error:"#b91c1c"}},
  { id:"luxury", name:"Luxury", colors:{primary:"#9b7b43",secondary:"#17130f",accent:"#c7a86b",background:"#fffdf8",surface:"#f6f1e7",textPrimary:"#1d1913",textSecondary:"#756b5d",border:"#dfd5c4",success:"#3f7d50",warning:"#a06b19",error:"#a33a34"}},
  { id:"midnight", name:"Midnight", colors:{primary:"#8b5cf6",secondary:"#111827",accent:"#22d3ee",background:"#080b12",surface:"#111827",textPrimary:"#f8fafc",textSecondary:"#a7b0c0",border:"#283142",success:"#22c55e",warning:"#f59e0b",error:"#ef4444"}},
] satisfies Array<{id:string;name:string;colors:ThemeConfig["brand"]["colors"]}>;

const TYPE = [
  { id:"modern", name:"Modern", value:{display:"Inter",body:"Inter",ui:"Inter"}},
  { id:"editorial", name:"Editorial", value:{display:"Georgia",body:"Inter",ui:"Inter"}},
  { id:"human", name:"Human", value:{display:"Arial",body:"Arial",ui:"Arial"}},
] satisfies Array<{id:string;name:string;value:ThemeConfig["brand"]["typography"]}>;

function sameRecord<T extends Record<string,string>>(current:T,candidate:T){
  return Object.keys(candidate).every(key=>current[key as keyof T]===candidate[key as keyof T]);
}

function humanLabel(value:string){
  return value.replace(/-/g," ").replace(/^./,char=>char.toUpperCase());
}

export function ThemeStudio({ theme, onChange }: { theme: ThemeConfig; onChange(next: ThemeConfig): void }) {
  const patchBrand = (patch: Partial<ThemeConfig["brand"]>) => onChange({ ...theme, brand: { ...theme.brand, ...patch, colors: { ...theme.brand.colors, ...(patch.colors ?? {}) }, typography: { ...theme.brand.typography, ...(patch.typography ?? {}) } } });
  const setFamily = (family: ThemeConfig["family"]) => onChange({ ...theme, family });

  return <div className={styles.studio}>
    <p className={styles.scopeNote}><strong>Site-wide styles</strong><span>Changes here update the visual system across every page and section.</span></p>
    <BrandKit brand={theme.brand} onChange={brand=>onChange({...theme,brand})}/>
    <section className={styles.section}><span className={styles.label}>Theme</span><div className={styles.chips} role="group" aria-label="Theme presets">{FAMILIES.map(f=><button type="button" key={f} className={theme.family===f?styles.active:undefined} aria-pressed={theme.family===f} onClick={()=>setFamily(f)}>{humanLabel(f)}</button>)}</div></section>
    <section className={styles.section}><span className={styles.label}>Palette</span><div className={styles.palette} role="group" aria-label="Palette presets">{PALETTES.map(p=>{const active=sameRecord(theme.brand.colors,p.colors);return <button type="button" key={p.id} className={active?styles.active:undefined} aria-pressed={active} onClick={()=>patchBrand({colors:p.colors})}><span className={styles.swatch} style={{background:`linear-gradient(135deg, ${p.colors.primary} 0 50%, ${p.colors.background} 50%)`}}/><span>{p.name}</span></button>})}</div></section>
    <section className={styles.section}><span className={styles.label}>Typography</span><div className={styles.type} role="group" aria-label="Typography presets">{TYPE.map(t=>{const active=sameRecord(theme.brand.typography,t.value);return <button type="button" key={t.id} className={active?styles.active:undefined} aria-pressed={active} onClick={()=>patchBrand({typography:t.value})}><strong style={{fontFamily:t.value.display}}>{t.name}</strong><small>{t.value.display}</small></button>})}</div></section>
    <section className={styles.controls}>
      <label>Density<small>Controls overall spacing and content breathing room.</small><select value={theme.brand.density} onChange={e=>patchBrand({density:e.target.value as ThemeConfig["brand"]["density"]})}>{DENSITIES.map(v=><option key={v} value={v}>{humanLabel(v)}</option>)}</select></label>
      <label>Shape<small>Controls how sharp or rounded the site feels.</small><select value={theme.brand.shape} onChange={e=>patchBrand({shape:e.target.value as ThemeConfig["brand"]["shape"]})}>{SHAPES.map(v=><option key={v} value={v}>{humanLabel(v)}</option>)}</select></label>
      <label>Motion<small>Controls the amount of site-wide interface animation.</small><select value={theme.brand.motion} onChange={e=>patchBrand({motion:e.target.value as ThemeConfig["brand"]["motion"]})}>{MOTIONS.map(v=><option key={v} value={v}>{humanLabel(v)}</option>)}</select></label>
    </section>
    <section className={styles.section}><span className={styles.label}>Fine tune</span><div className={styles.pickers}>
      <label>Primary<span>{theme.brand.colors.primary}</span><input type="color" aria-label="Primary color" value={theme.brand.colors.primary} onChange={e=>patchBrand({colors:{...theme.brand.colors,primary:e.target.value}})}/></label>
      <label>Accent<span>{theme.brand.colors.accent}</span><input type="color" aria-label="Accent color" value={theme.brand.colors.accent} onChange={e=>patchBrand({colors:{...theme.brand.colors,accent:e.target.value}})}/></label>
      <label>Background<span>{theme.brand.colors.background}</span><input type="color" aria-label="Background color" value={theme.brand.colors.background} onChange={e=>patchBrand({colors:{...theme.brand.colors,background:e.target.value}})}/></label>
    </div></section>
  </div>;
}
