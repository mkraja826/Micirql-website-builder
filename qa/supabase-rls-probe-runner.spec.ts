import { expect, test } from "@playwright/test";
import { deriveFunctionalArchitecture } from "../apps/builder/app/functional-architecture";
import { deriveBackendImplementationContract } from "../apps/builder/app/backend-implementation-contract";
import { createSupabaseRlsProbeRunner } from "../apps/builder/app/supabase-rls-probe-runner";

test("proves own-row access and denies cross-user access", async () => {
  const architecture = deriveFunctionalArchitecture({
    business_name: "Probe Clinic",
    industry: "dental clinic",
    goals: ["patient login", "appointment booking"],
    required_capabilities: ["auth", "booking", "backend"],
  });
  const contract = deriveBackendImplementationContract(architecture);
  const calls: string[] = [];
  let scopedRead = 0;
  const runner = createSupabaseRlsProbeRunner(async (_projectRef, sql) => {
    calls.push(sql);
    if (/select count\(\*\)::int as count/.test(sql)) {
      scopedRead += 1;
      return [{ count: scopedRead === 1 ? 1 : 0 }];
    }
    return [];
  });

  const result = await runner("preview-ref", contract);
  expect(result.positiveRlsPassed).toBe(true);
  expect(result.negativeRlsPassed).toBe(true);
  expect(result.errors).toEqual([]);
  expect(calls.some((sql) => sql.includes("set local role authenticated"))).toBe(true);
  expect(calls.some((sql) => sql.includes("request.jwt.claims"))).toBe(true);
  expect(calls.some((sql) => sql.startsWith("delete from public."))).toBe(true);
});

test("fails closed when cross-user access is visible", async () => {
  const architecture = deriveFunctionalArchitecture({
    business_name: "Probe Clinic",
    industry: "dental clinic",
    goals: ["patient login", "appointment booking"],
    required_capabilities: ["auth", "booking", "backend"],
  });
  const contract = deriveBackendImplementationContract(architecture);
  const runner = createSupabaseRlsProbeRunner(async (_projectRef, sql) => {
    if (/select count\(\*\)::int as count/.test(sql)) return [{ count: 1 }];
    return [];
  });

  const result = await runner("preview-ref", contract);
  expect(result.positiveRlsPassed).toBe(true);
  expect(result.negativeRlsPassed).toBe(false);
  expect(result.errors?.join(" ")).toContain("Cross-user/cross-tenant");
});

test("leaves storage and payment evidence to their dedicated probes", async () => {
  const architecture = deriveFunctionalArchitecture({
    business_name: "Probe Store",
    industry: "ecommerce",
    goals: ["sell products online", "user login"],
    required_capabilities: ["checkout", "payments", "file uploads", "auth", "backend"],
  });
  const contract = deriveBackendImplementationContract(architecture);
  let scopedRead = 0;
  const runner = createSupabaseRlsProbeRunner(async (_projectRef, sql) => {
    if (/select count\(\*\)::int as count/.test(sql)) {
      scopedRead += 1;
      return [{ count: scopedRead === 1 ? 1 : 0 }];
    }
    return [];
  });

  const result = await runner("preview-ref", contract);
  expect(result.positiveRlsPassed).toBe(true);
  expect(result.negativeRlsPassed).toBe(true);
  expect(result.storageOwnershipPassed).toBeUndefined();
  expect(result.paymentIdempotencyPassed).toBeUndefined();
  expect(result.errors).toEqual([]);
});
