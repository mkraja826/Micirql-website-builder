"use client";

import { useEffect } from "react";

export function KeyboardSectionActions() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const section = target.closest<HTMLElement>("[data-mi-section-id]");
      if (!section || target !== section) return;
      if (section.dataset.miGlobalSection === "true") return;

      const duplicate = (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === "d";
      const remove = !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey && (event.key === "Delete" || event.key === "Backspace");
      const moveUp = !event.metaKey && !event.ctrlKey && event.altKey && !event.shiftKey && event.key === "ArrowUp";
      const moveDown = !event.metaKey && !event.ctrlKey && event.altKey && !event.shiftKey && event.key === "ArrowDown";
      if (!duplicate && !remove && !moveUp && !moveDown) return;

      const actionName = duplicate ? "duplicate" : remove ? "remove" : moveUp ? "move-up" : "move-down";
      const action = section.querySelector<HTMLButtonElement>(`[data-mi-canvas-action="${actionName}"]`);
      if (!action || action.disabled) return;
      event.preventDefault();
      event.stopPropagation();
      action.click();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return null;
}
