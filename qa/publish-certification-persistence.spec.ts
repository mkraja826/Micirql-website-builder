import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";

const root = process.cwd();

async function source(file: string) {
  return readFile(path.join(root, file), "utf8");
}

test("publish certification receipts are service-role only and exact-draft keyed", async () => {
  const migration = await source("supabase/migrations/20260908062000_publish_certification_receipts.sql");
  expect(migration).toContain("create table if not exists public.publish_certification_receipts");
  expect(migration).toContain("unique(site_id, draft_fingerprint, certification_type)");
  expect(migration).toContain("revoke all on table public.publish_certification_receipts from public, anon, authenticated");
  expect(migration).toContain("grant select, insert, update on table public.publish_certification_receipts to service_role");
  expect(migration).toContain("upsert_publish_certification_receipt");
});

test("trusted writer cannot be used as a normal builder-client pass flag", async () => {
  const route = await source("apps/builder/app/api/publish-certifications/route.ts");
  expect(route).toContain("MICIRQL_CERTIFICATION_WRITE_TOKEN");
  expect(route).toContain("authorization !== `Bearer ${token}`");
  expect(route).toContain("MICIRQL_SUPABASE_SECRET_KEY");
  expect(route).toContain("SUPABASE_SERVICE_ROLE_KEY");
  expect(route).toContain("/^[a-f0-9]{64}$/i.test(draftFingerprint)");
  expect(route).toContain("text(record.siteId) !== siteId");
  expect(route).toContain("text(record.draftFingerprint) !== draftFingerprint");
});

test("production publish resolves request-scoped persisted stores", async () => {
  const publishRoute = await source("apps/builder/app/api/publish/route.ts");
  const aggregate = await source("apps/builder/app/publishable-draft-certification.ts");
  const fullStack = await source("apps/builder/app/publish-full-stack-certification.ts");
  const supabaseStore = await source("apps/builder/app/publish-certification-supabase-store.ts");

  expect(publishRoute).toContain("renderedVisualStore: createSupabaseRenderedVisualCertificationStore(request)");
  expect(publishRoute).toContain("fullStackStore: createSupabaseFullStackCertificationStore(request)");
  expect(aggregate).toContain("const visualStore = input.renderedVisualStore ?? renderedVisualStore");
  expect(aggregate).toContain("...(input.fullStackStore ? { store: input.fullStackStore } : {})");
  expect(fullStack).toContain("const certificationStore = input.store ?? store");
  expect(supabaseStore).toContain('certification_type: `eq.${certificationType}`');
  expect(supabaseStore).toContain('draft_fingerprint: `eq.${draftFingerprint}`');
});
