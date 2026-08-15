"use client";

import type { ThemeConfig } from "@micirql/schema";
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

export function ThemeStudio({ theme, onChange }: { theme: ThemeConfig; onChange(next: ThemeConfig): void }) {
  const patchBrand = (patch: Partial<ThemeConfig["brand"]>) => onChange({ ...theme, brand: { ...theme.brand, ...patch, colors: { ...theme.brand.colors, ...(patch.colors ?? {}) }, typography: { ...theme.brand.typography, ...(patch.typography ?? {}) } } });
  const setFamily = (family: ThemeConfig["family"]) => onChange({ ...theme, family });

  return <div className={styles.studio}>
    <section className={styles.section}><span className={styles.label}>Theme</span><div className={styles.chips}>{FAMILIES.map(f=><button type="button" key={f} className={theme.family===f?styles.active:undefined} onClick={()=>setFamily(f)}>{f}</button>)}</div></section>
    <section className={styles.section}><span className={styles.label}>Palette</span><div className={styles.palette}>{PALETTES.map(p=><button type="button" key={p.id} onClick={()=>patchBrand({colors:p.colors})}><span className={styles.swatch} style={{background:`linear-gradient(135deg, ${p.colors.primary} 0 50%, ${p.colors.background} 50%)`}}/><span>{p.name}</span></button>)}</div></section>
    <section className={styles.section}><span className={styles.label}>Typography</span><div className={styles.type}>{TYPE.map(t=><button type="button" key={t.id} onClick={()=>patchBrand({typography:t.value})}><strong style={{fontFamily:t.value.display}}>{t.name}</strong><small>{t.value.display}</small></button>)}</div></section>
    <section className={styles.controls}><label>Density<select value={theme.brand.density} onChange={e=>patchBrand({density:e.target.value as ThemeConfig["brand"]["density"]})}>{DENSITIES.map(v=><option key={v}>{v}</option>)}</select></label><label>Shape<select value={theme.brand.shape} onChange={e=>patchBrand({shape:e.target.value as ThemeConfig["brand"]["shape"]})}>{SHAPES.map(v=><option key={v}>{v}</option>)}</select></label><label>Motion<select value={theme.brand.motion} onChange={e=>patchBrand({motion:e.target.value as ThemeConfig["brand"]["motion"]})}>{MOTIONS.map(v=><option key={v}>{v}</option>)}</select></label></section>
    <section className={styles.section}><span className={styles.label}>Fine tune</span><div className={styles.pickers}><label>Primary<input type="color" value={theme.brand.colors.primary} onChange={e=>patchBrand({colors:{...theme.brand.colors,primary:e.target.value}})}/></label><label>Accent<input type="color" value={theme.brand.colors.accent} onChange={e=>patchBrand({colors:{...theme.brand.colors,accent:e.target.value}})}/></label><label>Background<input type="color" value={theme.brand.colors.background} onChange={e=>patchBrand({colors:{...theme.brand.colors,background:e.target.value}})}/></label></div></section>
  </div>;
}
