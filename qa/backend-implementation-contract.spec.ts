import { expect, test } from "@playwright/test";
import { deriveFunctionalArchitecture } from "../apps/builder/app/functional-architecture";
import { deriveBackendImplementationContract } from "../apps/builder/app/backend-implementation-contract";

test("turns booking auth admin and uploads into concrete Supabase requirements", () => {
  const architecture = deriveFunctionalArchitecture({
    business_name: "Example Clinic",
    industry: "dental clinic",
    goals: ["Allow patients to book appointments"],
    required_capabilities: ["login", "admin dashboard", "file uploads", "notifications"],
    notes: "Patients have accounts. Staff manage bookings from an admin dashboard and upload documents.",
  });
  const contract = deriveBackendImplementationContract(architecture);

  expect(contract.provider).toBe("supabase");
  expect(contract.requiresAuth).toBe(true);
  expect(contract.requiresRls).toBe(true);
  expect(contract.tables.some((table) => table.name === "bookings" && table.rlsEnabled)).toBe(true);
  expect(contract.routes).toEqual(expect.arrayContaining([
    expect.objectContaining({ method: "POST", path: "/api/bookings", serverValidation: true }),
    expect.objectContaining({ method: "POST", path: "/api/assets/upload", auth: "authenticated" }),
  ]));
  expect(contract.storageBuckets).toEqual(expect.arrayContaining([
    expect.objectContaining({ id: "user-assets", public: false, ownerScoped: true }),
  ]));
  expect(contract.acceptanceChecks.some((check) => check.id === "rls-negative-test")).toBe(true);
  expect(contract.acceptanceChecks.some((check) => check.id === "upload-ownership")).toBe(true);
});

test("payment architecture requires idempotent server routes and verified webhook integration", () => {
  const architecture = deriveFunctionalArchitecture({
    business_name: "Example Store",
    industry: "ecommerce",
    goals: ["Sell products online"],
    required_capabilities: ["checkout", "payments", "subscription"],
    notes: "Users sign in and pay online.",
  });
  const contract = deriveBackendImplementationContract(architecture);

  expect(contract.routes).toEqual(expect.arrayContaining([
    expect.objectContaining({ id: "payment-create", idempotent: true, auth: "authenticated" }),
    expect.objectContaining({ id: "payment-webhook", idempotent: true, auth: "webhook" }),
  ]));
  expect(contract.integrations).toEqual(expect.arrayContaining([
    expect.objectContaining({ id: "payments", required: true, secretsServerOnly: true, webhookVerificationRequired: true }),
  ]));
  expect(contract.acceptanceChecks.some((check) => check.id === "payment-idempotency")).toBe(true);
});

test("simple marketing site does not invent a backend", () => {
  const architecture = deriveFunctionalArchitecture({
    business_name: "Example Studio",
    industry: "creative studio",
    goals: ["Showcase portfolio"],
    required_capabilities: [],
    notes: "Static portfolio website with no login, forms or app backend.",
  });
  const contract = deriveBackendImplementationContract(architecture);

  expect(architecture.backendRequired).toBe(false);
  expect(contract.tables).toHaveLength(0);
  expect(contract.routes).toHaveLength(0);
  expect(contract.requiresAuth).toBe(false);
  expect(contract.requiresRls).toBe(false);
});
