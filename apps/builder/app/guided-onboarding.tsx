"use client";

import { useState } from "react";
import type { SupabaseSession } from "./auth-client";
import { analyzeLogoPixels, createTransparentLogoDerivative } from "./logo-pixel-analysis";
import styles from "./guided-onboarding.module.css";

export type GuidedOnboardingValue = {
  businessName: string;
  industry: string;
  subindustry: string;
  location: string;
  services: string;
  goals: string[];
  styleTags: string[];
  requiredCapabilities: string[];
  languages: string;
  notes: string;
  logoUrl: string | null;
  brandColors: string[];
};

const initialValue: GuidedOnboardingValue = {
  businessName: "",
  industry: "dental",
  subindustry: "",
  location: "",
  services: "",
  goals: ["generate leads"],
  styleTags: ["professional", "modern"],
  requiredCapabilities: ["contact form"],
  languages: "en",
  notes: "",
  logoUrl: null,
  brandColors: [],
};

const steps = ["Business", "Brand", "Goals", "Review"] as const;

export function GuidedOnboarding({
  session,
  workspaceId,
  siteId,
  building,
  error,
  onBack,
  onSubmit,
}: {
  session: SupabaseSession;
  workspaceId: string;
  siteId: string;
  building: boolean;
  error?: string;
  onBack?: () => void;
  onSubmit(value: GuidedOnboardingValue): Promise<void> | void;
}) {
  const [step, setStep] = useState(0);
  const [value, setValue] = useState<GuidedOnboardingValue>(initialValue);
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoPreview, setLogoPreview] = useState("");
  const [localError, setLocalError] = useState("");

  const canContinue = step === 0 ? Boolean(value.businessName.trim() && value.services.trim()) : true;
  const visibleError = localError || error || "";

  async function selectLogo(file?: File) {
    if (!file) {
      setLogoPreview("");
      setValue((current) => ({ ...current, logoUrl: null, brandColors: [] }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) return setLocalError("Logo must be smaller than 5 MB.");
    if (!["image/png", "image/jpeg", "image/webp", "image/svg+xml"].includes(file.type)) return setLocalError("Use a PNG, JPG, WebP or SVG logo.");
    setLogoBusy(true);
    setLocalError("");
    try {
      const dataUrl = await fileDataUrl(file);
      setLogoPreview(dataUrl);
      const [brandColors, clientAnalysis] = await Promise.all([extractBrandColors(file), analyzeLogoPixels(file)]);
      const cleanupDataUrl = await createTransparentLogoDerivative(file, clientAnalysis);
      const response = await fetch("/api/brand/logo", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}`, "content-type": "application/json" },
        body: JSON.stringify({ workspaceId, siteId, fileName: file.name, contentType: file.type, dataUrl, clientAnalysis: clientAnalysis ?? null, cleanupDataUrl: cleanupDataUrl ?? null }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.url) throw new Error(payload?.error ?? "Logo upload failed.");
      setValue((current) => ({ ...current, logoUrl: String(payload.url), brandColors }));
      if (payload.cleanupApplied && payload.url) setLogoPreview(String(payload.url));
    } catch (caught) {
      setLocalError(caught instanceof Error ? caught.message : "Logo upload failed.");
    } finally {
      setLogoBusy(false);
    }
  }

  function next() {
    if (!canContinue) {
      setLocalError("Add your business name and main services before continuing.");
      return;
    }
    setLocalError("");
    setStep((current) => Math.min(3, current + 1));
  }

  return <main className={styles.shell}>
    <section className={styles.card}>
      <div className={styles.topbar}>
        <button className={styles.back} type="button" onClick={step > 0 ? () => setStep(step - 1) : onBack}>{step > 0 ? "← Back" : "← Projects"}</button>
        <span className={styles.progressMeta}>Step {step + 1} of 4 · {steps[step]}</span>
      </div>
      <div className={styles.progress}><div className={styles.progressFill} style={{ width: `${((step + 1) / 4) * 100}%` }} /></div>
      <div className={styles.content}>
        <header>
          <div className={styles.eyebrow}>MiCirql guided discovery</div>
          <h1 className={styles.heading}>{step === 0 ? "Tell us about your business." : step === 1 ? "Give MiCirql your brand direction." : step === 2 ? "What should this website achieve?" : "Review before we build."}</h1>
          <p className={styles.intro}>{step === 0 ? "We only need the essentials first. MiCirql will use them to choose the right industry intelligence and site structure." : step === 1 ? "Upload a logo if you have one and choose the visual feeling you want. MiCirql handles the underlying design system." : step === 2 ? "Choose the outcomes and functionality that matter. We will only surface features relevant to your website." : "Check the brief. MiCirql will use this to assemble the site, write grounded content and prepare the editor."}</p>
        </header>

        {step === 0 ? <div className={styles.step}>
          <div className={styles.grid}>
            <Field label="Business name"><input className={styles.control} value={value.businessName} onChange={(e) => setValue({ ...value, businessName: e.target.value })} placeholder="Your business name" /></Field>
            <Field label="Industry"><select className={styles.control} value={value.industry} onChange={(e) => setValue({ ...value, industry: e.target.value })}><option value="dental">Dental / Clinic</option><option value="restaurant">Restaurant / Hospitality</option><option value="real estate">Real Estate</option><option value="professional services">Professional Services</option><option value="retail">Retail</option><option value="other">Other</option></select></Field>
            <Field label="Speciality"><input className={styles.control} value={value.subindustry} onChange={(e) => setValue({ ...value, subindustry: e.target.value })} placeholder="Implants, fine dining, residential…" /></Field>
            <Field label="Primary location"><input className={styles.control} value={value.location} onChange={(e) => setValue({ ...value, location: e.target.value })} placeholder="Hyderabad, Telangana" /></Field>
          </div>
          <Field label="Main services"><textarea className={styles.control} style={{ minHeight: 118, resize: "vertical" }} value={value.services} onChange={(e) => setValue({ ...value, services: e.target.value })} placeholder="Dental implants, crowns, root canal…" /></Field>
        </div> : null}

        {step === 1 ? <div className={styles.step}>
          <div className={styles.brandBox}>
            <div><strong>Brand logo <span className={styles.hint}>(optional)</span></strong><div className={styles.hint}>MiCirql checks the logo background, transparency and dominant colors automatically.</div></div>
            <div className={styles.logoRow}>
              <label className={styles.upload}><input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden onChange={(e) => void selectLogo(e.target.files?.[0])} />{logoBusy ? "Analyzing…" : value.logoUrl ? "Replace logo" : "Upload logo"}</label>
              {logoPreview ? <div className={styles.logoPreview}><img src={logoPreview} alt="Logo preview" style={{ width: "100%", height: "100%", objectFit: "contain" }} /></div> : <div className={styles.placeholder}>LOGO</div>}
              <div><div className={styles.hint}>Detected brand colors</div><div className={styles.swatches}>{value.brandColors.length ? value.brandColors.map((color) => <span key={color} className={styles.swatch} style={{ background: color }} title={color} />) : <span className={styles.hint}>No colors detected yet</span>}</div></div>
            </div>
            {value.logoUrl ? <div className={styles.success}>✓ Logo analyzed and ready for the website brand system.</div> : null}
          </div>
          <ChoiceGroup label="Visual direction" values={["professional", "modern", "premium", "minimal", "bold", "friendly", "editorial"]} selected={value.styleTags} onChange={(styleTags) => setValue({ ...value, styleTags })} />
        </div> : null}

        {step === 2 ? <div className={styles.step}>
          <ChoiceGroup label="Main goals" values={["generate leads", "book appointments", "sell online", "show portfolio", "build trust", "rank in search"]} selected={value.goals} onChange={(goals) => setValue({ ...value, goals })} />
          <ChoiceGroup label="Required functionality" values={["contact form", "booking", "gallery", "blog", "payments", "maps", "lead capture", "multilingual"]} selected={value.requiredCapabilities} onChange={(requiredCapabilities) => setValue({ ...value, requiredCapabilities })} />
          <div className={styles.grid}>
            <Field label="Languages"><input className={styles.control} value={value.languages} onChange={(e) => setValue({ ...value, languages: e.target.value })} placeholder="en, hi, te" /></Field>
            <Field label="Anything else"><input className={styles.control} value={value.notes} onChange={(e) => setValue({ ...value, notes: e.target.value })} placeholder="International patients, 24/7 enquiries…" /></Field>
          </div>
        </div> : null}

        {step === 3 ? <div className={styles.review}>
          <Review label="Business" value={`${value.businessName} · ${value.industry}${value.subindustry ? ` · ${value.subindustry}` : ""}${value.location ? ` · ${value.location}` : ""}`} />
          <Review label="Services" value={value.services} />
          <Review label="Brand" value={`${value.styleTags.join(", ")}${value.logoUrl ? " · logo supplied" : " · no logo"}`} />
          <Review label="Goals" value={value.goals.join(", ") || "No goals selected"} />
          <Review label="Functionality" value={value.requiredCapabilities.join(", ") || "No extra functionality selected"} />
          <Review label="Languages" value={value.languages || "en"} />
        </div> : null}

        {visibleError ? <div className={styles.error}>{visibleError}</div> : null}
        <div className={styles.actions}>
          {step > 0 ? <button type="button" className={styles.secondary} onClick={() => setStep(step - 1)} disabled={building}>Back</button> : <span />}
          {step < 3 ? <button type="button" className={styles.primary} onClick={next} disabled={logoBusy}>Continue</button> : <button type="button" className={styles.primary} disabled={building || logoBusy} onClick={() => void onSubmit(value)}>{building ? "Building your website…" : "Create my website"}</button>}
        </div>
      </div>
    </section>
  </main>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className={styles.field}>{label}{children}</label>; }
function ChoiceGroup({ label, values, selected, onChange }: { label: string; values: string[]; selected: string[]; onChange(value: string[]): void }) { return <fieldset style={{ border: 0, margin: 0, padding: 0 }}><legend style={{ fontSize: 14, fontWeight: 800, marginBottom: 12 }}>{label}</legend><div className={styles.choices}>{values.map((item) => { const active = selected.includes(item); return <button key={item} type="button" aria-pressed={active} className={`${styles.choice} ${active ? styles.choiceActive : ""}`} onClick={() => onChange(active ? selected.filter((value) => value !== item) : [...selected, item])}>{item}</button>; })}</div></fieldset>; }
function Review({ label, value }: { label: string; value: string }) { return <div className={styles.reviewCard}><strong>{label}</strong><span>{value || "Not provided"}</span></div>; }
function fileDataUrl(file: File) { return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Could not read logo.")); reader.onerror = () => reject(new Error("Could not read logo.")); reader.readAsDataURL(file); }); }
function extractBrandColors(file: File) { return new Promise<string[]>((resolve) => { const objectUrl = URL.createObjectURL(file); const image = new Image(); image.onload = () => { try { const canvas = document.createElement("canvas"); canvas.width = 64; canvas.height = 64; const ctx = canvas.getContext("2d", { willReadFrequently: true }); if (!ctx) return resolve([]); ctx.drawImage(image, 0, 0, 64, 64); const pixels = ctx.getImageData(0, 0, 64, 64).data; const counts = new Map<string, number>(); for (let i = 0; i < pixels.length; i += 16) { const a = pixels[i + 3] ?? 0; if (a < 120) continue; const r = pixels[i] ?? 0, g = pixels[i + 1] ?? 0, b = pixels[i + 2] ?? 0; if (r > 242 && g > 242 && b > 242) continue; const q = (v: number) => Math.max(0, Math.min(255, Math.round(v / 32) * 32)); const color = `#${[q(r), q(g), q(b)].map((v) => v.toString(16).padStart(2, "0")).join("")}`; counts.set(color, (counts.get(color) ?? 0) + 1); } const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([color]) => color); const chosen: string[] = []; for (const color of ranked) { if (chosen.every((existing) => distance(existing, color) > 72)) { chosen.push(color); if (chosen.length === 5) break; } } resolve(chosen); } catch { resolve([]); } finally { URL.revokeObjectURL(objectUrl); } }; image.onerror = () => { URL.revokeObjectURL(objectUrl); resolve([]); }; image.src = objectUrl; }); }
function distance(a: string, b: string) { const av = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16)); const bv = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16)); return Math.sqrt(av.reduce((sum, item, i) => sum + (item - (bv[i] ?? 0)) ** 2, 0)); }
