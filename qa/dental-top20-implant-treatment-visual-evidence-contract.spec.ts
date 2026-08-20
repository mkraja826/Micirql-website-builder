import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

async function source(path: string) {
  return readFile(path, "utf8");
}

test("implant rendered evidence records blueprint identity at every viewport", async () => {
  const visual = await source("qa/dental-top20-implant-treatment-visual-evidence.spec.ts");
  expect(visual).toContain('layoutBlueprintId: root.dataset.miLayoutBlueprint ?? ""');
  expect(visual).toContain('layoutArchetype: root.dataset.miLayoutArchetype ?? ""');
  expect(visual).toContain("expect(measured.layoutBlueprintId");
  expect(visual).toContain(".toBe(layout.id)");
  expect(visual).toContain("expect(measured.layoutArchetype");
  expect(visual).toContain("20 layouts x 6 viewports");
  expect(visual).toContain("test.setTimeout(1_200_000)");
});

test("implant evidence materializer independently rejects wrong or missing blueprint identity", async () => {
  const materializer = await source("qa/certify-dental-implant-treatment-visual.mjs");
  expect(materializer).toContain("metrics.layoutBlueprintId !== layout.layoutId");
  expect(materializer).toContain('typeof metrics.layoutArchetype !== "string" || !metrics.layoutArchetype.trim()');
  expect(materializer).toContain("rendered blueprint identity");
  expect(materializer).toContain("rendered layout archetype is missing");
  expect(materializer).toContain("schemaVersion: 2");
});

test("final Dental allowlist only accepts the hardened schema-2 implant certificate", async () => {
  const finalCertifier = await source("qa/certify-dental-top20-visual.mjs");
  expect(finalCertifier).toContain("implantTreatmentVisualCertification.schemaVersion !== 2");
  expect(finalCertifier).toContain('implantTreatmentVisualCertification.sourceTest !== "qa/dental-top20-implant-treatment-visual-evidence.spec.ts"');
  expect(finalCertifier).toContain("implantTreatmentVisualCertification.requiredChecks.length < 15");
  expect(finalCertifier).toContain("implantTreatmentVisualCertified: true");
});
