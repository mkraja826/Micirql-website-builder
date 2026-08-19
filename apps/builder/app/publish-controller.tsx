"use client";

import { useMemo, useState } from "react";
import type { Site } from "@micirql/schema";
import { RendererPreview } from "./renderer-preview";
import { publishReadiness } from "./publish-readiness";
import { useOnboardingProfile } from "./onboarding-profile-context";

export type PublishSuccess = { versionId: string; liveUrl?: string };

type Issue = { code?: string; message: string; pagePath?: string };
type PreviewViewport = "mobile" | "tablet" | "desktop";

export function PublishController({ site, disabled, ensureSaved }: {
  site: Site;
  disabled: boolean;
  ensureSaved(): Promise<boolean>;
}) {
  const profile = useOnboardingProfile();
  const [state, setState] = useState<"idle" | "publishing" | "success" | "error" | "rolling-back">("idle");
  const [issues, setIssues] = useState<Issue[]>([]);
  const [current, setCurrent] = useState<PublishSuccess | undefined>();
  const [previousVersionId, setPreviousVersionId] = useState<string | undefined>();
  const [reviewOpen, setReviewOpen] = useState(false);
  const [viewport, setViewport] = useState<PreviewViewport>("desktop");
  const [pagePath, setPagePath] = useState(site.pages[0]?.path ?? "/");
  const readiness = useMemo(() => publishReadiness(site), [site]);
  const blockers = readiness.checks.filter((check) => check.blocking && !check.ok);
  const destination = site.domains.find((domain) => domain.primary) ?? site.domains[0];

  function openReview() {
    if (state === "success" || state === "error") setState("idle");
    setIssues([]);
    setReviewOpen(true);
  }

  async function publish() {
    if (disabled || state === "publishing") return;
    setIssues([]);
    setState("publishing");
    const saved = await ensureSaved();
    if (!saved) {
      setIssues([{ message: "Save the latest draft successfully before publishing." }]);
      setState("error");
      return;
    }
    try {
      const response = await fetch("/api/publish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          site,
          createdBy: "workspace-user",
          groundingFacts: {
            businessName: profile?.business_name ?? site.name,
            industry: profile?.industry ?? site.subtype ?? null,
            subindustry: profile?.subindustry ?? site.subtype ?? null,
            location: profile?.location ?? site.seoBlueprint.targetLocations[0] ?? null,
            services: profile?.services ?? site.seoBlueprint.priorityTopics,
            goals: profile?.goals ?? [],
            notes: profile?.notes ?? null,
          },
        }),
      });
      const payload = await response.json() as { ok?: boolean; version?: { versionId: string }; liveUrl?: string; previousVersionId?: string; issues?: Issue[] };
      if (!response.ok || !payload.ok || !payload.version) {
        setIssues(payload.issues?.length ? payload.issues : [{ message: "Publishing failed." }]);
        setState("error");
        return;
      }
      setPreviousVersionId(payload.previousVersionId);
      setCurrent({ versionId: payload.version.versionId, ...(payload.liveUrl === undefined ? {} : { liveUrl: payload.liveUrl }) });
      setState("success");
    } catch (error) {
      setIssues([{ message: error instanceof Error ? error.message : "Publishing failed." }]);
      setState("error");
    }
  }

  async function rollback() {
    if (!previousVersionId || state === "rolling-back") return;
    setState("rolling-back");
    const response = await fetch("/api/publish/rollback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ siteId: site.siteId, targetVersionId: previousVersionId }),
    });
    const payload = await response.json() as { ok?: boolean; version?: { versionId: string }; liveUrl?: string; issues?: Issue[] };
    if (!response.ok || !payload.ok || !payload.version) {
      setIssues(payload.issues?.length ? payload.issues : [{ message: "Rollback failed." }]);
      setState("error");
      return;
    }
    setCurrent({ versionId: payload.version.versionId, ...(payload.liveUrl === undefined ? {} : { liveUrl: payload.liveUrl }) });
    setPreviousVersionId(undefined);
    setState("success");
  }

  return <div className="publish-controller">
    <button className="publish-button" type="button" disabled={state === "publishing" || state === "rolling-back"} onClick={openReview}>{state === "publishing" ? "Publishing…" : state === "rolling-back" ? "Rolling back…" : "Preview & publish"}</button>

    {reviewOpen ? <div className="publish-review" role="dialog" aria-modal="true" aria-label="Preview and publish website">
      <header className="publish-review-topbar">
        <div className="publish-review-title"><button type="button" onClick={() => setReviewOpen(false)} aria-label="Close preview">←</button><div><span>Final review</span><strong>{site.name}</strong></div></div>
        <div className="publish-review-pages" aria-label="Preview page">{site.pages.map((page) => <button key={page.id} type="button" className={page.path === pagePath ? "is-active" : ""} onClick={() => setPagePath(page.path)}>{page.name}</button>)}</div>
        <div className="publish-review-devices" aria-label="Preview device">{(["desktop", "tablet", "mobile"] as PreviewViewport[]).map((device) => <button key={device} type="button" className={viewport === device ? "is-active" : ""} onClick={() => setViewport(device)}>{device === "desktop" ? "Desktop" : device === "tablet" ? "Tablet" : "Mobile"}</button>)}</div>
      </header>

      <div className="publish-review-body">
        <section className={`publish-review-canvas viewport-${viewport}`}>
          <div className="publish-review-frame">
            <RendererPreview site={site} path={pagePath} viewport={viewport} onSelectSection={() => {}} />
          </div>
        </section>
        <aside className="publish-review-summary">
          <div className={`publish-review-status ${readiness.ready ? "is-ready" : "is-blocked"}`}><span>{readiness.ready ? "Ready to launch" : `${blockers.length} blocker${blockers.length === 1 ? "" : "s"}`}</span><strong>{readiness.ready ? "Everything required is complete." : "Finish these items before publishing."}</strong></div>
          <div className="publish-review-destination"><span>Goes live at</span><strong>{destination?.hostname ?? "MiCirql hosted URL"}</strong><small>{destination ? (destination.status === "active" && destination.sslStatus === "active" ? "Domain and SSL are active." : "Domain connection is still being completed.") : "You can connect a custom domain later."}</small></div>
          {blockers.length ? <div className="publish-review-blockers"><span>Launch blockers</span>{blockers.map((check) => <div key={check.id}><b>!</b><p><strong>{check.label}</strong><small>{check.detail}</small></p></div>)}</div> : <div className="publish-review-passed"><span>Launch checks</span>{readiness.checks.filter((check) => check.blocking).map((check) => <div key={check.id}><b>✓</b><p><strong>{check.label}</strong><small>{check.detail}</small></p></div>)}</div>}
          {state === "error" && issues.length ? <div className="publish-review-error" role="alert"><strong>Could not publish</strong>{issues.map((issue, index) => <span key={`${issue.code ?? "issue"}-${index}`}>{issue.pagePath ? `${issue.pagePath}: ` : ""}{issue.message}</span>)}</div> : null}
          {state === "success" && current ? <div className="publish-review-success" role="status"><strong>Website published</strong><span>Version {current.versionId}</span>{current.liveUrl ? <a href={current.liveUrl} target="_blank" rel="noreferrer">Open live website</a> : null}</div> : null}
          <div className="publish-review-actions"><button type="button" className="publish-review-secondary" onClick={() => setReviewOpen(false)}>Back to editor</button><button type="button" className="publish-review-primary" disabled={disabled || !readiness.ready || state === "publishing"} onClick={() => void publish()}>{state === "publishing" ? "Publishing…" : "Publish website"}</button></div>
          {!readiness.ready ? <small className="publish-review-hint">Return to the editor and open Publish to fix the blockers shown above.</small> : null}
        </aside>
      </div>
    </div> : null}

    {!reviewOpen && state === "success" && current ? <div className="publish-popover is-success"><strong>Website published</strong><span>Version {current.versionId}</span>{current.liveUrl ? <a href={current.liveUrl} target="_blank" rel="noreferrer">Open live website</a> : null}{previousVersionId ? <button type="button" onClick={() => void rollback()}>Rollback previous version</button> : null}</div> : null}
    {!reviewOpen && state === "error" && issues.length ? <div className="publish-popover is-error"><strong>Could not publish</strong>{issues.map((issue, index) => <span key={`${issue.code ?? "issue"}-${index}`}>{issue.pagePath ? `${issue.pagePath}: ` : ""}{issue.message}</span>)}</div> : null}
  </div>;
}
