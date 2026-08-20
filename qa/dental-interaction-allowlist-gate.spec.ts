import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const root = process.cwd();

async function text(path: string) {
  return readFile(`${root}/${path}`, "utf8");
}

test("dental visual certification runs Builder and published-live interactions before emitting runtime allowlist", async () => {
  const pkg = JSON.parse(await text("package.json"));
  const command = String(pkg.scripts?.["qa:dental-visual"] ?? "");
  const interactionSpec = "qa/dental-rendered-interaction-certification.spec.ts";
  const liveInteractionSpec = "qa/live-rendered-interaction-parity.spec.ts";
  const interactionMaterializer = "node qa/certify-dental-interactions.mjs";
  const liveInteractionMaterializer = "node qa/certify-dental-live-interactions.mjs";
  const allowlistCertifier = "node qa/certify-dental-top20-visual.mjs";

  expect(command).toContain(interactionSpec);
  expect(command).toContain(liveInteractionSpec);
  expect(command).toContain(interactionMaterializer);
  expect(command).toContain(liveInteractionMaterializer);
  expect(command).toContain(allowlistCertifier);
  expect(command.indexOf(interactionSpec)).toBeLessThan(command.indexOf(interactionMaterializer));
  expect(command.indexOf(liveInteractionSpec)).toBeLessThan(command.indexOf(liveInteractionMaterializer));
  expect(command.indexOf(interactionMaterializer)).toBeLessThan(command.indexOf(allowlistCertifier));
  expect(command.indexOf(liveInteractionMaterializer)).toBeLessThan(command.indexOf(allowlistCertifier));
});

test("runtime allowlist certifier fails closed without same-commit Builder and live interaction evidence", async () => {
  const source = await text("qa/certify-dental-top20-visual.mjs");

  expect(source).toContain("interaction-certification.json");
  expect(source).toContain("live-interaction-certification.json");
  expect(source).toContain("shared-dental-rendered-interaction-v1");
  expect(source).toContain("published-live-rendered-interaction-v1");
  expect(source).toContain("interactionCertification.sourceCommit !== currentSha");
  expect(source).toContain("liveInteractionCertification.sourceCommit !== currentSha");
  expect(source).toContain("Published live Dental interaction certification is missing; runtime allowlist cannot be emitted.");
  expect(source).toContain("interactionCertified: true");
  expect(source).toContain("liveInteractionCertified: true");
  expect(source.indexOf("if (failures.length)")).toBeLessThan(source.indexOf("const runtimeAllowlist"));
});

test("published interaction certification is derived from generated live runtime CSS", async () => {
  const spec = await text("qa/live-rendered-interaction-parity.spec.ts");
  const generator = await text("apps/live/scripts/build-runtime-css.mjs");
  const route = await text("apps/live/app/__micirql/runtime.css/route.ts");

  expect(spec).toContain("@micirql/live");
  expect(spec).toContain("generate:runtime-css");
  expect(spec).toContain("apps/live/generated/runtime-css.ts");
  expect(spec).toContain("packages/sections/src/interaction-polish.css");
  expect(generator).toContain('const interactionPolishSource = "packages/sections/src/interaction-polish.css"');
  expect(route).toContain("MICIRQL_RUNTIME_CSS");
});

test("production deployment verifies all 20 layouts are Builder and live interaction-certified before secret upload", async () => {
  const workflow = await text(".github/workflows/deploy-builder.yml");

  expect(workflow).toContain("certification.requiredInteractionContract !== 'shared-dental-rendered-interaction-v1'");
  expect(workflow).toContain("certification.requiredLiveInteractionContract !== 'published-live-rendered-interaction-v1'");
  expect(workflow).toContain("entry.interactionCertified !== true");
  expect(workflow).toContain("entry.liveInteractionCertified !== true");
  expect(workflow).toContain("All 20 runtime Dental layouts are Builder + published-live interaction-certified for this commit.");

  const verifyIndex = workflow.indexOf("Verify runtime Dental certification allowlist");
  const uploadIndex = workflow.indexOf("Upload rendered Dental certification allowlist to Builder Worker");
  expect(verifyIndex).toBeGreaterThanOrEqual(0);
  expect(uploadIndex).toBeGreaterThan(verifyIndex);
});
