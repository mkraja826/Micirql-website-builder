import { expect, test } from "@playwright/test";
import fs from "node:fs";

const materializer = fs.readFileSync("apps/builder/app/ai-edit-proposed-site.ts", "utf8");
const assistant = fs.readFileSync("apps/builder/app/ai-editor-assistant.tsx", "utf8");

test("section removal can be reviewed on devices before explicit removal", () => {
  expect(materializer).toContain('operation.type === "section.remove"');
  expect(assistant).toContain("<AiEditVisualPreview");
  expect(assistant).toContain("Remove section");
});
