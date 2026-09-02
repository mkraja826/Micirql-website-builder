import { expect, test } from "@playwright/test";
import fs from "node:fs";

const visual = fs.readFileSync("apps/builder/app/ai-edit-visual-preview.tsx", "utf8");

test("switching proposal devices does not apply or mutate the draft", () => {
  expect(visual).toContain("onClick={() => setViewport(item.id)}");
  expect(visual).not.toContain("onApply");
  expect(visual).not.toContain("executeEditorCommand");
  expect(visual).not.toContain("fetch(\"/api/drafts\"");
});
