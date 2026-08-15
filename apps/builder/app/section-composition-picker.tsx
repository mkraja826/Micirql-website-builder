"use client";

import { useEffect, useMemo, useState } from "react";
import type { Site } from "@micirql/schema";
import { SeedSection, seedSectionCatalog } from "@micirql/sections";
import { readStoredSession } from "./auth-client";
import type { AiEditorSectionFamily } from "./ai-edit-types";

type Candidate = {
  componentId: string;
  version: string;
  displayName: string;
  score: number;
  reasons: string[];
  previewOnly: boolean;
};

export function SectionCompositionPicker({ site, pageId, family, afterSectionId, onChoose, onCancel }: {
  site: Site;
  pageId: string;
  family: AiEditorSectionFamily;
  afterSectionId?: string;
  onChoose(candidate: Candidate): void;
  onCancel(): void;
}) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Candidate>();

  useEffect(() => {
    let cancelled = false;
    const session = readStoredSession();
    if (!session?.access_token) { setError("Sign in again to load section directions."); setBusy(false); return; }
    const query = new URLSearchParams({ workspaceId: site.workspaceId, siteId: site.siteId });
    Promise.all([
      fetch(`/api/design-preferences?${query}`, { headers: { Authorization: `Bearer ${session.access_token}` }, cache: "no-store" }).then((r) => r.ok ? r.json() : null),
    ]).then(async ([preferences]) => {
      const response = await fetch("/api/section-candidates", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}`, "content-type": "application/json" },
        body: JSON.stringify({ site, pageId, family, afterSectionId, preferenceProfile: preferences?.profile ?? null }),
      });
      const payload = await response.json() as { candidates?: Candidate[]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not rank section directions.");
      if (!cancelled) {
        const next = payload.candidates ?? [];
        setCandidates(next);
        setSelected(next[0]);
      }
    }).catch((caught) => { if (!cancelled) setError(caught instanceof Error ? caught.message : "Could not rank section directions."); })
      .finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, [site, pageId, family, afterSectionId]);

  const selectedSeed = useMemo(
    () => selected ? seedSectionCatalog.find((item) => item.id === selected.componentId) : undefined,
    [selected],
  );

  return <section className="section-composition-picker">
    <div className="section-composition-head"><div><span>Choose a direction</span><strong>{label(family)} section</strong><small>Ranked from your page context and learned design taste. Preview the real component before inserting it.</small></div><button type="button" onClick={onCancel}>×</button></div>
    {busy ? <div className="section-composition-state">Ranking compatible library directions…</div> : null}
    {error ? <div className="section-composition-state is-error">{error}</div> : null}
    {!busy && !error && selected ? <div className="section-composition-stage">
      <div className="section-composition-stage-bar"><div><strong>{selected.displayName}</strong><span>{selected.previewOnly ? "Preview library" : "Certified"} · {selected.score.toFixed(1)}</span></div><button type="button" onClick={() => onChoose(selected)}>Use this section</button></div>
      <div className="section-composition-live-preview" style={site.theme.brand.colors as unknown as React.CSSProperties}>
        {selectedSeed ? <SeedSection family={selectedSeed.family} variant={selectedSeed.variant} props={previewProps(family, site.name)} /> : <div className="section-composition-state is-error">Renderer unavailable for {selected.componentId}</div>}
      </div>
    </div> : null}
    {!busy && !error ? <div className="section-composition-grid">{candidates.map((candidate, index) => <article key={`${candidate.componentId}@${candidate.version}`} className={`section-composition-card${selected?.componentId === candidate.componentId ? " is-selected" : ""}`}>
      <button type="button" className="section-composition-card-select" onClick={() => setSelected(candidate)} aria-label={`Preview ${candidate.displayName}`}>
        <span>{String(index + 1).padStart(2, "0")}</span>
        <b>{candidate.displayName}</b>
      </button>
      <div className="section-composition-copy"><div><strong>{candidate.displayName}</strong><span>{candidate.previewOnly ? "Preview library" : "Certified"} · {candidate.score.toFixed(1)}</span></div><ul>{candidate.reasons.slice(0, 3).map((reason) => <li key={reason}>{reason}</li>)}</ul></div>
      <button type="button" onClick={() => setSelected(candidate)}>{selected?.componentId === candidate.componentId ? "Viewing" : "Preview"}</button>
    </article>)}</div> : null}
    {!busy && !error && !candidates.length ? <div className="section-composition-state">No compatible directions are available yet.</div> : null}
    <p className="section-composition-note">Preview-library choices are clearly marked and are never treated as certified production components.</p>
  </section>;
}

function label(value: string) { return value.charAt(0).toUpperCase() + value.slice(1); }
function previewProps(family: AiEditorSectionFamily, siteName: string): Record<string, unknown> {
  if (family === "about") return { eyebrow: "Our story", heading: `About ${siteName}`, body: "A clear introduction to the business, its approach and what makes it worth choosing." };
  if (family === "services") return { eyebrow: "What we do", heading: "Services", body: "Explore the services designed around what customers need most.", items: [{ title: "Primary service", description: "A concise explanation of the core offer." }, { title: "Specialist service", description: "A second service with a clear customer benefit." }, { title: "Supporting service", description: "Another useful option for visitors to explore." }] };
  if (family === "features") return { eyebrow: "Why choose us", heading: "Built around better outcomes", items: [{ title: "Clear benefit", description: "A meaningful reason customers choose this business." }, { title: "Trusted approach", description: "A second proof point that supports confidence." }, { title: "Easy experience", description: "A practical benefit visitors can understand quickly." }] };
  if (family === "process") return { eyebrow: "How it works", heading: "A simple path forward", items: [{ title: "Discover", description: "Understand the customer requirement." }, { title: "Plan", description: "Recommend the right next step." }, { title: "Deliver", description: "Complete the service with clear communication." }] };
  if (family === "testimonials") return { eyebrow: "Customer stories", heading: "What customers say", items: [{ quote: "The experience felt clear, professional and easy from start to finish.", name: "Customer", role: "Verified client" }, { quote: "Everything was explained well and the final result exceeded expectations.", name: "Customer", role: "Verified client" }] };
  if (family === "gallery") return { eyebrow: "Selected work", heading: "Gallery", body: "A visual selection of work, spaces or results." };
  if (family === "team") return { eyebrow: "Our people", heading: "Meet the team", items: [{ name: "Team member", role: "Specialist" }, { name: "Team member", role: "Specialist" }, { name: "Team member", role: "Specialist" }] };
  if (family === "cta") return { eyebrow: "Next step", heading: "Ready to get started?", body: "Take the next step with a clear, low-friction action.", primaryCta: { label: "Get started", href: "#contact" } };
  return { eyebrow: "Contact", heading: "Let’s talk", body: "Tell us what you need and we’ll help you choose the right next step.", primaryCta: { label: "Send enquiry", href: "#contact" } };
}
