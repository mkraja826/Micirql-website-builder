"use client";

import { FormEvent, useEffect, useState } from "react";
import type { SupabaseSession } from "./auth-client";
import type { OnboardingProfile } from "./preset-ranking";
import { OnboardingProfileProvider } from "./onboarding-profile-context";
import { FirstBuildReview } from "./first-build-review";
import { uploadWorkspaceImage } from "./upload-client";
import WorkspaceClient from "./workspace-client";

type DraftContext = { workspaceId: string; siteId: string; snapshot?: { name?: string } };
type FormState = {
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
  brandPrimary: string;
  brandSecondary: string;
  brandAccent: string;
  logoAssetId: string;
  logoName: string;
};

const initialForm: FormState = {
  businessName: "",
  industry: "dental",
  subindustry: "",
  location: "",
  services: "",
  goals: ["generate leads", "book appointments"],
  styleTags: ["professional", "modern"],
  requiredCapabilities: ["contact form", "booking"],
  languages: "en",
  notes: "",
  brandPrimary: "",
  brandSecondary: "",
  brandAccent: "",
  logoAssetId: "",
  logoName: "",
};

export function OnboardingGate({
  session,
  initialWorkspaceId,
  initialSiteId,
  onBack,
}: {
  session: SupabaseSession;
  initialWorkspaceId?: string;
  initialSiteId?: string;
  onBack?: () => void;
}) {
  const [qualityWarnings, setQualityWarnings] = useState<string[]>([]);
  const [context, setContext] = useState<DraftContext>();
  const [profile, setProfile] = useState<OnboardingProfile | null>(null);
  const [ready, setReady] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [building, setBuilding] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoStatus, setLogoStatus] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState<FormState>(initialForm);
  const authHeaders = { Authorization: "Bearer " + session.access_token };

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const workspaceId = initialWorkspaceId ?? "workspace-demo";
        const siteId = initialSiteId ?? "workspace-preview";
        if (initialWorkspaceId && initialSiteId) {
          localStorage.setItem("micirql_active_project", JSON.stringify({ workspaceId: initialWorkspaceId, siteId: initialSiteId }));
        }
        const draftResponse = await fetch("/api/drafts?workspaceId=" + encodeURIComponent(workspaceId) + "&siteId=" + encodeURIComponent(siteId), {
          headers: authHeaders,
          cache: "no-store",
        });
        const draftPayload = await draftResponse.json();
        if (!draftResponse.ok || !draftPayload?.draft) throw new Error(draftPayload?.error ?? "Could not open your workspace.");
        const nextContext = {
          workspaceId: String(draftPayload.draft.workspaceId),
          siteId: String(draftPayload.draft.siteId),
          snapshot: draftPayload.draft.snapshot,
        };
        if (cancelled) return;
        setContext(nextContext);
        localStorage.setItem("micirql_active_project", JSON.stringify({ workspaceId: nextContext.workspaceId, siteId: nextContext.siteId }));

        const statusResponse = await fetch("/api/onboarding?workspaceId=" + encodeURIComponent(nextContext.workspaceId) + "&siteId=" + encodeURIComponent(nextContext.siteId), {
          headers: authHeaders,
          cache: "no-store",
        });
        const statusPayload = await statusResponse.json();
        if (!statusResponse.ok) throw new Error(statusPayload?.error ?? "Could not load onboarding status.");
        if (!cancelled) {
          const nextProfile = (statusPayload.profile ?? null) as OnboardingProfile | null;
          setProfile(nextProfile);
          setReviewing(Boolean(statusPayload.reviewPending && nextProfile));
          setReady(Boolean(statusPayload.completed));
        }
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Could not start the builder.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session.access_token, initialWorkspaceId, initialSiteId]);

  async function uploadLogo(file: File) {
    if (!context) return;
    setUploadingLogo(true);
    setLogoStatus("Preparing logo upload…");
    setError("");
    try {
      const asset = await uploadWorkspaceImage({
        workspaceId: context.workspaceId,
        siteId: context.siteId,
        file,
        onProgress(progress) {
          setLogoStatus(progress.phase === "complete" ? "Logo uploaded" : "Uploading logo… " + progress.percent + "%");
        },
      });
      setForm((current) => ({ ...current, logoAssetId: asset.id, logoName: asset.name }));
      setLogoStatus("Logo uploaded");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Logo upload failed.";
      setLogoStatus(message);
      setError(message);
    } finally {
      setUploadingLogo(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!context) return;
    setBuilding(true);
    setError("");
    try {
      const colors = {
        ...(form.brandPrimary.trim() ? { primary: form.brandPrimary.trim() } : {}),
        ...(form.brandSecondary.trim() ? { secondary: form.brandSecondary.trim() } : {}),
        ...(form.brandAccent.trim() ? { accent: form.brandAccent.trim() } : {}),
      };
      const brandInput = {
        ...(form.logoAssetId ? { logoAssetId: form.logoAssetId } : {}),
        colors,
      };
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { ...authHeaders, "content-type": "application/json" },
        body: JSON.stringify({
          workspaceId: context.workspaceId,
          siteId: context.siteId,
          businessName: form.businessName,
          industry: form.industry,
          subindustry: form.subindustry,
          location: form.location,
          services: commaList(form.services),
          goals: form.goals,
          styleTags: form.styleTags,
          requiredCapabilities: form.requiredCapabilities,
          languages: commaList(form.languages),
          notes: form.notes,
          brandInput,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) throw new Error(payload?.message ?? payload?.error ?? "Website planning failed.");
      const nextProfile = (payload.profile ?? null) as OnboardingProfile | null;
      setProfile(nextProfile);
      setQualityWarnings(Array.isArray(payload.qualityWarnings) ? payload.qualityWarnings.filter((item: unknown): item is string => typeof item === "string") : []);
      if (nextProfile) setReviewing(true);
      else setReady(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Website planning failed.");
    } finally {
      setBuilding(false);
    }
  }

  if (loading) return <main style={shellStyle}><div style={cardStyle}>Preparing your MiCirql workspace…</div></main>;
  if (reviewing && context && profile) {
    return <FirstBuildReview session={session} workspaceId={context.workspaceId} siteId={context.siteId} profile={profile} qualityWarnings={qualityWarnings} onComplete={() => { setReviewing(false); setReady(true); }} />;
  }
  if (ready) {
    return <OnboardingProfileProvider profile={profile}><>{onBack ? <button style={backStyle} onClick={onBack}>← Projects</button> : null}<WorkspaceClient /></></OnboardingProfileProvider>;
  }

  return <main style={shellStyle}>
    <form onSubmit={submit} style={{ ...cardStyle, maxWidth: 920 }}>
      {onBack ? <button type="button" onClick={onBack} style={plainBack}>← Back to projects</button> : null}
      <div>
        <div style={{ fontSize: 14, opacity: 0.65 }}>MiCirql business discovery</div>
        <h1 style={{ marginBottom: 8 }}>Plan your certified dental website.</h1>
        <p style={{ marginTop: 0, opacity: 0.72 }}>We build the factual structure first, rank 20 dental-only compositions, then create content and imagery after you choose.</p>
      </div>
      <div style={gridStyle}>
        <Field label="Business name"><input required value={form.businessName} onChange={(event) => setForm({ ...form, businessName: event.target.value })} /></Field>
        <Field label="Industry">
          <select value={form.industry} onChange={(event) => setForm({ ...form, industry: event.target.value })}>
            <option value="dental">Dental / Clinic — certified</option>
            <option value="restaurant">Restaurant / Hospitality — coming soon</option>
            <option value="real estate">Real Estate — coming soon</option>
            <option value="professional services">Professional Services — coming soon</option>
            <option value="retail">Retail — coming soon</option>
            <option value="other">Other — coming soon</option>
          </select>
        </Field>
        <Field label="Dental speciality"><input value={form.subindustry} placeholder="Implants, orthodontics, general dentistry…" onChange={(event) => setForm({ ...form, subindustry: event.target.value })} /></Field>
        <Field label="Primary location"><input value={form.location} placeholder="Hyderabad, Telangana" onChange={(event) => setForm({ ...form, location: event.target.value })} /></Field>
      </div>
      <Field label="Main services"><textarea required value={form.services} placeholder="Dental implants, crowns, root canal…" onChange={(event) => setForm({ ...form, services: event.target.value })} /></Field>
      <ChoiceGroup label="Main goals" values={["generate leads","book appointments","build trust","rank in search"]} selected={form.goals} onChange={(goals) => setForm({ ...form, goals })} />
      <ChoiceGroup label="Visual direction" values={["professional","modern","premium","minimal","bold","friendly","editorial"]} selected={form.styleTags} onChange={(styleTags) => setForm({ ...form, styleTags })} />
      <ChoiceGroup label="Required functionality" values={["contact form","booking","gallery","blog","maps","lead capture","multilingual"]} selected={form.requiredCapabilities} onChange={(requiredCapabilities) => setForm({ ...form, requiredCapabilities })} />
      <section style={brandPanelStyle}>
        <div>
          <strong>Brand input</strong>
          <p style={{ margin: "4px 0 0", opacity: 0.68, fontSize: 13 }}>Supplied colors and logo remain unchanged in every design. Leave colors blank to use each composition’s palette.</p>
        </div>
        <div style={gridStyle}>
          <Field label="Primary color"><input pattern="^#[0-9A-Fa-f]{6}$" placeholder="#0F766E" value={form.brandPrimary} onChange={(event) => setForm({ ...form, brandPrimary: event.target.value })} /></Field>
          <Field label="Secondary color"><input pattern="^#[0-9A-Fa-f]{6}$" placeholder="#164E63" value={form.brandSecondary} onChange={(event) => setForm({ ...form, brandSecondary: event.target.value })} /></Field>
          <Field label="Accent color"><input pattern="^#[0-9A-Fa-f]{6}$" placeholder="#14B8A6" value={form.brandAccent} onChange={(event) => setForm({ ...form, brandAccent: event.target.value })} /></Field>
        </div>
        <label style={{ display: "grid", gap: 7, fontSize: 14, fontWeight: 600 }}>
          Optional logo
          <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" disabled={uploadingLogo || !context} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadLogo(file); }} />
        </label>
        {form.logoName ? <small>Using {form.logoName}</small> : null}
        {logoStatus ? <small role="status">{logoStatus}</small> : null}
      </section>
      <div style={gridStyle}>
        <Field label="Languages"><input value={form.languages} placeholder="en, hi, te" onChange={(event) => setForm({ ...form, languages: event.target.value })} /></Field>
        <Field label="Anything else"><input value={form.notes} placeholder="Only include facts supplied here." onChange={(event) => setForm({ ...form, notes: event.target.value })} /></Field>
      </div>
      {error ? <div style={{ color: "#b42318", fontSize: 14 }} role="alert">{error}</div> : null}
      <button type="submit" disabled={building || uploadingLogo || !context} style={buttonStyle}>{building ? "Planning 20 dental designs…" : "Create 20 dental designs"}</button>
    </form>
  </main>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label style={{ display: "grid", gap: 7, fontSize: 14, fontWeight: 600 }}>{label}{children}</label>;
}

function ChoiceGroup({ label, values, selected, onChange }: { label: string; values: string[]; selected: string[]; onChange(value: string[]): void }) {
  return <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
    <legend style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>{label}</legend>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {values.map((value) => {
        const active = selected.includes(value);
        return <button key={value} type="button" onClick={() => onChange(active ? selected.filter((item) => item !== value) : [...selected, value])} style={{ padding: "9px 12px", borderRadius: 999, border: "1px solid #d8d8de", background: active ? "#111" : "#fff", color: active ? "#fff" : "#111", cursor: "pointer" }}>{value}</button>;
      })}
    </div>
  </fieldset>;
}

function commaList(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

const shellStyle: React.CSSProperties = { minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#f5f5f7", fontFamily: "Arial, Helvetica, sans-serif" };
const cardStyle: React.CSSProperties = { width: "100%", maxWidth: 560, display: "grid", gap: 22, padding: 28, borderRadius: 20, background: "white", boxShadow: "0 18px 60px rgba(0,0,0,.08)" };
const gridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16 };
const brandPanelStyle: React.CSSProperties = { display: "grid", gap: 16, padding: 18, border: "1px solid #dedee5", borderRadius: 14, background: "#fafafa" };
const buttonStyle: React.CSSProperties = { minHeight: 48, border: 0, borderRadius: 12, background: "#111", color: "white", fontWeight: 700, cursor: "pointer" };
const plainBack: React.CSSProperties = { justifySelf: "start", border: 0, background: "transparent", cursor: "pointer" };
const backStyle: React.CSSProperties = { position: "fixed", zIndex: 20, left: 12, top: 12, border: "1px solid #333", background: "#151519", color: "white", padding: "8px 11px", borderRadius: 9, cursor: "pointer" };
