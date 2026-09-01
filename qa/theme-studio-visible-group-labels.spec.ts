import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("apps/builder/app/theme-studio.tsx", "utf8");

describe("Theme Studio visible group labels", () => {
  it("uses the visible section labels as accessible names for grouped controls", () => {
    expect(source).toContain('id="theme-presets-label">Theme');
    expect(source).toContain('aria-labelledby="theme-presets-label"');
    expect(source).toContain('id="palette-presets-label">Palette');
    expect(source).toContain('aria-labelledby="palette-presets-label"');
    expect(source).toContain('id="typography-presets-label">Typography');
    expect(source).toContain('aria-labelledby="typography-presets-label"');
    expect(source).toContain('id="fine-tune-colors-label">Fine tune');
    expect(source).toContain('aria-labelledby="fine-tune-colors-label"');
  });
});
