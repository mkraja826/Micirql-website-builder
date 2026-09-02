import { expect, test } from "@playwright/test";
import fs from "node:fs";

const visual = fs.readFileSync("apps/builder/app/ai-edit-visual-preview.tsx", "utf8");

test("responsive proposal review is explicit rather than automatic carousel behavior", () => {
  expect(visual).toContain("onClick={() => setViewport(item.id)}");
  expect(visual).not.toContain("setInterval");
  expect(visual).not.toContain("setTimeout");
});
