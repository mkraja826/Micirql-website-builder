"use client";

import { useEffect, useMemo, useState } from "react";
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

  const activePage = useMemo(() => site.pages.find((page) => page.id === pageId) ?? site.pages[0], [site.pages, pageId]);
  const activeSection = useMemo(() => activePage?.sections.find((section) => section.id === sectionId), [activePage, sectionId]);
  const sectionLabel = activeSection ? sectionName(activeSection.component.componentId) : undefined;

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
      setError("Your session has expired. Sign in again to use Ask MiCirql.");
      return;
    }
    setPrompt(next);
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

  const selectedContext = sectionId
    ? `${sectionLabel ?? "Selected section"} on ${activePage?.name ?? "this page"}`
    : activePage?.name ? `${activePage.name} page` : "Current page";

  return <section className={styles.shell} aria-labelledby="ai-editor-title">
    <div className={styles.hero}>
      <div className={styles.spark}>✦</div>
      <div className={styles.heading}>
        <span id="ai-editor-title">Ask MiCirql</span>
        <strong>What would you like to improve?</strong>
        <small>{selectedContext}. MiCirql proposes a safe structured edit first—you decide whether to apply it.</small>
      </div>
    </div>

    <div className={styles.suggestionGroup} role="group" aria-labelledby="ai-editor-suggestions-label">
      <span id="ai-editor-suggestions-label" className={styles.groupLabel}>{sectionId ? "For this section" : "For this page"}</span>
      <div className={styles.chips}>
        {sectionId ? <>
          <button type="button" onClick={() => void ask("Give me another layout for this section")}>Try another layout</button>
          <button type="button" onClick={() => void ask("Make this section feel more premium")}>Make it more premium</button>
          <button type="button" onClick={() => void ask("Rewrite this section to be clearer and shorter")}>Improve the copy</button>
          <button type="button" onClick={() => void ask("Change the image in this section")}>Replace the image</button>
          <button type="button" onClick={() => void ask("Connect an action for this section")}>Add an action</button>
        </> : <>
          <button type="button" onClick={() => setPrompt("Add a testimonials section")}>Add a section</button>
          <button type="button" onClick={() => void ask("Improve the SEO title and description for this page")}>Improve page SEO</button>
          <button type="button" onClick={() => setPrompt("Create an About page")}>Create an About page</button>
        </>}
      </div>
    </div>

    <div className={styles.input} aria-busy={busy}>
      <textarea
        aria-label="Ask MiCirql edit request"
        aria-describedby="ai-editor-prompt-help"
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        placeholder={sectionId ? "Ask MiCirql to change this section…" : "Ask MiCirql to improve this page…"}
      />
      <div className={styles.inputFooter}>
        <small id="ai-editor-prompt-help">Design-safe edits · Undo supported</small>
        <button type="button" disabled={busy || !prompt.trim()} onClick={() => void ask()}>{busy ? "Working…" : "Create proposal"}</button>
      </div>
    </div>

    {proposal ? <div className={`${styles.proposal} ${proposal.operation.type === "section.remove" ? styles.destructive : ""}`}>
      <div className={styles.proposalCopy} role="status">
        <span>{proposal.source === "ai" ? "MiCirql proposal" : "Safe fallback"}</span>
        <strong>{proposal.operation.rationale}</strong>
        <small>{humanOperation(proposal.operation.type)}{proposal.model ? ` · ${proposal.model}` : ""}</small>
      </div>
      <div className={styles.proposalActions}>
        <button type="button" onClick={() => setProposal(undefined)}>Not now</button>
        <button type="button" className={proposal.operation.type === "section.remove" ? styles.danger : styles.primary} onClick={apply}>
          {proposal.operation.type === "section.add" ? "Choose design" : proposal.operation.type === "section.remove" ? "Remove section" : "Apply change"}
        </button>
      </div>
    </div> : null}
    {error ? <p className={styles.error} role="alert">{error}</p> : null}
  </section>;
}

function sectionName(componentId: string) {
  const match = componentId.match(/(?:^|\.)(hero|about|services|features|process|testimonials|gallery|team|cta|contact)(?:\.|-|$)/i);
  const value = match?.[1] ?? componentId.split(/[.-]/).find((part) => ["hero","about","services","features","process","testimonials","gallery","team","cta","contact"].includes(part.toLowerCase()));
  return value ? `${value.charAt(0).toUpperCase()}${value.slice(1)} section` : "Selected section";
}

function humanOperation(type: AiEditorOperation["type"]) {
  const labels: Record<string, string> = {
    "section.variant": "Layout change",
    "section.copy": "Copy improvement",
    "section.add": "New section",
    "section.visibility": "Visibility change",
    "section.remove": "Remove section",
    "section.move": "Reorder section",
    "media.open": "Media change",
    "functions.open": "Function setup",
    "seo.patch": "SEO improvement",
    "page.add": "New page",
  };
  return labels[type] ?? type;
}
