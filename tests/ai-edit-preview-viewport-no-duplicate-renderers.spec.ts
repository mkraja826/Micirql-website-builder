import { expect, test } from "@playwright/test";
import fs from "node:fs";

const visual = fs.readFileSync("apps/builder/app/ai-edit-visual-preview.tsx", "utf8");

test("device switching uses one renderer instance instead of rendering three hidden canvases", () => {
  expect((visual.match(/<RendererPreview/g) ?? []).length).toBe(1);
  expect(visual).toContain("viewport={viewport}");
});
