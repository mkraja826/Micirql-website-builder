import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = fs.readFileSync(path.join(process.cwd(), "apps/builder/app/keyboard-section-actions.tsx"), "utf8");

describe("editor history keyboard shortcuts", () => {
  it("supports standard undo and redo shortcuts", () => {
    expect(source).toContain('const undo = key === "z" && !event.shiftKey;');
    expect(source).toContain('const redo = (key === "z" && event.shiftKey) || (event.ctrlKey && !event.metaKey && key === "y" && !event.shiftKey);');
    expect(source).toContain('.workspace-actions button[title="${undo ? "Undo" : "Redo"}"]');
  });

  it("preserves native history inside editable controls", () => {
    expect(source).toContain('target.matches("input, textarea, select")');
    expect(source).toContain("target.isContentEditable");
    expect(source).toContain('target.closest("[contenteditable=\'true\']")');
    expect(source).toContain('if (modifier && !event.altKey && !editable)');
  });

  it("only consumes a shortcut when the editor action is available", () => {
    expect(source).toContain("if (action && !action.disabled)");
    expect(source).toContain("event.preventDefault();");
    expect(source).toContain("action.click();");
  });
});
