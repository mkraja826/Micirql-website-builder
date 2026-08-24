import { expect, test } from "@playwright/test";
import { deriveFunctionalArchitecture } from "../apps/builder/app/functional-architecture";
import { deriveBackendImplementationContract } from "../apps/builder/app/backend-implementation-contract";
import { generateSupabaseMigration } from "../apps/builder/app/supabase-migration-generator";
import {
  executeSupabaseStagingCertification,
  type SupabaseStagingAdapter,
} from "../apps/builder/app/supabase-staging-executor";

function appContract() {
  const architecture = deriveFunctionalArchitecture({
    business_name: "Pearl Dental",
    industry: "dental clinic",
    goals: ["appointment booking", "patient login", "admin dashboard"],
    required_capabilities: ["booking", "auth", "backend", "admin"],
    notes: "Patients sign in and staff manage bookings.",
  });
  return deriveBackendImplementationContract(architecture);
}

test("certifies an isolated staging migration only after schema and RLS probes pass", async () => {
  const contract = appContract();
  const artifact = generateSupabaseMigration(contract);
  const adapter: SupabaseStagingAdapter = {
    async applyMigration() {},
    async introspectSchema() {
      return {
        tables: contract.tables.map((table) => table.name),
        policies: contract.policies.map((policy) => ({ table: policy.table, name: policy.id })),
        buckets: contract.storageBuckets.map((bucket) => bucket.id),
      };
    },
    async runSecurityProbes() {
      return {
        positiveRlsPassed: true,
        negativeRlsPassed: true,
        storageOwnershipPassed: true,
        paymentIdempotencyPassed: true,
      };
    },
  };

  const result = await executeSupabaseStagingCertification({
    contract,
    artifact,
    target: { environment: "staging", projectRef: "staging-ref", productionProjectRef: "prod-ref" },
    adapter,
  });

  expect(result.certification.certified).toBe(true);
  expect(result.certification.productionApplyAllowed).toBe(true);
  expect(result.evidence.schemaIntrospectionPassed).toBe(true);
});

test("refuses to certify against the production Supabase project", async () => {
  const contract = appContract();
  const artifact = generateSupabaseMigration(contract);
  const adapter = {} as SupabaseStagingAdapter;

  await expect(executeSupabaseStagingCertification({
    contract,
    artifact,
    target: { environment: "staging", projectRef: "same-ref", productionProjectRef: "same-ref" },
    adapter,
  })).rejects.toThrow(/STAGING_PROJECT_MUST_DIFFER_FROM_PRODUCTION/);
});

test("fails certification when an expected policy is absent", async () => {
  const contract = appContract();
  const artifact = generateSupabaseMigration(contract);
  const adapter: SupabaseStagingAdapter = {
    async applyMigration() {},
    async introspectSchema() {
      return {
        tables: contract.tables.map((table) => table.name),
        policies: [],
        buckets: contract.storageBuckets.map((bucket) => bucket.id),
      };
    },
    async runSecurityProbes() {
      throw new Error("must not run when schema introspection fails");
    },
  };

  const result = await executeSupabaseStagingCertification({
    contract,
    artifact,
    target: { environment: "preview", projectRef: "preview-ref", productionProjectRef: "prod-ref" },
    adapter,
  });

  expect(result.certification.certified).toBe(false);
  expect(result.evidence.schemaIntrospectionPassed).toBe(false);
  expect(result.certification.issues.some((issue) => issue.code === "POLICY_COUNT_MISMATCH")).toBe(true);
});
