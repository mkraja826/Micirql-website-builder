import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const root = process.cwd();

async function text(path: string) {
  return readFile(`${root}/${path}`, "utf8");
}

test("dental visual certification runs Builder and published-live functional interactions before emitting runtime allowlist", async () => {
  const pkg = JSON.parse(await text("package.json"));
  const command = String(pkg.scripts?.["qa:dental-visual"] ?? "");
  const interactionSpec = "qa/dental-rendered-interaction-certification.spec.ts";
  const liveInteractionSpec = "qa/live-rendered-interaction-parity.spec.ts";
  const liveFunctionalSpec = "qa/live-functional-interaction-certification.spec.ts";
  const interactionMaterializer = "node qa/certify-dental-interactions.mjs";
  const liveInteractionMaterializer = "node qa/certify-dental-live-interactions.mjs";
  const allowlistCertifier = "node qa/certify-dental-top20-visual.mjs";

  expect(command).toContain(interactionSpec);
  expect(command).toContain(liveInteractionSpec);
  expect(command).toContain(liveFunctionalSpec);
  expect(command).toContain(interactionMaterializer);
  expect(command).toContain(liveInteractionMaterializer);
  expect(command).toContain(allowlistCertifier);
  expect(command.indexOf(interactionSpec)).toBeLessThan(command.indexOf(interactionMaterializer));
  expect(command.indexOf(liveInteractionSpec)).toBeLessThan(command.indexOf(liveInteractionMaterializer));
  expect(command.indexOf(liveFunctionalSpec)).toBeLessThan(command.indexOf(liveInteractionMaterializer));
  expect(command.indexOf(interactionMaterializer)).toBeLessThan(command.indexOf(allowlistCertifier));
  expect(command.indexOf(liveInteractionMaterializer)).toBeLessThan(command.indexOf(allowlistCertifier));
});

test("runtime allowlist certifier fails closed without same-commit Builder and live functional interaction evidence", async () => {
  const source = await text("qa/certify-dental-top20-visual.mjs");

  expect(source).toContain("interaction-certification.json");
  expect(source).toContain("live-interaction-certification.json");
  expect(source).toContain("shared-dental-rendered-interaction-v1");
  expect(source).toContain("published-live-functional-interaction-v2");
  expect(source).toContain("qa/live-functional-interaction-certification.spec.ts");
  expect(source).toContain("interactionCertification.sourceCommit !== currentSha");
  expect(source).toContain("liveInteractionCertification.sourceCommit !== currentSha");
  expect(source).toContain("Published live Dental interaction certification is missing; runtime allowlist cannot be emitted.");
  expect(source).toContain("interactionCertified: true");
  expect(source).toContain("liveInteractionCertified: true");
  expect(source).toContain("liveFunctionalInteractionCertified: true");
  expect(source.indexOf("if (failures.length)")).toBeLessThan(source.indexOf("const runtimeAllowlist"));
});

test("published interaction certification is derived from generated live runtime CSS and the real form-feedback script", async () => {
  const interactionSpec = await text("qa/live-rendered-interaction-parity.spec.ts");
  const functionalSpec = await text("qa/live-functional-interaction-certification.spec.ts");
  const generator = await text("apps/live/scripts/build-runtime-css.mjs");
  const route = await text("apps/live/app/__micirql/runtime.css/route.ts");

  expect(interactionSpec).toContain("@micirql/live");
  expect(interactionSpec).toContain("generate:runtime-css");
  expect(interactionSpec).toContain("apps/live/generated/runtime-css.ts");
  expect(interactionSpec).toContain("packages/sections/src/interaction-polish.css");
  expect(functionalSpec).toContain("packages/live-runtime/src/index.ts");
  expect(functionalSpec).toContain("publishedFormFeedbackScript");
  expect(functionalSpec).toContain("appointment.request");
  expect(functionalSpec).toContain("data-mi-form-status");
  expect(generator).toContain('const interactionPolishSource = "packages/sections/src/interaction-polish.css"');
  expect(route).toContain("MICIRQL_RUNTIME_CSS");
});

test("production deployment verifies all 20 layouts are Builder and live functional interaction-certified before secret upload", async () => {
  const workflow = await text(".github/workflows/deploy-builder.yml");

  expect(workflow).toContain("certification.requiredInteractionContract !== 'shared-dental-rendered-interaction-v1'");
  expect(workflow).toContain("certification.requiredLiveInteractionContract !== 'published-live-functional-interaction-v2'");
  expect(workflow).toContain("entry.interactionCertified !== true");
  expect(workflow).toContain("entry.liveInteractionCertified !== true");
  expect(workflow).toContain("entry.liveFunctionalInteractionCertified !== true");
  expect(workflow).toContain("All 20 runtime Dental layouts are Builder + published-live functional-interaction certified for this commit.");

  const verifyIndex = workflow.indexOf("Verify runtime Dental certification allowlist");
  const uploadIndex = workflow.indexOf("Upload rendered Dental certification allowlist to Builder Worker");
  expect(verifyIndex).toBeGreaterThanOrEqual(0);
  expect(uploadIndex).toBeGreaterThan(verifyIndex);
});
