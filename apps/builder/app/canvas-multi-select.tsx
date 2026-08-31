"use client";

import { useEffect } from "react";

const SELECTED_ATTR = "data-mi-batch-selected";

function clearBatchSelection() {
  document.querySelectorAll<HTMLElement>(`[${SELECTED_ATTR}="true"]`).forEach((section) => {
    section.removeAttribute(SELECTED_ATTR);
  });
}

export function CanvasMultiSelect() {
  useEffect(() => {
    const onClickCapture = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const section = target.closest<HTMLElement>("[data-mi-section-id]");
      if (!section) return;

      if (document.documentElement.dataset.miBatchAction === "true") return;

      const additive = event.metaKey || event.ctrlKey;
      if (!additive) {
        clearBatchSelection();
        return;
      }
      if (section.dataset.miGlobalSection === "true") return;
      if (target.closest("[data-mi-canvas-action]")) return;

      event.preventDefault();
      event.stopPropagation();
      if (section.getAttribute(SELECTED_ATTR) === "true") section.removeAttribute(SELECTED_ATTR);
      else section.setAttribute(SELECTED_ATTR, "true");

      window.dispatchEvent(new CustomEvent("micirql:batch-selection-change", {
        detail: {
          sectionIds: Array.from(document.querySelectorAll<HTMLElement>(`[${SELECTED_ATTR}="true"]`))
            .map((candidate) => candidate.dataset.miSectionId)
            .filter((id): id is string => Boolean(id)),
        },
      }));
    };

    const clearOnPageNavigation = () => clearBatchSelection();
    window.addEventListener("click", onClickCapture, true);
    window.addEventListener("popstate", clearOnPageNavigation);
    return () => {
      window.removeEventListener("click", onClickCapture, true);
      window.removeEventListener("popstate", clearOnPageNavigation);
      clearBatchSelection();
    };
  }, []);

  return null;
}
