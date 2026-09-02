import { expect, test } from "@playwright/test";
import fs from "node:fs";

const assistant = fs.readFileSync("apps/builder/app/ai-editor-assistant.tsx", "utf8");
const visual = fs.readFileSync("apps/builder/app/ai-edit-visual-preview.tsx", "utf8");
const styles = fs.readFileSync("apps/builder/app/ai-edit-visual-preview.module.css", "utf8");

test("AI visual proposals can be checked on desktop tablet and mobile before Apply", () => {
  expect(visual).toContain('{ id: "desktop", label: "Desktop" }');
  expect(visual).toContain('{ id: "tablet", label: "Tablet" }');
  expect(visual).toContain('{ id: "mobile", label: "Mobile" }');
  expect(visual).toContain('aria-label="Proposal preview device"');
  expect(visual).toContain("aria-pressed={viewport === item.id}");
  expect(visual).toContain("viewport={viewport}");
});

test("proposal device switching stays preview-only and keeps Apply outside the canvas", () => {
  expect(visual).toContain('node.setAttribute("inert", "")');
  expect(visual).toContain('aria-hidden="true"');
  expect(assistant.indexOf("<AiEditVisualPreview")).toBeLessThan(assistant.indexOf("className={styles.proposalActions}"));
  expect(styles).toContain(".frameDesktop");
  expect(styles).toContain(".frameTablet");
  expect(styles).toContain(".frameMobile");
});

test("AI proposal preview accepts the editor viewport as its initial device", () => {
  expect(assistant).toContain('viewport = "desktop"');
  expect(assistant).toContain("viewport={viewport}");
  expect(visual).toContain('viewport: initialViewport = "desktop"');
  expect(visual).toContain("setViewport(initialViewport)");
});
