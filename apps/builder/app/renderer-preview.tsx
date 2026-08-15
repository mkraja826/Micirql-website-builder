"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { Site } from "@micirql/schema";
import { SeedSection, seedSectionCatalog } from "@micirql/sections";

type PreviewSection = {
  id: string;
  componentId: string;
  componentVersion: string;
  props: Record<string, unknown>;
};

type PreviewPayload = {
  ok: boolean;
  siteId?: string;
  pageId?: string;
  theme?: string;
  themeStyle?: Record<string, string>;
  sections?: PreviewSection[];
  issues?: Array<{ message: string }>;
};

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
  const [preview, setPreview] = useState<PreviewPayload>();
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
        const payload = await response.json() as PreviewPayload;
        if (id !== requestId.current) return;
        if (!response.ok || !payload.ok || !Array.isArray(payload.sections)) {
          throw new Error(payload.issues?.map((issue) => issue.message).join(" ") || `Preview failed (${response.status}).`);
        }
        setPreview(payload);
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

  return (
    <div className={`site-preview renderer-site-preview viewport-${viewport}`}>
      {status === "rendering" ? <div className="renderer-preview-state">Rendering preview…</div> : null}
      {status === "error" ? <div className="renderer-preview-state renderer-preview-error">{error}</div> : null}
      {status === "ready" && preview?.sections ? (
        <main
          className="renderer-preview-document"
          data-mi-site={preview.siteId}
          data-mi-page={preview.pageId}
          data-mi-theme={preview.theme}
          style={(preview.themeStyle ?? {}) as CSSProperties}
        >
          {preview.sections.map((section) => {
            const seed = seedSectionCatalog.find((candidate) => candidate.id === section.componentId);
            if (!seed) return <div key={section.id} className="renderer-preview-state renderer-preview-error">Missing section renderer: {section.componentId}</div>;
            const selected = section.id === selectedSectionId;
            return (
              <div
                key={section.id}
                data-mi-section-id={section.id}
                data-mi-component-id={section.componentId}
                data-mi-component-version={section.componentVersion}
                className={selected ? "mi-editor-selected" : undefined}
                onClick={(event) => { event.preventDefault(); event.stopPropagation(); onSelectSection(section.id); }}
              >
                <SeedSection family={seed.family} variant={seed.variant} props={section.props as Parameters<typeof SeedSection>[0]["props"]} />
              </div>
            );
          })}
        </main>
      ) : null}
    </div>
  );
}
