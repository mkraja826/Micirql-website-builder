import { expect, test } from "@playwright/test";
import fs from "node:fs";

const visual = fs.readFileSync("apps/builder/app/ai-edit-visual-preview.tsx", "utf8");

test("selected device is passed directly to RendererPreview", () => {
  expect(visual).toContain("<RendererPreview site={proposal.site} path={proposal.path} viewport={viewport}");
});
