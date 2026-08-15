"use client";

import { useEffect, useMemo, useState } from "react";
import { siteSchema, type Site } from "@micirql/schema";
import type { SupabaseSession } from "./auth-client";
import { RendererPreview } from "./renderer-preview";
import { buildReviewDirections, type ReviewDirection } from "./review-directions";
import type { OnboardingProfile } from "./preset-ranking";
import styles from "./first-build-review.module.css";

type DraftRecord = { workspaceId: string; siteId: string; revision: number; snapshot: Site };

type Viewport = "desktop" | "mobile";

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
  const [visibleIds, setVisibleIds] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string>();
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const pool = useMemo(() => draft ? buildReviewDirections(draft.snapshot, profile, 48) : [], [draft, profile]);
  const byId = useMemo(() => new Map(pool.map((item) => [item.id, item])), [pool]);
  const visible = useMemo(() => visibleIds.map((id) => byId.get(id)).filter((item): item is ReviewDirection => Boolean(item)), [visibleIds, byId]);
  const active = activeId ? byId.get(activeId) : undefined;
  const compared = compareIds.map((id) => byId.get(id)).filter((item): item is ReviewDirection => Boolean(item));

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

  useEffect(() => {
    if (pool.length && visibleIds.length === 0) setVisibleIds(pool.slice(0, 20).map((item) => item.id));
  }, [pool, visibleIds.length]);

  async function choose(direction: ReviewDirection) {
    if (!draft || savingId) return;
    setSavingId(direction.id);
    setError("");
    try {
      const alreadyApplied = sameDesign(draft.snapshot, direction.site);
      if (!alreadyApplied) {
        const response = await fetch("/api/drafts", {
          method: "PUT",
          headers: { Authorization: `Bearer ${session.access_token}`, "content-type": "application/json" },
          body: JSON.stringify({ snapshot: direction.site, expectedRevision: draft.revision, updatedBy: "first-build-review" }),
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

  function regenerate(direction: ReviewDirection) {
    const unused = pool.find((candidate) => candidate.themeFamily === direction.themeFamily && !visibleIds.includes(candidate.id))
      ?? pool.find((candidate) => !visibleIds.includes(candidate.id));
    if (!unused) return;
    setVisibleIds((current) => current.map((id) => id === direction.id ? unused.id : id));
    setCompareIds((current) => current.filter((id) => id !== direction.id));
    if (activeId === direction.id) setActiveId(unused.id);
  }

  function moreLike(direction: ReviewDirection) {
    const sameFamily = pool.filter((candidate) => candidate.themeFamily === direction.themeFamily);
    const others = pool.filter((candidate) => candidate.themeFamily !== direction.themeFamily);
    setVisibleIds([...sameFamily, ...others].slice(0, 20).map((item) => item.id));
  }

  function toggleCompare(id: string) {
    setCompareIds((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length < 2 ? [...current, id] : [current[1]!, id]);
  }

  if (!draft) return <main className={styles.shell}><div className={styles.header}><span>MiCirql design review</span><h1>Your website is ready for a first look.</h1><p>{error || "Generating a broad set of design directions from your business brief and brand…"}</p></div></main>;

  return <main className={styles.shell}>
    <header className={styles.header}>
      <span>MiCirql design review</span>
      <h1>Choose from 20 different directions.</h1>
      <p>MiCirql keeps your business structure, functionality and logo-derived brand colors intact, then varies theme language, typography, layout and section composition. Taste stays with you.</p>
      <div className={styles.headerActions}>
        <strong>{visible.length} directions</strong>
        <span>Select up to two designs to compare.</span>
        {compared.length === 2 ? <button type="button" onClick={() => setActiveId("__compare__")}>Compare selected</button> : null}
      </div>
    </header>

    <section className={styles.grid}>
      {visible.map((direction, index) => <article className={styles.card} key={direction.id}>
        <div className={styles.cardTop}>
          <span className={styles.badge}>{index < 3 ? `Top ${index + 1}` : `#${index + 1}`}</span>
          <strong>{direction.name}</strong>
          <small>{direction.reasons.slice(0, 2).join(" · ") || direction.description}</small>
        </div>
        <button className={styles.previewButton} type="button" onClick={() => setActiveId(direction.id)} aria-label={`Preview ${direction.name}`}>
          <div className={styles.preview}>
            <RendererPreview site={direction.site} path={direction.site.pages[0]?.path ?? "/"} viewport="desktop" onSelectSection={() => {}} />
          </div>
        </button>
        <div className={styles.utilityActions}>
          <button type="button" onClick={() => setActiveId(direction.id)}>Preview</button>
          <button type="button" className={compareIds.includes(direction.id) ? styles.selectedAction : ""} onClick={() => toggleCompare(direction.id)}>{compareIds.includes(direction.id) ? "Comparing" : "Compare"}</button>
          <button type="button" onClick={() => moreLike(direction)}>More like this</button>
          <button type="button" onClick={() => regenerate(direction)}>Regenerate</button>
        </div>
        <div className={styles.actions}><button type="button" disabled={Boolean(savingId)} onClick={() => void choose(direction)}>{savingId === direction.id ? "Saving…" : "Use this design"}</button></div>
      </article>)}
    </section>

    {error ? <div className={styles.error}>{error}</div> : null}

    {active && activeId !== "__compare__" ? <div className={styles.modalBackdrop} role="dialog" aria-modal="true" aria-label={`${active.name} preview`}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <div><small>Design preview</small><strong>{active.name}</strong></div>
          <div className={styles.modalTools}>
            <button type="button" className={viewport === "desktop" ? styles.selectedAction : ""} onClick={() => setViewport("desktop")}>Desktop</button>
            <button type="button" className={viewport === "mobile" ? styles.selectedAction : ""} onClick={() => setViewport("mobile")}>Mobile</button>
            <button type="button" onClick={() => setActiveId(undefined)}>Close</button>
          </div>
        </div>
        <div className={viewport === "mobile" ? styles.fullPreviewMobile : styles.fullPreview}>
          <RendererPreview site={active.site} path={active.site.pages[0]?.path ?? "/"} viewport={viewport} onSelectSection={() => {}} />
        </div>
        <div className={styles.modalFooter}>
          <button type="button" onClick={() => moreLike(active)}>More like this</button>
          <button type="button" onClick={() => regenerate(active)}>Regenerate</button>
          <button type="button" className={styles.primaryModalAction} disabled={Boolean(savingId)} onClick={() => void choose(active)}>{savingId === active.id ? "Saving…" : "Use this design"}</button>
        </div>
      </div>
    </div> : null}

    {activeId === "__compare__" && compared.length === 2 ? <div className={styles.modalBackdrop} role="dialog" aria-modal="true" aria-label="Compare designs">
      <div className={`${styles.modal} ${styles.compareModal}`}>
        <div className={styles.modalHeader}><div><small>Side-by-side</small><strong>Compare designs</strong></div><button type="button" onClick={() => setActiveId(undefined)}>Close</button></div>
        <div className={styles.compareGrid}>{compared.map((direction) => <div key={direction.id} className={styles.comparePane}><h3>{direction.name}</h3><div className={styles.comparePreview}><RendererPreview site={direction.site} path={direction.site.pages[0]?.path ?? "/"} viewport="desktop" onSelectSection={() => {}} /></div><button type="button" onClick={() => void choose(direction)}>Use this design</button></div>)}</div>
      </div>
    </div> : null}
  </main>;
}

function sameDesign(a: Site, b: Site) {
  if (JSON.stringify(a.theme) !== JSON.stringify(b.theme)) return false;
  const componentsA = a.pages.flatMap((page) => page.sections.map((section) => section.component.componentId));
  const componentsB = b.pages.flatMap((page) => page.sections.map((section) => section.component.componentId));
  return JSON.stringify(componentsA) === JSON.stringify(componentsB);
}
