import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const binder=fs.readFileSync(path.join(root,"apps/builder/app/functional-binding-intelligence.ts"),"utf8");
const form=fs.readFileSync(path.join(root,"packages/sections/src/functional-form.tsx"),"utf8");
const publicApi=fs.readFileSync(path.join(root,"apps/builder/app/api/public/leads/route.ts"),"utf8");
const inboxApi=fs.readFileSync(path.join(root,"apps/builder/app/api/leads/route.ts"),"utf8");
const migration=fs.readFileSync(path.join(root,"supabase/migrations/20260818230500_site_leads.sql"),"utf8");

test("generated sites receive a native MiCirql lead endpoint when no external form is supplied",()=>{
 expect(binder).toContain("NEXT_PUBLIC_MICIRQL_FORM_ENDPOINT");
 expect(binder).toContain("https://builder.micirql.com/api/public/leads");
 expect(binder).toContain("formWorkspaceId");
 expect(binder).toContain("formSiteId");
 expect(binder).toContain("native-form");
});

test("native form posts site identity action and consent",()=>{
 for(const field of ["workspaceId","siteId","actionId","sourcePage","consent","website"])expect(form).toContain(field);
 expect(form).toContain('method="post"');
});

test("public submission endpoint validates site and stores sanitized leads",()=>{
 expect(publicApi).toContain("workspace_drafts");
 expect(publicApi).toContain("site_leads");
 expect(publicApi).toContain("sanitizeFields");
 expect(publicApi).toContain("Consent is required");
 expect(publicApi).toContain("site_notification_destinations");
 expect(publicApi).toContain('status:"queued"');
});

test("lead inbox is authenticated and workspace scoped",()=>{
 expect(inboxApi).toContain("workspace_members");
 expect(inboxApi).toContain("site_leads");
 expect(inboxApi).toContain("WORKSPACE_FORBIDDEN");
 expect(inboxApi).toContain("PATCH");
});

test("lead table is server managed with RLS and no direct client grants",()=>{
 expect(migration).toContain("create table if not exists public.site_leads");
 expect(migration).toContain("enable row level security");
 expect(migration).toContain("revoke all on table public.site_leads from anon, authenticated");
});
