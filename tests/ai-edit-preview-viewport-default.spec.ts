import { expect, test } from "@playwright/test";
import fs from "node:fs";

const visual = fs.readFileSync("apps/builder/app/ai-edit-visual-preview.tsx", "utf8");

test("AI visual proposal has a safe desktop default when no editor viewport is supplied", () => {
  expect(visual).toContain('viewport: initialViewport = "desktop"');
  expect(visual).toContain("useState<EditorViewport>(initialViewport)");
});
