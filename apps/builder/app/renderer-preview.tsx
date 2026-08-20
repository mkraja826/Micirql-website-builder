"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import type { CSSProperties, DragEvent, MouseEvent } from "react";
import type { Site } from "@micirql/schema";
import { installGalleryLightboxes, SeedSection, seedSectionCatalog, sectionDesignId, type SectionFamily } from "@micirql/sections";
import { persistedFirstScreenRepairCss } from "./persisted-first-screen-repair";

type PreviewSection = {
  id: string;
  componentId: string;
  componentVersion: string;
  props: Record<string, unknown>;
};

type PreviewPayload = {
  ok: boolean;
  siteId?: string;
  pageId?: string | undefined;
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
  onRequestDesignChange,
  onRequestCopyEdit,
  onRequestMove,
  onRequestVisibility,
  onRequestAddSection,
  onReorderSection,
}: {
  site: Site;
  path: string;
  viewport: "mobile" | "tablet" | "desktop";
  selectedSectionId?: string;
  onSelectSection(sectionId: string): void;
  onInlineTextChange?(sectionId: string, propPath: string, value: string): void;
  onRequestImageChange?(sectionId: string, propPath: string): void;
  onRequestDesignChange?(sectionId: string): void;
  onRequestCopyEdit?(sectionId: string): void;
  onRequestMove?(sectionId: string, direction: "up" | "down"): void;
  onRequestVisibility?(sectionId: string, hidden: boolean): void;
  onRequestAddSection?(afterSectionId?: string): void;
  onReorderSection?(sectionId: string, toIndex: number): void;
}) {
  const [preview, setPreview] = useState<PreviewPayload>(() => localPreview(site, path));
  const [status, setStatus] = useState<"rendering" | "ready" | "error">("ready");
  const [error, setError] = useState("");
  const [draggedSectionId, setDraggedSectionId] = useState<string>();
  const [dropIndex, setDropIndex] = useState<number>();
  const requestId = useRef(0);
  const previewRoot = useRef<HTMLElement>(null);
  const repairCss = persistedFirstScreenRepairCss(site, viewport, path);

  useEffect(() => {
    const id = ++requestId.current;
    setPreview(localPreview(site, path));
    setStatus("ready");
    const timer = window.setTimeout(async () => {
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
        setPreview(localPreview(site, path));
        setError(caught instanceof Error ? caught.message : "Preview failed.");
        setStatus("ready");
      }
    }, 120);
    return () => window.clearTimeout(timer);
  }, [site, path]);

  useEffect(() => {
    const root = previewRoot.current;
    if (!root) return;
    return installGalleryLightboxes(root);
  }, [preview]);

  function handleSectionClick(event: MouseEvent<HTMLDivElement>, sectionId: string) {
    const target = event.target as HTMLElement;
    if (target.closest("[data-mi-canvas-action]")) return;
    if (target.closest("[data-mi-gallery-open],[data-mi-gallery-lightbox]")) return;
    const inline = target.closest<HTMLElement>("[data-mi-prop-path]");
    const image = target.closest<HTMLElement>("[data-mi-image-field]");
    if (inline && onInlineTextChange) {
      event.preventDefault(); event.stopPropagation(); onSelectSection(sectionId); beginInlineEditing(inline, sectionId, onInlineTextChange); return;
    }
    if (image && onRequestImageChange) {
      event.preventDefault(); event.stopPropagation(); onSelectSection(sectionId); onRequestImageChange(sectionId, image.dataset.miImageField ?? "image"); return;
    }
    event.preventDefault(); event.stopPropagation(); onSelectSection(sectionId);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>, targetIndex: number) {
    event.preventDefault();
    const sectionId = draggedSectionId ?? event.dataTransfer.getData("text/mi-section-id");
    if (sectionId && onReorderSection) onReorderSection(sectionId, targetIndex);
    setDraggedSectionId(undefined); setDropIndex(undefined);
  }

  function runAction(event: MouseEvent<HTMLButtonElement>, action: () => void) {
    event.preventDefault(); event.stopPropagation(); action();
  }

  function insertionZone(afterSectionId: string | undefined, index: number) {
    if (!onRequestAddSection && !onReorderSection) return null;
    return <div
      className={`mi-editor-insert-zone${dropIndex === index ? " is-drop-target" : ""}`}
      data-mi-canvas-action="insert-zone"
      onDragOver={(event) => { if (onReorderSection) { event.preventDefault(); setDropIndex(index); } }}
      onDragLeave={() => { if (dropIndex === index) setDropIndex(undefined); }}
      onDrop={(event) => handleDrop(event, index)}
    >
      <span className="mi-editor-insert-line" />
      {onRequestAddSection ? <button type="button" data-mi-canvas-action="add-section" onClick={(event) => runAction(event, () => onRequestAddSection(afterSectionId))}>+ Add section</button> : null}
      {dropIndex === index ? <em>Drop section here</em> : null}
    </div>;
  }

  return (
    <div className={`site-preview renderer-site-preview viewport-${viewport}`}>
      {status === "rendering" ? <div className="renderer-preview-state">Rendering preview…</div> : null}
      {status === "error" ? <div className="renderer-preview-state renderer-preview-error">{error}</div> : null}
      {status === "ready" && preview?.sections ? (
        <main ref={previewRoot} className="renderer-preview-document" data-mi-site={preview.siteId} data-mi-page={preview.pageId} data-mi-theme={preview.theme} data-mi-first-screen-repair={repairCss ? "1" : undefined} style={(preview.themeStyle ?? {}) as CSSProperties}>
          {repairCss ? <style data-mi-persisted-first-screen-repair>{repairCss}</style> : null}
          {insertionZone(undefined, 0)}
          {preview.sections.map((section, index) => {
            const seed = seedSectionCatalog.find((candidate) => candidate.id === section.componentId);
            if (!seed) return <div key={section.id} className="renderer-preview-state renderer-preview-error">Missing section renderer: {section.componentId}</div>;
            const selected = section.id === selectedSectionId;
            const globalShell = seed.family === "navbar" || seed.family === "footer";
            const sourceSection = site.pages.find((page) => page.path === path)?.sections.find((candidate) => candidate.id === section.id);
            const hidden = sourceSection?.hidden ?? false;
            return <Fragment key={section.id}>
              <div
                data-mi-section-id={section.id}
                data-mi-component-id={section.componentId}
                data-mi-component-version={section.componentVersion}
                data-mi-global-section={globalShell ? "true" : undefined}
                className={`mi-editor-section${selected ? " mi-editor-selected" : ""}${hidden ? " mi-editor-hidden" : ""}${globalShell ? " mi-editor-global-section" : ""}`}
                draggable={Boolean(onReorderSection && !globalShell)}
                onDragStart={(event) => { if (globalShell) { event.preventDefault(); return; } setDraggedSectionId(section.id); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/mi-section-id", section.id); }}
                onDragEnd={() => { setDraggedSectionId(undefined); setDropIndex(undefined); }}
                onClick={(event) => handleSectionClick(event, section.id)}
              >
                {selected ? <div className="mi-editor-canvas-toolbar" data-mi-canvas-action="toolbar">
                  {!globalShell ? <span className="mi-editor-drag-handle" title="Drag section" aria-hidden="true">⋮⋮</span> : null}
                  <span className="mi-editor-canvas-label">{seed.family}{globalShell ? " · Global" : ""}</span>
                  <div className="mi-editor-canvas-actions">
                    {onRequestDesignChange ? <button type="button" data-mi-canvas-action="design" onClick={(event) => runAction(event, () => onRequestDesignChange(section.id))}>Replace design</button> : null}
                    {onRequestCopyEdit ? <button type="button" data-mi-canvas-action="copy" onClick={(event) => runAction(event, () => onRequestCopyEdit(section.id))}>Edit copy</button> : null}
                    {onRequestImageChange && !globalShell ? <button type="button" data-mi-canvas-action="image" onClick={(event) => runAction(event, () => onRequestImageChange(section.id, "image"))}>Change image</button> : null}
                    {onRequestMove && !globalShell ? <span className="mi-editor-move-actions"><button type="button" title="Move section up" aria-label="Move section up" data-mi-canvas-action="move-up" disabled={index === 0} onClick={(event) => runAction(event, () => onRequestMove(section.id, "up"))}>↑</button><button type="button" title="Move section down" aria-label="Move section down" data-mi-canvas-action="move-down" disabled={index === preview.sections!.length - 1} onClick={(event) => runAction(event, () => onRequestMove(section.id, "down"))}>↓</button></span> : null}
                    {onRequestVisibility && !globalShell ? <button type="button" className="is-muted" data-mi-canvas-action="visibility" onClick={(event) => runAction(event, () => onRequestVisibility(section.id, !hidden))}>{hidden ? "Show" : "Hide"}</button> : null}
                  </div>
                </div> : null}
                <SeedSection family={seed.family} variant={seed.variant} props={section.props as Parameters<typeof SeedSection>[0]["props"]} />
              </div>
              {insertionZone(section.id, index + 1)}
            </Fragment>;
          })}
          {error ? <div className="renderer-preview-warning" role="status">Using local preview while the server preview reconnects.</div> : null}
        </main>
      ) : null}
    </div>
  );
}

function localPreview(site: Site, path: string): PreviewPayload {
  const page = site.pages.find((candidate) => candidate.path === path) ?? site.pages[0];
  const sections: PreviewSection[] = (page?.sections ?? []).map((section) => {
    let componentId = section.component.componentId;
    if (!seedSectionCatalog.some((candidate) => candidate.id === componentId)) {
      const family = legacyFamily(componentId);
      if (family) componentId = sectionDesignId(site.theme.family, family, 1);
    }
    return {
      id: section.id,
      componentId,
      componentVersion: section.component.version,
      props: normalizeLocalProps(section.props as Record<string, unknown>),
    };
  });
  const colors = site.theme.brand.colors;
  return {
    ok: true,
    siteId: site.siteId,
    pageId: page?.id,
    theme: site.theme.family,
    themeStyle: {
      "--mi-primary": colors.primary,
      "--mi-secondary": colors.secondary,
      "--mi-accent": colors.accent,
      "--mi-background": colors.background,
      "--mi-surface": colors.surface,
      "--mi-text-primary": colors.textPrimary,
      "--mi-text-secondary": colors.textSecondary,
      "--mi-border": colors.border,
    },
    sections,
  };
}

function legacyFamily(componentId: string): SectionFamily | undefined {
  const value = componentId.toLowerCase();
  const families: SectionFamily[] = ["navbar", "hero", "about", "services", "features", "process", "testimonials", "gallery", "team", "cta", "contact", "footer"];
  return families.find((family) => value === `${family}.placeholder` || value.startsWith(`${family}.`));
}

function normalizeLocalProps(props: Record<string, unknown>) {
  const title = stringValue(props.title) ?? stringValue(props.heading) ?? "Untitled section";
  const description = stringValue(props.description) ?? stringValue(props.body);
  return { ...props, title, ...(description ? { description } : {}) };
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function beginInlineEditing(element: HTMLElement, sectionId: string, onChange: (sectionId: string, propPath: string, value: string) => void) {
  if (element.dataset.miEditing === "true") return;
  const propPath = element.dataset.miPropPath; if (!propPath) return;
  const original = element.innerText;
  element.dataset.miEditing = "true"; element.contentEditable = "true"; element.spellcheck = true; element.focus();
  const selection = window.getSelection(); const range = document.createRange(); range.selectNodeContents(element); range.collapse(false); selection?.removeAllRanges(); selection?.addRange(range);
  const finish = () => { element.removeEventListener("blur", finish); element.removeEventListener("keydown", keydown); const next = element.innerText.trim(); element.contentEditable = "false"; delete element.dataset.miEditing; if (next && next !== original) onChange(sectionId, propPath, next); else if (!next) element.innerText = original; };
  const keydown = (event: KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); element.innerText = original; element.blur(); } if (event.key === "Enter" && !event.shiftKey && !propPath.includes("description")) { event.preventDefault(); element.blur(); } };
  element.addEventListener("blur", finish); element.addEventListener("keydown", keydown);
}
