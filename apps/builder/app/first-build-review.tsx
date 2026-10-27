"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  siteSchema,
  type CompositionGateReport,
  type Site,
} from "@micirql/schema";
import type { SupabaseSession } from "./auth-client";
import { resolveCertifiedIndustryPackRuntimeForSite } from "./industry-packs";
import { type OnboardingProfile, type RankedPreset } from "./preset-ranking";
import { ProductBrand } from "./product-brand";
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
  const [focusedIds, setFocusedIds] = useState<Record<number, string>>({});
  const [viewports, setViewports] = useState<Record<string, ReviewViewport>>(
    {},
  );
  const [defaultViewport, setDefaultViewport] =
    useState<ReviewViewport>("desktop");
  const [previewPaths, setPreviewPaths] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = useState<string>();
  const [error, setError] = useState("");
  const [gate, setGate] = useState<CompositionGateReport>();
  const expandedCardRef = useRef<HTMLElement | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const industryRuntime = useMemo(
    () =>
      draft
        ? resolveCertifiedIndustryPackRuntimeForSite({
            domain: draft.snapshot.domain,
            subtype: draft.snapshot.subtype ?? null,
          })
        : undefined,
    [draft],
  );
  const ranked = useMemo<RankedPreset[]>(
    () =>
      industryRuntime
        ? industryRuntime
            .rankCandidates({
              ...profile,
              industryFacts:
                draft?.snapshot.generation?.industryFacts ??
                profile.industryFacts,
            })
            .map(({ candidate, ...ranking }) => ({
              preset: candidate,
              ...ranking,
            }))
        : [],
    [draft?.snapshot.generation?.industryFacts, industryRuntime, profile],
  );
  const reviewCount = industryRuntime?.pack.reviewCount ?? 0;
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
    if (!draft || !industryRuntime) return [];
    return visibleRanked.map((item) => {
      const composed = industryRuntime.applyCandidate(
        draft.snapshot,
        item.preset.id,
      );
      if (composed.generation) {
        composed.generation = {
          ...composed.generation,
          selectedCandidateId: item.preset.id,
        };
      }
      return {
        ...item,
        site: industryRuntime.applyContentHygiene(composed).site,
      };
    });
  }, [draft, industryRuntime, visibleRanked]);
  const focusedChoice =
    choices.find(({ preset }) => preset.id === focusedIds[pageIndex]) ??
    choices[0];

  useEffect(() => {
    const updateDefaultViewport = () => {
      setDefaultViewport(
        window.innerWidth <= 640
          ? "mobile"
          : window.innerWidth <= 1100
            ? "tablet"
            : "desktop",
      );
    };
    updateDefaultViewport();
    window.addEventListener("resize", updateDefaultViewport);
    return () => window.removeEventListener("resize", updateDefaultViewport);
  }, []);

  useEffect(() => {
    if (!expandedId) return;
    const previous = document.body.style.overflow;
    const card = expandedCardRef.current;
    returnFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const focusable = () =>
      Array.from(
        card?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((element) => element.getClientRects().length > 0);
    const handleKeyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setExpandedId(undefined);
        return;
      }
      if (event.key !== "Tab") return;
      const elements = focusable();
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (!first || !last) {
        event.preventDefault();
        return;
      }
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyboard);
    const focusFrame = window.requestAnimationFrame(() => {
      card
        ?.querySelector<HTMLElement>('[data-full-preview-close="true"]')
        ?.focus();
    });
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", handleKeyboard);
      returnFocusRef.current?.focus();
      returnFocusRef.current = null;
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
        code?: string;
        draft?: DraftRecord;
        gate?: CompositionGateReport;
      };
      if (response.status === 409 || payload.code === "REVISION_CONFLICT") {
        const query = new URLSearchParams({ workspaceId, siteId });
        const latestResponse = await fetch("/api/drafts?" + query, {
          headers: { Authorization: "Bearer " + session.access_token },
          cache: "no-store",
        });
        const latestPayload = (await latestResponse.json()) as {
          draft?: DraftRecord;
        };
        if (latestResponse.ok && latestPayload.draft) {
          setDraft({
            ...latestPayload.draft,
            snapshot: siteSchema.parse(latestPayload.draft.snapshot),
          });
        }
        throw new Error(
          "This website changed in another session. We reloaded the latest version—review the direction, then try again.",
        );
      }
      if (payload.draft) {
        setDraft({
          ...payload.draft,
          snapshot: siteSchema.parse(payload.draft.snapshot),
        });
      }
      if (payload.gate) setGate(payload.gate);
      if (!response.ok || !payload.ok) {
        throw new Error(
          selectionFailureMessage(response.status, payload.code, payload.gate),
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

  if (!draft)
    return (
      <ReviewStatus
        alert={Boolean(error)}
        kicker="Certified design review"
        message={
          error || "Loading the factual scaffold and ranked design directions…"
        }
        title="Preparing your industry-specific designs."
      />
    );

  if (!industryRuntime || ordered.length !== reviewCount) {
    return (
      <ReviewStatus
        kicker="Industry pack status"
        message="MiCirql will not fill this review with another industry’s designs, cross-industry layouts or simple recolors. This brief can continue when its own component pack has passed certification."
        title="This industry pack is not certified yet."
      />
    );
  }

  const focusedRank = focusedChoice
    ? ordered.findIndex(({ preset }) => preset.id === focusedChoice.preset.id) +
      1
    : 0;
  const focusedViewport = focusedChoice
    ? (viewports[focusedChoice.preset.id] ?? defaultViewport)
    : defaultViewport;
  const focusedPreviewPath = focusedChoice
    ? (previewPaths[focusedChoice.preset.id] ??
      focusedChoice.site.pages[0]?.path ??
      "/")
    : "/";
  const expanded = expandedId === focusedChoice?.preset.id;

  return (
    <main className={styles.shell}>
      <div className={styles.frame}>
        <header
          aria-hidden={expandedId ? true : undefined}
          className={styles.productHeader}
          inert={expandedId ? true : undefined}
        >
          <ProductBrand />
          <span className={styles.draftStatus}>Design review</span>
        </header>

        <section
          aria-hidden={expandedId ? true : undefined}
          className={styles.intro}
          data-design-review-intro
          inert={expandedId ? true : undefined}
        >
          <span className={styles.eyebrow}>
            Certified {industryRuntime.pack.label} · Step 2 of 3
          </span>
          <h1>
            Choose the structure that feels right for {draft.snapshot.name}.
          </h1>
          <p>
            MiCirql ranked {reviewCount} certified directions using the goals,
            required capabilities and visual preferences in the saved brief. The
            ranking is a starting point—you can choose any direction.
          </p>
          <div className={styles.reviewFacts} aria-label="Review safeguards">
            <span>
              <strong>{reviewCount}</strong> certified directions
            </span>
            <span>
              <strong>{DESIGNS_PER_PAGE}</strong> directions per group
            </span>
            <span>
              <strong>Exact</strong> facts &amp; brand
            </span>
          </div>
          <ol
            className={styles.progress}
            aria-label="Website creation progress"
          >
            <li className={styles.completeStep}>
              <span aria-hidden="true">✓</span>
              <strong>Business brief</strong>
            </li>
            <li className={styles.currentStep} aria-current="step">
              <span>02</span>
              <strong>Choose direction</strong>
            </li>
            <li>
              <span>03</span>
              <strong>Edit &amp; publish</strong>
            </li>
          </ol>
          {qualityWarnings?.length ? (
            <div className={styles.warning} role="status">
              <strong>Brief review note</strong>
              <span>{qualityWarnings.join(" ")}</span>
            </div>
          ) : null}
        </section>

        <div className={styles.reviewBody} aria-busy={Boolean(savingId)}>
          {savingId ? (
            <div
              className={styles.selectionStatus}
              role="status"
              aria-live="polite"
            >
              <span className={styles.statusSpinner} aria-hidden="true" />
              <div>
                <strong>Preparing the selected direction</strong>
                <span>
                  Adding approved copy and imagery, then running quality checks.
                  Nothing is published yet.
                </span>
              </div>
            </div>
          ) : null}
          {gate && !gate.passed ? (
            <section className={styles.error} role="alert">
              <strong>This direction needs another quality pass.</strong>
              <p>
                Nothing was published. You can retry this direction or choose a
                different one.
              </p>
            </section>
          ) : null}
          {error ? (
            <div className={styles.error} role="alert">
              {error}
            </div>
          ) : null}

          <div
            aria-hidden={expanded ? true : undefined}
            className={styles.comparisonControls}
            inert={expanded ? true : undefined}
          >
            <div className={styles.comparisonHeading}>
              <div>
                <span>Compare certified directions</span>
                <strong>Choose one to inspect at full size</strong>
              </div>
              <p>
                Rank measures brief fit, not design quality. Your approved
                facts, navigation and brand inputs stay fixed in every option.
              </p>
            </div>

            <ReviewPagination
              ariaLabel="Design review pages"
              disabled={Boolean(savingId)}
              pageCount={pageCount}
              pageIndex={pageIndex}
              reviewCount={reviewCount}
              onPageChange={setPageIndex}
            />
          </div>

          {focusedChoice ? (
            <section
              aria-label={`Ranked ${industryRuntime.pack.label} design directions`}
              className={styles.comparisonWorkspace}
            >
              <aside
                aria-hidden={expanded ? true : undefined}
                className={styles.directionRail}
                inert={expanded ? true : undefined}
              >
                <div className={styles.railHeading}>
                  <span>
                    Ranks {pageIndex * DESIGNS_PER_PAGE + 1}–
                    {Math.min((pageIndex + 1) * DESIGNS_PER_PAGE, reviewCount)}
                  </span>
                  <strong>Directions in this group</strong>
                </div>
                <ol className={styles.directionList}>
                  {choices.map(({ preset, site }, visibleIndex) => {
                    const rank =
                      pageIndex * DESIGNS_PER_PAGE + visibleIndex + 1;
                    const active = preset.id === focusedChoice.preset.id;
                    return (
                      <li key={preset.id}>
                        <button
                          aria-controls="focused-design-preview"
                          aria-pressed={active}
                          className={`${styles.directionOption} ${
                            active ? styles.activeDirection : ""
                          }`}
                          data-candidate-id={preset.id}
                          data-candidate-rank={rank}
                          disabled={Boolean(savingId)}
                          onClick={() =>
                            setFocusedIds((current) => ({
                              ...current,
                              [pageIndex]: preset.id,
                            }))
                          }
                          type="button"
                        >
                          <span className={styles.optionRank}>
                            {rank === 1 ? "Recommended" : `Rank ${rank}`}
                          </span>
                          <strong>{preset.name}</strong>
                          <span className={styles.optionDescription}>
                            {preset.description}
                          </span>
                          <span className={styles.optionMeta}>
                            <span>{site.theme.family.replace(/-/g, " ")}</span>
                            <span>{site.theme.brand.density}</span>
                            <span
                              className={styles.optionSwatches}
                              aria-hidden="true"
                            >
                              {[
                                site.theme.brand.colors.primary,
                                site.theme.brand.colors.secondary,
                                site.theme.brand.colors.accent,
                              ].map((color) => (
                                <i
                                  key={color}
                                  style={{ backgroundColor: color }}
                                />
                              ))}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </aside>

              {expanded ? (
                <div
                  aria-hidden="true"
                  className={styles.modalBackdrop}
                  onMouseDown={() => setExpandedId(undefined)}
                />
              ) : null}

              <article
                aria-describedby={`design-description-${focusedChoice.preset.id}`}
                aria-labelledby={`design-title-${focusedChoice.preset.id}`}
                aria-modal={expanded ? true : undefined}
                className={`${styles.focusedPanel} ${
                  focusedRank === 1 ? styles.recommendedPanel : ""
                } ${expanded ? styles.expandedPanel : ""}`}
                data-active-candidate-id={focusedChoice.preset.id}
                id="focused-design-preview"
                ref={expanded ? expandedCardRef : undefined}
                role={expanded ? "dialog" : undefined}
              >
                <header className={styles.focusedHeader}>
                  <div className={styles.focusedTitle}>
                    <span className={styles.badge}>
                      {focusedRank === 1
                        ? "Recommended for your brief"
                        : `Brief fit · Rank ${focusedRank}`}
                    </span>
                    <div>
                      <h2 id={`design-title-${focusedChoice.preset.id}`}>
                        {focusedChoice.preset.name}
                      </h2>
                      <p id={`design-description-${focusedChoice.preset.id}`}>
                        {focusedChoice.preset.description}
                      </p>
                    </div>
                  </div>
                  <div className={styles.fitPanel}>
                    <strong>Why MiCirql recommends it</strong>
                    <ul>
                      {recommendationReasons(focusedChoice.reasons).map(
                        (reason) => (
                          <li key={reason}>{reason}</li>
                        ),
                      )}
                    </ul>
                  </div>
                  <div
                    className={styles.signature}
                    aria-label={`${focusedChoice.site.theme.family} design system, ${focusedChoice.preset.typographyStrategy} typography, ${focusedChoice.site.theme.brand.density} density`}
                  >
                    <span
                      className={styles.typeSample}
                      style={{
                        fontFamily:
                          focusedChoice.site.theme.brand.typography.display,
                      }}
                    >
                      Aa
                    </span>
                    <span>
                      {focusedChoice.site.theme.family.replace(/-/g, " ")}
                    </span>
                    <span>
                      {focusedChoice.preset.typographyStrategy.replace(
                        /-/g,
                        " ",
                      )}
                    </span>
                    <span>{focusedChoice.site.theme.brand.density}</span>
                    <span>
                      {focusedChoice.preset.imageStrategy.replace(/-/g, " ")}
                    </span>
                  </div>
                </header>

                <div className={styles.preview}>
                  <div className={styles.previewToolbar}>
                    <label className={styles.pagePicker}>
                      <span>Preview page</span>
                      <select
                        aria-label={`Preview page for ${focusedChoice.preset.name}`}
                        disabled={Boolean(savingId)}
                        value={focusedPreviewPath}
                        onChange={(event) =>
                          setPreviewPaths((current) => ({
                            ...current,
                            [focusedChoice.preset.id]: event.target.value,
                          }))
                        }
                      >
                        {focusedChoice.site.pages.map((page) => (
                          <option key={page.id} value={page.path}>
                            {page.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div
                      className={styles.deviceControls}
                      role="group"
                      aria-label={`Preview ${focusedChoice.preset.name} at a device size`}
                    >
                      {(["mobile", "tablet", "desktop"] as const).map(
                        (nextViewport) => (
                          <button
                            aria-label={`${sentenceCase(nextViewport)} preview`}
                            aria-pressed={focusedViewport === nextViewport}
                            className={
                              focusedViewport === nextViewport
                                ? styles.activeViewport
                                : undefined
                            }
                            disabled={Boolean(savingId)}
                            key={nextViewport}
                            onClick={() =>
                              setViewports((current) => ({
                                ...current,
                                [focusedChoice.preset.id]: nextViewport,
                              }))
                            }
                            type="button"
                          >
                            {sentenceCase(nextViewport)}
                          </button>
                        ),
                      )}
                    </div>
                    <button
                      aria-expanded={expanded}
                      className={styles.fullPreviewButton}
                      data-full-preview-close={expanded ? "true" : undefined}
                      disabled={Boolean(savingId)}
                      onClick={() =>
                        setExpandedId(
                          expanded ? undefined : focusedChoice.preset.id,
                        )
                      }
                      type="button"
                    >
                      {expanded ? "Close preview" : "Open full preview"}
                    </button>
                  </div>
                  <div
                    aria-label={`Scrollable website preview for ${focusedChoice.preset.name}`}
                    className={styles.previewCanvas}
                    role="region"
                    tabIndex={0}
                  >
                    <RendererPreview
                      onSelectSection={() => {}}
                      path={focusedPreviewPath}
                      reviewMode
                      site={focusedChoice.site}
                      viewport={focusedViewport}
                    />
                  </div>
                </div>

                <footer className={styles.actions}>
                  <div>
                    <strong>Use {focusedChoice.preset.name}</strong>
                    <span>
                      Exact facts, navigation and supplied brand assets remain
                      unchanged. Nothing is published yet.
                    </span>
                  </div>
                  <button
                    disabled={Boolean(savingId)}
                    onClick={() => void choose(focusedChoice.preset.id)}
                    type="button"
                  >
                    {savingId === focusedChoice.preset.id
                      ? "Building your website…"
                      : focusedRank === 1
                        ? "Choose recommended direction"
                        : "Use this direction"}
                    <span aria-hidden="true">→</span>
                  </button>
                </footer>
              </article>
            </section>
          ) : null}
        </div>
      </div>
    </main>
  );
}

function ReviewPagination({
  ariaLabel,
  disabled,
  pageCount,
  pageIndex,
  reviewCount,
  onPageChange,
}: {
  ariaLabel: string;
  disabled: boolean;
  pageCount: number;
  pageIndex: number;
  reviewCount: number;
  onPageChange(index: number): void;
}) {
  return (
    <nav className={styles.pagination} aria-label={ariaLabel}>
      <button
        disabled={pageIndex === 0 || disabled}
        onClick={() => onPageChange(Math.max(0, pageIndex - 1))}
        type="button"
      >
        <span aria-hidden="true">←</span> Previous
      </button>
      <div>
        {Array.from({ length: pageCount }, (_, index) => (
          <button
            aria-current={index === pageIndex ? "page" : undefined}
            aria-label={`Show design ranks ${index * DESIGNS_PER_PAGE + 1} to ${Math.min((index + 1) * DESIGNS_PER_PAGE, reviewCount)}`}
            className={index === pageIndex ? styles.activePage : undefined}
            disabled={disabled}
            key={index}
            onClick={() => onPageChange(index)}
            type="button"
          >
            {index * DESIGNS_PER_PAGE + 1}–
            {Math.min((index + 1) * DESIGNS_PER_PAGE, reviewCount)}
          </button>
        ))}
      </div>
      <button
        disabled={pageIndex >= pageCount - 1 || disabled}
        onClick={() => onPageChange(Math.min(pageCount - 1, pageIndex + 1))}
        type="button"
      >
        Next <span aria-hidden="true">→</span>
      </button>
    </nav>
  );
}

function ReviewStatus({
  alert,
  kicker,
  message,
  title,
}: {
  alert?: boolean;
  kicker: string;
  message: string;
  title: string;
}) {
  return (
    <main className={styles.shell}>
      <div className={styles.statusFrame}>
        <header className={styles.productHeader}>
          <ProductBrand />
          <span className={styles.draftStatus}>Design review</span>
        </header>
        <section
          className={styles.statusCard}
          role={alert ? "alert" : "status"}
        >
          <span className={styles.eyebrow}>{kicker}</span>
          <h1>{title}</h1>
          <p>{message}</p>
        </section>
      </div>
    </main>
  );
}

function recommendationReasons(reasons: string[]) {
  const useful = reasons.filter((reason) => !/^Certified\b/i.test(reason));
  return (useful.length ? useful : reasons).slice(0, 3);
}

function sentenceCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function selectionFailureMessage(
  status: number,
  code?: string,
  gate?: CompositionGateReport,
) {
  if (status === 401)
    return "Your session ended before the direction could be saved. Sign in again, then retry.";
  if (status === 403)
    return "This website could not be opened with the current account. Return to projects and open it again.";
  if (code === "PREMIUM_GATE_FAILED" || (gate && !gate.passed))
    return "MiCirql could not complete the quality checks for this direction. Nothing was published; retry or choose another direction.";
  if (status >= 500)
    return "MiCirql could not finish this direction right now. Your draft is safe; please retry.";
  return "This direction could not be prepared. Your draft is safe; retry or choose another direction.";
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
