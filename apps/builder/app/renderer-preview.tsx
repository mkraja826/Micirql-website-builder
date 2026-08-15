"use client";

import { useEffect, useRef, useState } from "react";
import type { Site } from "@micirql/schema";

export function RendererPreview({
  site,
  path,
  viewport,
  selectedSectionId,
  onSelectSection,
}: {
  site: Site;
  path: string;
  viewport: "mobile" | "tablet" | "desktop";
  selectedSectionId?: string;
  onSelectSection(sectionId: string): void;
}) {
  const [html, setHtml] = useState("");
  const [status, setStatus] = useState<"rendering" | "ready" | "error">("rendering");
  const [error, setError] = useState("");
  const requestId = useRef(0);

  useEffect(() => {
    const id = ++requestId.current;
    const timer = window.setTimeout(async () => {
      setStatus("rendering");
      try {
        const response = await fetch("/api/preview", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ site, path }),
        });
        const payload = await response.json() as { ok: boolean; html?: string; issues?: Array<{ message: string }> };
        if (id !== requestId.current) return;
        if (!response.ok || !payload.ok || typeof payload.html !== "string") {
          throw new Error(payload.issues?.map((issue) => issue.message).join(" ") || `Preview failed (${response.status}).`);
        }
        setHtml(payload.html);
        setError("");
        setStatus("ready");
      } catch (caught) {
        if (id !== requestId.current) return;
        setError(caught instanceof Error ? caught.message : "Preview failed.");
        setStatus("error");
      }
    }, 120);
    return () => window.clearTimeout(timer);
  }, [site, path]);

  function handleClick(event: React.MouseEvent<HTMLDivElement>) {
    const element = event.target as HTMLElement;
    const section = element.closest<HTMLElement>("[data-mi-section-id]");
    if (!section?.dataset.miSectionId) return;
    event.preventDefault();
    onSelectSection(section.dataset.miSectionId);
  }

  return (
    <div className={`site-preview renderer-site-preview viewport-${viewport}`}>
      {status === "rendering" ? <div className="renderer-preview-state">Rendering preview…</div> : null}
      {status === "error" ? <div className="renderer-preview-state renderer-preview-error">{error}</div> : null}
      {status === "ready" ? (
        <div
          className="renderer-preview-document"
          data-selected-section={selectedSectionId ?? ""}
          onClick={handleClick}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : null}
    </div>
  );
}
