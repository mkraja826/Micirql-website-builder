"use client";

import { FormEvent, useEffect, useState } from "react";
import type { SupabaseSession } from "./auth-client";
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
};

const initialForm: FormState = {
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
};

export function OnboardingGate({ session }: { session: SupabaseSession }) {
  const [context, setContext] = useState<DraftContext>();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<FormState>(initialForm);

  const authHeaders = { Authorization: `Bearer ${session.access_token}` };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const draftResponse = await fetch("/api/drafts?workspaceId=workspace-demo&siteId=workspace-preview", { headers: authHeaders, cache: "no-store" });
        const draftPayload = await draftResponse.json();
        if (!draftResponse.ok || !draftPayload?.draft) throw new Error(draftPayload?.error ?? "Could not open your workspace.");
        const nextContext = {
          workspaceId: String(draftPayload.draft.workspaceId),
          siteId: String(draftPayload.draft.siteId),
          snapshot: draftPayload.draft.snapshot,
        };
        if (cancelled) return;
        setContext(nextContext);

        const statusResponse = await fetch(`/api/onboarding?workspaceId=${encodeURIComponent(nextContext.workspaceId)}&siteId=${encodeURIComponent(nextContext.siteId)}`, { headers: authHeaders, cache: "no-store" });
        const statusPayload = await statusResponse.json();
        if (!statusResponse.ok) throw new Error(statusPayload?.error ?? "Could not load onboarding status.");
        if (!cancelled) setReady(Boolean(statusPayload.completed));
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Could not start the builder.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [session.access_token]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!context) return;
    setBuilding(true);
    setError("");
    try {
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
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) throw new Error(payload?.error ?? "Website build failed.");
      setReady(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Website build failed.");
    } finally {
      setBuilding(false);
    }
  }

  if (loading) return <main style={shellStyle}><div style={cardStyle}>Preparing your MiCirql workspace…</div></main>;
  if (ready) return <WorkspaceClient session={session} />;

  return (
    <main style={shellStyle}>
      <form onSubmit={submit} style={{ ...cardStyle, maxWidth: 920 }}>
        <div>
          <div style={{ fontSize: 14, opacity: .65 }}>MiCirql business discovery</div>
          <h1 style={{ marginBottom: 8 }}>Tell us what you need. We’ll assemble the right site.</h1>
          <p style={{ marginTop: 0, opacity: .72 }}>We use this brief to choose the industry pack, theme, sections and functionality before the editor opens.</p>
        </div>

        <div style={gridStyle}>
          <Field label="Business name"><input required value={form.businessName} onChange={e => setForm({ ...form, businessName: e.target.value })} /></Field>
          <Field label="Industry"><select value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })}><option value="dental">Dental / Clinic</option><option value="restaurant">Restaurant / Hospitality</option><option value="real estate">Real Estate</option><option value="professional services">Professional Services</option><option value="retail">Retail</option><option value="other">Other</option></select></Field>
          <Field label="Speciality / subindustry"><input value={form.subindustry} placeholder="Implants, fine dining, residential…" onChange={e => setForm({ ...form, subindustry: e.target.value })} /></Field>
          <Field label="Primary location"><input value={form.location} placeholder="Hyderabad, Telangana" onChange={e => setForm({ ...form, location: e.target.value })} /></Field>
        </div>

        <Field label="Main services"><textarea required value={form.services} placeholder="Dental implants, crowns, root canal…" onChange={e => setForm({ ...form, services: e.target.value })} /></Field>

        <ChoiceGroup label="Main goals" values={["generate leads", "book appointments", "sell online", "show portfolio", "build trust", "rank in search"]} selected={form.goals} onChange={goals => setForm({ ...form, goals })} />
        <ChoiceGroup label="Visual direction" values={["professional", "modern", "premium", "minimal", "bold", "friendly", "editorial"]} selected={form.styleTags} onChange={styleTags => setForm({ ...form, styleTags })} />
        <ChoiceGroup label="Required functionality" values={["contact form", "booking", "gallery", "blog", "payments", "maps", "lead capture", "multilingual"]} selected={form.requiredCapabilities} onChange={requiredCapabilities => setForm({ ...form, requiredCapabilities })} />

        <div style={gridStyle}>
          <Field label="Languages"><input value={form.languages} placeholder="en, hi, te" onChange={e => setForm({ ...form, languages: e.target.value })} /></Field>
          <Field label="Anything else"><input value={form.notes} placeholder="International patients, 24/7 enquiries…" onChange={e => setForm({ ...form, notes: e.target.value })} /></Field>
        </div>

        {error ? <div style={{ color: "#b42318", fontSize: 14 }}>{error}</div> : null}
        <button type="submit" disabled={building || !context} style={buttonStyle}>{building ? "Building your website…" : "Create my website"}</button>
      </form>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label style={{ display: "grid", gap: 7, fontSize: 14, fontWeight: 600 }}>{label}{children}</label>;
}

function ChoiceGroup({ label, values, selected, onChange }: { label: string; values: string[]; selected: string[]; onChange(value: string[]): void }) {
  return <fieldset style={{ border: 0, padding: 0, margin: 0 }}><legend style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>{label}</legend><div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{values.map(value => { const active = selected.includes(value); return <button key={value} type="button" onClick={() => onChange(active ? selected.filter(item => item !== value) : [...selected, value])} style={{ padding: "9px 12px", borderRadius: 999, border: "1px solid #d8d8de", background: active ? "#111" : "#fff", color: active ? "#fff" : "#111", cursor: "pointer" }}>{value}</button>; })}</div></fieldset>;
}

function commaList(value: string) { return value.split(",").map(item => item.trim()).filter(Boolean); }

const shellStyle: React.CSSProperties = { minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#f5f5f7", fontFamily: "Arial, Helvetica, sans-serif" };
const cardStyle: React.CSSProperties = { width: "100%", maxWidth: 560, display: "grid", gap: 22, padding: 28, borderRadius: 20, background: "white", boxShadow: "0 18px 60px rgba(0,0,0,.08)" };
const gridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16 };
const buttonStyle: React.CSSProperties = { minHeight: 48, border: 0, borderRadius: 12, background: "#111", color: "white", fontWeight: 700, cursor: "pointer" };
