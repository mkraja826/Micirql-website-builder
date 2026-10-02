import { getCloudflareContext } from "@opennextjs/cloudflare";

export const dynamic = "force-dynamic";

type RuntimeVersion = {
  id: string | null;
  tag: string | null;
  timestamp: string | null;
};

function runtimeVersion(): RuntimeVersion {
  try {
    const { env } = getCloudflareContext();
    const metadata = env.CF_VERSION_METADATA;

    return {
      id: metadata?.id ?? null,
      tag: metadata?.tag ?? null,
      timestamp: metadata?.timestamp ?? null,
    };
  } catch {
    return { id: null, tag: null, timestamp: null };
  }
}

export function GET() {
  const worker = runtimeVersion();

  return Response.json(
    {
      status: "ok",
      service: "micirql-website-builder",
      source: {
        sha: process.env.MICIRQL_BUILD_SHA ?? "unknown",
        branch: process.env.MICIRQL_BUILD_BRANCH ?? "unknown",
        buildId: process.env.MICIRQL_BUILD_ID ?? "unknown",
      },
      worker,
    },
    {
      headers: {
        "cache-control": "no-store, max-age=0",
        "x-content-type-options": "nosniff",
      },
    },
  );
}
