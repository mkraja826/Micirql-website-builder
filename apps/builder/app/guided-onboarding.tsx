"use client";

import { useState } from "react";
import type { SupabaseSession } from "./auth-client";
import { analyzeLogoPixels, createTransparentLogoDerivative } from "./logo-pixel-analysis";
import styles from "./guided-onboarding.module.css";

export type GuidedOnboardingValue = {
  context: string;
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
  context: "",
  businessName: "",
  industry: "",
  subindustry: "",
  location: "",
  services: "",
  goals: [],
  styleTags: [],
  requiredCapabilities: [],
  languages: "en",
  notes: "",
  logoUrl: null,
  brandColors: [],
};

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
  const [value, setValue] = useState<GuidedOnboardingValue>(initialValue);
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoPreview, setLogoPreview] = useState("");
  const [interpreting, setInterpreting] = useState(false);
  const [localError, setLocalError] = useState("");
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

  async function createWebsite() {
    const context = value.context.trim();
    if (context.length < 20) {
      setLocalError("Tell MiCirql a little more about your business and the website you want.");
      return;
    }
    setInterpreting(true);
    setLocalError("");
    try {
      const response = await fetch("/api/onboarding/interpret", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}`, "content-type": "application/json" },
        body: JSON.stringify({ context }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.profile) throw new Error(payload?.error ?? "MiCirql could not understand the brief.");
      const profile = payload.profile as Record<string, unknown>;
      const next: GuidedOnboardingValue = {
        ...value,
        businessName: asText(profile.businessName) || "My Business",
        industry: asText(profile.industry) || "other",
        subindustry: asText(profile.subindustry),
        location: asText(profile.location),
        services: asList(profile.services).join(", "),
        goals: asList(profile.goals),
        styleTags: asList(profile.styleTags),
        requiredCapabilities: asList(profile.requiredCapabilities),
        languages: asList(profile.languages).join(", ") || "en",
        notes: asText(profile.notes) || context,
      };
      setValue(next);
      await onSubmit(next);
    } catch (caught) {
      setLocalError(caught instanceof Error ? caught.message : "MiCirql could not start the website build.");
    } finally {
      setInterpreting(false);
    }
  }

  const busy = building || logoBusy || interpreting;

  return <main className={styles.shell}>
    <section className={styles.card}>
      <div className={styles.topbar}>
        <button className={styles.back} type="button" onClick={onBack}>← Projects</button>
        <span className={styles.progressMeta}>AI website brief</span>
      </div>
      <div className={styles.content}>
        <header>
          <div className={styles.eyebrow}>MiCirql website intelligence</div>
          <h1 className={styles.heading}>Describe the website you want.</h1>
          <p className={styles.intro}>Write naturally. Tell MiCirql about your business, services, location, audience, style, goals and any features you need. You do not need to fill out a form or choose a template.</p>
        </header>

        <div className={styles.step}>
          <label className={styles.field}>
            Your website brief
            <textarea
              className={styles.control}
              style={{ minHeight: 250, resize: "vertical", lineHeight: 1.65 }}
              value={value.context}
              onChange={(event) => setValue((current) => ({ ...current, context: event.target.value }))}
              placeholder={'Example: “I run a premium dental implant clinic in Hyderabad called Pearl Dental. We focus on implants, cosmetic dentistry and full-mouth rehabilitation. I want a modern luxury website that builds trust, introduces our doctors, shows before/after work and Google reviews, and encourages patients to book appointments on WhatsApp.”'}
              autoFocus
            />
          </label>
          <div className={styles.hint}>MiCirql will automatically understand the industry, services, visual direction, conversion goals, required sections and functionality from this brief.</div>

          <div className={styles.brandBox}>
            <div><strong>Logo <span className={styles.hint}>(optional)</span></strong><div className={styles.hint}>Upload it if you have one. MiCirql will preserve it, analyze its background and derive the brand palette automatically.</div></div>
            <div className={styles.logoRow}>
              <label className={styles.upload}><input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden onChange={(e) => void selectLogo(e.target.files?.[0])} />{logoBusy ? "Analyzing…" : value.logoUrl ? "Replace logo" : "Upload logo"}</label>
              {logoPreview ? <div className={styles.logoPreview}><img src={logoPreview} alt="Logo preview" style={{ width: "100%", height: "100%", objectFit: "contain" }} /></div> : <div className={styles.placeholder}>LOGO</div>}
              <div><div className={styles.hint}>Detected brand colors</div><div className={styles.swatches}>{value.brandColors.length ? value.brandColors.map((color) => <span key={color} className={styles.swatch} style={{ background: color }} title={color} />) : <span className={styles.hint}>MiCirql can choose a palette if no logo is supplied.</span>}</div></div>
            </div>
            {value.logoUrl ? <div className={styles.success}>✓ Logo analyzed and ready for the website brand system.</div> : null}
          </div>
        </div>

        {visibleError ? <div className={styles.error}>{visibleError}</div> : null}
        <div className={styles.actions}>
          <span className={styles.hint}>{interpreting ? "Understanding your brief…" : building ? "Generating content, imagery and design directions…" : "You can refine everything after generation."}</span>
          <button type="button" className={styles.primary} disabled={busy || value.context.trim().length < 20} onClick={() => void createWebsite()}>{building ? "Building your website…" : interpreting ? "Understanding brief…" : "Create my website"}</button>
        </div>
      </div>
    </section>
  </main>;
}

function asText(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function asList(value: unknown) { return Array.isArray(value) ? value.map(asText).filter(Boolean) : []; }
function fileDataUrl(file: File) { return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Could not read logo.")); reader.onerror = () => reject(new Error("Could not read logo.")); reader.readAsDataURL(file); }); }
function extractBrandColors(file: File) { return new Promise<string[]>((resolve) => { const objectUrl = URL.createObjectURL(file); const image = new Image(); image.onload = () => { try { const canvas = document.createElement("canvas"); canvas.width = 64; canvas.height = 64; const ctx = canvas.getContext("2d", { willReadFrequently: true }); if (!ctx) return resolve([]); ctx.drawImage(image, 0, 0, 64, 64); const pixels = ctx.getImageData(0, 0, 64, 64).data; const counts = new Map<string, number>(); for (let i = 0; i < pixels.length; i += 16) { const a = pixels[i + 3] ?? 0; if (a < 120) continue; const r = pixels[i] ?? 0, g = pixels[i + 1] ?? 0, b = pixels[i + 2] ?? 0; if (r > 242 && g > 242 && b > 242) continue; const q = (v: number) => Math.max(0, Math.min(255, Math.round(v / 32) * 32)); const color = `#${[q(r), q(g), q(b)].map((v) => v.toString(16).padStart(2, "0")).join("")}`; counts.set(color, (counts.get(color) ?? 0) + 1); } const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([color]) => color); const chosen: string[] = []; for (const color of ranked) { if (chosen.every((existing) => distance(existing, color) > 72)) { chosen.push(color); if (chosen.length === 5) break; } } resolve(chosen); } catch { resolve([]); } finally { URL.revokeObjectURL(objectUrl); } }; image.onerror = () => { URL.revokeObjectURL(objectUrl); resolve([]); }; image.src = objectUrl; }); }
function distance(a: string, b: string) { const av = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16)); const bv = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16)); return Math.sqrt(av.reduce((sum, item, i) => sum + (item - (bv[i] ?? 0)) ** 2, 0)); }
