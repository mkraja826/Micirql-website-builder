"use client";

import { useState } from "react";

const shortcuts = [
  ["Undo", "Ctrl/Cmd + Z"],
  ["Redo", "Ctrl/Cmd + Shift + Z · Ctrl + Y"],
  ["Duplicate section", "Ctrl/Cmd + D"],
  ["Delete section", "Delete / Backspace"],
  ["Move section", "Alt + ↑ / ↓"]
] as const;

export function KeyboardShortcutsHelp() {
  const [open, setOpen] = useState(false);

  return (
    <div className="keyboard-shortcuts-help">
      <button
        type="button"
        className="keyboard-shortcuts-trigger"
        aria-expanded={open}
        aria-controls="keyboard-shortcuts-panel"
        title="Keyboard shortcuts"
        onClick={() => setOpen((value) => !value)}
      >
        ?
      </button>
      {open ? (
        <div id="keyboard-shortcuts-panel" className="keyboard-shortcuts-panel" role="dialog" aria-label="Keyboard shortcuts">
          <div className="keyboard-shortcuts-heading">
            <strong>Keyboard shortcuts</strong>
            <button type="button" aria-label="Close keyboard shortcuts" onClick={() => setOpen(false)}>×</button>
          </div>
          <div className="keyboard-shortcuts-list">
            {shortcuts.map(([label, keys]) => (
              <div className="keyboard-shortcut-row" key={label}>
                <span>{label}</span>
                <kbd>{keys}</kbd>
              </div>
            ))}
          </div>
          <small>Section shortcuts work when the section itself has canvas focus. Typing fields keep their native shortcuts.</small>
        </div>
      ) : null}
    </div>
  );
}
