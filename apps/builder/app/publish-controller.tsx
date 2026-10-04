"use client";

import { useState } from "react";
import type { Site } from "@micirql/schema";

export type PublishSuccess = { versionId: string; liveUrl?: string };

type Issue = { code?: string; message: string; pagePath?: string };

export function PublishController({
  site,
  disabled,
  ensureSaved,
}: {
  site: Site;
  disabled: boolean;
  ensureSaved(): Promise<boolean>;
}) {
  const [state, setState] = useState<
    "idle" | "publishing" | "success" | "error" | "rolling-back"
  >("idle");
  const [issues, setIssues] = useState<Issue[]>([]);
  const [current, setCurrent] = useState<PublishSuccess | undefined>();
  const [previousVersionId, setPreviousVersionId] = useState<
    string | undefined
  >();
  const [exporting, setExporting] = useState<"portable" | "static">();

  async function publish() {
    if (disabled || state === "publishing") return;
    setIssues([]);
    setState("publishing");
    const saved = await ensureSaved();
    if (!saved) {
      setIssues([
        { message: "Save the latest draft successfully before publishing." },
      ]);
      setState("error");
      return;
    }
    try {
      const response = await fetch("/api/publish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ site }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        version?: { versionId: string };
        liveUrl?: string;
        previousVersionId?: string;
        issues?: Issue[];
      };
      if (!response.ok || !payload.ok || !payload.version) {
        setIssues(
          payload.issues?.length
            ? payload.issues
            : [{ message: "Publishing failed." }],
        );
        setState("error");
        return;
      }
      setPreviousVersionId(payload.previousVersionId);
      setCurrent({
        versionId: payload.version.versionId,
        ...(payload.liveUrl === undefined ? {} : { liveUrl: payload.liveUrl }),
      });
      setState("success");
    } catch (error) {
      setIssues([
        {
          message:
            error instanceof Error ? error.message : "Publishing failed.",
        },
      ]);
      setState("error");
    }
  }

  async function rollback() {
    if (!previousVersionId || state === "rolling-back") return;
    setState("rolling-back");
    const response = await fetch("/api/publish/rollback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        workspaceId: site.workspaceId,
        siteId: site.siteId,
        targetVersionId: previousVersionId,
      }),
    });
    const payload = (await response.json()) as {
      ok?: boolean;
      version?: { versionId: string };
      liveUrl?: string;
      issues?: Issue[];
    };
    if (!response.ok || !payload.ok || !payload.version) {
      setIssues(
        payload.issues?.length
          ? payload.issues
          : [{ message: "Rollback failed." }],
      );
      setState("error");
      return;
    }
    setCurrent({
      versionId: payload.version.versionId,
      ...(payload.liveUrl === undefined ? {} : { liveUrl: payload.liveUrl }),
    });
    setPreviousVersionId(undefined);
    setState("success");
  }

  async function downloadExport(format: "portable" | "static") {
    if (!current || exporting) return;
    setExporting(format);
    setIssues([]);
    try {
      const query = new URLSearchParams({
        workspaceId: site.workspaceId,
        siteId: site.siteId,
        versionId: current.versionId,
        format,
      });
      const response = await fetch(`/api/publish/export?${query}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          issues?: Issue[];
        };
        setIssues(
          payload.issues?.length
            ? payload.issues
            : [{ message: `Export failed (${response.status}).` }],
        );
        setState("error");
        return;
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const disposition = response.headers.get("content-disposition") ?? "";
      const fileName =
        disposition.match(/filename="([^"]+)"/i)?.[1] ??
        `${site.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${current.versionId}.${format === "static" ? "zip" : "micirql.json"}`;
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = fileName;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      setIssues([
        {
          message: error instanceof Error ? error.message : "Export failed.",
        },
      ]);
      setState("error");
    } finally {
      setExporting(undefined);
    }
  }

  return (
    <div className="publish-controller">
      <button
        className="publish-button"
        type="button"
        disabled={
          disabled || state === "publishing" || state === "rolling-back"
        }
        onClick={() => void publish()}
      >
        {state === "publishing"
          ? "Publishing…"
          : state === "rolling-back"
            ? "Rolling back…"
            : "Publish"}
      </button>
      {state === "success" && current ? (
        <div className="publish-popover is-success">
          <strong>Website published</strong>
          <span>Version {current.versionId}</span>
          {current.liveUrl ? (
            <a href={current.liveUrl} target="_blank" rel="noreferrer">
              Open live website
            </a>
          ) : null}
          <button
            type="button"
            disabled={Boolean(exporting)}
            onClick={() => void downloadExport("portable")}
          >
            {exporting === "portable" ? "Preparing…" : "Export Site Schema"}
          </button>
          <button
            type="button"
            disabled={Boolean(exporting)}
            onClick={() => void downloadExport("static")}
          >
            {exporting === "static" ? "Preparing…" : "Export static ZIP"}
          </button>
          {previousVersionId ? (
            <button type="button" onClick={() => void rollback()}>
              Rollback previous version
            </button>
          ) : null}
        </div>
      ) : null}
      {state === "error" && issues.length ? (
        <div className="publish-popover is-error">
          <strong>Could not publish</strong>
          {issues.map((issue, index) => (
            <span key={`${issue.code ?? "issue"}-${index}`}>
              {issue.pagePath ? `${issue.pagePath}: ` : ""}
              {issue.message}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
