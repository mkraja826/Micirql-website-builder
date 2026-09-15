import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SupabaseSitePersistenceRepository } from "./supabase";

function requiredServerEnv(name: "SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY") {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required server environment variable: ${name}`);
  return value;
}

/**
 * Server-only repository for the public published-site route.
 * The service-role credential must never be imported into a client component
 * or serialized to the browser. Repository queries still fail closed on
 * published status + exact published_version_id + matching site_id.
 */
export function createPublishedSiteRepository() {
  const client = createClient(
    requiredServerEnv("SUPABASE_URL"),
    requiredServerEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );

  return new SupabaseSitePersistenceRepository(client);
}
