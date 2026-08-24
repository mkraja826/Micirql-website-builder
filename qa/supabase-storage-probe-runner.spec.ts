import { expect, test } from "@playwright/test";
import { createSupabaseStorageProbeRunner } from "../apps/builder/app/supabase-storage-probe-runner";
import { deriveFunctionalArchitecture } from "../apps/builder/app/functional-architecture";
import { deriveBackendImplementationContract } from "../apps/builder/app/backend-implementation-contract";

test("proves owner can access storage while a foreign user is denied", async () => {
  const contract = deriveBackendImplementationContract(deriveFunctionalArchitecture({
    business_name: "Storage Clinic",
    industry: "dental clinic",
    goals: ["patient login", "upload documents"],
    required_capabilities: ["auth", "file uploads", "backend"],
  }));

  let createUserCount = 0;
  let tokenCount = 0;
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = String(input);
    const auth = new Headers(init?.headers).get("authorization") ?? "";

    if (url.endsWith("/auth/v1/admin/users") && init?.method === "POST") {
      createUserCount += 1;
      return json({ id: createUserCount === 1 ? "user-a" : "user-b" });
    }
    if (url.includes("/auth/v1/token?grant_type=password")) {
      tokenCount += 1;
      return json({ access_token: tokenCount === 1 ? "token-a" : "token-b" });
    }
    if (url.includes("/storage/v1/object/user-assets/user-a/")) {
      if (init?.method === "POST" && auth === "Bearer token-a") return new Response("{}", { status: 200 });
      if (init?.method === "GET" && auth === "Bearer token-a") return new Response("probe", { status: 200 });
      if (init?.method === "GET" && auth === "Bearer token-b") return new Response("forbidden", { status: 404 });
      if (init?.method === "DELETE" && auth === "Bearer token-b") return new Response("forbidden", { status: 403 });
      if (init?.method === "DELETE" && auth === "Bearer token-a") return new Response("{}", { status: 200 });
    }
    if (url.includes("/auth/v1/admin/users/user-") && init?.method === "DELETE") return new Response("{}", { status: 200 });
    return new Response("unexpected", { status: 500 });
  };

  const runner = createSupabaseStorageProbeRunner({
    getApiKeys: async () => [
      { type: "publishable", apiKey: "publishable-key" },
      { type: "secret", apiKey: "secret-key" },
    ],
    fetchImpl,
  });

  const result = await runner("previewref", contract);
  expect(result.storageOwnershipPassed).toBe(true);
  expect(result.errors).toEqual([]);
});

test("fails closed when preview project keys needed for storage probes are unavailable", async () => {
  const contract = deriveBackendImplementationContract(deriveFunctionalArchitecture({
    business_name: "Storage Clinic",
    industry: "dental clinic",
    goals: ["upload documents"],
    required_capabilities: ["auth", "file uploads", "backend"],
  }));
  const runner = createSupabaseStorageProbeRunner({ getApiKeys: async () => [] });
  const result = await runner("previewref", contract);
  expect(result.storageOwnershipPassed).toBe(false);
  expect(result.errors?.join(" ")).toContain("requires both publishable/anon and secret/service_role");
});

function json(value: unknown) {
  return new Response(JSON.stringify(value), { status: 200, headers: { "content-type": "application/json" } });
}
