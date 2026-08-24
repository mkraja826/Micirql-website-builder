import { expect, test } from "@playwright/test";
import { deriveFunctionalArchitecture } from "../apps/builder/app/functional-architecture";
import { deriveBackendImplementationContract } from "../apps/builder/app/backend-implementation-contract";
import { createSupabasePaymentProbeRunner } from "../apps/builder/app/supabase-payment-probe-runner";

test("payment contract persists unique checkout and webhook idempotency keys", () => {
  const contract = deriveBackendImplementationContract(deriveFunctionalArchitecture({
    business_name: "Example Store",
    industry: "ecommerce",
    goals: ["sell products online"],
    required_capabilities: ["checkout", "payments"],
    notes: "Users sign in and pay online.",
  }));

  const orders = contract.tables.find((table) => table.name === "orders");
  const events = contract.tables.find((table) => table.name === "payment_events");
  expect(orders?.columns).toEqual(expect.arrayContaining([expect.objectContaining({ name: "idempotency_key", unique: true })]));
  expect(events?.columns).toEqual(expect.arrayContaining([expect.objectContaining({ name: "provider_event_id", unique: true })]));
});

test("payment probe passes when duplicate keys remain single rows", async () => {
  const contract = deriveBackendImplementationContract(deriveFunctionalArchitecture({
    business_name: "Example Store",
    industry: "ecommerce",
    goals: ["sell products online"],
    required_capabilities: ["checkout", "payments"],
    notes: "Users sign in and pay online.",
  }));

  const runner = createSupabasePaymentProbeRunner(async (_projectRef, sql) => {
    if (sql.includes("from public.\"orders\"")) return [{ count: 1 }];
    if (sql.includes("from public.\"payment_events\"")) return [{ count: 1 }];
    return [];
  });

  const result = await runner("preview-ref", contract);
  expect(result.paymentIdempotencyPassed).toBe(true);
  expect(result.errors).toEqual([]);
});

test("payment probe fails closed if duplicate webhook persistence is observed", async () => {
  const contract = deriveBackendImplementationContract(deriveFunctionalArchitecture({
    business_name: "Example Store",
    industry: "ecommerce",
    goals: ["sell products online"],
    required_capabilities: ["checkout", "payments"],
    notes: "Users sign in and pay online.",
  }));

  const runner = createSupabasePaymentProbeRunner(async (_projectRef, sql) => {
    if (sql.includes("from public.\"orders\"")) return [{ count: 1 }];
    if (sql.includes("from public.\"payment_events\"")) return [{ count: 2 }];
    return [];
  });

  const result = await runner("preview-ref", contract);
  expect(result.paymentIdempotencyPassed).toBe(false);
  expect(result.errors?.join(" ")).toContain("Duplicate provider webhook event");
});
