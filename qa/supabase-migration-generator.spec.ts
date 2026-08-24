import { expect, test } from "@playwright/test";
import { deriveFunctionalArchitecture } from "../apps/builder/app/functional-architecture";
import { deriveBackendImplementationContract } from "../apps/builder/app/backend-implementation-contract";
import { generateSupabaseMigration } from "../apps/builder/app/supabase-migration-generator";

test("generates executable tables indexes and RLS policies from an app contract", () => {
  const architecture = deriveFunctionalArchitecture({
    business_name: "Pearl Dental",
    industry: "dental clinic",
    goals: ["appointment booking", "patient login", "admin dashboard"],
    required_capabilities: ["booking", "auth", "backend", "admin"],
    services: ["implants"],
  });
  const contract = deriveBackendImplementationContract(architecture);
  const migration = generateSupabaseMigration(contract);

  expect(migration.tableCount).toBeGreaterThan(0);
  expect(migration.policyCount).toBeGreaterThan(0);
  expect(migration.sql).toContain("begin;");
  expect(migration.sql).toContain("create table if not exists public.\"bookings\"");
  expect(migration.sql).toContain("enable row level security");
  expect(migration.sql).toContain("create policy");
  expect(migration.sql).toContain("to authenticated");
  expect(migration.sql).toContain("auth.uid()");
  expect(migration.sql.trimEnd().endsWith("commit;")).toBeTruthy();
});

test("static site contract produces no application tables", () => {
  const architecture = deriveFunctionalArchitecture({
    business_name: "Simple Studio",
    industry: "creative studio",
    goals: ["showcase work"],
    required_capabilities: [],
    services: ["branding"],
  });
  const migration = generateSupabaseMigration(deriveBackendImplementationContract(architecture));
  expect(migration.tableCount).toBe(0);
  expect(migration.policyCount).toBe(0);
  expect(migration.sql).toContain("begin;");
  expect(migration.sql).toContain("commit;");
});

test("refuses unsafe SQL defaults instead of emitting arbitrary migration SQL", () => {
  const architecture = deriveFunctionalArchitecture({
    business_name: "Unsafe Test",
    industry: "saas",
    goals: ["user login"],
    required_capabilities: ["backend"],
  });
  const contract = deriveBackendImplementationContract(architecture);
  expect(contract.tables.length).toBeGreaterThan(0);
  contract.tables[0]!.columns[0]!.defaultSql = "gen_random_uuid(); drop table users";
  expect(() => generateSupabaseMigration(contract)).toThrow(/UNSAFE_COLUMN_DEFAULT/);
});
