export type WorkspaceRecord = {
  id: string;
  name: string;
  status: "active" | "suspended";
};

export type SiteRecord = {
  id: string;
  workspaceId: string;
  name: string;
  status: "draft" | "preview" | "active" | "suspended";
  publishedVersionId?: string;
};

export type SiteHostnameRecord = {
  id: string;
  siteId: string;
  hostname: string;
  mode: "micirql-subdomain" | "custom-domain" | "managed-dns";
  status: "pending" | "verifying" | "active" | "failed";
  sslStatus: "pending" | "active" | "failed";
  primary: boolean;
};

export type SiteIntegrationRecord = {
  id: string;
  workspaceId: string;
  siteId: string;
  provider: string;
  capability: string;
  status: "active" | "disabled" | "error";
  configRef: string;
};

export type BackendConfigStore = {
  getWorkspace(workspaceId: string): Promise<WorkspaceRecord | undefined>;
  getSite(siteId: string): Promise<SiteRecord | undefined>;
  findHostname(hostname: string): Promise<SiteHostnameRecord | undefined>;
  listSiteIntegrations(siteId: string): Promise<SiteIntegrationRecord[]>;
};

export function createBackendSiteResolver(store: BackendConfigStore) {
  return {
    async resolve(hostname: string) {
      const normalized = normalizeHostname(hostname);
      const hostnameRecord = await store.findHostname(normalized);
      if (!hostnameRecord || hostnameRecord.status !== "active" || hostnameRecord.sslStatus !== "active") {
        return undefined;
      }

      const site = await store.getSite(hostnameRecord.siteId);
      if (!site || site.status !== "active") return undefined;

      const workspace = await store.getWorkspace(site.workspaceId);
      if (!workspace || workspace.status !== "active") return undefined;

      return {
        siteId: site.id,
        workspaceId: workspace.id,
        hostname: normalized,
        status: "active" as const,
      };
    },
  };
}

export async function resolveSiteIntegration(
  store: BackendConfigStore,
  siteId: string,
  capability: string,
): Promise<SiteIntegrationRecord | undefined> {
  const integrations = await store.listSiteIntegrations(siteId);
  return integrations.find((integration) => integration.status === "active" && integration.capability === capability);
}

export function normalizeHostname(value: string): string {
  return value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/:\d+$/, "").replace(/^www\./, "").replace(/\/$/, "");
}
