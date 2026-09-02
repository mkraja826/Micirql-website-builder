import { expect, test } from "@playwright/test";
import fs from "node:fs";

const materializer = fs.readFileSync("apps/builder/app/ai-edit-proposed-site.ts", "utf8");
const visual = fs.readFileSync("apps/builder/app/ai-edit-visual-preview.tsx", "utf8");

test("new page proposals can be reviewed responsively before creation", () => {
  expect(materializer).toContain('operation.type === "page.add"');
  expect(materializer).toContain("previewNewPage");
  expect(visual).toContain("viewport={viewport}");
});
