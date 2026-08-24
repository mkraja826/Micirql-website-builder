import type { BackendImplementationContract } from "@micirql/schema";
import type { SupabaseMigrationArtifact } from "./supabase-migration-generator";

export type MigrationCertificationEvidence = {
  environment: "preview" | "staging" | "production";
  migrationApplied: boolean;
  schemaIntrospectionPassed: boolean;
  observedTableCount: number;
  observedPolicyCount: number;
  observedBucketCount: number;
  positiveRlsPassed?: boolean;
  negativeRlsPassed?: boolean;
  storageOwnershipPassed?: boolean;
  paymentIdempotencyPassed?: boolean;
  applyErrors?: string[];
};

export type MigrationCertificationIssue = {
  code:
    | "PRODUCTION_CERTIFICATION_FORBIDDEN"
    | "MIGRATION_NOT_APPLIED"
    | "SCHEMA_INTROSPECTION_FAILED"
    | "TABLE_COUNT_MISMATCH"
    | "POLICY_COUNT_MISMATCH"
    | "BUCKET_COUNT_MISMATCH"
    | "RLS_POSITIVE_TEST_FAILED"
    | "RLS_NEGATIVE_TEST_FAILED"
    | "STORAGE_OWNERSHIP_TEST_FAILED"
    | "PAYMENT_IDEMPOTENCY_TEST_FAILED"
    | "MIGRATION_APPLY_ERROR";
  message: string;
};

export type MigrationCertificationResult = {
  certified: boolean;
  productionApplyAllowed: boolean;
  issues: MigrationCertificationIssue[];
  warnings: string[];
};

export function certifySupabaseMigration(
  contract: BackendImplementationContract,
  artifact: SupabaseMigrationArtifact,
  evidence: MigrationCertificationEvidence,
): MigrationCertificationResult {
  const issues: MigrationCertificationIssue[] = [];

  if (evidence.environment === "production") {
    issues.push({
      code: "PRODUCTION_CERTIFICATION_FORBIDDEN",
      message: "Migration certification must run against preview or staging, never the production database.",
    });
  }

  if (!evidence.migrationApplied) {
    issues.push({ code: "MIGRATION_NOT_APPLIED", message: "The generated migration was not successfully applied to the certification database." });
  }
  if (!evidence.schemaIntrospectionPassed) {
    issues.push({ code: "SCHEMA_INTROSPECTION_FAILED", message: "Post-migration schema introspection did not pass." });
  }
  if (evidence.observedTableCount !== artifact.tableCount) {
    issues.push({ code: "TABLE_COUNT_MISMATCH", message: `Expected ${artifact.tableCount} generated tables but observed ${evidence.observedTableCount}.` });
  }
  if (evidence.observedPolicyCount !== artifact.policyCount) {
    issues.push({ code: "POLICY_COUNT_MISMATCH", message: `Expected ${artifact.policyCount} generated RLS policies but observed ${evidence.observedPolicyCount}.` });
  }
  if (evidence.observedBucketCount !== artifact.bucketCount) {
    issues.push({ code: "BUCKET_COUNT_MISMATCH", message: `Expected ${artifact.bucketCount} generated storage buckets but observed ${evidence.observedBucketCount}.` });
  }

  if (contract.requiresRls) {
    if (evidence.positiveRlsPassed !== true) {
      issues.push({ code: "RLS_POSITIVE_TEST_FAILED", message: "Authorized users were not proven able to access rows permitted by RLS." });
    }
    if (evidence.negativeRlsPassed !== true) {
      issues.push({ code: "RLS_NEGATIVE_TEST_FAILED", message: "Cross-user or cross-tenant access was not proven to be denied by RLS." });
    }
  }

  if (contract.storageBuckets.some((bucket) => bucket.ownerScoped) && evidence.storageOwnershipPassed !== true) {
    issues.push({ code: "STORAGE_OWNERSHIP_TEST_FAILED", message: "Owner-scoped storage access has not passed positive and negative ownership tests." });
  }

  const requiresPaymentIdempotency = contract.acceptanceChecks.some((check) => check.required && check.id === "payment-idempotency");
  if (requiresPaymentIdempotency && evidence.paymentIdempotencyPassed !== true) {
    issues.push({ code: "PAYMENT_IDEMPOTENCY_TEST_FAILED", message: "Duplicate checkout/webhook execution has not been proven idempotent." });
  }

  for (const error of evidence.applyErrors ?? []) {
    if (error.trim()) issues.push({ code: "MIGRATION_APPLY_ERROR", message: error.trim() });
  }

  const certified = issues.length === 0;
  return {
    certified,
    productionApplyAllowed: certified && evidence.environment !== "production",
    issues,
    warnings: artifact.warnings,
  };
}
