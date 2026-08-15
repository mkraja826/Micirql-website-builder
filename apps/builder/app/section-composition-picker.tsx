"use client";

import { useEffect, useState } from "react";
import type { Site } from "@micirql/schema";
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
      if (!cancelled) setCandidates(payload.candidates ?? []);
    }).catch((caught) => { if (!cancelled) setError(caught instanceof Error ? caught.message : "Could not rank section directions."); })
      .finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, [site, pageId, family, afterSectionId]);

  return <section className="section-composition-picker">
    <div className="section-composition-head"><div><span>Choose a direction</span><strong>{label(family)} section</strong><small>Ranked from your page context and learned design taste.</small></div><button type="button" onClick={onCancel}>×</button></div>
    {busy ? <div className="section-composition-state">Ranking compatible library directions…</div> : null}
    {error ? <div className="section-composition-state is-error">{error}</div> : null}
    {!busy && !error ? <div className="section-composition-grid">{candidates.map((candidate, index) => <article key={`${candidate.componentId}@${candidate.version}`} className="section-composition-card">
      <div className="section-composition-preview" aria-hidden="true"><span>{String(index + 1).padStart(2, "0")}</span><b>{visualMark(candidate.componentId)}</b></div>
      <div className="section-composition-copy"><div><strong>{candidate.displayName}</strong><span>{candidate.previewOnly ? "Preview library" : "Certified"} · {candidate.score.toFixed(1)}</span></div><ul>{candidate.reasons.slice(0, 3).map((reason) => <li key={reason}>{reason}</li>)}</ul></div>
      <button type="button" onClick={() => onChoose(candidate)}>Preview & use</button>
    </article>)}</div> : null}
    {!busy && !error && !candidates.length ? <div className="section-composition-state">No compatible directions are available yet.</div> : null}
    <p className="section-composition-note">Preview-library choices are clearly marked and are never treated as certified production components.</p>
  </section>;
}

function label(value: string) { return value.charAt(0).toUpperCase() + value.slice(1); }
function visualMark(componentId: string) {
  const match = componentId.match(/-(00[1-5])$/);
  const variant = Number(match?.[1] ?? 1);
  return variant === 1 ? "▰ ▰ ▰" : variant === 2 ? "▰  ▱" : variant === 3 ? "▱ ▰ ▱" : variant === 4 ? "▤  ▰" : "▰ ◇ ▰";
}
