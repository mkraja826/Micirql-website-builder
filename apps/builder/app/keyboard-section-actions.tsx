"use client";

import { useEffect } from "react";

export function KeyboardSectionActions() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const modifier = event.metaKey || event.ctrlKey;
      const editable = target.matches("input, textarea, select") || target.isContentEditable || Boolean(target.closest("[contenteditable='true']"));
      if (modifier && !event.altKey && !editable) {
        const key = event.key.toLowerCase();
        const undo = key === "z" && !event.shiftKey;
        const redo = (key === "z" && event.shiftKey) || (event.ctrlKey && !event.metaKey && key === "y" && !event.shiftKey);
        if (undo || redo) {
          const action = document.querySelector<HTMLButtonElement>(`.workspace-actions button[title="${undo ? "Undo" : "Redo"}"]`);
          if (action && !action.disabled) {
            event.preventDefault();
            event.stopPropagation();
            action.click();
          }
          return;
        }
      }

      const section = target.closest<HTMLElement>("[data-mi-section-id]");
      if (!section || target !== section) return;
      if (section.dataset.miGlobalSection === "true") return;

      const duplicate = modifier && !event.altKey && !event.shiftKey && event.key.toLowerCase() === "d";
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
