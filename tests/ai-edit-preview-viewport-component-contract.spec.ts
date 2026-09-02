import { expect, test } from "@playwright/test";
import fs from "node:fs";

const visual = fs.readFileSync("apps/builder/app/ai-edit-visual-preview.tsx", "utf8");

test("visual proposal component exposes viewport without changing its required edit contract", () => {
  expect(visual).toContain("site: Site; pageId: string; sectionId?: string; operation: AiEditorOperation; viewport?: EditorViewport");
});
