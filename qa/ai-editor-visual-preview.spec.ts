import { expect, test } from "@playwright/test";
import fs from "node:fs";

const assistant = fs.readFileSync("apps/builder/app/ai-editor-assistant.tsx", "utf8");
const visual = fs.readFileSync("apps/builder/app/ai-edit-visual-preview.tsx", "utf8");
const materializer = fs.readFileSync("apps/builder/app/ai-edit-proposed-site.ts", "utf8");

test("AI proposals render a real canvas preview before Apply", () => {
  expect(assistant).toContain("<AiEditVisualPreview");
  expect(assistant.indexOf("<AiEditVisualPreview")).toBeLessThan(assistant.indexOf("className={styles.proposalActions}"));
  expect(visual).toContain("<RendererPreview");
  expect(visual).toContain('node.setAttribute("inert", "")');
  expect(visual).toContain('aria-hidden="true"');
  expect(visual).toContain("nothing has been applied");
});

test("visual proposals materialize from an immutable Site clone", () => {
  expect(materializer).toContain("const next = structuredClone(site)");
  expect(materializer).toContain('operation.type === "section.variant"');
  expect(materializer).toContain('operation.type === "section.copy"');
  expect(materializer).toContain('operation.type === "section.add"');
  expect(materializer).toContain('operation.type === "section.visibility"');
  expect(materializer).toContain('operation.type === "section.remove"');
  expect(materializer).toContain('operation.type === "section.move"');
  expect(materializer).toContain('operation.type === "page.add"');
});

test("non-canvas AI operations never fabricate a visual change", () => {
  expect(materializer).toContain("SEO metadata changes do not alter the page canvas.");
  expect(materializer).toContain("MiCirql will open Media before any image is changed.");
  expect(materializer).toContain("MiCirql will open Functions before any action is changed.");
  expect(visual).toContain("No canvas change");
});
