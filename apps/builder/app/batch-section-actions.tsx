"use client";

import { useEffect, useState } from "react";

type BatchSelectionDetail = { sectionIds?: string[] };

const SELECTED_ATTR = "data-mi-batch-selected";

function selectedSections() {
  return Array.from(document.querySelectorAll<HTMLElement>(`[${SELECTED_ATTR}="true"]`))
    .filter((section) => section.dataset.miGlobalSection !== "true");
}

function waitForFrame() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

function selectedIds() {
  return selectedSections()
    .map((section) => section.dataset.miSectionId)
    .filter((id): id is string => Boolean(id));
}

function restoreBatchSelection(ids: string[]) {
  ids.forEach((sectionId) => {
    document.querySelector<HTMLElement>(`[data-mi-section-id="${CSS.escape(sectionId)}"]`)?.setAttribute(SELECTED_ATTR, "true");
  });
  window.dispatchEvent(new CustomEvent("micirql:batch-selection-change", { detail: { sectionIds: ids } }));
}

async function setBatchVisibility(hidden: boolean) {
  const ids = selectedIds();
  if (!ids.length) return;

  document.documentElement.dataset.miBatchAction = "true";
  try {
    for (const sectionId of ids) {
      const section = document.querySelector<HTMLElement>(`[data-mi-section-id="${CSS.escape(sectionId)}"]`);
      if (!section || section.dataset.miGlobalSection === "true") continue;
      const isHidden = section.classList.contains("mi-editor-hidden");
      if (isHidden === hidden) continue;

      section.focus();
      section.click();
      await waitForFrame();
      await waitForFrame();

      const current = document.querySelector<HTMLElement>(`[data-mi-section-id="${CSS.escape(sectionId)}"]`);
      const visibility = current?.querySelector<HTMLButtonElement>('[data-mi-canvas-action="visibility"]');
      if (visibility && !visibility.disabled) visibility.click();
      await waitForFrame();
    }
  } finally {
    delete document.documentElement.dataset.miBatchAction;
    restoreBatchSelection(ids);
  }
}

async function duplicateBatchSelection() {
  const ids = selectedIds();
  if (!ids.length) return;

  document.documentElement.dataset.miBatchAction = "true";
  try {
    for (const sectionId of ids) {
      const section = document.querySelector<HTMLElement>(`[data-mi-section-id="${CSS.escape(sectionId)}"]`);
      if (!section || section.dataset.miGlobalSection === "true") continue;

      section.focus();
      section.click();
      await waitForFrame();
      await waitForFrame();

      const current = document.querySelector<HTMLElement>(`[data-mi-section-id="${CSS.escape(sectionId)}"]`);
      const duplicate = current?.querySelector<HTMLButtonElement>('[data-mi-canvas-action="duplicate"]');
      if (duplicate && !duplicate.disabled) duplicate.click();
      await waitForFrame();
      await waitForFrame();
    }
  } finally {
    delete document.documentElement.dataset.miBatchAction;
    restoreBatchSelection(ids);
  }
}

async function removeBatchSelection() {
  const ids = selectedIds();
  if (!ids.length) return;
  const label = ids.length === 1 ? "this selected section" : `${ids.length} selected sections`;
  if (!window.confirm(`Remove ${label}? You can undo these changes.`)) return;

  document.documentElement.dataset.miBatchAction = "true";
  try {
    for (const sectionId of ids) {
      const section = document.querySelector<HTMLElement>(`[data-mi-section-id="${CSS.escape(sectionId)}"]`);
      if (!section || section.dataset.miGlobalSection === "true") continue;

      section.focus();
      section.click();
      await waitForFrame();
      await waitForFrame();

      const current = document.querySelector<HTMLElement>(`[data-mi-section-id="${CSS.escape(sectionId)}"]`);
      const remove = current?.querySelector<HTMLButtonElement>('[data-mi-canvas-action="remove"]');
      if (remove && !remove.disabled) {
        const originalConfirm = window.confirm;
        window.confirm = () => true;
        try {
          remove.click();
        } finally {
          window.confirm = originalConfirm;
        }
      }
      await waitForFrame();
      await waitForFrame();
    }
  } finally {
    delete document.documentElement.dataset.miBatchAction;
    window.dispatchEvent(new CustomEvent("micirql:batch-selection-change", { detail: { sectionIds: [] } }));
  }
}

function clearBatchSelection() {
  selectedSections().forEach((section) => section.removeAttribute(SELECTED_ATTR));
  window.dispatchEvent(new CustomEvent("micirql:batch-selection-change", { detail: { sectionIds: [] } }));
}

export function BatchSectionActions() {
  const [sectionIds, setSectionIds] = useState<string[]>([]);

  useEffect(() => {
    const onSelectionChange = (event: Event) => {
      const detail = (event as CustomEvent<BatchSelectionDetail>).detail;
      setSectionIds(Array.isArray(detail?.sectionIds) ? detail.sectionIds : []);
    };
    window.addEventListener("micirql:batch-selection-change", onSelectionChange as EventListener);
    return () => window.removeEventListener("micirql:batch-selection-change", onSelectionChange as EventListener);
  }, []);

  if (!sectionIds.length) return null;

  return (
    <div className="mi-editor-batch-toolbar" role="toolbar" aria-label="Batch section actions" data-mi-canvas-action="batch-toolbar">
      <strong>{sectionIds.length} selected</strong>
      <button type="button" onClick={() => void duplicateBatchSelection()}>Duplicate</button>
      <button type="button" onClick={() => void setBatchVisibility(true)}>Hide all</button>
      <button type="button" onClick={() => void setBatchVisibility(false)}>Show all</button>
      <button type="button" className="is-danger" onClick={() => void removeBatchSelection()}>Remove</button>
      <button type="button" className="is-muted" onClick={clearBatchSelection}>Clear</button>
    </div>
  );
}
