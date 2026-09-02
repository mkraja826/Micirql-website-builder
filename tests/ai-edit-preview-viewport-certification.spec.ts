import { expect, test } from "@playwright/test";
import fs from "node:fs";

const visual = fs.readFileSync("apps/builder/app/ai-edit-visual-preview.tsx", "utf8");
const assistant = fs.readFileSync("apps/builder/app/ai-editor-assistant.tsx", "utf8");
const styles = fs.readFileSync("apps/builder/app/ai-edit-visual-preview.module.css", "utf8");

test("V2-06 increment 3 certification: responsive AI proposal review before Apply", () => {
  expect(visual).toContain("Desktop");
  expect(visual).toContain("Tablet");
  expect(visual).toContain("Mobile");
  expect(visual).toContain("viewport={viewport}");
  expect(visual).toContain('node.setAttribute("inert", "")');
  expect(styles).toContain(".viewportPicker");
  expect(assistant.indexOf("<AiEditVisualPreview")).toBeLessThan(assistant.indexOf("className={styles.proposalActions}"));
});
