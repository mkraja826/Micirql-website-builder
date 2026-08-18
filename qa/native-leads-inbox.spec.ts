import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const inbox = fs.readFileSync(path.join(root, "apps/builder/app/leads-inbox.tsx"), "utf8");
const page = fs.readFileSync(path.join(root, "apps/builder/app/enquiries/page.tsx"), "utf8");
const dashboard = fs.readFileSync(path.join(root, "apps/builder/app/project-dashboard.tsx"), "utf8");

test("project enquiries open the native site-scoped leads inbox", () => {
  expect(dashboard).toContain("workspaceId:project.workspace_id");
  expect(page).toContain("LeadsInbox");
  expect(page).toContain("workspaceId={workspaceId}");
});

test("native leads inbox reads and updates the secured leads API", () => {
  expect(inbox).toContain("/api/leads?");
  expect(inbox).toContain('Authorization: `Bearer ${session.access_token}`');
  expect(inbox).toContain('method: "PATCH"');
  for (const status of ["new", "contacted", "qualified", "closed", "spam"]) expect(inbox).toContain(status);
});

test("lead detail exposes direct follow-up actions", () => {
  expect(inbox).toContain("tel:");
  expect(inbox).toContain("https://wa.me/");
  expect(inbox).toContain("mailto:");
  expect(inbox).toContain("Mark contacted");
  expect(inbox).toContain("Mark qualified");
  expect(inbox).toContain("Close lead");
});
