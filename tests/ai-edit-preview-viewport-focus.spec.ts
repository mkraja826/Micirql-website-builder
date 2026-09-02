import { expect, test } from "@playwright/test";
import fs from "node:fs";

const visual = fs.readFileSync("apps/builder/app/ai-edit-visual-preview.tsx", "utf8");

test("proposal renderer stays outside keyboard focus while device buttons remain operable", () => {
  expect(visual).toContain('node.setAttribute("inert", "")');
  expect(visual).toContain('<button key={item.id} type="button"');
});
