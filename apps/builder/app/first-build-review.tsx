"use client";

import { useEffect, useMemo, useState } from "react";
import {
  siteSchema,
  type CompositionGateReport,
  type Site,
} from "@micirql/schema";
import type { SupabaseSession } from "./auth-client";
import { applyIndustryPreset } from "./apply-industry-preset";
import { DESIGN_REVIEW_COUNT } from "./industry-design-preset-data";
import {
  rankPresets,
  type OnboardingProfile,
  type RankedPreset,
} from "./preset-ranking";
import { RendererPreview } from "./renderer-preview";
import styles from "./first-build-review.module.css";

type DraftRecord = {
  workspaceId: string;
  siteId: string;
  revision: number;
  snapshot: Site;
};
type ReviewViewport = "mobile" | "tablet" | "desktop";
const DESIGNS_PER_PAGE = 4;

export function FirstBuildReview({
  session,
  workspaceId,
  siteId,
  profile,
  qualityWarnings,
  onComplete,
}: {
  session: SupabaseSession;
  workspaceId: string;
  siteId: string;
  profile: OnboardingProfile;
  qualityWarnings?: string[];
  onComplete(): void;
}) {
  const [draft, setDraft] = useState<DraftRecord>();
  const [savingId, setSavingId] = useState<string>();
  const [pageIndex, setPageIndex] = useState(0);
  const [viewports, setViewports] = useState<Record<string, ReviewViewport>>(
    {},
  );
  const [expandedId, setExpandedId] = useState<string>();
  const [error, setError] = useState("");
  const [gate, setGate] = useState<CompositionGateReport>();
  const ranked = useMemo(() => rankPresets(profile), [profile]);
  const ordered = useMemo(
    () => orderFromDraft(ranked, draft?.snapshot),
    [ranked, draft?.snapshot],
  );
  const pageCount = Math.ceil(ordered.length / DESIGNS_PER_PAGE);
  const visibleRanked = useMemo(
    () =>
      ordered.slice(
        pageIndex * DESIGNS_PER_PAGE,
        (pageIndex + 1) * DESIGNS_PER_PAGE,
      ),
    [ordered, pageIndex],
  );
  const choices = useMemo(() => {
    if (!draft) return [];
    return visibleRanked.map((item) => ({
      ...item,
      site: applyIndustryPreset(draft.snapshot, item.preset),
    }));
  }, [draft, visibleRanked]);

  useEffect(() => {
    if (!expandedId) return;
    const previous = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpandedId(undefined);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [expandedId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const query = new URLSearchParams({ workspaceId, siteId });
        const response = await fetch("/api/drafts?" + query, {
          headers: { Authorization: "Bearer " + session.access_token },
          cache: "no-store",
        });
        const payload = (await response.json()) as {
          draft?: DraftRecord;
          error?: string;
        };
        if (!response.ok || !payload.draft)
          throw new Error(
            payload.error ?? "Could not load the generated website.",
          );
        const next = {
          ...payload.draft,
          snapshot: siteSchema.parse(payload.draft.snapshot),
        };
        if (!cancelled) setDraft(next);
      } catch (caught) {
        if (!cancelled)
          setError(
            caught instanceof Error
              ? caught.message
              : "Could not load design review.",
          );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session.access_token, workspaceId, siteId]);

  async function choose(candidateId: string) {
    if (!draft || savingId) return;
    setSavingId(candidateId);
    setError("");
    setGate(undefined);
    try {
      const response = await fetch("/api/design-review/select", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + session.access_token,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          workspaceId,
          siteId,
          candidateId,
          expectedRevision: draft.revision,
        }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        message?: string;
        error?: string;
        draft?: DraftRecord;
        gate?: CompositionGateReport;
      };
      if (payload.draft) {
        setDraft({
          ...payload.draft,
          snapshot: siteSchema.parse(payload.draft.snapshot),
        });
      }
      if (payload.gate) setGate(payload.gate);
      if (!response.ok || !payload.ok) {
        const diagnostic = payload.gate?.issues
          .filter((issue) => issue.severity === "error")
          .map((issue) => issue.message)
          .join(" ");
        throw new Error(
          payload.message ??
            diagnostic ??
            payload.error ??
            "This design did not pass the premium gate.",
        );
      }
      onComplete();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not complete this design.",
      );
    } finally {
      setSavingId(undefined);
    }
  }

  if (!draft) {
    return (
      <main className={styles.shell}>
        <div className={styles.header}>
          <span>MiCirql dental design review</span>
          <h1>Preparing your certified Top 20.</h1>
          <p>
            {error ||
              "Loading the factual scaffold and ranked dental compositions…"}
          </p>
        </div>
      </main>
    );
  }

  if (ordered.length !== DESIGN_REVIEW_COUNT) {
    return (
      <main className={styles.shell}>
        <div className={styles.header}>
          <span>Industry pack status</span>
          <h1>Industry pack not yet certified.</h1>
          <p>
            MiCirql will not fill this review with dental designs,
            cross-industry layouts, or simple recolors. This brief can continue
            when its own component pack has passed certification.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <span>MiCirql flagship dental · 20 certified compositions</span>
        <h1>Choose the structure before content is generated.</h1>
        <p>
          Four ranked previews are mounted at a time. Every option stays inside
          the dental pack, preserves your business facts and supplied brand
          assets, and uses a materially different composition.
        </p>
        {qualityWarnings?.length ? (
          <div className={styles.warning}>
            <strong>Review note</strong>
            <div>{qualityWarnings.join(" ")}</div>
          </div>
        ) : null}
      </header>

      <nav className={styles.pagination} aria-label="Design review pages">
        <button
          type="button"
          disabled={pageIndex === 0 || Boolean(savingId)}
          onClick={() => setPageIndex((value) => Math.max(0, value - 1))}
        >
          ← Previous four
        </button>
        <div>
          {Array.from({ length: pageCount }, (_, index) => (
            <button
              type="button"
              key={index}
              disabled={Boolean(savingId)}
              aria-current={index === pageIndex ? "page" : undefined}
              className={index === pageIndex ? styles.activePage : undefined}
              onClick={() => setPageIndex(index)}
            >
              {index * DESIGNS_PER_PAGE + 1}–
              {Math.min((index + 1) * DESIGNS_PER_PAGE, DESIGN_REVIEW_COUNT)}
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={pageIndex >= pageCount - 1 || Boolean(savingId)}
          onClick={() =>
            setPageIndex((value) => Math.min(pageCount - 1, value + 1))
          }
        >
          Next four →
        </button>
      </nav>

      <section className={styles.grid}>
        {choices.map(({ preset, reasons, site }, visibleIndex) => {
          const rank = pageIndex * DESIGNS_PER_PAGE + visibleIndex + 1;
          const viewport = viewports[preset.id] ?? "desktop";
          const expanded = expandedId === preset.id;
          return (
            <article
              className={`${styles.card}${expanded ? ` ${styles.expandedCard}` : ""}`}
              key={preset.id}
            >
              <div className={styles.cardTop}>
                <span className={styles.badge}>
                  {rank === 1 ? "Rank 1 · Recommended" : "Rank " + rank}
                </span>
                <strong>{preset.name}</strong>
                <small>{preset.description}</small>
                <div
                  className={styles.signature}
                  aria-label={`${preset.theme.family} design system, ${preset.typographyStrategy} typography, ${preset.theme.brand.density} density`}
                >
                  <span
                    className={styles.typeSample}
                    style={{
                      fontFamily: preset.theme.brand.typography.display,
                    }}
                  >
                    Aa
                  </span>
                  <span>{preset.theme.family.replace(/-/g, " ")}</span>
                  <span>{preset.typographyStrategy.replace(/-/g, " ")}</span>
                  <span>{preset.theme.brand.density}</span>
                  <span className={styles.swatches} aria-hidden="true">
                    {[
                      preset.theme.brand.colors.primary,
                      preset.theme.brand.colors.secondary,
                      preset.theme.brand.colors.accent,
                      preset.theme.brand.colors.background,
                    ].map((color) => (
                      <i key={color} style={{ backgroundColor: color }} />
                    ))}
                  </span>
                </div>
                <small className={styles.fit}>
                  {reasons.slice(0, 2).join(" · ")}
                </small>
              </div>
              <div className={styles.preview}>
                <div className={styles.previewToolbar}>
                  <div
                    role="group"
                    aria-label={`Preview ${preset.name} at a device size`}
                  >
                    {(["mobile", "tablet", "desktop"] as const).map(
                      (nextViewport) => (
                        <button
                          type="button"
                          key={nextViewport}
                          aria-pressed={viewport === nextViewport}
                          className={
                            viewport === nextViewport
                              ? styles.activeViewport
                              : undefined
                          }
                          onClick={() =>
                            setViewports((current) => ({
                              ...current,
                              [preset.id]: nextViewport,
                            }))
                          }
                        >
                          {nextViewport}
                        </button>
                      ),
                    )}
                  </div>
                  <button
                    type="button"
                    aria-expanded={expanded}
                    onClick={() =>
                      setExpandedId(expanded ? undefined : preset.id)
                    }
                  >
                    {expanded ? "Close full preview" : "Full preview"}
                  </button>
                </div>
                <div className={styles.previewCanvas}>
                  <RendererPreview
                    site={site}
                    path={site.pages[0]?.path ?? "/"}
                    viewport={viewport}
                    onSelectSection={() => {}}
                  />
                </div>
              </div>
              <div className={styles.actions}>
                <button
                  type="button"
                  disabled={Boolean(savingId)}
                  onClick={() => void choose(preset.id)}
                >
                  {savingId === preset.id
                    ? "Generating content and imagery…"
                    : rank === 1
                      ? "Select recommended design"
                      : "Select this design"}
                </button>
              </div>
            </article>
          );
        })}
      </section>

      <div className={styles.reviewRange}>
        Showing ranks {pageIndex * DESIGNS_PER_PAGE + 1}–
        {Math.min((pageIndex + 1) * DESIGNS_PER_PAGE, DESIGN_REVIEW_COUNT)} of{" "}
        {DESIGN_REVIEW_COUNT}
      </div>
      {gate && !gate.passed ? (
        <div className={styles.error}>
          <strong>Premium gate blocked editor entry.</strong> Score {gate.score}
          /100. Resolve the diagnostic below and retry this selection.
        </div>
      ) : null}
      {error ? <div className={styles.error}>{error}</div> : null}
    </main>
  );
}

function orderFromDraft(ranked: RankedPreset[], site?: Site): RankedPreset[] {
  const ids = site?.generation?.candidateIds;
  if (!ids?.length) return ranked;
  const byId = new Map(ranked.map((item) => [item.preset.id, item]));
  const ordered = ids
    .map((id) => byId.get(id))
    .filter((item): item is RankedPreset => Boolean(item));
  return ordered.length === ids.length ? ordered : [];
}
