import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const draftRoute = fs.readFileSync(path.join(root, "apps/builder/app/api/drafts/route.ts"), "utf8");

test("draft saves enforce factual grounding before persistence", () => {
  expect(draftRoute).toContain("groundSiteContent");
  expect(draftRoute).toContain("loadGroundingFacts");
  expect(draftRoute).toContain("business_onboarding_profiles");
  expect(draftRoute).toContain('code:"CONTENT_GROUNDING_NOT_READY"');
  expect(draftRoute).toContain("if(!grounding.grounded)");
  expect(draftRoute.indexOf("groundSiteContent(snapshot,groundingFacts)")).toBeLessThan(draftRoute.indexOf("saveSupabaseDraft(request"));
});

test("saved locked facts are restored for edit-time grounding", () => {
  expect(draftRoute).toContain('labelledFacts(notes,"People/team")');
  expect(draftRoute).toContain('labelledFacts(notes,"Credentials")');
  expect(draftRoute).toContain('labelledFacts(notes,"Claims/statistics/guarantees")');
  expect(draftRoute).toContain('labelledFacts(notes,"Prices")');
});
