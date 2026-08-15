"use client";

import { useState } from "react";
import type { Site } from "@micirql/schema";

export type PublishSuccess = { versionId: string; liveUrl?: string };

type Issue = { code?: string; message: string; pagePath?: string };

export function PublishController({ site, disabled, ensureSaved }: {
  site: Site;
  disabled: boolean;
  ensureSaved(): Promise<boolean>;
}) {
  const [state, setState] = useState<"idle" | "publishing" | "success" | "error" | "rolling-back">("idle");
  const [issues, setIssues] = useState<Issue[]>([]);
  const [current, setCurrent] = useState<PublishSuccess | undefined>();
  const [previousVersionId, setPreviousVersionId] = useState<string | undefined>();

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
        body: JSON.stringify({ site, createdBy: "workspace-user" }),
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
    <button className="publish-button" type="button" disabled={disabled || state === "publishing" || state === "rolling-back"} onClick={() => void publish()}>{state === "publishing" ? "Publishing…" : state === "rolling-back" ? "Rolling back…" : "Publish"}</button>
    {state === "success" && current ? <div className="publish-popover is-success"><strong>Website published</strong><span>Version {current.versionId}</span>{current.liveUrl ? <a href={current.liveUrl} target="_blank" rel="noreferrer">Open live website</a> : null}{previousVersionId ? <button type="button" onClick={() => void rollback()}>Rollback previous version</button> : null}</div> : null}
    {state === "error" && issues.length ? <div className="publish-popover is-error"><strong>Could not publish</strong>{issues.map((issue, index) => <span key={`${issue.code ?? "issue"}-${index}`}>{issue.pagePath ? `${issue.pagePath}: ` : ""}{issue.message}</span>)}</div> : null}
  </div>;
}