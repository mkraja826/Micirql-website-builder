import { expect, test } from "@playwright/test";
import { createSupabaseManagementProvider } from "../apps/builder/app/supabase-management-provider";

function jsonResponse(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });
}

test("creates an isolated preview branch, waits for readiness and deletes it", async () => {
  const calls: Array<{ url: string; method: string; body?: string }> = [];
  let branchChecks = 0;
  const provider = createSupabaseManagementProvider({
    accessToken: "test-token",
    pollIntervalMs: 250,
    readyTimeoutMs: 5_000,
    fetchImpl: (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, method: init?.method ?? "GET", ...(typeof init?.body === "string" ? { body: init.body } : {}) });
      if (url.endsWith("/v1/projects/prod-ref/branches") && init?.method === "POST") {
        return jsonResponse({ name: "micirql-cert-1", project_ref: "preview-ref", parent_project_ref: "prod-ref", status: "CREATING_PROJECT" }, 201);
      }
      if (url.endsWith("/v1/branches/preview-ref")) {
        branchChecks += 1;
        return jsonResponse({ status: branchChecks > 1 ? "ACTIVE_HEALTHY" : "CREATING_PROJECT" });
      }
      if (url.endsWith("/v1/branches/preview-ref?force=true") && init?.method === "DELETE") return jsonResponse({ message: "ok" });
      return jsonResponse({ message: "unexpected" }, 404);
    }) as typeof fetch,
  });

  const branch = await provider.createPreviewBranch("prod-ref", "micirql-cert-1");
  expect(branch.projectRef).toBe("preview-ref");
  expect(branch.parentProjectRef).toBe("prod-ref");
  await provider.deletePreviewBranch(branch.projectRef);
  expect(calls.some((call) => call.url.endsWith("/v1/branches/preview-ref?force=true") && call.method === "DELETE")).toBeTruthy();
});

test("staging adapter uses Management API query endpoints for migration and introspection", async () => {
  const queries: string[] = [];
  const provider = createSupabaseManagementProvider({
    accessToken: "test-token",
    fetchImpl: (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const body = typeof init?.body === "string" ? JSON.parse(init.body) as { query?: string } : {};
      if (body.query) queries.push(body.query);
      if (url.endsWith("/database/query") && init?.method === "POST") return jsonResponse([], 201);
      if (url.endsWith("/database/query/read-only") && init?.method === "POST") {
        if (/pg_tables/.test(body.query ?? "")) return jsonResponse([{ tablename: "bookings" }], 201);
        if (/pg_policies/.test(body.query ?? "")) return jsonResponse([{ tablename: "bookings", policyname: "booking-select" }], 201);
        if (/storage\.buckets/.test(body.query ?? "")) return jsonResponse([{ id: "user-assets" }], 201);
      }
      return jsonResponse({ message: "unexpected" }, 404);
    }) as typeof fetch,
  });

  const adapter = provider.createStagingAdapter();
  await adapter.applyMigration("preview-ref", "begin; select 1; commit;");
  const snapshot = await adapter.introspectSchema("preview-ref");
  expect(snapshot.tables).toEqual(["bookings"]);
  expect(snapshot.policies).toEqual([{ table: "bookings", name: "booking-select" }]);
  expect(snapshot.buckets).toEqual(["user-assets"]);
  expect(queries.some((query) => query.includes("begin; select 1; commit;"))).toBeTruthy();
});

test("built-in security probes remain neutral when the contract has no security requirements", async () => {
  const provider = createSupabaseManagementProvider({
    accessToken: "test-token",
    fetchImpl: (async () => jsonResponse([])) as typeof fetch,
  });
  const result = await provider.createStagingAdapter().runSecurityProbes("preview-ref", {
    version: "1.0",
    provider: "supabase",
    tables: [], policies: [], routes: [], storageBuckets: [], jobs: [], integrations: [], acceptanceChecks: [],
    requiresAuth: false, requiresRls: false, requiresSecrets: false, notes: [],
  });
  expect(result.errors).toEqual([]);
  expect(result.positiveRlsPassed).toBeUndefined();
  expect(result.negativeRlsPassed).toBeUndefined();
  expect(result.storageOwnershipPassed).toBe(true);
  expect(result.paymentIdempotencyPassed).toBe(true);
});
