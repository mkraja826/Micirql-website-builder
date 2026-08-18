import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";

const root=process.cwd();
const dashboard=fs.readFileSync(path.join(root,"apps/builder/app/project-dashboard.tsx"),"utf8");
const projects=fs.readFileSync(path.join(root,"apps/builder/app/api/projects/route.ts"),"utf8");
const publicLeads=fs.readFileSync(path.join(root,"apps/builder/app/api/public/leads/route.ts"),"utf8");

test("project cards expose new lead counts",()=>{
 expect(projects).toContain("new_lead_count");
 expect(projects).toContain("status:\"eq.new\"");
 expect(dashboard).toContain("leadBadge");
 expect(dashboard).toContain("new_lead_count");
});

test("owner email notification delivery uses Resend only when configured",()=>{
 expect(publicLeads).toContain("deliverOwnerEmail");
 expect(publicLeads).toContain("https://api.resend.com/emails");
 expect(publicLeads).toContain("RESEND_API_KEY");
 expect(publicLeads).toContain("MICIRQL_NOTIFICATION_FROM_EMAIL");
 expect(publicLeads).toContain('"provider-not-configured"');
 expect(publicLeads).toContain('provider:"resend"');
 expect(publicLeads).toContain("notification_delivery_log");
 expect(publicLeads).toContain('return "sent"');
});

test("generic notification destinations remain queued for provider workers",()=>{
 expect(publicLeads).toContain("queueNotifications");
 expect(publicLeads).toContain('status:"queued"');
 expect(publicLeads).toContain("site_notification_destinations");
});
