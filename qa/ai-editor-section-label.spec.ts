import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("apps/builder/app/ai-editor-assistant.tsx", "utf8");

describe("Ask MiCirql section label", () => {
  it("uses the visible Ask MiCirql title as the section accessible name", () => {
    expect(source).toContain('<section className={styles.shell} aria-labelledby="ai-editor-title">');
    expect(source).toContain('<span id="ai-editor-title">Ask MiCirql</span>');
  });
});
