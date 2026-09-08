import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  evaluateRenderedVisualReceipt,
  type RenderedVisualCertificationReceipt,
} from "../apps/builder/app/publishable-draft-certification";

const siteId = "site-pearl";
const draftFingerprint = "draft-exact-123";

function receipt(overrides: Partial<RenderedVisualCertificationReceipt> = {}): RenderedVisualCertificationReceipt {
  return {
    siteId,
    draftFingerprint,
    passed: true,
    certifiedAt: "2026-09-08T05:00:00.000Z",
    viewports: ["mobile", "tablet", "desktop"],
    dimensions: ["first-screen", "typography", "responsive-composition", "image"],
    ...overrides,
  };
}

test("rendered visual evidence is exact-draft and fail closed", () => {
  expect(evaluateRenderedVisualReceipt(undefined, siteId, draftFingerprint)).toEqual({ certified: false, status: "missing" });

  const stale = evaluateRenderedVisualReceipt(receipt({ draftFingerprint: "older-draft" }), siteId, draftFingerprint);
  expect(stale.certified).toBe(false);
  expect(stale.status).toBe("failed");

  const wrongSite = evaluateRenderedVisualReceipt(receipt({ siteId: "other-site" }), siteId, draftFingerprint);
  expect(wrongSite.certified).toBe(false);
});

test("rendered visual evidence must cover every certified viewport and quality dimension", () => {
  const partialViewport = evaluateRenderedVisualReceipt(receipt({ viewports: ["mobile", "desktop"] }), siteId, draftFingerprint);
  expect(partialViewport.certified).toBe(false);

  const partialDimensions = evaluateRenderedVisualReceipt(receipt({ dimensions: ["first-screen", "typography", "image"] }), siteId, draftFingerprint);
  expect(partialDimensions.certified).toBe(false);

  const reportedFailure = evaluateRenderedVisualReceipt(receipt({ failures: ["tablet overflow"] }), siteId, draftFingerprint);
  expect(reportedFailure.certified).toBe(false);
});

test("complete exact-draft rendered evidence certifies", () => {
  const result = evaluateRenderedVisualReceipt(receipt(), siteId, draftFingerprint);
  expect(result.certified).toBe(true);
  expect(result.status).toBe("certified");
});

test("production publish is gated by the aggregate publishable draft contract", async () => {
  const route = await readFile(path.join(process.cwd(), "apps/builder/app/api/publish/route.ts"), "utf8");
  const orchestrator = await readFile(path.join(process.cwd(), "apps/builder/app/publishable-draft-certification.ts"), "utf8");

  expect(route).toContain("evaluatePublishableDraftCertification");
  expect(route).toContain('code: "PUBLISHABLE_DRAFT_REQUIRED"');
  expect(route).toContain("if (!publishableDraft.publishable)");
  expect(route).not.toContain("await evaluateFullStackPublishCertification({");

  expect(orchestrator).toContain("evaluateFinalGenerationAcceptance(input.site)");
  expect(orchestrator).toContain("evaluateFunctionalPublishGate(input.site, input.architecture)");
  expect(orchestrator).toContain("fingerprintPublishInput(input.site, input.architecture, input.backend)");
  expect(orchestrator).toContain("evaluateFullStackPublishCertification(input)");
  expect(orchestrator).toContain("renderedVisual.certified && fullStack.allowed");
});
