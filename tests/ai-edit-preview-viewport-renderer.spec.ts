import { expect, test } from "@playwright/test";
import fs from "node:fs";

const visual = fs.readFileSync("apps/builder/app/ai-edit-visual-preview.tsx", "utf8");

test("all AI proposal device previews reuse the production renderer", () => {
  expect(visual).toContain('import { RendererPreview } from "./renderer-preview"');
  expect(visual).toContain("<RendererPreview");
  expect(visual).toContain("viewport={viewport}");
  expect(visual).not.toContain("iframe");
});
