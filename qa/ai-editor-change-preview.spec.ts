import { expect, test } from "@playwright/test";
import fs from "node:fs";

const assistant = fs.readFileSync("apps/builder/app/ai-editor-assistant.tsx", "utf8");
const preview = fs.readFileSync("apps/builder/app/ai-edit-preview.tsx", "utf8");

test("AI proposals show a structured before and after preview before apply", () => {
  expect(assistant).toContain("<AiEditPreview operation={proposal.operation} target={selectedContext} />");
  expect(preview).toContain('aria-label="Proposed change preview"');
  expect(preview).toContain("Before");
  expect(preview).toContain("After");
});

test("preview covers every certified AI editor operation", () => {
  for (const operation of ["section.variant", "section.copy", "section.add", "section.visibility", "section.remove", "section.move", "media.open", "functions.open", "seo.patch", "page.add"]) {
    expect(preview).toContain(`case \"${operation}\"`);
  }
});
