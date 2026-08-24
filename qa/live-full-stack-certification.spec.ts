import { expect, test } from "@playwright/test";
import {
  backendImplementationContractSchema,
  functionalArchitectureSchema,
} from "@micirql/schema";
import { executeFullStackRuntimeCertification } from "../apps/builder/app/full-stack-runtime-probe-executor";
import { createFullStackPlaywrightRuntimeAdapter } from "./full-stack-playwright-runtime-adapter";

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name}_REQUIRED`);
  return value;
}

function optionalIdentity(prefix: string) {
  const email = process.env[`${prefix}_EMAIL`]?.trim();
  const password = process.env[`${prefix}_PASSWORD`]?.trim();
  if (!email && !password) return undefined;
  if (!email || !password) throw new Error(`${prefix}_IDENTITY_INCOMPLETE`);
  return { email, password };
}

function parseJsonEnv(name: string) {
  const raw = requiredEnv(name);
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new Error(`${name}_INVALID_JSON`);
  }
}

test("certifies a real generated preview end to end", async ({ browser, request }) => {
  const architecture = functionalArchitectureSchema.parse(parseJsonEnv("MICIRQL_FULL_STACK_ARCHITECTURE_JSON"));
  const backend = backendImplementationContractSchema.parse(parseJsonEnv("MICIRQL_FULL_STACK_BACKEND_JSON"));
  const appBaseUrl = requiredEnv("MICIRQL_FULL_STACK_PREVIEW_URL");
  const productionBaseUrl = process.env.MICIRQL_FULL_STACK_PRODUCTION_URL?.trim() || undefined;

  const adapter = createFullStackPlaywrightRuntimeAdapter({
    browser,
    request,
    userA: optionalIdentity("MICIRQL_FULL_STACK_USER_A"),
    userB: optionalIdentity("MICIRQL_FULL_STACK_USER_B"),
    admin: optionalIdentity("MICIRQL_FULL_STACK_ADMIN"),
  });

  const result = await executeFullStackRuntimeCertification({
    architecture,
    backend,
    target: {
      environment: "preview",
      appBaseUrl,
      ...(productionBaseUrl ? { productionBaseUrl } : {}),
    },
    adapter,
  });

  await test.info().attach("full-stack-certification.json", {
    body: Buffer.from(JSON.stringify(result, null, 2)),
    contentType: "application/json",
  });

  expect(result.certification.certified, JSON.stringify(result.evidence, null, 2)).toBe(true);
});
