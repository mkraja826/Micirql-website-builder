import { expect, test } from "@playwright/test";
import fs from "node:fs";

const visual = fs.readFileSync("apps/builder/app/ai-edit-visual-preview.tsx", "utf8");

test("responsive review keeps a single proposal materialization and single preview renderer", () => {
  expect((visual.match(/proposedSiteForAiEdit\(/g) ?? []).length).toBe(1);
  expect((visual.match(/<RendererPreview/g) ?? []).length).toBe(1);
});
