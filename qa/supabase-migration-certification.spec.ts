import { expect, test } from "@playwright/test";
import { deriveFunctionalArchitecture } from "../apps/builder/app/functional-architecture";
import { deriveBackendImplementationContract } from "../apps/builder/app/backend-implementation-contract";
import { generateSupabaseMigration } from "../apps/builder/app/supabase-migration-generator";
import { certifySupabaseMigration } from "../apps/builder/app/supabase-migration-certification";

function appFixture() {
  const architecture = deriveFunctionalArchitecture({
    business_name: "Example Clinic",
    industry: "dental clinic",
    goals: ["appointment booking", "patient login", "admin dashboard"],
    required_capabilities: ["booking", "auth", "backend", "admin", "file upload"],
    notes: "Patients upload documents and staff manage bookings.",
  });
  const contract = deriveBackendImplementationContract(architecture);
  return { contract, artifact: generateSupabaseMigration(contract) };
}

test("certifies a staging migration only after schema and RLS evidence pass", () => {
  const { contract, artifact } = appFixture();
  const result = certifySupabaseMigration(contract, artifact, {
    environment: "staging",
    migrationApplied: true,
    schemaIntrospectionPassed: true,
    observedTableCount: artifact.tableCount,
    observedPolicyCount: artifact.policyCount,
    observedBucketCount: artifact.bucketCount,
    positiveRlsPassed: true,
    negativeRlsPassed: true,
    storageOwnershipPassed: true,
  });

  expect(result.certified).toBe(true);
  expect(result.productionApplyAllowed).toBe(true);
  expect(result.issues).toEqual([]);
});

test("blocks production apply when negative RLS evidence is missing", () => {
  const { contract, artifact } = appFixture();
  const result = certifySupabaseMigration(contract, artifact, {
    environment: "preview",
    migrationApplied: true,
    schemaIntrospectionPassed: true,
    observedTableCount: artifact.tableCount,
    observedPolicyCount: artifact.policyCount,
    observedBucketCount: artifact.bucketCount,
    positiveRlsPassed: true,
    negativeRlsPassed: false,
    storageOwnershipPassed: true,
  });

  expect(result.certified).toBe(false);
  expect(result.productionApplyAllowed).toBe(false);
  expect(result.issues.some((issue) => issue.code === "RLS_NEGATIVE_TEST_FAILED")).toBe(true);
});

test("never uses production itself as the migration certification environment", () => {
  const { contract, artifact } = appFixture();
  const result = certifySupabaseMigration(contract, artifact, {
    environment: "production",
    migrationApplied: true,
    schemaIntrospectionPassed: true,
    observedTableCount: artifact.tableCount,
    observedPolicyCount: artifact.policyCount,
    observedBucketCount: artifact.bucketCount,
    positiveRlsPassed: true,
    negativeRlsPassed: true,
    storageOwnershipPassed: true,
  });

  expect(result.certified).toBe(false);
  expect(result.issues.some((issue) => issue.code === "PRODUCTION_CERTIFICATION_FORBIDDEN")).toBe(true);
});

test("requires payment idempotency evidence when the backend contract requires it", () => {
  const architecture = deriveFunctionalArchitecture({
    business_name: "Example Store",
    industry: "ecommerce",
    goals: ["sell online"],
    required_capabilities: ["login", "checkout", "payments"],
  });
  const contract = deriveBackendImplementationContract(architecture);
  const artifact = generateSupabaseMigration(contract);
  const result = certifySupabaseMigration(contract, artifact, {
    environment: "staging",
    migrationApplied: true,
    schemaIntrospectionPassed: true,
    observedTableCount: artifact.tableCount,
    observedPolicyCount: artifact.policyCount,
    observedBucketCount: artifact.bucketCount,
    positiveRlsPassed: true,
    negativeRlsPassed: true,
    paymentIdempotencyPassed: false,
  });

  expect(result.certified).toBe(false);
  expect(result.issues.some((issue) => issue.code === "PAYMENT_IDEMPOTENCY_TEST_FAILED")).toBe(true);
});
