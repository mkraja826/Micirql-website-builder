import type { BackendImplementationContract, BackendTable } from "@micirql/schema";
import type { SupabaseCertificationProbeResult } from "./supabase-staging-executor";

export type SupabaseProbeQueryExecutor = (
  projectRef: string,
  sql: string,
  readOnly: boolean,
) => Promise<unknown>;

const IDENTIFIER = /^[a-z_][a-z0-9_]*$/;

export function createSupabaseRlsProbeRunner(query: SupabaseProbeQueryExecutor) {
  return async function runSupabaseRlsProbes(
    projectRef: string,
    contract: BackendImplementationContract,
  ): Promise<SupabaseCertificationProbeResult> {
    const errors: string[] = [];
    let positiveRlsPassed: boolean | undefined;
    let negativeRlsPassed: boolean | undefined;

    const protectedTable = contract.tables.find((table) =>
      table.rlsEnabled && table.columns.some((column) => column.name === "owner_user_id" || column.name === "tenant_id"),
    );

    if (contract.requiresRls) {
      if (!protectedTable) {
        errors.push("RLS is required but no probeable user- or tenant-owned table exists.");
      } else {
        try {
          const result = await probeProtectedTable(query, projectRef, protectedTable, contract);
          positiveRlsPassed = result.positive;
          negativeRlsPassed = result.negative;
          errors.push(...result.errors);
        } catch (error) {
          errors.push(`RLS probe failed: ${errorMessage(error)}`);
          positiveRlsPassed = false;
          negativeRlsPassed = false;
        }
      }
    }

    const paymentIdempotencyPassed = contract.acceptanceChecks.some((check) => check.required && check.id === "payment-idempotency")
      ? undefined
      : true;

    if (contract.acceptanceChecks.some((check) => check.required && check.id === "payment-idempotency")) {
      errors.push("Payment idempotency requires an integration-level payment probe and remains uncertified by the SQL RLS runner.");
    }

    return {
      positiveRlsPassed,
      negativeRlsPassed,
      storageOwnershipPassed: contract.storageBuckets.some((bucket) => bucket.ownerScoped) ? undefined : true,
      paymentIdempotencyPassed,
      errors,
    };
  };
}

async function probeProtectedTable(
  query: SupabaseProbeQueryExecutor,
  projectRef: string,
  table: BackendTable,
  contract: BackendImplementationContract,
) {
  assertIdentifier(table.name);
  const ownerColumn = table.columns.find((column) => column.name === "owner_user_id");
  const tenantColumn = table.columns.find((column) => column.name === "tenant_id");
  const userA = crypto.randomUUID();
  const userB = crypto.randomUUID();
  const tenantA = crypto.randomUUID();
  const tenantB = crypto.randomUUID();
  const rowA = crypto.randomUUID();
  const rowB = crypto.randomUUID();
  const errors: string[] = [];

  try {
    if (tenantColumn && contract.tables.some((candidate) => candidate.name === "tenants")) {
      await query(projectRef, `insert into public."tenants" ("id", "name", "slug") values ('${tenantA}', 'MiCirql Probe A', 'probe-a-${tenantA.slice(0, 8)}'), ('${tenantB}', 'MiCirql Probe B', 'probe-b-${tenantB.slice(0, 8)}') on conflict ("id") do nothing;`, false);
    }

    await query(projectRef, seedSql(table, rowA, ownerColumn ? userA : undefined, tenantColumn ? tenantA : undefined), false);
    await query(projectRef, seedSql(table, rowB, ownerColumn ? userB : undefined, tenantColumn ? tenantB : undefined), false);

    const claimsA = tenantColumn ? { sub: userA, role: "authenticated", tenant_id: tenantA } : { sub: userA, role: "authenticated" };
    const claimsB = tenantColumn ? { sub: userB, role: "authenticated", tenant_id: tenantB } : { sub: userB, role: "authenticated" };

    const ownCount = scalarCount(await query(projectRef, scopedCountSql(table.name, claimsA, rowA), false));
    const foreignCount = scalarCount(await query(projectRef, scopedCountSql(table.name, claimsB, rowA), false));

    const positive = ownCount === 1;
    const negative = foreignCount === 0;
    if (!positive) errors.push(`Authorized RLS probe could not read its own row in ${table.name}.`);
    if (!negative) errors.push(`Cross-user/cross-tenant RLS probe could read another principal's row in ${table.name}.`);

    return { positive, negative, errors };
  } finally {
    await safeCleanup(query, projectRef, table.name, [rowA, rowB]);
    if (tenantColumn && contract.tables.some((candidate) => candidate.name === "tenants")) {
      await safeCleanup(query, projectRef, "tenants", [tenantA, tenantB]);
    }
  }
}

function seedSql(table: BackendTable, id: string, ownerUserId?: string, tenantId?: string) {
  const entries: Array<[string, string]> = [["id", sqlString(id)]];
  if (ownerUserId) entries.push(["owner_user_id", sqlString(ownerUserId)]);
  if (tenantId) entries.push(["tenant_id", sqlString(tenantId)]);

  for (const column of table.columns) {
    if (entries.some(([name]) => name === column.name)) continue;
    if (column.name === table.primaryKey || column.defaultSql || column.nullable) continue;
    entries.push([column.name, probeValue(column.type, column.name)]);
  }

  return `insert into public.${q(table.name)} (${entries.map(([name]) => q(name)).join(", ")}) values (${entries.map(([, value]) => value).join(", ")});`;
}

function scopedCountSql(table: string, claims: Record<string, string>, rowId: string) {
  assertIdentifier(table);
  const claimsJson = JSON.stringify(claims).replace(/'/g, "''");
  return `begin; set local role authenticated; set local request.jwt.claims = '${claimsJson}'; select count(*)::int as count from public.${q(table)} where "id" = '${rowId}'; commit;`;
}

async function safeCleanup(query: SupabaseProbeQueryExecutor, projectRef: string, table: string, ids: string[]) {
  try {
    assertIdentifier(table);
    await query(projectRef, `delete from public.${q(table)} where "id" in (${ids.map(sqlString).join(", ")});`, false);
  } catch {
    // Preview environments are disposable; cleanup failure must not mask the probe result.
  }
}

function probeValue(type: BackendTable["columns"][number]["type"], name: string) {
  if (type === "uuid") return sqlString(crypto.randomUUID());
  if (type === "integer" || type === "numeric") return "1";
  if (type === "boolean") return "false";
  if (type === "date") return "current_date";
  if (type === "timestamptz") return "now()";
  if (type === "jsonb") return "'{}'::jsonb";
  return sqlString(`MiCirql probe ${name}`);
}

function scalarCount(value: unknown) {
  const rows = normalizeRows(value);
  const count = rows[0]?.count;
  if (typeof count === "number") return count;
  if (typeof count === "string" && /^\d+$/.test(count)) return Number(count);
  return -1;
}

function normalizeRows(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) return value.filter(isRecord);
  if (isRecord(value)) {
    for (const key of ["result", "data", "rows"]) {
      const candidate = value[key];
      if (Array.isArray(candidate)) return candidate.filter(isRecord);
    }
  }
  return [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function assertIdentifier(value: string) { if (!IDENTIFIER.test(value)) throw new Error(`UNSAFE_PROBE_IDENTIFIER:${value}`); }
function q(value: string) { assertIdentifier(value); return `"${value}"`; }
function sqlString(value: string) { return `'${value.replace(/'/g, "''")}'`; }
function errorMessage(error: unknown) { return error instanceof Error ? error.message : String(error); }
