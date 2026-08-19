"use client";

import { useEffect, useMemo, useState } from "react";
import type { Site } from "@micirql/schema";
import { RendererPreview } from "./renderer-preview";
import { publishReadiness } from "./publish-readiness";
import { evaluateFunctionalPublishGate } from "./functional-publish-gate";
import { repairFunctionalPublishIssues } from "./functional-publish-repair";
import { useOnboardingProfile } from "./onboarding-profile-context";

export type PublishSuccess = { versionId: string; liveUrl?: string };

type Issue = { code?: string; message: string; pagePath?: string };
type PreviewViewport = "mobile" | "tablet" | "desktop";
type ReviewBlocker = { id: string; label: string; detail: string; blocking: true; ok: false };
type PublishPayload = {
  ok?: boolean;
  version?: { versionId: string };
  liveUrl?: string;
  previousVersionId?: string;
  issues?: Issue[];
  functionalRepairs?: string[];
  repairedSite?: Site;
  draftRepairPersisted?: boolean;
  repairedDraftRevision?: number;
};

type RepairNotice = { current: PublishSuccess; repairs: string[]; repairedDraftRevision?: number };
const REPAIR_NOTICE_KEY = "micirql.publish.repair.notice";

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
  const [repairSummary, setRepairSummary] = useState<string[]>([]);
  const [repairedDraftRevision, setRepairedDraftRevision] = useState<number | undefined>();

  const readiness = useMemo(() => publishReadiness(site), [site]);
  const functionalRepairPreview = useMemo(() => repairFunctionalPublishIssues(site), [site]);
  const reviewSite = functionalRepairPreview.site;
  const functionalReadiness = useMemo(() => evaluateFunctionalPublishGate(reviewSite), [reviewSite]);
  const readinessBlockers = readiness.checks.filter((check) => check.blocking && !check.ok);
  const functionalBlockers: ReviewBlocker[] = functionalReadiness.issues.map((issue, index) => ({
    id: `functional-${issue.code}-${index}`,
    label: issue.code === "BROKEN_INTERNAL_LINK" ? "Broken internal link" : issue.code === "INVALID_ACTION" ? "Invalid action" : issue.code === "MISSING_CONTACT_PATH" ? "Contact path" : "Conversion path",
    detail: `${issue.pagePath ? `${issue.pagePath}: ` : ""}${issue.message}`,
    blocking: true,
    ok: false,
  }));
  const blockers = [...readinessBlockers, ...functionalBlockers];
  const launchReady = readiness.ready && functionalReadiness.ready;
  const destination = reviewSite.domains.find((domain) => domain.primary) ?? reviewSite.domains[0];

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(REPAIR_NOTICE_KEY);
      if (!raw) return;
      sessionStorage.removeItem(REPAIR_NOTICE_KEY);
      const notice = JSON.parse(raw) as RepairNotice;
      if (!notice?.current?.versionId || !Array.isArray(notice.repairs)) return;
      setCurrent(notice.current);
      setRepairSummary(notice.repairs);
      setRepairedDraftRevision(notice.repairedDraftRevision);
      setState("success");
    } catch {}
  }, []);

  useEffect(() => {
    if (reviewSite.pages.some((page) => page.path === pagePath)) return;
    setPagePath(reviewSite.pages[0]?.path ?? "/");
  }, [reviewSite.pages, pagePath]);

  function openReview() {
    if (state === "success" || state === "error") setState("idle");
    setIssues([]);
    setRepairSummary([]);
    setReviewOpen(true);
  }

  async function publish() {
    if (disabled || state === "publishing") return;
    if (!launchReady) {
      setIssues(functionalReadiness.issues.length
        ? functionalReadiness.issues.map((issue) => ({ code: issue.code, message: issue.message, ...(issue.pagePath ? { pagePath: issue.pagePath } : {}) }))
        : [{ message: "Resolve all launch blockers before publishing." }]);
      setState("error");
      return;
    }
    setIssues([]);
    setRepairSummary([]);
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
        headers: {
          "content-type": "application/json",
          ...(publishAccessToken() ? { Authorization: `Bearer ${publishAccessToken()}` } : {}),
        },
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
      const payload = await response.json() as PublishPayload;
      if (!response.ok || !payload.ok || !payload.version) {
        setIssues(payload.issues?.length ? payload.issues : [{ message: "Publishing failed." }]);
        setRepairSummary(payload.functionalRepairs ?? []);
        setState("error");
        return;
      }
      const success: PublishSuccess = { versionId: payload.version.versionId, ...(payload.liveUrl === undefined ? {} : { liveUrl: payload.liveUrl }) };
      setPreviousVersionId(payload.previousVersionId);
      setCurrent(success);
      setRepairSummary(payload.functionalRepairs ?? []);
      setRepairedDraftRevision(payload.repairedDraftRevision);

      if (payload.functionalRepairs?.length && payload.repairedSite && payload.draftRepairPersisted) {
        const notice: RepairNotice = {
          current: success,
          repairs: payload.functionalRepairs,
          ...(payload.repairedDraftRevision === undefined ? {} : { repairedDraftRevision: payload.repairedDraftRevision }),
        };
        sessionStorage.setItem(REPAIR_NOTICE_KEY, JSON.stringify(notice));
        window.location.reload();
        return;
      }
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
    setRepairSummary([]);
    setState("success");
  }

  const previewRepairs = functionalRepairPreview.repairs;

  return <div className="publish-controller">
    <button className="publish-button" type="button" disabled={state === "publishing" || state === "rolling-back"} onClick={openReview}>{state === "publishing" ? "Publishing…" : state === "rolling-back" ? "Rolling back…" : "Preview & publish"}</button>

    {reviewOpen ? <div className="publish-review" role="dialog" aria-modal="true" aria-label="Preview and publish website">
      <header className="publish-review-topbar">
        <div className="publish-review-title"><button type="button" onClick={() => setReviewOpen(false)} aria-label="Close preview">←</button><div><span>Final review</span><strong>{reviewSite.name}</strong></div></div>
        <div className="publish-review-pages" aria-label="Preview page">{reviewSite.pages.map((page) => <button key={page.id} type="button" className={page.path === pagePath ? "is-active" : ""} onClick={() => setPagePath(page.path)}>{page.name}</button>)}</div>
        <div className="publish-review-devices" aria-label="Preview device">{(["desktop", "tablet", "mobile"] as PreviewViewport[]).map((device) => <button key={device} type="button" className={viewport === device ? "is-active" : ""} onClick={() => setViewport(device)}>{device === "desktop" ? "Desktop" : device === "tablet" ? "Tablet" : "Mobile"}</button>)}</div>
      </header>

      <div className="publish-review-body">
        <section className={`publish-review-canvas viewport-${viewport}`}>
          <div className="publish-review-frame">
            <RendererPreview site={reviewSite} path={pagePath} viewport={viewport} onSelectSection={() => {}} />
          </div>
        </section>
        <aside className="publish-review-summary">
          <div className={`publish-review-status ${launchReady ? "is-ready" : "is-blocked"}`}><span>{launchReady ? "Ready to launch" : `${blockers.length} blocker${blockers.length === 1 ? "" : "s"}`}</span><strong>{launchReady ? "Everything required is complete." : "Finish these items before publishing."}</strong></div>
          {previewRepairs.length ? <div className="publish-review-passed"><span>MiCirql safe fixes</span>{previewRepairs.map((repair, index) => <div key={`preview-repair-${index}`}><b>↻</b><p><strong>Will be repaired automatically</strong><small>{repair}</small></p></div>)}</div> : null}
          <div className="publish-review-destination"><span>Goes live at</span><strong>{destination?.hostname ?? "MiCirql hosted URL"}</strong><small>{destination ? (destination.status === "active" && destination.sslStatus === "active" ? "Domain and SSL are active." : "Domain connection is still being completed.") : "You can connect a custom domain later."}</small></div>
          {blockers.length ? <div className="publish-review-blockers"><span>Launch blockers</span>{blockers.map((check) => <div key={check.id}><b>!</b><p><strong>{check.label}</strong><small>{check.detail}</small></p></div>)}</div> : <div className="publish-review-passed"><span>Launch checks</span>{readiness.checks.filter((check) => check.blocking).map((check) => <div key={check.id}><b>✓</b><p><strong>{check.label}</strong><small>{check.detail}</small></p></div>)}<div><b>✓</b><p><strong>Functional journey</strong><small>Primary actions, contact paths and internal destinations are valid after any safe repairs shown above.</small></p></div></div>}
          {state === "error" && issues.length ? <div className="publish-review-error" role="alert"><strong>Could not publish</strong>{issues.map((issue, index) => <span key={`${issue.code ?? "issue"}-${index}`}>{issue.pagePath ? `${issue.pagePath}: ` : ""}{issue.message}</span>)}{repairSummary.length ? <small>MiCirql identified safe repairs, but did not publish because all repaired changes could not be persisted safely.</small> : null}</div> : null}
          {state === "success" && current ? <div className="publish-review-success" role="status"><strong>Website published</strong><span>Version {current.versionId}</span>{repairSummary.length ? <span>{repairSummary.length} safe fix{repairSummary.length === 1 ? "" : "es"} saved back to the editor draft.</span> : null}{current.liveUrl ? <a href={current.liveUrl} target="_blank" rel="noreferrer">Open live website</a> : null}</div> : null}
          <div className="publish-review-actions"><button type="button" className="publish-review-secondary" onClick={() => setReviewOpen(false)}>Back to editor</button><button type="button" className="publish-review-primary" disabled={disabled || !launchReady || state === "publishing"} onClick={() => void publish()}>{state === "publishing" ? "Publishing…" : previewRepairs.length ? "Apply safe fixes & publish" : "Publish website"}</button></div>
          {!launchReady ? <small className="publish-review-hint">Return to the editor and open Publish to fix the blockers shown above.</small> : previewRepairs.length ? <small className="publish-review-hint">MiCirql will save these deterministic fixes into the draft first, then publish that exact saved version.</small> : null}
        </aside>
      </div>
    </div> : null}

    {!reviewOpen && state === "success" && current ? <div className="publish-popover is-success"><strong>Website published</strong><span>Version {current.versionId}</span>{repairSummary.length ? <span>{repairSummary.length} safe functional fix{repairSummary.length === 1 ? "" : "es"} saved to the draft{repairedDraftRevision ? ` · revision ${repairedDraftRevision}` : ""}.</span> : null}{current.liveUrl ? <a href={current.liveUrl} target="_blank" rel="noreferrer">Open live website</a> : null}{previousVersionId ? <button type="button" onClick={() => void rollback()}>Rollback previous version</button> : null}</div> : null}
    {!reviewOpen && state === "error" && issues.length ? <div className="publish-popover is-error"><strong>Could not publish</strong>{issues.map((issue, index) => <span key={`${issue.code ?? "issue"}-${index}`}>{issue.pagePath ? `${issue.pagePath}: ` : ""}{issue.message}</span>)}{repairSummary.length ? <span>Safe repairs were identified but publication remained blocked to protect draft/live consistency.</span> : null}</div> : null}
  </div>;
}

function publishAccessToken() {
  if (typeof window === "undefined") return "";
  try {
    const raw = localStorage.getItem("micirql.supabase.session");
    if (!raw) return "";
    const session = JSON.parse(raw) as { access_token?: unknown };
    return typeof session.access_token === "string" ? session.access_token.trim() : "";
  } catch {
    return "";
  }
}
