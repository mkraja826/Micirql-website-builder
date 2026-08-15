"use client";

import { useEffect, useState } from "react";
import type { Site } from "@micirql/schema";
import { readStoredSession } from "./auth-client";
import type { AiEditorOperation, AiEditorResponse } from "./ai-edit-types";
import { SectionCompositionPicker } from "./section-composition-picker";
import "./section-composition-picker.css";
import styles from "./ai-editor-assistant.module.css";

export function AiEditorAssistant({
  site,
  pageId,
  sectionId,
  onApply,
}: {
  site: Site;
  pageId: string;
  sectionId?: string;
  onApply(operation: AiEditorOperation): void;
}) {
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [proposal, setProposal] = useState<AiEditorResponse>();
  const [pendingSectionAdd, setPendingSectionAdd] = useState<Extract<AiEditorOperation, { type: "section.add" }>>();
  const [preferenceProfile, setPreferenceProfile] = useState<unknown>(null);

  useEffect(() => {
    let cancelled = false;
    const session = readStoredSession();
    if (!session?.access_token) return () => { cancelled = true; };
    const query = new URLSearchParams({ workspaceId: site.workspaceId, siteId: site.siteId });
    fetch(`/api/design-preferences?${query}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
      cache: "no-store",
    })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => { if (!cancelled) setPreferenceProfile(payload?.profile ?? null); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [site.workspaceId, site.siteId]);

  async function ask(value = prompt) {
    const next = value.trim();
    if (!next || busy) return;
    const session = readStoredSession();
    if (!session?.access_token) {
      setError("Your session has expired. Sign in again to use AI editing.");
      return;
    }
    setBusy(true);
    setError("");
    setProposal(undefined);
    setPendingSectionAdd(undefined);
    try {
      const response = await fetch("/api/ai-edit", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ prompt: next, site, pageId, sectionId, preferenceProfile }),
      });
      const payload = await response.json() as AiEditorResponse & { error?: string };
      if (!response.ok || !payload.operation) throw new Error(payload.error ?? "MiCirql could not interpret that edit.");
      setProposal(payload);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "MiCirql could not interpret that edit.");
    } finally {
      setBusy(false);
    }
  }

  function apply() {
    if (!proposal) return;
    if (proposal.operation.type === "section.add") {
      setPendingSectionAdd(proposal.operation);
      setProposal(undefined);
      return;
    }
    onApply(proposal.operation);
    setProposal(undefined);
    setPrompt("");
  }

  if (pendingSectionAdd) {
    return <SectionCompositionPicker
      site={site}
      pageId={pageId}
      family={pendingSectionAdd.family}
      {...(pendingSectionAdd.position === "after-selected" && sectionId ? { afterSectionId: sectionId } : {})}
      onCancel={() => setPendingSectionAdd(undefined)}
      onChoose={(candidate) => {
        const match = candidate.componentId.match(/-(00[1-5])$/);
        const variant = Number(match?.[1] ?? 2) as 1 | 2 | 3 | 4 | 5;
        onApply({ ...pendingSectionAdd, variant, componentId: candidate.componentId, version: candidate.version });
        setPendingSectionAdd(undefined);
        setPrompt("");
      }}
    />;
  }

  return <section className={styles.shell}>
    <div className={styles.heading}><span>MiCirql AI</span><strong>Tell the editor what to change</strong><small>Structured edits only. Your existing design system and undo history stay intact.</small></div>
    <div className={styles.chips}>
      {sectionId ? <>
        <button type="button" onClick={() => void ask("Give me another layout for this section")}>Another layout</button>
        <button type="button" onClick={() => void ask("Make this section feel more premium")}>More premium</button>
        <button type="button" onClick={() => void ask("Rewrite this section to be clearer and shorter")}>Improve copy</button>
        <button type="button" onClick={() => void ask("Change the image in this section")}>Change image</button>
        <button type="button" onClick={() => void ask("Move this section down")}>Move down</button>
        <button type="button" onClick={() => void ask("Connect an action for this section")}>Connect action</button>
      </> : null}
      <button type="button" onClick={() => setPrompt("Add a testimonials section")}>Add section</button>
      <button type="button" onClick={() => void ask("Improve the SEO title and description for this page")}>Improve SEO</button>
      <button type="button" onClick={() => setPrompt("Create an About page")}>Add About page</button>
    </div>
    <div className={styles.input}><textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder={sectionId ? "e.g. Make this hero more editorial and concise" : "e.g. Create an About page"} /><button type="button" disabled={busy || !prompt.trim()} onClick={() => void ask()}>{busy ? "Thinking…" : "Generate edit"}</button></div>
    {proposal ? <div className={`${styles.proposal} ${proposal.operation.type === "section.remove" ? styles.destructive : ""}`}><div><span>{proposal.source === "ai" ? "AI proposal" : "Safe fallback"}</span><strong>{proposal.operation.rationale}</strong><small>{proposal.operation.type.replace(".", " · ")}{proposal.model ? ` · ${proposal.model}` : ""}</small></div><div><button type="button" onClick={() => setProposal(undefined)}>Dismiss</button><button type="button" className={proposal.operation.type === "section.remove" ? styles.danger : styles.primary} onClick={() => {
      if (proposal.operation.type === "section.remove" && !window.confirm("Remove this section? You can undo it afterward.")) return;
      apply();
    }}>{proposal.operation.type === "section.add" ? "Choose design" : proposal.operation.type === "section.remove" ? "Remove section" : "Apply change"}</button></div></div> : null}
    {error ? <p className={styles.error}>{error}</p> : null}
  </section>;
}
