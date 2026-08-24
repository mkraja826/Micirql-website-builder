import type { BackendImplementationContract } from "@micirql/schema";
import type { SupabaseMigrationArtifact } from "./supabase-migration-generator";
import {
  certifySupabaseMigration,
  type MigrationCertificationEvidence,
  type MigrationCertificationResult,
} from "./supabase-migration-certification";

export type SupabaseCertificationEnvironment = {
  environment: "preview" | "staging";
  projectRef: string;
  productionProjectRef?: string;
};

export type SupabaseSchemaSnapshot = {
  tables: string[];
  policies: Array<{ table: string; name: string }>;
  buckets: string[];
};

export type SupabaseCertificationProbeResult = {
  positiveRlsPassed?: boolean;
  negativeRlsPassed?: boolean;
  storageOwnershipPassed?: boolean;
  paymentIdempotencyPassed?: boolean;
  errors?: string[];
};

export type SupabaseStagingAdapter = {
  applyMigration: (projectRef: string, sql: string) => Promise<void>;
  introspectSchema: (projectRef: string) => Promise<SupabaseSchemaSnapshot>;
  runSecurityProbes: (
    projectRef: string,
    contract: BackendImplementationContract,
  ) => Promise<SupabaseCertificationProbeResult>;
};

export type SupabaseStagingExecutionResult = {
  evidence: MigrationCertificationEvidence;
  certification: MigrationCertificationResult;
  snapshot?: SupabaseSchemaSnapshot;
};

export async function executeSupabaseStagingCertification(input: {
  contract: BackendImplementationContract;
  artifact: SupabaseMigrationArtifact;
  target: SupabaseCertificationEnvironment;
  adapter: SupabaseStagingAdapter;
}): Promise<SupabaseStagingExecutionResult> {
  const { contract, artifact, target, adapter } = input;
  assertIsolatedTarget(target);

  const errors: string[] = [];
  let migrationApplied = false;
  let schemaIntrospectionPassed = false;
  let snapshot: SupabaseSchemaSnapshot | undefined;
  let probes: SupabaseCertificationProbeResult = {};

  try {
    await adapter.applyMigration(target.projectRef, artifact.sql);
    migrationApplied = true;
  } catch (error) {
    errors.push(`Migration apply failed: ${errorMessage(error)}`);
  }

  if (migrationApplied) {
    try {
      snapshot = await adapter.introspectSchema(target.projectRef);
      schemaIntrospectionPassed = validateSnapshot(contract, snapshot).length === 0;
      errors.push(...validateSnapshot(contract, snapshot));
    } catch (error) {
      errors.push(`Schema introspection failed: ${errorMessage(error)}`);
    }
  }

  if (migrationApplied && schemaIntrospectionPassed) {
    try {
      probes = await adapter.runSecurityProbes(target.projectRef, contract);
      errors.push(...(probes.errors ?? []).filter(Boolean));
    } catch (error) {
      errors.push(`Security probes failed: ${errorMessage(error)}`);
    }
  }

  const expectedTableNames = new Set(contract.tables.map((table) => table.name));
  const expectedPolicyIds = new Set(contract.policies.map((policy) => policy.id));
  const expectedBucketIds = new Set(contract.storageBuckets.map((bucket) => bucket.id));
  const observedTables = snapshot?.tables.filter((table) => expectedTableNames.has(table)) ?? [];
  const observedPolicies = snapshot?.policies.filter((policy) => expectedPolicyIds.has(policy.name)) ?? [];
  const observedBuckets = snapshot?.buckets.filter((bucket) => expectedBucketIds.has(bucket)) ?? [];

  const evidence: MigrationCertificationEvidence = {
    environment: target.environment,
    migrationApplied,
    schemaIntrospectionPassed,
    observedTableCount: observedTables.length,
    observedPolicyCount: observedPolicies.length,
    observedBucketCount: observedBuckets.length,
    positiveRlsPassed: probes.positiveRlsPassed,
    negativeRlsPassed: probes.negativeRlsPassed,
    storageOwnershipPassed: probes.storageOwnershipPassed,
    paymentIdempotencyPassed: probes.paymentIdempotencyPassed,
    applyErrors: errors,
  };

  return {
    evidence,
    certification: certifySupabaseMigration(contract, artifact, evidence),
    ...(snapshot ? { snapshot } : {}),
  };
}

function assertIsolatedTarget(target: SupabaseCertificationEnvironment) {
  if (!target.projectRef.trim()) throw new Error("STAGING_PROJECT_REF_REQUIRED");
  if (target.productionProjectRef && target.projectRef === target.productionProjectRef) {
    throw new Error("STAGING_PROJECT_MUST_DIFFER_FROM_PRODUCTION");
  }
  if (/prod(?:uction)?/i.test(target.environment)) throw new Error("PRODUCTION_CERTIFICATION_FORBIDDEN");
}

function validateSnapshot(contract: BackendImplementationContract, snapshot: SupabaseSchemaSnapshot) {
  const errors: string[] = [];
  const tables = new Set(snapshot.tables);
  const policies = new Set(snapshot.policies.map((policy) => `${policy.table}:${policy.name}`));
  const buckets = new Set(snapshot.buckets);

  for (const table of contract.tables) {
    if (!tables.has(table.name)) errors.push(`Missing expected table: ${table.name}`);
  }
  for (const policy of contract.policies) {
    if (!policies.has(`${policy.table}:${policy.id}`)) errors.push(`Missing expected RLS policy: ${policy.table}.${policy.id}`);
  }
  for (const bucket of contract.storageBuckets) {
    if (!buckets.has(bucket.id)) errors.push(`Missing expected storage bucket: ${bucket.id}`);
  }
  return errors;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
