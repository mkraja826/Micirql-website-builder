"use client";

import { useEffect, useState } from "react";

const SELECTED_ATTR = "data-mi-batch-selected";

function selectedIds() {
  return Array.from(document.querySelectorAll<HTMLElement>(`[${SELECTED_ATTR}="true"]`))
    .map((candidate) => candidate.dataset.miSectionId)
    .filter((id): id is string => Boolean(id));
}

function clearBatchSelection() {
  document.querySelectorAll<HTMLElement>(`[${SELECTED_ATTR}="true"]`).forEach((section) => {
    section.removeAttribute(SELECTED_ATTR);
  });
}

export function CanvasMultiSelect() {
  const [batchCount, setBatchCount] = useState(0);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const syncHint = () => setShowHint(finePointer.matches);
    syncHint();
    finePointer.addEventListener("change", syncHint);

    const emitSelection = () => {
      const ids = selectedIds();
      setBatchCount(ids.length);
      window.dispatchEvent(new CustomEvent("micirql:batch-selection-change", { detail: { sectionIds: ids } }));
    };

    const clearAndEmit = () => {
      clearBatchSelection();
      emitSelection();
    };

    const onClickCapture = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const section = target.closest<HTMLElement>("[data-mi-section-id]");
      if (!section) return;

      if (document.documentElement.dataset.miBatchAction === "true") return;

      const additive = event.metaKey || event.ctrlKey;
      if (!additive) {
        clearAndEmit();
        return;
      }
      if (section.dataset.miGlobalSection === "true") return;
      if (target.closest("[data-mi-canvas-action]")) return;

      event.preventDefault();
      event.stopPropagation();
      if (section.getAttribute(SELECTED_ATTR) === "true") section.removeAttribute(SELECTED_ATTR);
      else section.setAttribute(SELECTED_ATTR, "true");

      emitSelection();
    };

    window.addEventListener("click", onClickCapture, true);
    window.addEventListener("popstate", clearAndEmit);
    return () => {
      window.removeEventListener("click", onClickCapture, true);
      window.removeEventListener("popstate", clearAndEmit);
      finePointer.removeEventListener("change", syncHint);
      clearBatchSelection();
    };
  }, []);

  if (!showHint || batchCount > 0) return null;

  return <div className="mi-editor-multiselect-hint" role="status" aria-live="polite" data-mi-canvas-action="multiselect-hint">
    <span aria-hidden="true">⌘</span>
    <span><strong>Multi-select</strong> · Ctrl/Cmd-click sections</span>
  </div>;
}
