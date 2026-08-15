"use client";

import { useEffect, useMemo, useState } from "react";
import { siteSchema, type Site } from "@micirql/schema";
import type { SupabaseSession } from "./auth-client";
import { applyIndustryPreset } from "./apply-industry-preset";
import { rankPresets, type OnboardingProfile } from "./preset-ranking";
import { RendererPreview } from "./renderer-preview";
import styles from "./first-build-review.module.css";

type DraftRecord = { workspaceId: string; siteId: string; revision: number; snapshot: Site };

export function FirstBuildReview({
  session,
  workspaceId,
  siteId,
  profile,
  onComplete,
}: {
  session: SupabaseSession;
  workspaceId: string;
  siteId: string;
  profile: OnboardingProfile;
  onComplete(): void;
}) {
  const [draft, setDraft] = useState<DraftRecord>();
  const [savingId, setSavingId] = useState<string>();
  const [error, setError] = useState("");
  const ranked = useMemo(() => rankPresets(profile).slice(0, 3), [profile]);
  const choices = useMemo(() => draft ? ranked.map((item) => ({ ...item, site: applyIndustryPreset(draft.snapshot, item.preset) })) : [], [draft, ranked]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const query = new URLSearchParams({ workspaceId, siteId });
        const response = await fetch(`/api/drafts?${query}`, { headers: { Authorization: `Bearer ${session.access_token}` }, cache: "no-store" });
        const payload = await response.json() as { draft?: DraftRecord; error?: string };
        if (!response.ok || !payload.draft) throw new Error(payload.error ?? "Could not load the generated website.");
        const next = { ...payload.draft, snapshot: siteSchema.parse(payload.draft.snapshot) };
        if (!cancelled) setDraft(next);
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Could not load design review.");
      }
    })();
    return () => { cancelled = true; };
  }, [session.access_token, workspaceId, siteId]);

  async function choose(presetId: string, site: Site) {
    if (!draft || savingId) return;
    setSavingId(presetId);
    setError("");
    try {
      const alreadyApplied = sameDesign(draft.snapshot, site);
      if (!alreadyApplied) {
        const response = await fetch("/api/drafts", {
          method: "PUT",
          headers: { Authorization: `Bearer ${session.access_token}`, "content-type": "application/json" },
          body: JSON.stringify({ snapshot: site, expectedRevision: draft.revision, updatedBy: "first-build-review" }),
        });
        const payload = await response.json() as { draft?: DraftRecord; error?: string };
        if (!response.ok || !payload.draft) throw new Error(payload.error ?? "Could not save this design direction.");
      }
      onComplete();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save this design direction.");
    } finally {
      setSavingId(undefined);
    }
  }

  if (!draft) return <main className={styles.shell}><div className={styles.header}><span>MiCirql design review</span><h1>Your website is ready for a first look.</h1><p>{error || "Preparing three design directions from your business brief…"}</p></div></main>;

  return <main className={styles.shell}>
    <header className={styles.header}>
      <span>MiCirql design review</span>
      <h1>Choose the direction that feels right.</h1>
      <p>All three use the same business content and functionality. Only the visual system and section presentation change. You can switch again later in the editor.</p>
    </header>
    <section className={styles.grid}>
      {choices.map(({ preset, reasons, site }, index) => <article className={styles.card} key={preset.id}>
        <div className={styles.cardTop}>
          <span className={styles.badge}>{index === 0 ? "Recommended" : `Alternative ${index}`}</span>
          <strong>{preset.name}</strong>
          <small>{reasons.slice(0, 2).join(" · ") || preset.description}</small>
        </div>
        <div className={styles.preview}>
          <RendererPreview site={site} path={site.pages[0]?.path ?? "/"} viewport="desktop" onSelectSection={() => {}} />
        </div>
        <div className={styles.actions}><button type="button" disabled={Boolean(savingId)} onClick={() => void choose(preset.id, site)}>{savingId === preset.id ? "Saving…" : index === 0 ? "Continue with recommended" : "Choose this design"}</button></div>
      </article>)}
    </section>
    {error ? <div className={styles.error}>{error}</div> : null}
  </main>;
}

function sameDesign(a: Site, b: Site) {
  if (JSON.stringify(a.theme) !== JSON.stringify(b.theme)) return false;
  const componentsA = a.pages.flatMap((page) => page.sections.map((section) => section.component.componentId));
  const componentsB = b.pages.flatMap((page) => page.sections.map((section) => section.component.componentId));
  return JSON.stringify(componentsA) === JSON.stringify(componentsB);
}
