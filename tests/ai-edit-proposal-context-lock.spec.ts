import { expect, test } from "@playwright/test";
import fs from "node:fs";

const assistant = fs.readFileSync("apps/builder/app/ai-editor-assistant.tsx", "utf8");

test("AI proposal captures the exact draft and target used to generate it", () => {
  expect(assistant).toContain("type ProposalContext = { site: Site; pageId: string; sectionId?: string; label: string }");
  expect(assistant).toContain("const context: ProposalContext = { site, pageId");
  expect(assistant).toContain("setProposalContext(context); setProposal(payload)");
});

test("proposal becomes stale when draft or selection changes", () => {
  expect(assistant).toContain("proposalContext.site !== site");
  expect(assistant).toContain("proposalContext.pageId !== pageId");
  expect(assistant).toContain("proposalContext.sectionId !== sectionId");
  expect(assistant).toContain("if (!proposal || !proposalContext || proposalStale) return");
});

test("stale proposal preview remains pinned to its original context", () => {
  expect(assistant).toContain("site={previewContext.site}");
  expect(assistant).toContain("pageId={previewContext.pageId}");
  expect(assistant).toContain("target={previewContext.label}");
});

test("stale section-add proposal cannot escape through design selection", () => {
  expect(assistant).toContain("if (pendingSectionAdd && proposalContext)");
  expect(assistant).toContain("if (proposalStale) return <section");
  expect(assistant).toContain("if (proposalStale) return;");
});

test("stale proposal visibly disables its mutation action", () => {
  expect(assistant).toContain("disabled={proposalStale}");
  expect(assistant).toContain("This proposal is out of date because the draft or selection changed.");
});
