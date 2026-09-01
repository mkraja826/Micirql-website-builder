import fs from "node:fs";
import path from "node:path";

describe("Ask MiCirql prompt help semantics", () => {
  it("associates the existing helper text with the prompt field", () => {
    const file = fs.readFileSync(path.join(process.cwd(), "apps/builder/app/ai-editor-assistant.tsx"), "utf8");
    expect(file).toContain('aria-describedby="ai-editor-prompt-help"');
    expect(file).toContain('<small id="ai-editor-prompt-help">Design-safe edits · Undo supported</small>');
  });
});
