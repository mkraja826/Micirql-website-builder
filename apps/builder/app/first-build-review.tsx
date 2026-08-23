"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { siteSchema, type Site } from "@micirql/schema";
import type { DesignPreferenceProfile } from "@micirql/design-engine";
import type { SupabaseSession } from "./auth-client";
import { RendererPreview } from "./renderer-preview";
import { CompareDesigns } from "./compare-designs";
import { buildReviewDirections, type ReviewDirection } from "./review-directions";
import { DentalReviewRenderCertifier, type DentalReviewCertificationResult } from "./dental-review-render-certifier";
import type { OnboardingProfile } from "./preset-ranking";
import styles from "./first-build-review.module.css";

type DraftRecord = { workspaceId: string; siteId: string; revision: number; snapshot: Site };
type Viewport = "desktop" | "mobile";
type PreferenceSignal = "more_like_this" | "compare" | "regenerate" | "selected";

type DentalDirectionsPayload = {
  directions?: ReviewDirection[];
  revision?: number;
  error?: string;
};

const DENTAL_BACKGROUND_RENDER_LIMIT = 3;
const DENTAL_BACKGROUND_RENDER_BUDGET_MS = 12_000;
const DENTAL_REVIEW_REQUEST_TIMEOUT_MS = 8_000;
const DENTAL_REVIEW_RETRY_DELAY_MS = 750;

export function FirstBuildReview({ session, workspaceId, siteId, profile, onComplete }: {
  session: SupabaseSession;
  workspaceId: string;
  siteId: string;
  profile: OnboardingProfile;
  onComplete(): void;
}) {
  const [draft, setDraft] = useState<DraftRecord>();
  const [preferenceProfile, setPreferenceProfile] = useState<DesignPreferenceProfile>();
  const [preferenceLoaded, setPreferenceLoaded] = useState(false);
  const [serverDentalPool, setServerDentalPool] = useState<ReviewDirection[]>();
  const [serverDentalPoolLoaded, setServerDentalPoolLoaded] = useState(false);
  const [savingId, setSavingId] = useState<string>();
  const [error, setError] = useState("");
  const [visibleIds, setVisibleIds] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string>();
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [dentalCertificationResults, setDentalCertificationResults] = useState<DentalReviewCertificationResult[]>();
  const dentalReview = isDentalReviewProfile(profile);
  const profileSignature = useMemo(() => JSON.stringify(profile), [profile]);
  const preferenceSignature = useMemo(() => JSON.stringify(preferenceProfile ?? null), [preferenceProfile]);
  const rawPool = useMemo(() => {
    if (!draft || !preferenceLoaded) return [];
    if (!dentalReview) return buildReviewDirections(draft.snapshot, profile, 24, preferenceProfile);
    if (serverDentalPool?.length) return serverDentalPool;
    if (!serverDentalPoolLoaded) return [];
    return buildReviewDirections(draft.snapshot, profile, 8, preferenceProfile);
  }, [dentalReview, draft, preferenceLoaded, preferenceProfile, profile, serverDentalPool, serverDentalPoolLoaded]);
  const rawPoolSignature = useMemo(() => rawPool.map((item) => `${item.id}:${item.designScore.total}`).join("|"), [rawPool]);
  const dentalProbePool = useMemo(
    () => dentalReview && Boolean(serverDentalPool?.length) ? rawPool.slice(0, DENTAL_BACKGROUND_RENDER_LIMIT) : [],
    [dentalReview, rawPool, serverDentalPool?.length],
  );

  // The server Dental pool is already constrained by the production allowlist.
  // Browser-rendered QA is an additional signal, not a reason to make generation
  // appear broken. It therefore runs in the background on only the strongest few
  // candidates and never replaces the usable server-approved pool.
  const pool = rawPool;
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
    if (!dentalReview) {
      setServerDentalPool(undefined);
      setServerDentalPoolLoaded(true);
      return;
    }
    if (!draft || !preferenceLoaded) return;

    let cancelled = false;
    setServerDentalPool(undefined);
    setServerDentalPoolLoaded(false);
    setError("");

    (async () => {
      try {
        const payload = await fetchDentalDirectionsWithRetry({
          accessToken: session.access_token,
          workspaceId,
          siteId,
          profile,
          preferenceProfile,
        });
        if (!Array.isArray(payload.directions) || !payload.directions.length) {
          throw new Error(payload.error ?? "Could not prepare certified Dental review directions.");
        }
        const directions = payload.directions.map((direction) => ({
          ...direction,
          site: siteSchema.parse(direction.site),
        }));
        if (!cancelled) {
          setServerDentalPool(directions);
          setServerDentalPoolLoaded(true);
        }
      } catch (caught) {
        if (!cancelled) {
          setServerDentalPool([]);
          setServerDentalPoolLoaded(true);
          setError("Advanced Dental review was temporarily unavailable. MiCirql recovered with safe local design directions; full certification remains a publish-time safeguard.");
          console.warn("MiCirql Dental review service unavailable; using safe local directions.", caught);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [dentalReview, draft?.revision, preferenceLoaded, preferenceSignature, profileSignature, session.access_token, workspaceId, siteId]);

  useEffect(() => {
    if (!dentalReview) return;
    setDentalCertificationResults(undefined);
    setVisibleIds([]);
    setCompareIds([]);
    setActiveId(undefined);
  }, [dentalReview, rawPoolSignature]);

  const handleDentalCertification = useCallback((results: DentalReviewCertificationResult[]) => {
    setDentalCertificationResults(results);
  }, []);

  useEffect(() => {
    if (!dentalReview || !dentalProbePool.length || dentalCertificationResults !== undefined) return;
    const timer = window.setTimeout(() => {
      setDentalCertificationResults([]);
    }, DENTAL_BACKGROUND_RENDER_BUDGET_MS);
    return () => window.clearTimeout(timer);
  }, [dentalCertificationResults, dentalProbePool.length, dentalReview, rawPoolSignature]);

  useEffect(() => {
    if (pool.length && visibleIds.length === 0) setVisibleIds(pool.map((item) => item.id));
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
    setVisibleIds(ranked.slice(0, 8).map((item) => item.id));
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
            name: displayDirectionName(direction.name),
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

  if (!draft || !preferenceLoaded) return <main className={styles.shell}><div className={styles.header}><span>MiCirql design review</span><h1>Your website is ready for a first look.</h1><p>{error || "Preparing distinct design directions and learning from your previous choices…"}</p></div></main>;

  if (dentalReview && !serverDentalPoolLoaded) return <main className={styles.shell}><div className={styles.header}><span>MiCirql design review</span><h1>Preparing your certified Dental directions.</h1><p>Applying the production-certified layout allowlist and premium review gates on the server…</p></div></main>;

  if (dentalReview && rawPool.length === 0) return <main className={styles.shell}><div className={styles.header}><span>MiCirql design review</span><h1>No dental direction is available yet.</h1><p>{error || "MiCirql could not prepare a safe review direction for this draft."}</p></div></main>;

  const countLabel = `${visible.length} curated design direction${visible.length === 1 ? "" : "s"}`;
  const backgroundPassCount = dentalCertificationResults?.filter((result) => result.passed).length ?? 0;

  return <main className={styles.shell}>
    {dentalReview && dentalProbePool.length > 0 && dentalCertificationResults === undefined
      ? <DentalReviewRenderCertifier directions={dentalProbePool} onComplete={handleDentalCertification} />
      : null}

    <header className={styles.header}>
      <span>MiCirql design review</span>
      <h1>Choose your design direction.</h1>
      <p>MiCirql selected the strongest visually distinct directions for this website. Your business structure, functionality and brand colors stay intact while composition, typography and visual language change.</p>
      <div className={styles.headerActions}>
        <strong>{countLabel}</strong>
        <span>{preferenceProfile?.signalCount ? `Personalized from ${preferenceProfile.signalCount} prior choice${preferenceProfile.signalCount === 1 ? "" : "s"}.` : "Only meaningfully different directions are shown."}</span>
        {dentalReview ? <span>{serverDentalPool?.length ? (dentalCertificationResults === undefined ? "Top designs are receiving an additional rendered check in the background." : backgroundPassCount ? `${backgroundPassCount} top design${backgroundPassCount === 1 ? "" : "s"} passed the background rendered check.` : "Your server-approved designs are available now; deep rendered certification remains a publish-time safeguard.") : "Certified review service is temporarily unavailable; safe local directions are shown and full certification remains a publish-time safeguard."}</span> : null}
        {compared.length === 2 ? <button type="button" onClick={() => setActiveId("__compare__")}>Compare selected</button> : null}
      </div>
    </header>

    <section className={styles.grid}>
      {visible.map((direction, index) => {
        const name = displayDirectionName(direction.name);
        const recommendation = index === 0 ? recommendationReasons(direction) : [];
        return <article className={styles.card} key={direction.id}>
          <div className={styles.cardTop}>
            <span className={styles.badge}>{index === 0 ? "Best match" : index < 3 ? `Top ${index + 1}` : `Direction ${index + 1}`}</span>
            <strong>{name}</strong>
            <small>{direction.description}</small>
            {index === 0 && recommendation.length ? <div className={styles.matchReasons}>{recommendation.map((reason) => <span key={reason}>{reason}</span>)}</div> : null}
          </div>
          <div className={styles.previewButton} aria-label={`${name} design preview`}>
            <div className={styles.preview}><RendererPreview site={direction.site} path={direction.site.pages[0]?.path ?? "/"} viewport="desktop" onSelectSection={() => {}} /></div>
          </div>
          <div className={styles.utilityActions}>
            <button type="button" className={styles.previewAction} onClick={() => setActiveId(direction.id)}>Preview</button>
            <details className={styles.moreActions}>
              <summary aria-label={`More actions for ${name}`}>•••</summary>
              <div className={styles.moreActionsMenu}>
                <button type="button" className={compareIds.includes(direction.id) ? styles.selectedAction : ""} onClick={() => toggleCompare(direction)}>{compareIds.includes(direction.id) ? "Comparing" : "Compare"}</button>
                <button type="button" onClick={() => moreLike(direction)}>More like this</button>
                <button type="button" onClick={() => regenerate(direction)}>Try another</button>
              </div>
            </details>
          </div>
          <div className={styles.actions}><button type="button" disabled={Boolean(savingId)} onClick={() => void choose(direction)}>{savingId === direction.id ? "Saving…" : "Use this design"}</button></div>
        </article>;
      })}
    </section>

    {error ? <div className={styles.error}>{error}</div> : null}

    {active && activeId !== "__compare__" ? <div className={styles.modalBackdrop} role="dialog" aria-modal="true" aria-label={`${displayDirectionName(active.name)} preview`}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <div><small>Design preview</small><strong>{displayDirectionName(active.name)}</strong></div>
          <div className={styles.modalTools}>
            <button type="button" className={viewport === "desktop" ? styles.selectedAction : ""} onClick={() => setViewport("desktop")}>Desktop</button>
            <button type="button" className={viewport === "mobile" ? styles.selectedAction : ""} onClick={() => setViewport("mobile")}>Mobile</button>
            <button type="button" onClick={() => setActiveId(undefined)}>Close</button>
          </div>
        </div>
        <div className={viewport === "mobile" ? styles.fullPreviewMobile : styles.fullPreview}><RendererPreview site={active.site} path={active.site.pages[0]?.path ?? "/"} viewport={viewport} onSelectSection={() => {}} /></div>
        <div className={styles.modalFooter}>
          <button type="button" onClick={() => moreLike(active)}>More like this</button>
          <button type="button" onClick={() => regenerate(active)}>Try another</button>
          <button type="button" className={styles.primaryModalAction} disabled={Boolean(savingId)} onClick={() => void choose(active)}>{savingId === active.id ? "Saving…" : "Use this design"}</button>
        </div>
      </div>
    </div> : null}

    {activeId === "__compare__" && compared.length === 2 ? <CompareDesigns directions={compared} viewport={viewport} savingId={savingId} onViewportChange={setViewport} onClose={() => setActiveId(undefined)} onChoose={(direction) => void choose(direction)} /> : null}
  </main>;
}

async function fetchDentalDirectionsWithRetry(input: {
  accessToken: string;
  workspaceId: string;
  siteId: string;
  profile: OnboardingProfile;
  preferenceProfile?: DesignPreferenceProfile;
}): Promise<DentalDirectionsPayload> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), DENTAL_REVIEW_REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch("/api/review-directions/dental", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${input.accessToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          workspaceId: input.workspaceId,
          siteId: input.siteId,
          profile: input.profile,
          ...(input.preferenceProfile ? { preferenceProfile: input.preferenceProfile } : {}),
        }),
        cache: "no-store",
        signal: controller.signal,
      });
      const payload = await readDentalDirectionsPayload(response);
      if (response.ok && Array.isArray(payload.directions) && payload.directions.length) return payload;
      lastError = new Error(payload.error ?? `Dental review service failed (${response.status}).`);
    } catch (error) {
      lastError = error;
    } finally {
      window.clearTimeout(timeout);
    }
    if (attempt === 0) await delay(DENTAL_REVIEW_RETRY_DELAY_MS);
  }
  throw lastError instanceof Error ? lastError : new Error("Dental review service is temporarily unavailable.");
}

async function readDentalDirectionsPayload(response: Response): Promise<DentalDirectionsPayload> {
  const contentType = response.headers.get("content-type") ?? "";
  const body = await response.text();
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error(`Dental review service returned a non-JSON response (${response.status}).`);
  }
  try {
    return JSON.parse(body) as DentalDirectionsPayload;
  } catch {
    throw new Error(`Dental review service returned malformed JSON (${response.status}).`);
  }
}

function delay(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

function displayDirectionName(name: string) {
  return name.replace(/\s*·\s*variation\s+\d+\s*$/i, "").trim();
}

function recommendationReasons(direction: ReviewDirection): string[] {
  const ignored = /certified dental design system|design quality|readiness|content quality/i;
  const normalized = direction.reasons
    .filter((reason) => !ignored.test(reason))
    .map((reason) => reason.replace(/^matched to\s+/i, "").replace(/\bsection rhythm$/i, "").trim())
    .filter(Boolean);
  return [...new Set(normalized)].slice(0, 3);
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

function isDentalReviewProfile(profile: OnboardingProfile): boolean {
  return /dental|dentist|dentistry|orthodont|endodont|implant|cosmetic/.test(`${cleanProfileSignal(profile.industry)} ${cleanProfileSignal(profile.subindustry)}`);
}

function cleanProfileSignal(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}
