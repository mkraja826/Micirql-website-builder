"use client";

import { useEffect, useMemo, useState } from "react";
import { siteSchema, type Site } from "@micirql/schema";
import type { DesignPreferenceProfile } from "@micirql/design-engine";
import type { SupabaseSession } from "./auth-client";
import { RendererPreview } from "./renderer-preview";
import { buildReviewDirections, type ReviewDirection } from "./review-directions";
import type { OnboardingProfile } from "./preset-ranking";
import styles from "./first-build-review.module.css";

type DraftRecord = { workspaceId: string; siteId: string; revision: number; snapshot: Site };
type Viewport = "desktop" | "mobile";
type PreferenceSignal = "more_like_this" | "compare" | "regenerate" | "selected";

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
  const [preferenceProfile, setPreferenceProfile] = useState<DesignPreferenceProfile>();
  const [preferenceLoaded, setPreferenceLoaded] = useState(false);
  const [savingId, setSavingId] = useState<string>();
  const [error, setError] = useState("");
  const [visibleIds, setVisibleIds] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string>();
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const pool = useMemo(
    () => draft && preferenceLoaded ? buildReviewDirections(draft.snapshot, profile, 48, preferenceProfile) : [],
    [draft, profile, preferenceLoaded, preferenceProfile],
  );
  const byId = useMemo(() => new Map(pool.map((item) => [item.id, item])), [pool]);
  const visible = useMemo(() => visibleIds.map((id) => byId.get(id)).filter((item): item is ReviewDirection => Boolean(item)), [visibleIds, byId]);
  const active = activeId ? byId.get(activeId) : undefined;
  const compared = compareIds.map((id) => byId.get(id)).filter((item): item is ReviewDirection => Boolean(item));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const draftQuery = new URLSearchParams({ workspaceId, siteId });
        const preferenceQuery = new URLSearchParams({ workspaceId, siteId });
        const headers = { Authorization: `Bearer ${session.access_token}` };
        const [draftResponse, preferenceResponse] = await Promise.all([
          fetch(`/api/drafts?${draftQuery}`, { headers, cache: "no-store" }),
          fetch(`/api/design-preferences?${preferenceQuery}`, { headers, cache: "no-store" }),
        ]);

        const draftPayload = await draftResponse.json() as { draft?: DraftRecord; error?: string };
        if (!draftResponse.ok || !draftPayload.draft) throw new Error(draftPayload.error ?? "Could not load the generated website.");
        const next = { ...draftPayload.draft, snapshot: siteSchema.parse(draftPayload.draft.snapshot) };

        let learnedProfile: DesignPreferenceProfile | undefined;
        if (preferenceResponse.ok) {
          const preferencePayload = await preferenceResponse.json() as { profile?: DesignPreferenceProfile };
          learnedProfile = preferencePayload.profile?.signalCount ? preferencePayload.profile : undefined;
        }

        if (!cancelled) {
          setDraft(next);
          setPreferenceProfile(learnedProfile);
          setPreferenceLoaded(true);
        }
      } catch (caught) {
        if (!cancelled) {
          setPreferenceLoaded(true);
          setError(caught instanceof Error ? caught.message : "Could not load design review.");
        }
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
      await recordPreference("selected", direction, { comparedWith: compareIds.filter((id) => id !== direction.id) });
      onComplete();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save this design direction.");
    } finally {
      setSavingId(undefined);
    }
  }

  function regenerate(direction: ReviewDirection) {
    void recordPreference("regenerate", direction);
    const unused = pool.find((candidate) => candidate.themeFamily === direction.themeFamily && !visibleIds.includes(candidate.id))
      ?? pool.find((candidate) => !visibleIds.includes(candidate.id));
    if (!unused) return;
    setVisibleIds((current) => current.map((id) => id === direction.id ? unused.id : id));
    setCompareIds((current) => current.filter((id) => id !== direction.id));
    if (activeId === direction.id) setActiveId(unused.id);
  }

  function moreLike(direction: ReviewDirection) {
    void recordPreference("more_like_this", direction);
    const fingerprint = direction.designScore.fingerprint;
    const ranked = [...pool].sort((a, b) => similarityToFingerprint(b.designScore.fingerprint, fingerprint) - similarityToFingerprint(a.designScore.fingerprint, fingerprint));
    setVisibleIds(ranked.slice(0, 20).map((item) => item.id));
  }

  function toggleCompare(direction: ReviewDirection) {
    const adding = !compareIds.includes(direction.id);
    if (adding) void recordPreference("compare", direction, { currentCompareIds: compareIds });
    setCompareIds((current) => current.includes(direction.id) ? current.filter((item) => item !== direction.id) : current.length < 2 ? [...current, direction.id] : [current[1]!, direction.id]);
  }

  async function recordPreference(signalType: PreferenceSignal, direction: ReviewDirection, metadata: Record<string, unknown> = {}) {
    try {
      await fetch("/api/design-preferences", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}`, "content-type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          siteId,
          signalType,
          directionId: direction.id,
          directionSignature: designSignature(direction.site),
          themeFamily: direction.site.theme.family,
          density: direction.site.theme.brand.density,
          shape: direction.site.theme.brand.shape,
          motion: direction.site.theme.brand.motion,
          typographyDisplay: direction.site.theme.brand.typography.display,
          typographyBody: direction.site.theme.brand.typography.body,
          metadata: {
            variantSeed: direction.variantSeed,
            name: direction.name,
            designQuality: direction.designScore.total,
            fingerprint: direction.designScore.fingerprint,
            ...metadata,
          },
        }),
      });
    } catch (caught) {
      console.warn("MiCirql preference signal could not be stored.", caught);
    }
  }

  if (!draft || !preferenceLoaded) return <main className={styles.shell}><div className={styles.header}><span>MiCirql design review</span><h1>Your website is ready for a first look.</h1><p>{error || "Preparing diverse design directions and learning from your previous choices…"}</p></div></main>;

  return <main className={styles.shell}>
    <header className={styles.header}>
      <span>MiCirql design review</span>
      <h1>Choose from 20 different directions.</h1>
      <p>MiCirql keeps your business structure, functionality and logo-derived brand colors intact, then varies theme language, typography, layout and section composition. Taste stays with you.</p>
      <div className={styles.headerActions}>
        <strong>{visible.length} directions</strong>
        <span>{preferenceProfile?.signalCount ? `Personalized from ${preferenceProfile.signalCount} prior choice${preferenceProfile.signalCount === 1 ? "" : "s"}.` : "No prior design preference is required."}</span>
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
        <div className={styles.previewButton} aria-label={`${direction.name} design preview`}>
          <div className={styles.preview}><RendererPreview site={direction.site} path={direction.site.pages[0]?.path ?? "/"} viewport="desktop" onSelectSection={() => {}} /></div>
        </div>
        <div className={styles.utilityActions}>
          <button type="button" onClick={() => setActiveId(direction.id)}>Preview</button>
          <button type="button" className={compareIds.includes(direction.id) ? styles.selectedAction : ""} onClick={() => toggleCompare(direction)}>{compareIds.includes(direction.id) ? "Comparing" : "Compare"}</button>
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
        <div className={viewport === "mobile" ? styles.fullPreviewMobile : styles.fullPreview}><RendererPreview site={active.site} path={active.site.pages[0]?.path ?? "/"} viewport={viewport} onSelectSection={() => {}} /></div>
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

function designSignature(site: Site) {
  return [site.theme.family, site.theme.brand.density, site.theme.brand.shape, site.theme.brand.motion, ...site.pages.flatMap((page) => page.sections.map((section) => section.component.componentId))].join("|");
}

function similarityToFingerprint(a: ReviewDirection["designScore"]["fingerprint"], b: ReviewDirection["designScore"]["fingerprint"]): number {
  let score = 0;
  if (a.palette === b.palette) score += 0.25;
  if (a.typography === b.typography) score += 0.2;
  if (a.density === b.density) score += 0.1;
  if (a.shape === b.shape) score += 0.1;
  const left = new Set(a.structure.split("|").filter(Boolean));
  const right = new Set(b.structure.split("|").filter(Boolean));
  const union = new Set([...left, ...right]);
  const intersection = [...left].filter((token) => right.has(token)).length;
  score += union.size ? (intersection / union.size) * 0.35 : 0;
  return score;
}

function sameDesign(a: Site, b: Site) {
  if (JSON.stringify(a.theme) !== JSON.stringify(b.theme)) return false;
  const componentsA = a.pages.flatMap((page) => page.sections.map((section) => section.component.componentId));
  const componentsB = b.pages.flatMap((page) => page.sections.map((section) => section.component.componentId));
  return JSON.stringify(componentsA) === JSON.stringify(componentsB);
}
