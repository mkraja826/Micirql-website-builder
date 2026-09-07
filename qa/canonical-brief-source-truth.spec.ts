import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260907090000_canonical_brief_source_truth.sql"),
  "utf8",
);

test("explicit source-brief business identity wins over interpretation metadata", () => {
  expect(migration).toContain("Business name");
  expect(migration).toContain("v_business_name := coalesce(");
  expect(migration.indexOf("v_business_name,")).toBeLessThan(
    migration.indexOf("nullif(trim(v_meta->>'business_name'), '')"),
  );
});

test("premium numbered Pages/Create brief shape is parsed deterministically", () => {
  expect(migration).toContain("lower(v_clean) = 'pages'");
  expect(migration).toContain("lower(v_clean) in ('create:', 'create')");
  expect(migration).toContain("jsonb_build_array('Our Dentists / Team')");
  expect(migration).toContain("jsonb_build_array('Patient Information')");
  expect(migration).toContain("jsonb_build_array('Contact / Book Appointment')");
  expect(migration).toContain("jsonb_build_array('Treatment Detail')");
});

test("conditional service examples cannot become supplied business facts", () => {
  expect(migration).toContain("Suitable categories may include");
  expect(migration).toContain("may include");
  expect(migration).toContain("if they are");
  expect(migration).toContain("if confirmed");
  expect(migration).toContain("canonical_brief_version");
});
