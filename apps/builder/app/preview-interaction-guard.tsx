"use client";

import { useEffect } from "react";

export function PreviewInteractionGuard() {
  useEffect(() => {
    const listeners = new Map<Element, EventListener>();

    const bindBurgerSummaries = () => {
      for (const summary of document.querySelectorAll(".renderer-preview-document summary.mi-burger")) {
        if (listeners.has(summary)) continue;
        const handler: EventListener = (event) => {
          // The editor section wrapper intentionally prevents generic preview
          // clicks so they select/edit sections instead of navigating away.
          // A mobile-nav <summary> is different: its native <details> toggle is
          // itself the behavior being previewed, so stop bubbling without
          // cancelling the browser's default activation.
          event.stopPropagation();
        };
        summary.addEventListener("click", handler);
        listeners.set(summary, handler);
      }
    };

    bindBurgerSummaries();
    const observer = new MutationObserver(bindBurgerSummaries);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      for (const [summary, handler] of listeners) summary.removeEventListener("click", handler);
      listeners.clear();
    };
  }, []);

  return null;
}
