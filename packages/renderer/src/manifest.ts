export type RuntimeManifestEntry = {
  kind: "component" | "section";
  version: number;
  defaults: Record<string, unknown>;
  libraryId: string;
  exportName: string;
  modulePath: string;
  propsSchema: Record<string, unknown>;
};

export type RuntimeManifest = Record<string, RuntimeManifestEntry>;

export type RuntimeManifestPayload = {
  manifest: RuntimeManifest;
  draft?: unknown;
  validation?: {
    valid: boolean;
    issues?: Array<{ code?: string; message?: string; renderKey?: string }>;
  };
};

export function isRuntimeManifest(value: unknown): value is RuntimeManifest {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.values(value as Record<string, unknown>).every((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return false;
    const item = entry as Record<string, unknown>;
    return (
      (item.kind === "component" || item.kind === "section") &&
      typeof item.version === "number" &&
      typeof item.libraryId === "string" &&
      typeof item.exportName === "string" &&
      typeof item.modulePath === "string"
    );
  });
}

export function resolveRuntimeEntry(manifest: RuntimeManifest, renderKey: string): RuntimeManifestEntry {
  const entry = manifest[renderKey];
  if (!entry) throw new Error(`Unknown MiCirql render key: ${renderKey}`);
  return entry;
}

export function validateRenderKeys(manifest: RuntimeManifest, renderKeys: Iterable<string>): string[] {
  const missing = new Set<string>();
  for (const renderKey of renderKeys) {
    if (!manifest[renderKey]) missing.add(renderKey);
  }
  return [...missing];
}

export async function fetchRuntimeManifest(args: {
  endpoint: string;
  accessToken: string;
  siteId?: string;
  fetchImpl?: typeof fetch;
}): Promise<RuntimeManifestPayload> {
  const fetchImpl = args.fetchImpl ?? fetch;
  const response = await fetchImpl(args.endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args.siteId ? { siteId: args.siteId } : {}),
  });

  if (!response.ok) {
    throw new Error(`Runtime manifest request failed (${response.status})`);
  }

  const payload = (await response.json()) as RuntimeManifestPayload;
  if (!payload || !isRuntimeManifest(payload.manifest)) {
    throw new Error("Invalid MiCirql runtime manifest response");
  }
  return payload;
}
