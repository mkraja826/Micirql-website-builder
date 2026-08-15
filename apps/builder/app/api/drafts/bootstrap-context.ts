import type { NextRequest } from "next/server";
import { SCHEMA_VERSION, type Site } from "@micirql/schema";
import { authenticatedUserId, saveSupabaseDraft, supabaseConfig, supabaseHeaders, type DraftRecord } from "./supabase-store";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type MembershipRow = { workspace_id: string };
type WorkspaceRow = { id: string; name: string };
type SiteRow = { id: string; workspace_id: string; name: string };

export async function resolveOrBootstrapDraft(
  request: NextRequest,
  requestedWorkspaceId: string,
  requestedSiteId: string,
): Promise<DraftRecord | undefined> {
  const { url } = supabaseConfig();
  const headers = supabaseHeaders(request);

  let workspaceId = UUID_RE.test(requestedWorkspaceId) ? requestedWorkspaceId : undefined;
  let siteId = UUID_RE.test(requestedSiteId) ? requestedSiteId : undefined;

  if (!workspaceId) {
    const memberships = await getJson<MembershipRow[]>(`${url}/rest/v1/workspace_members?select=workspace_id&order=created_at.asc&limit=1`, headers);
    workspaceId = memberships[0]?.workspace_id;
  }

  if (!workspaceId) {
    const rows = await postJson<WorkspaceRow[]>(`${url}/rest/v1/workspaces?select=id,name`, headers, { name: "My workspace" }, true);
    workspaceId = rows[0]?.id;
    if (!workspaceId) throw new Error("Workspace bootstrap failed.");
  }

  if (!siteId) {
    const query = new URLSearchParams({ workspace_id: `eq.${workspaceId}`, select: "id,workspace_id,name", order: "created_at.asc", limit: "1" });
    const sites = await getJson<SiteRow[]>(`${url}/rest/v1/sites?${query}`, headers);
    siteId = sites[0]?.id;
  }

  if (!siteId) {
    const rows = await postJson<SiteRow[]>(`${url}/rest/v1/sites?select=id,workspace_id,name`, headers, { workspace_id: workspaceId, name: "Your website", status: "draft" }, true);
    siteId = rows[0]?.id;
    if (!siteId) throw new Error("Site bootstrap failed.");
  }

  const existing = await getJson<any[]>(`${url}/rest/v1/workspace_drafts?workspace_id=eq.${workspaceId}&site_id=eq.${siteId}&select=workspace_id,site_id,revision,snapshot,updated_at,updated_by&limit=1`, headers);
  if (existing[0]) {
    return {
      workspaceId: existing[0].workspace_id,
      siteId: existing[0].site_id,
      revision: Number(existing[0].revision),
      snapshot: existing[0].snapshot as Site,
      updatedAt: existing[0].updated_at,
      updatedBy: existing[0].updated_by,
    };
  }

  const snapshot = defaultSite(workspaceId, siteId);
  return saveSupabaseDraft(request, { snapshot, expectedRevision: 0, updatedBy: authenticatedUserId(request) });
}

function defaultSite(workspaceId: string, siteId: string): Site {
  return {
    schemaVersion: SCHEMA_VERSION,
    siteId,
    workspaceId,
    name: "Your website",
    domain: "landing-page",
    theme: {
      family: "minimalist",
      modifiers: ["light"],
      brand: {
        colors: { primary: "#6d5dfc", secondary: "#171717", accent: "#8b7fff", background: "#ffffff", surface: "#f5f5f7", textPrimary: "#111111", textSecondary: "#65656b", border: "#dddde3", success: "#168a4a", warning: "#ad6a00", error: "#c93636" },
        typography: { display: "Arial", body: "Arial", ui: "Arial" },
        density: "comfortable",
        shape: "balanced",
        motion: "subtle",
      },
    },
    seoBlueprint: { primaryGoal: "Present the business clearly and convert visitors", targetLocations: [], priorityTopics: [], audiences: [], languages: ["en"], localSeo: false, servicePages: true, locationPages: false, blog: false },
    pages: [{
      id: "home",
      path: "/",
      name: "Home",
      sections: [
        { id: "hero-1", component: { componentId: "hero.placeholder", version: "1.0.0" }, props: { eyebrow: "Built with MiCirql", heading: "A website your business can grow into.", body: "Select any section to edit its content, images, design and actions without touching code." }, bindings: {}, hidden: false },
        { id: "features-1", component: { componentId: "features.placeholder", version: "1.0.0" }, props: { heading: "Everything stays editable", body: "Your authenticated Supabase draft updates the preview and remains isolated to your workspace.", items: [{ title: "Mobile first", description: "Every layout begins with the smallest screen." }, { title: "Fast by default", description: "Approved components stay within the MiCirql performance protocol." }, { title: "Fully editable", description: "Content, assets, design and functionality remain workspace-controlled." }] }, bindings: {}, hidden: false },
      ],
      seo: { title: "Your website", description: "A website created with MiCirql.", canonicalPath: "/", indexable: true, structuredDataTypes: [] },
    }],
    navigation: [{ label: "Home", href: "/" }],
    integrations: [],
    domains: [],
  };
}

async function getJson<T>(url: string, headers: Record<string, string>): Promise<T> {
  const response = await fetch(url, { headers, cache: "no-store" });
  if (!response.ok) throw new Error(`Supabase context request failed (${response.status}).`);
  return response.json() as Promise<T>;
}

async function postJson<T>(url: string, headers: Record<string, string>, body: unknown, returnRepresentation = false): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { ...headers, ...(returnRepresentation ? { Prefer: "return=representation" } : {}) },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Supabase context creation failed (${response.status}).`);
  return response.json() as Promise<T>;
}
