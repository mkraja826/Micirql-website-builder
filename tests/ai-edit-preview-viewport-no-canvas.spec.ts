import { expect, test } from "@playwright/test";
import fs from "node:fs";

const visual = fs.readFileSync("apps/builder/app/ai-edit-visual-preview.tsx", "utf8");

test("non-canvas proposals do not show meaningless device controls", () => {
  const proposalGuard = visual.indexOf("{proposal.site ? <>");
  const picker = visual.indexOf('aria-label="Proposal preview device"');
  expect(proposalGuard).toBeGreaterThan(-1);
  expect(picker).toBeGreaterThan(proposalGuard);
});
