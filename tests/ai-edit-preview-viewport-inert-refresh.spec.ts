import { expect, test } from "@playwright/test";
import fs from "node:fs";

const visual = fs.readFileSync("apps/builder/app/ai-edit-visual-preview.tsx", "utf8");

test("proposal renderer is re-asserted inert when its device changes", () => {
  expect(visual).toContain("[proposal.site, proposal.path, viewport]");
  expect(visual).toContain('node.setAttribute("inert", "")');
});
