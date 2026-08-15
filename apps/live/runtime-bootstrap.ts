import type { LiveSiteStore, PublishedSiteRecord } from "@micirql/live-runtime";
import {
  createFunctionBindingResolver,
  renderPreparedPage,
  type PreparedPage,
  type RendererRegistry,
} from "@micirql/renderer";
import { renderToStaticMarkup } from "react-dom/server";
import { configureLiveHostRuntime } from "./live-runtime";

let configured = false;

const emptyProductionRegistry: RendererRegistry = {
  async resolve() {
    return undefined;
  },
};

export function ensureLiveRuntimeConfigured() {
  if (configured) return;

  const supabaseUrl = process.env.MICIRQL_SUPABASE_URL?.replace(/\/+$/, "");
  const publishableKey = process.env.MICIRQL_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !publishableKey) return;

  const rpc = async <T>(name: string, body: Record<string, unknown>): Promise<T> => {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${name}`, {
      method: "POST",
      headers: {
        apikey: publishableKey,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Live Supabase RPC ${name} failed with ${response.status}.`);
    }

    return (await response.json()) as T;
  };

  const store: LiveSiteStore = {
    async resolveHostname(hostname) {
      const rows = await rpc<Array<{ site_id: string }>>("resolve_live_site_hostname", {
        p_hostname: hostname,
      });
      const siteId = rows[0]?.site_id;
      return siteId ? { siteId } : undefined;
    },

    async getPublishedSite(siteId) {
      const rows = await rpc<
        Array<{ site_id: string; version_id: string; snapshot: PublishedSiteRecord["snapshot"] }>
      >("get_live_published_site", { p_site_id: siteId });
      const row = rows[0];
      if (!row) return undefined;
      return {
        siteId: row.site_id,
        versionId: row.version_id,
        snapshot: row.snapshot,
      } satisfies PublishedSiteRecord;
    },
  };

  configureLiveHostRuntime({
    store,
    registry: emptyProductionRegistry,
    functions: createFunctionBindingResolver({ actionIds: [] }),
    renderPage(page: PreparedPage) {
      return renderToStaticMarkup(renderPreparedPage(page));
    },
    cacheTtlSeconds: 300,
  });

  configured = true;
}
