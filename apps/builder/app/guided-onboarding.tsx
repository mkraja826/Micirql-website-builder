"use client";

import { useState } from "react";
import type { SupabaseSession } from "./auth-client";
import { computeImageDHash } from "./image-perceptual-hash";
import { analyzeLogoPixels, createTransparentLogoDerivative } from "./logo-pixel-analysis";
import { customerSafeApiMessage, fetchJsonWithRetry } from "./safe-api-json";
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
  selectedLayoutId: string;
};

type LayoutRecommendation = {
  id: string;
  name: string;
  description: string;
  score: number;
  reasons: string[];
  archetype?: string | undefined;
  styleTags?: string[];
  preferredSubindustry?: string | undefined;
};

type ApiPayload = Record<string, unknown> & { error?: string };

const initialValue: GuidedOnboardingValue = { context: "", businessName: "", industry: "", subindustry: "", location: "", services: "", goals: [], styleTags: [], requiredCapabilities: [], languages: "en", notes: "", logoUrl: null, brandColors: [], selectedLayoutId: "" };

export function GuidedOnboarding({ session, workspaceId, siteId, building, error, onBack, onSubmit }: { session: SupabaseSession; workspaceId: string; siteId: string; building: boolean; error?: string; onBack?: () => void; onSubmit(value: GuidedOnboardingValue): Promise<void> | void; }) {
  const [value, setValue] = useState<GuidedOnboardingValue>(initialValue);
  const [interpreted, setInterpreted] = useState<GuidedOnboardingValue | null>(null);
  const [interpretedContext, setInterpretedContext] = useState("");
  const [designMatch, setDesignMatch] = useState<LayoutRecommendation | null>(null);
  const [runnerUp, setRunnerUp] = useState<LayoutRecommendation | null>(null);
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoPreview, setLogoPreview] = useState("");
  const [assetBusy, setAssetBusy] = useState(false);
  const [assetSummary, setAssetSummary] = useState<string[]>([]);
  const [interpreting, setInterpreting] = useState(false);
  const [localError, setLocalError] = useState("");
  const visibleError = localError || error || "";
  const interpretationReady = Boolean(interpreted && interpretedContext === value.context.trim());

  function updateContext(context: string) {
    setValue((current) => ({ ...current, context, selectedLayoutId: "" }));
    if (context.trim() !== interpretedContext) {
      setInterpreted(null);
      setDesignMatch(null);
      setRunnerUp(null);
    }
  }

  async function selectLogo(file?: File) {
    if (!file) { setLogoPreview(""); setValue((current) => ({ ...current, logoUrl: null, brandColors: [] })); return; }
    if (file.size > 5 * 1024 * 1024) return setLocalError("Logo must be smaller than 5 MB.");
    if (!["image/png", "image/jpeg", "image/webp", "image/svg+xml"].includes(file.type)) return setLocalError("Use a PNG, JPG, WebP or SVG logo.");
    setLogoBusy(true); setLocalError("");
    try {
      const dataUrl = await fileDataUrl(file); setLogoPreview(dataUrl);
      const [brandColors, clientAnalysis] = await Promise.all([extractBrandColors(file), analyzeLogoPixels(file)]);
      const cleanupDataUrl = await createTransparentLogoDerivative(file, clientAnalysis);
      const { response, payload } = await fetchJsonWithRetry<ApiPayload>("/api/brand/logo", { method: "POST", headers: { Authorization: `Bearer ${session.access_token}`, "content-type": "application/json" }, body: JSON.stringify({ workspaceId, siteId, fileName: file.name, contentType: file.type, dataUrl, clientAnalysis: clientAnalysis ?? null, cleanupDataUrl: cleanupDataUrl ?? null }) }, { retries: 1, onRetry: (_, attempt) => console.warn("MiCirql logo API retry", { stage: "logo", attempt }) });
      if (!response.ok || !payload?.url) throw new Error(typeof payload?.error === "string" ? payload.error : "Logo upload failed.");
      setValue((current) => ({ ...current, logoUrl: String(payload.url), brandColors })); if (payload.cleanupApplied && payload.url) setLogoPreview(String(payload.url));
    } catch (caught) { setLocalError(customerSafeApiMessage(caught, caught instanceof Error && !caught.message.includes("API_RESPONSE") ? caught.message : "MiCirql couldn’t process the logo. Please try again.")); } finally { setLogoBusy(false); }
  }

  async function uploadBusinessAssets(files?: FileList | null) {
    if (!files?.length) return;
    const selected = [...files].filter((file) => ["image/png", "image/jpeg", "image/webp"].includes(file.type)).slice(0, 12);
    if (!selected.length) return setLocalError("Choose PNG, JPG or WebP business images.");
    setAssetBusy(true); setLocalError("");
    const summary: string[] = [];
    try {
      for (const file of selected) {
        if (file.size > 8 * 1024 * 1024) { summary.push(`${file.name}: skipped (over 8 MB)`); continue; }
        const [dataUrl, dimensions, perceptualHash] = await Promise.all([fileDataUrl(file), imageDimensions(file), computeImageDHash(file)]);
        try {
          const { response, payload } = await fetchJsonWithRetry<ApiPayload>("/api/assets/upload", { method: "POST", headers: { Authorization: `Bearer ${session.access_token}`, "content-type": "application/json" }, body: JSON.stringify({ workspaceId, name: file.name, dataUrl, width: dimensions.width, height: dimensions.height, perceptualHash }) }, { retries: 1, onRetry: (_, attempt) => console.warn("MiCirql asset API retry", { stage: "business-media", attempt }) });
          if (!response.ok || !payload?.asset) { summary.push(`${file.name}: upload failed`); continue; }
          const classification = payload.classification && typeof payload.classification === "object" && !Array.isArray(payload.classification) ? payload.classification as Record<string, unknown> : undefined;
          const category = typeof classification?.category === "string" ? classification.category : "business image";
          summary.push(`${file.name}: ${category}`);
        } catch {
          summary.push(`${file.name}: upload failed`);
        }
      }
      setAssetSummary((current) => [...current, ...summary].slice(-12));
    } catch (caught) { setLocalError(customerSafeApiMessage(caught, "Business image upload failed. Please try again.")); } finally { setAssetBusy(false); }
  }

  async function interpretBrief() {
    const context = value.context.trim();
    if (context.length < 20) { setLocalError("Tell MiCirql a little more about your business and the website you want."); return; }
    setInterpreting(true); setLocalError("");
    try {
      const { response, payload, attempts } = await fetchJsonWithRetry<ApiPayload>("/api/onboarding/interpret", { method: "POST", headers: { Authorization: `Bearer ${session.access_token}`, "content-type": "application/json" }, body: JSON.stringify({ context }) }, { retries: 1, onRetry: (retryError, attempt) => console.warn("MiCirql brief interpretation retry", { stage: "understanding-brief", attempt, code: retryError.message }) });
      if (!response.ok || !payload?.profile) throw new Error(typeof payload?.error === "string" ? payload.error : "MiCirql could not understand the brief.");
      if (attempts > 1) console.info("MiCirql brief interpretation recovered", { stage: "understanding-brief", attempts });
      const profile = payload.profile as Record<string, unknown>;
      const recommendation = asLayoutRecommendation(payload.layoutRecommendation);
      const next: GuidedOnboardingValue = {
        ...value,
        context,
        businessName: asText(profile.businessName) || "My Business",
        industry: asText(profile.industry) || "other",
        subindustry: recommendation?.preferredSubindustry || asText(profile.subindustry),
        location: asText(profile.location),
        services: asList(profile.services).join(", "),
        goals: asList(profile.goals),
        styleTags: asList(profile.styleTags),
        requiredCapabilities: asList(profile.requiredCapabilities),
        languages: asList(profile.languages).join(", ") || "en",
        notes: asText(profile.notes) || context,
        selectedLayoutId: recommendation?.id ?? "",
      };
      setValue(next);
      setInterpreted(next);
      setInterpretedContext(context);
      setDesignMatch(recommendation);
      setRunnerUp(asLayoutRecommendation(payload.layoutAlternative));
    } catch (caught) {
      console.error("MiCirql brief interpretation failed", { stage: "understanding-brief", error: caught instanceof Error ? caught.message : "UNKNOWN" });
      setLocalError(customerSafeApiMessage(caught, "MiCirql couldn’t understand the brief right now. Please try again."));
    } finally { setInterpreting(false); }
  }

  async function buildWebsite() {
    if (!interpreted || interpretedContext !== value.context.trim()) return void interpretBrief();
    if (!designMatch?.id || interpreted.selectedLayoutId !== designMatch.id) { setLocalError("The reviewed design match is no longer current. Analyze the brief again before building."); return; }
    setLocalError("");
    await onSubmit({ ...interpreted, context: value.context.trim(), logoUrl: value.logoUrl, brandColors: value.brandColors, selectedLayoutId: designMatch.id });
  }

  const busy = building || logoBusy || assetBusy || interpreting;
  return <main className={styles.shell}><section className={styles.card}>
    <div className={styles.topbar}><button className={styles.back} type="button" onClick={onBack}>← Projects</button><span className={styles.progressMeta}>{interpretationReady ? "Brief understood" : "AI website brief"}</span></div>
    <div className={styles.content}>
      <header><div className={styles.eyebrow}>MiCirql website intelligence</div><h1 className={styles.heading}>Describe the website you want.</h1><p className={styles.intro}>Write naturally. MiCirql will interpret your business, visual direction and conversion goals first, then show you what it understood before it builds anything.</p></header>
      <div className={styles.step}>
        <label className={styles.field}>Your website brief<textarea className={styles.control} style={{ minHeight: 250, resize: "vertical", lineHeight: 1.65 }} value={value.context} onChange={(event) => updateContext(event.target.value)} placeholder={'Example: “I run a premium dental implant clinic in Hyderabad called Pearl Dental. We focus on implants, cosmetic dentistry and full-mouth rehabilitation. I want a modern luxury website that builds trust, introduces our doctors, shows before/after work and Google reviews, and encourages patients to book appointments on WhatsApp.”'} autoFocus /></label>
        <div className={styles.hint}>Your brief directly drives layout selection, typography, imagery, section emphasis and conversion strategy.</div>

        {interpretationReady && interpreted ? <section className={styles.interpretation} aria-label="What MiCirql understood">
          <div className={styles.interpretationHead}><div><div className={styles.eyebrow}>Brief interpretation</div><div className={styles.interpretationTitle}>What MiCirql understood</div><div className={styles.hint}>These signals will drive the design. If something is wrong, edit your brief and analyze it again.</div></div><span className={styles.readyBadge}>Ready to build</span></div>
          {designMatch ? <div className={styles.designMatch}>
            <div className={styles.designMatchTop}><div><div className={styles.interpretationLabel}>Recommended certified layout</div><div className={styles.designMatchName}>{designMatch.name}</div><div className={styles.designMatchDescription}>{designMatch.description}</div></div><div className={styles.matchScore}>{layoutMatchPercent(designMatch.score)}%<span>match</span></div></div>
            <div className={styles.matchReasons}>{designMatch.reasons.slice(0, 4).map((reason) => <span key={reason}>✓ {reason}</span>)}</div>
            {runnerUp && runnerUp.score > 0 ? <div className={styles.runnerUp}>Alternative certified layout: <strong>{runnerUp.name}</strong> · {layoutMatchPercent(runnerUp.score)}% match</div> : null}
          </div> : null}
          <div className={styles.interpretationGrid}>
            <InterpretationCard label="Business" values={[interpreted.businessName, interpreted.industry, interpreted.subindustry, interpreted.location]} />
            <InterpretationCard label="Visual direction" values={interpreted.styleTags} />
            <InterpretationCard label="Services" values={commaList(interpreted.services)} />
            <InterpretationCard label="Website goals" values={interpreted.goals} />
            <InterpretationCard label="Functionality" values={interpreted.requiredCapabilities} />
            <InterpretationCard label="Languages" values={commaList(interpreted.languages)} />
          </div>
        </section> : null}

        <div className={styles.brandBox}><div><strong>Logo <span className={styles.hint}>(optional)</span></strong><div className={styles.hint}>Upload it if you have one. MiCirql will preserve it, analyze its background and derive the brand palette automatically.</div></div><div className={styles.logoRow}><label className={styles.upload}><input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden onChange={(e) => void selectLogo(e.target.files?.[0])} />{logoBusy ? "Analyzing…" : value.logoUrl ? "Replace logo" : "Upload logo"}</label>{logoPreview ? <div className={styles.logoPreview}><img src={logoPreview} alt="Logo preview" style={{ width: "100%", height: "100%", objectFit: "contain" }} /></div> : <div className={styles.placeholder}>LOGO</div>}<div><div className={styles.hint}>Detected brand colors</div><div className={styles.swatches}>{value.brandColors.length ? value.brandColors.map((color) => <span key={color} className={styles.swatch} style={{ background: color }} title={color} />) : <span className={styles.hint}>MiCirql can choose a palette if no logo is supplied.</span>}</div></div></div>{value.logoUrl ? <div className={styles.success}>✓ Logo analyzed and ready for the website brand system.</div> : null}</div>
        <div className={styles.brandBox}><div><strong>Business photos <span className={styles.hint}>(optional)</span></strong><div className={styles.hint}>Upload up to 12 doctor/team, clinic, treatment, product, certificate or real results images. MiCirql classifies them with vision AI and routes them to the right pages automatically.</div></div><label className={styles.upload}><input type="file" accept="image/png,image/jpeg,image/webp" multiple hidden onChange={(e) => void uploadBusinessAssets(e.target.files)} />{assetBusy ? "Classifying images…" : assetSummary.length ? "Add more photos" : "Upload business photos"}</label>{assetSummary.length ? <div className={styles.success}>✓ {assetSummary.length} image{assetSummary.length === 1 ? "" : "s"} processed. {assetSummary.slice(-4).join(" · ")}</div> : null}<div className={styles.hint}>Uploaded assets are treated as customer-owned evidence. MiCirql will not turn a normal photo into a fake credential, staff identity or treatment result.</div></div>
      </div>
      {visibleError ? <div className={styles.error}>{visibleError}</div> : null}
      <div className={styles.actions}>
        <span className={styles.hint}>{assetBusy ? "Classifying your business media…" : interpreting ? "Understanding your brief…" : building ? "Generating content, imagery and design directions…" : interpretationReady ? "Review the interpretation and certified layout match, then build when it looks right." : "Analyze the brief before generation."}</span>
        <div className={styles.actionButtons}>{interpretationReady ? <button type="button" className={styles.secondary} disabled={busy} onClick={() => { setInterpreted(null); setInterpretedContext(""); setDesignMatch(null); setRunnerUp(null); }}>Edit brief</button> : null}<button type="button" className={styles.primary} disabled={busy || value.context.trim().length < 20} onClick={() => void (interpretationReady ? buildWebsite() : interpretBrief())}>{building ? "Building your website…" : interpreting ? "Understanding brief…" : interpretationReady ? "Build my website" : "Analyze my brief"}</button></div>
      </div>
    </div>
  </section></main>;
}

function InterpretationCard({ label, values }: { label: string; values: string[] }) {
  const clean = [...new Set(values.map((item) => item.trim()).filter(Boolean))];
  return <div className={styles.interpretationCard}><div className={styles.interpretationLabel}>{label}</div>{clean.length ? <div className={styles.chips}>{clean.map((item) => <span key={item} className={styles.chip}>{item}</span>)}</div> : <span className={styles.hint}>Not specified</span>}</div>;
}

function layoutMatchPercent(score: number) { return Math.max(55, Math.min(99, Math.round(score))); }
function asLayoutRecommendation(value: unknown): LayoutRecommendation | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  const id = asText(item.id), name = asText(item.name), description = asText(item.description);
  const score = Number(item.score);
  if (!id || !name || !Number.isFinite(score)) return null;
  return { id, name, description, score, reasons: asList(item.reasons), archetype: asText(item.archetype) || undefined, styleTags: asList(item.styleTags), preferredSubindustry: asText(item.preferredSubindustry) || undefined };
}
function asText(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function asList(value: unknown) { return Array.isArray(value) ? value.map(asText).filter(Boolean) : []; }
function commaList(value: string) { return value.split(",").map((item) => item.trim()).filter(Boolean); }
function fileDataUrl(file: File) { return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Could not read image.")); reader.onerror = () => reject(new Error("Could not read image.")); reader.readAsDataURL(file); }); }
function imageDimensions(file: File) { return new Promise<{ width: number; height: number }>((resolve) => { const url = URL.createObjectURL(file); const image = new Image(); image.onload = () => { const result = { width: image.naturalWidth || 1200, height: image.naturalHeight || 800 }; URL.revokeObjectURL(url); resolve(result); }; image.onerror = () => { URL.revokeObjectURL(url); resolve({ width: 1200, height: 800 }); }; image.src = url; }); }
function extractBrandColors(file: File) { return new Promise<string[]>((resolve) => { const objectUrl = URL.createObjectURL(file); const image = new Image(); image.onload = () => { try { const canvas = document.createElement("canvas"); canvas.width = 64; canvas.height = 64; const ctx = canvas.getContext("2d", { willReadFrequently: true }); if (!ctx) return resolve([]); ctx.drawImage(image, 0, 0, 64, 64); const pixels = ctx.getImageData(0, 0, 64, 64).data; const counts = new Map<string, number>(); for (let i = 0; i < pixels.length; i += 16) { const a = pixels[i + 3] ?? 0; if (a < 120) continue; const r = pixels[i] ?? 0, g = pixels[i + 1] ?? 0, b = pixels[i + 2] ?? 0; if (r > 242 && g > 242 && b > 242) continue; const q = (v: number) => Math.max(0, Math.min(255, Math.round(v / 32) * 32)); const color = `#${[q(r), q(g), q(b)].map((v) => v.toString(16).padStart(2, "0")).join("")}`; counts.set(color, (counts.get(color) ?? 0) + 1); } const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([color]) => color); const chosen: string[] = []; for (const color of ranked) { if (chosen.every((existing) => distance(existing, color) > 72)) { chosen.push(color); if (chosen.length === 5) break; } } resolve(chosen); } catch { resolve([]); } finally { URL.revokeObjectURL(objectUrl); } }; image.onerror = () => { URL.revokeObjectURL(objectUrl); resolve([]); }; image.src = objectUrl; }); }
function distance(a: string, b: string) { const av = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16)); const bv = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16)); return Math.sqrt(av.reduce((sum, item, i) => sum + (item - (bv[i] ?? 0)) ** 2, 0)); }