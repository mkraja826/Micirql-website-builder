import { expect, test } from "@playwright/test";
import fs from "node:fs";

const visual = fs.readFileSync("apps/builder/app/ai-edit-visual-preview.tsx", "utf8");

test("responsive proposal review is driven by the same immutable proposed Site", () => {
  expect(visual).toContain("proposal.site");
  expect(visual).toContain("site={proposal.site}");
  expect(visual).toContain("path={proposal.path}");
});
