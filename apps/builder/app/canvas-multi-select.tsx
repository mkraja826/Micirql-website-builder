"use client";

import { useEffect, useRef, useState } from "react";

const SELECTED_ATTR = "data-mi-batch-selected";

function selectableSections() {
  return Array.from(document.querySelectorAll<HTMLElement>("[data-mi-section-id]"))
    .filter((section) => section.dataset.miGlobalSection !== "true");
}

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
  const anchorSectionId = useRef<string | null>(null);

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

    const selectRange = (fromId: string, toId: string) => {
      const sections = selectableSections();
      const fromIndex = sections.findIndex((candidate) => candidate.dataset.miSectionId === fromId);
      const toIndex = sections.findIndex((candidate) => candidate.dataset.miSectionId === toId);
      if (fromIndex < 0 || toIndex < 0) return false;
      const start = Math.min(fromIndex, toIndex);
      const end = Math.max(fromIndex, toIndex);
      clearBatchSelection();
      sections.slice(start, end + 1).forEach((candidate) => candidate.setAttribute(SELECTED_ATTR, "true"));
      emitSelection();
      return true;
    };

    const onClickCapture = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const section = target.closest<HTMLElement>("[data-mi-section-id]");
      if (!section) return;

      if (document.documentElement.dataset.miBatchAction === "true") return;
      if (section.dataset.miGlobalSection === "true") return;
      if (target.closest("[data-mi-canvas-action]")) return;

      const sectionId = section.dataset.miSectionId;
      if (!sectionId) return;

      if (event.shiftKey && anchorSectionId.current) {
        event.preventDefault();
        event.stopPropagation();
        if (selectRange(anchorSectionId.current, sectionId)) return;
      }

      const additive = event.metaKey || event.ctrlKey;
      if (!additive) {
        anchorSectionId.current = sectionId;
        clearAndEmit();
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      anchorSectionId.current = sectionId;
      if (section.getAttribute(SELECTED_ATTR) === "true") section.removeAttribute(SELECTED_ATTR);
      else section.setAttribute(SELECTED_ATTR, "true");

      emitSelection();
    };

    const clearSelectionState = () => {
      anchorSectionId.current = null;
      clearAndEmit();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      const editingText = target instanceof HTMLElement && Boolean(target.closest("input, textarea, select, [contenteditable=true]"));

      if (event.key === "Escape" && selectedIds().length > 0) {
        if (editingText) return;
        clearSelectionState();
        return;
      }

      const selectAll = (event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === "a";
      if (!selectAll || editingText) return;
      const active = document.activeElement;
      if (!(active instanceof HTMLElement) || !active.closest("[data-mi-section-id]")) return;

      const sections = selectableSections();
      if (!sections.length) return;
      event.preventDefault();
      clearBatchSelection();
      sections.forEach((section) => section.setAttribute(SELECTED_ATTR, "true"));
      anchorSectionId.current = sections[0]?.dataset.miSectionId ?? null;
      emitSelection();
    };

    window.addEventListener("click", onClickCapture, true);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("popstate", clearSelectionState);
    return () => {
      window.removeEventListener("click", onClickCapture, true);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("popstate", clearSelectionState);
      finePointer.removeEventListener("change", syncHint);
      clearBatchSelection();
    };
  }, []);

  if (!showHint || batchCount > 0) return null;

  return <div className="mi-editor-multiselect-hint" role="status" aria-live="polite" data-mi-canvas-action="multiselect-hint">
    <span aria-hidden="true">⌘</span>
    <span><strong>Multi-select</strong> · Ctrl/Cmd-click, Shift-click, or Ctrl/Cmd+A from the canvas</span>
  </div>;
}
