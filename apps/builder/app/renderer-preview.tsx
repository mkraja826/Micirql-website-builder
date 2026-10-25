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
  domain?: string;
  subtype?: string;
  candidateId?: string;
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
  reviewMode = false,
}: {
  site: Site;
  path: string;
  viewport: "mobile" | "tablet" | "desktop";
  selectedSectionId?: string;
  onSelectSection(sectionId: string): void;
  onInlineTextChange?(sectionId: string, propPath: string, value: string): void;
  onRequestImageChange?(sectionId: string, propPath: string): void;
  onReorderSection?(sectionId: string, toIndex: number): void;
  reviewMode?: boolean;
}) {
  const [preview, setPreview] = useState<PreviewPayload>();
  const [status, setStatus] = useState<"rendering" | "ready" | "error">(
    "rendering",
  );
  const [error, setError] = useState("");
  const [draggedSectionId, setDraggedSectionId] = useState<string>();
  const [frame, setFrame] = useState({ scale: 1, height: 320 });
  const requestId = useRef(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const viewportWidth = previewViewportWidth(viewport);

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
        const payload = (await response.json()) as PreviewPayload;
        if (id !== requestId.current) return;
        if (!response.ok || !payload.ok || !Array.isArray(payload.sections)) {
          throw new Error(
            payload.issues?.map((issue) => issue.message).join(" ") ||
              `Preview failed (${response.status}).`,
          );
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

  useEffect(() => {
    const stage = stageRef.current;
    const previewFrame = frameRef.current;
    if (!stage || !previewFrame) return;

    const syncFrame = () => {
      const scale = Math.min(1, stage.clientWidth / viewportWidth);
      const height = Math.max(
        240,
        Math.ceil(previewFrame.scrollHeight * scale),
      );
      setFrame((current) =>
        Math.abs(current.scale - scale) < 0.001 && current.height === height
          ? current
          : { scale, height },
      );
    };

    const observer = new ResizeObserver(syncFrame);
    observer.observe(stage);
    observer.observe(previewFrame);
    syncFrame();
    return () => observer.disconnect();
  }, [preview?.sections?.length, status, viewportWidth]);

  function handleSectionClick(
    event: MouseEvent<HTMLDivElement>,
    sectionId: string,
  ) {
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
    const sectionId =
      draggedSectionId ?? event.dataTransfer.getData("text/mi-section-id");
    if (sectionId && onReorderSection) onReorderSection(sectionId, targetIndex);
    setDraggedSectionId(undefined);
  }

  return (
    <div
      ref={stageRef}
      className={`renderer-preview-stage viewport-${viewport}`}
      style={
        {
          "--mi-preview-scale": String(frame.scale),
          "--mi-preview-height": `${frame.height}px`,
        } as CSSProperties
      }
    >
      <style dangerouslySetInnerHTML={{ __html: RESPONSIVE_PREVIEW_CSS }} />
      <div
        ref={frameRef}
        className={`site-preview renderer-site-preview viewport-${viewport}`}
        style={{
          width: `${viewportWidth}px`,
          transform: `scale(${frame.scale})`,
          containerType: "inline-size",
        }}
      >
        {status === "rendering" ? (
          <div className="renderer-preview-state">Rendering preview…</div>
        ) : null}
        {status === "error" ? (
          <div className="renderer-preview-state renderer-preview-error">
            {error}
          </div>
        ) : null}
        {status === "ready" && preview?.sections ? (
          <div
            aria-label={
              reviewMode
                ? `Website preview for ${site.name}, ${path}`
                : undefined
            }
            className="renderer-preview-document"
            data-mi-site={preview.siteId}
            data-mi-page={preview.pageId}
            data-mi-theme={preview.theme}
            data-mi-domain={preview.domain}
            data-mi-subtype={preview.subtype}
            data-mi-candidate={preview.candidateId}
            inert={reviewMode ? true : undefined}
            role={reviewMode ? "img" : undefined}
            style={(preview.themeStyle ?? {}) as CSSProperties}
          >
            {preview.sections.map((section, index) => {
              const seed = seedSectionCatalog.find(
                (candidate) => candidate.id === section.componentId,
              );
              if (!seed)
                return (
                  <div
                    key={section.id}
                    className="renderer-preview-state renderer-preview-error"
                  >
                    Missing section renderer: {section.componentId}
                  </div>
                );
              const selected = section.id === selectedSectionId;
              return (
                <div
                  key={section.id}
                  id={`section-${index + 1}`}
                  data-mi-rendered-section={section.id}
                  data-mi-section-id={section.id}
                  data-mi-component-id={section.componentId}
                  data-mi-component-version={section.componentVersion}
                  className={`mi-editor-section${selected ? " mi-editor-selected" : ""}`}
                  draggable={Boolean(onReorderSection)}
                  onDragStart={(event) => {
                    setDraggedSectionId(section.id);
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData(
                      "text/mi-section-id",
                      section.id,
                    );
                  }}
                  onDragEnd={() => setDraggedSectionId(undefined)}
                  onDragOver={(event) => {
                    if (onReorderSection) event.preventDefault();
                  }}
                  onDrop={(event) => handleDrop(event, index)}
                  onClick={(event) => handleSectionClick(event, section.id)}
                >
                  {selected ? (
                    <div className="mi-editor-canvas-toolbar">
                      <span>Drag to move</span>
                      {onRequestImageChange ? (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            onRequestImageChange(section.id, "image");
                          }}
                        >
                          Replace image
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                  <SeedSection
                    family={seed.family}
                    theme={seed.theme}
                    variant={seed.variant}
                    props={
                      section.props as Parameters<
                        typeof SeedSection
                      >[0]["props"]
                    }
                  />
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export const RESPONSIVE_PREVIEW_CSS = `
.renderer-preview-stage .mi-section__layout,
.renderer-preview-stage .mi-section__layout > *,
.renderer-preview-stage .mi-container,
.renderer-preview-stage .mi-section,
.renderer-preview-stage .mi-section-variant {
  min-width: 0;
  max-width: 100%;
}
.renderer-preview-stage .mi-section__media,
.renderer-preview-stage .mi-section__media img {
  max-width: 100%;
}
.renderer-preview-stage .mi-section-theme[data-section-family="hero"] .mi-type--display {
  max-inline-size: min(19ch, 100%);
  font-size: clamp(
    var(--mi-hero-display-min, 2.2rem),
    var(--mi-hero-display-fluid, 4.8cqi),
    var(--mi-hero-display-max, 4.5rem)
  );
  overflow-wrap: break-word;
  word-break: normal;
}
.renderer-preview-stage.viewport-mobile .mi-section__layout {
  grid-template-columns: minmax(0, 1fr) !important;
}
.renderer-preview-stage.viewport-mobile .mi-section__layout > * {
  width: 100%;
}
.renderer-preview-stage.viewport-mobile
  .mi-section-variant:not([data-section-family="navbar"]):not(
    [data-section-family="hero"]
  ):not([data-section-family="contact"]):not(
    [data-section-family="footer"]
  )
  .mi-section__composition {
  display: flex !important;
  width: 100% !important;
  flex-direction: column !important;
  align-items: stretch !important;
}
.renderer-preview-stage.viewport-mobile
  .mi-section-variant:not([data-section-family="navbar"]):not(
    [data-section-family="hero"]
  ):not([data-section-family="contact"]):not(
    [data-section-family="footer"]
  )
  :is(
    .mi-section__heading,
    .mi-section__grid,
    .mi-gallery,
    .mi-stats,
    .mi-section__actions
  ) {
  grid-column: auto !important;
  grid-row: auto !important;
  box-sizing: border-box !important;
  width: 100% !important;
  min-width: 0 !important;
  margin-inline: 0 !important;
}
.renderer-preview-stage.viewport-mobile
  .mi-section-variant
  .mi-section__grid {
  grid-template-columns: minmax(0, 1fr) !important;
  grid-auto-flow: row !important;
  grid-auto-columns: auto !important;
  overflow-x: visible !important;
  padding-bottom: 0 !important;
  scroll-snap-type: none !important;
}
.renderer-preview-stage.viewport-mobile
  .mi-section-variant
  .mi-section__card:first-child {
  grid-column: auto !important;
  grid-row: auto !important;
}
.renderer-preview-stage.viewport-mobile
  .mi-section--hero
  .mi-section__layout {
  grid-template-areas: none !important;
}
.renderer-preview-stage.viewport-mobile
  .mi-section--hero
  .mi-section__layout
  > * {
  grid-area: auto !important;
  grid-column: auto !important;
  grid-row: auto !important;
  box-sizing: border-box !important;
  width: 100% !important;
  max-width: 100% !important;
  margin-inline: 0 !important;
}
.renderer-preview-stage.viewport-mobile
  .mi-section-variant[data-section-family="contact"]
  .mi-section__layout {
  grid-template-columns: minmax(0, 1fr) !important;
}
.renderer-preview-stage.viewport-mobile
  .mi-section-variant[data-section-family="contact"]
  :is(.mi-section__heading, .mi-section__form) {
  width: 100% !important;
  max-width: 100% !important;
  justify-self: stretch !important;
  order: initial !important;
}
.renderer-preview-stage.viewport-mobile
  .mi-section-variant[data-section-family="footer"]
  .mi-footer {
  grid-template-columns: minmax(0, 1fr) !important;
  justify-items: stretch !important;
  text-align: start !important;
}
.renderer-preview-stage.viewport-mobile
  .mi-section-variant[data-section-family="footer"]
  .mi-footer
  nav {
  display: flex !important;
  justify-content: flex-start !important;
}
.renderer-preview-stage.viewport-mobile .mi-section-theme[data-section-family="hero"] {
  --mi-hero-display-min: 2rem;
  --mi-hero-display-fluid: 9cqi;
  --mi-hero-display-max: 2.75rem;
}
.renderer-preview-stage.viewport-mobile
  .mi-section-theme--corporate[data-section-family="hero"] {
  --mi-hero-display-min: 2.5rem;
  --mi-hero-display-fluid: 12cqi;
  --mi-hero-display-max: 3rem;
  --mi-display-weight: 700;
  --mi-display-leading: 1.08;
  --mi-display-tracking: -0.018em;
}
.renderer-preview-stage.viewport-mobile
  :is(
    .mi-section-theme--maximalist[data-section-family="hero"],
    .mi-section-theme--cinematic[data-section-family="hero"]
  ) {
  --mi-hero-display-min: 1.85rem;
  --mi-hero-display-fluid: 7.6cqi;
  --mi-hero-display-max: 2.25rem;
}
.renderer-preview-stage.viewport-mobile
  :is(
    .mi-section-theme--maximalist[data-section-family="hero"],
    .mi-section-theme--cinematic[data-section-family="hero"]
  )
  .mi-type--display {
  font-family: var(--mi-font-ui, var(--mi-font-body));
  font-weight: 600;
  line-height: 1.08;
  letter-spacing: -0.02em;
  text-transform: none;
}
.renderer-preview-stage.viewport-mobile .mi-type--h2 {
  font-size: clamp(1.55rem, 6.4cqi, 2rem);
}
.renderer-preview-stage.viewport-mobile .mi-type--h3 {
  font-size: clamp(1.1rem, 4.8cqi, 1.35rem);
}
.renderer-preview-stage.viewport-mobile
  :is(.mi-section-theme--maximalist, .mi-section-theme--cinematic)
  :is(.mi-type--h2, .mi-type--h3) {
  font-family: var(--mi-font-ui, var(--mi-font-body));
  font-weight: 650;
  line-height: 1.14;
  letter-spacing: -0.02em;
}
.renderer-preview-stage.viewport-mobile
  .mi-section-variant--2[data-section-family="hero"]
  .mi-section__media {
  order: initial;
}
.renderer-preview-stage.viewport-mobile .mi-section--hero {
  padding-top: 2.5rem;
}
.renderer-preview-stage.viewport-mobile .mi-section--hero .mi-section__media {
  min-height: 0;
}
.renderer-preview-stage.viewport-mobile
  .mi-section--hero
  .mi-section__media:empty::before,
.renderer-preview-stage.viewport-mobile .mi-section__media--placeholder {
  min-height: 14rem;
}
.renderer-preview-stage.viewport-mobile .mi-section__card {
  padding: var(--mi-space-md);
}
.renderer-preview-stage.viewport-mobile
  .mi-section-theme--corporate
  .mi-section__heading {
  padding-left: var(--mi-space-md);
}
.renderer-preview-stage.viewport-mobile .mi-gallery,
.renderer-preview-stage.viewport-mobile .mi-stats {
  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
}
.renderer-preview-stage.viewport-mobile .mi-section--hero .mi-section__actions {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
}
.renderer-preview-stage.viewport-mobile .mi-section--hero .mi-section__action {
  width: 100%;
}
.renderer-preview-stage.viewport-mobile
  .mi-section-theme--luxury[data-section-family="hero"]
  .mi-section__media {
  min-height: clamp(18rem, 78cqi, 28rem);
}
.renderer-preview-stage.viewport-tablet
  .mi-section-theme[data-section-family="hero"]
  .mi-section__layout {
  grid-template-columns: minmax(0, 1fr) !important;
}
.renderer-preview-stage:is(.viewport-mobile, .viewport-tablet)
  .mi-nav-menu
  > ul.is-open {
  max-height: min(70svh, 30rem);
  overflow-y: auto;
  overscroll-behavior: contain;
}
`;

function previewViewportWidth(viewport: "mobile" | "tablet" | "desktop") {
  if (viewport === "mobile") return 390;
  if (viewport === "tablet") return 768;
  return 1120;
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
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !propPath.includes("description")
    ) {
      event.preventDefault();
      element.blur();
    }
  };
  element.addEventListener("blur", finish);
  element.addEventListener("keydown", keydown);
}
