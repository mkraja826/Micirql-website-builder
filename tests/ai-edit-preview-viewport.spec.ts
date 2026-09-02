import { expect, test } from "@playwright/test";
import fs from "node:fs";

const visual = fs.readFileSync("apps/builder/app/ai-edit-visual-preview.tsx", "utf8");
const styles = fs.readFileSync("apps/builder/app/ai-edit-visual-preview.module.css", "utf8");
const assistant = fs.readFileSync("apps/builder/app/ai-editor-assistant.tsx", "utf8");

test("AI proposals can be reviewed on desktop tablet and mobile before Apply", () => {
  expect(visual).toContain('{ id: "desktop", label: "Desktop" }');
  expect(visual).toContain('{ id: "tablet", label: "Tablet" }');
  expect(visual).toContain('{ id: "mobile", label: "Mobile" }');
  expect(visual).toContain('aria-label="Proposal preview device"');
  expect(visual).toContain("aria-pressed={viewport === item.id}");
  expect(visual).toContain("viewport={viewport}");
  expect(assistant.indexOf("<AiEditVisualPreview")).toBeLessThan(assistant.indexOf("className={styles.proposalActions}"));
});

test("responsive proposal review stays preview-only", () => {
  expect(visual).toContain('node.setAttribute("inert", "")');
  expect(visual).toContain('aria-hidden="true"');
  expect(visual).not.toContain("onApply");
  expect(visual).not.toContain("executeEditorCommand");
  expect(visual).not.toContain("fetch(");
  expect(styles).toContain(".frameDesktop");
  expect(styles).toContain(".frameTablet");
  expect(styles).toContain(".frameMobile");
  expect(styles).toContain("grid-template-columns:repeat(3,1fr)");
});

test("non-canvas proposals do not fabricate device previews", () => {
  const guard = visual.indexOf("{proposal.site ? <>");
  const picker = visual.indexOf('aria-label="Proposal preview device"');
  expect(guard).toBeGreaterThan(-1);
  expect(picker).toBeGreaterThan(guard);
});
