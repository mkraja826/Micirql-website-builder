import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const root = process.cwd();

async function text(path: string) {
  return readFile(`${root}/${path}`, "utf8");
}

test("dental visual certification runs rendered interactions before emitting runtime allowlist", async () => {
  const pkg = JSON.parse(await text("package.json"));
  const command = String(pkg.scripts?.["qa:dental-visual"] ?? "");
  const interactionSpec = "qa/dental-rendered-interaction-certification.spec.ts";
  const interactionMaterializer = "node qa/certify-dental-interactions.mjs";
  const allowlistCertifier = "node qa/certify-dental-top20-visual.mjs";

  expect(command).toContain(interactionSpec);
  expect(command).toContain(interactionMaterializer);
  expect(command).toContain(allowlistCertifier);
  expect(command.indexOf(interactionSpec)).toBeLessThan(command.indexOf(interactionMaterializer));
  expect(command.indexOf(interactionMaterializer)).toBeLessThan(command.indexOf(allowlistCertifier));
});

test("runtime allowlist certifier fails closed without same-commit interaction evidence", async () => {
  const source = await text("qa/certify-dental-top20-visual.mjs");

  expect(source).toContain("interaction-certification.json");
  expect(source).toContain("shared-dental-rendered-interaction-v1");
  expect(source).toContain("interactionCertification.sourceCommit !== currentSha");
  expect(source).toContain("runtime allowlist cannot be emitted");
  expect(source).toContain("interactionCertified: true");
  expect(source.indexOf("if (failures.length)")).toBeLessThan(source.indexOf("const runtimeAllowlist"));
});

test("production deployment verifies all 20 layouts are interaction-certified before secret upload", async () => {
  const workflow = await text(".github/workflows/deploy-builder.yml");

  expect(workflow).toContain("certification.requiredInteractionContract !== 'shared-dental-rendered-interaction-v1'");
  expect(workflow).toContain("entry.interactionCertified !== true");
  expect(workflow).toContain("All 20 runtime Dental layouts are interaction-certified for this commit.");

  const verifyIndex = workflow.indexOf("Verify runtime Dental certification allowlist");
  const uploadIndex = workflow.indexOf("Upload rendered Dental certification allowlist to Builder Worker");
  expect(verifyIndex).toBeGreaterThanOrEqual(0);
  expect(uploadIndex).toBeGreaterThan(verifyIndex);
});
