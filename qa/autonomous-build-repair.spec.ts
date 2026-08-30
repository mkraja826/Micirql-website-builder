import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const route = fs.readFileSync(path.join(root, "apps/builder/app/api/onboarding/architect/route.ts"), "utf8");
const correction = fs.readFileSync(path.join(root, "apps/builder/app/final-generation-correction.ts"), "utf8");

test("architect quality failures enter deterministic repair before rejection", () => {
  expect(route).toContain('stage = "quality-repair"');
  expect(route).toContain("applyFinalGenerationCorrection(finalDraft.snapshot)");
  expect(route).toContain('stage = "functional-repair"');
  expect(route).toContain("repairFunctionalPublishIssues(finalDraft.snapshot)");
  expect(route).toContain("GENERATED_SITE_QUALITY_FAILED_AFTER_AUTONOMOUS_REPAIR");
  expect(route).toContain("GENERATED_FUNCTIONAL_QUALITY_FAILED_AFTER_AUTONOMOUS_REPAIR");
});

test("autonomous repairs persist only completed schema-valid correction results and re-read the draft", () => {
  expect(route).toContain("if (correction.applied) {");
  expect(route).toContain("snapshot: correction.site");
  expect(route).toContain("if (repair.repaired) {");
  expect(route).toContain("snapshot: repair.site");
  expect(route.match(/getSupabaseDraft\(request, workspaceId, siteId\)/g)?.length ?? 0).toBeGreaterThanOrEqual(4);
  expect(route).toContain("generatedQuality = evaluateGeneratedSiteQuality(finalDraft.snapshot, businessName)");
  expect(route).toContain("functionalQuality = evaluateFunctionalPublishGate(finalDraft.snapshot, functionalArchitecture)");
});

test("general correction loop is bounded and stops on no-change", () => {
  expect(correction).toContain("const MAX_RECOVERY_PASSES = 3");
  expect(correction).toContain("pass <= MAX_RECOVERY_PASSES");
  expect(correction).toContain("if (JSON.stringify(candidate) === beforePass) break");
});

test("repair activity is exposed through build observability", () => {
  expect(route).toContain("autonomousRepair");
  expect(route).toContain("Autonomous deterministic repair applied");
  expect(route).toContain("outcome = recoveryReason ? \"recovered\"");
  expect(route).toContain("details: { generatedMediaCount, exactPlacement, functionalBindings, functionalArchitecture, functionalQuality, contentWarning, mediaWarning, autonomousRepair");
});
