"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, DragEvent, MouseEvent } from "react";
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
  onInlineTextChange,
  onRequestImageChange,
  onReorderSection,
}: {
  site: Site;
  path: string;
  viewport: "mobile" | "tablet" | "desktop";
  selectedSectionId?: string;
  onSelectSection(sectionId: string): void;
  onInlineTextChange?(sectionId: string, propPath: string, value: string): void;
  onRequestImageChange?(sectionId: string, propPath: string): void;
  onReorderSection?(sectionId: string, toIndex: number): void;
}) {
  const [preview, setPreview] = useState<PreviewPayload>();
  const [status, setStatus] = useState<"rendering" | "ready" | "error">("rendering");
  const [error, setError] = useState("");
  const [draggedSectionId, setDraggedSectionId] = useState<string>();
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

  function handleSectionClick(event: MouseEvent<HTMLDivElement>, sectionId: string) {
    const target = event.target as HTMLElement;
    const inline = target.closest<HTMLElement>("[data-mi-prop-path]");
    const image = target.closest<HTMLElement>("[data-mi-image-field]");
    if (inline && onInlineTextChange) {
      event.preventDefault();
      event.stopPropagation();
      onSelectSection(sectionId);
      beginInlineEditing(inline, sectionId, onInlineTextChange);
      return;
    }
    if (image && onRequestImageChange) {
      event.preventDefault();
      event.stopPropagation();
      onSelectSection(sectionId);
      onRequestImageChange(sectionId, image.dataset.miImageField ?? "image");
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    onSelectSection(sectionId);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>, targetIndex: number) {
    event.preventDefault();
    const sectionId = draggedSectionId ?? event.dataTransfer.getData("text/mi-section-id");
    if (sectionId && onReorderSection) onReorderSection(sectionId, targetIndex);
    setDraggedSectionId(undefined);
  }

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
          {preview.sections.map((section, index) => {
            const seed = seedSectionCatalog.find((candidate) => candidate.id === section.componentId);
            if (!seed) return <div key={section.id} className="renderer-preview-state renderer-preview-error">Missing section renderer: {section.componentId}</div>;
            const selected = section.id === selectedSectionId;
            return (
              <div
                key={section.id}
                data-mi-section-id={section.id}
                data-mi-component-id={section.componentId}
                data-mi-component-version={section.componentVersion}
                className={`mi-editor-section${selected ? " mi-editor-selected" : ""}`}
                draggable={Boolean(onReorderSection)}
                onDragStart={(event) => {
                  setDraggedSectionId(section.id);
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/mi-section-id", section.id);
                }}
                onDragEnd={() => setDraggedSectionId(undefined)}
                onDragOver={(event) => { if (onReorderSection) event.preventDefault(); }}
                onDrop={(event) => handleDrop(event, index)}
                onClick={(event) => handleSectionClick(event, section.id)}
              >
                {selected ? <div className="mi-editor-canvas-toolbar"><span>Drag to move</span>{onRequestImageChange ? <button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); onRequestImageChange(section.id, "image"); }}>Replace image</button> : null}</div> : null}
                <SeedSection family={seed.family} variant={seed.variant} props={section.props as Parameters<typeof SeedSection>[0]["props"]} />
              </div>
            );
          })}
        </main>
      ) : null}
    </div>
  );
}

function beginInlineEditing(
  element: HTMLElement,
  sectionId: string,
  onChange: (sectionId: string, propPath: string, value: string) => void,
) {
  if (element.dataset.miEditing === "true") return;
  const propPath = element.dataset.miPropPath;
  if (!propPath) return;
  const original = element.innerText;
  element.dataset.miEditing = "true";
  element.contentEditable = "true";
  element.spellcheck = true;
  element.focus();
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  selection?.removeAllRanges();
  selection?.addRange(range);

  const finish = () => {
    element.removeEventListener("blur", finish);
    element.removeEventListener("keydown", keydown);
    const next = element.innerText.trim();
    element.contentEditable = "false";
    delete element.dataset.miEditing;
    if (next && next !== original) onChange(sectionId, propPath, next);
    else if (!next) element.innerText = original;
  };
  const keydown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      element.innerText = original;
      element.blur();
    }
    if (event.key === "Enter" && !event.shiftKey && !propPath.includes("description")) {
      event.preventDefault();
      element.blur();
    }
  };
  element.addEventListener("blur", finish);
  element.addEventListener("keydown", keydown);
}
