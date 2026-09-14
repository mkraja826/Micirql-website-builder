import type { PublishableDraft } from "../publish/schema";
import type { MaterializedSiteSnapshot } from "./schema";

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(",")}}`;
}

function fingerprint(value: unknown): string {
  const input = stableStringify(value);
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `v1-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function siteIdFor(sourceKey: string, candidateId: string): string {
  return `site-${fingerprint({ sourceKey, candidateId }).slice(3)}`;
}

function hasRenderableContent(site: MaterializedSiteSnapshot): boolean {
  const content = site.snapshot?.content;
  return Boolean(
    content &&
    content.version === "1.0" &&
    Array.isArray(content.pages) &&
    content.pages.length > 0 &&
    content.pages.every((page) => page.slug.trim() && page.title.trim() && Array.isArray(page.sections) && page.sections.length > 0),
  );
}

export function materializeSiteDraft({
  sourceKey,
  draft,
}: {
  sourceKey: string;
  draft: PublishableDraft;
}): MaterializedSiteSnapshot {
  if (draft.readiness !== "ready") {
    throw new Error(`Cannot materialize blocked draft ${draft.candidateId}.`);
  }

  const persistedSnapshot = {
    pages: deepClone(draft.pages),
    content: deepClone(draft.content),
    selectedSections: deepClone(draft.selectedSections),
    theme: deepClone(draft.theme),
    cssVariables: deepClone(draft.cssVariables),
    primaryCapability: deepClone(draft.primaryCapability),
    capabilities: deepClone(draft.capabilities),
    warnings: [...draft.warnings],
  };

  return {
    version: "1.0",
    siteId: siteIdFor(sourceKey, draft.candidateId),
    revision: 1,
    status: "draft",
    fingerprint: fingerprint(persistedSnapshot),
    source: {
      sourceKey,
      candidateId: draft.candidateId,
      draftVersion: draft.version,
    },
    snapshot: persistedSnapshot,
  };
}

export function serializeMaterializedSite(site: MaterializedSiteSnapshot): string {
  return stableStringify(site);
}

export function hydrateMaterializedSite(serialized: string): MaterializedSiteSnapshot {
  const parsed = JSON.parse(serialized) as MaterializedSiteSnapshot;
  if (parsed.version !== "1.0" || parsed.revision !== 1 || parsed.status !== "draft") {
    throw new Error("Unsupported materialized site snapshot.");
  }
  if (!hasRenderableContent(parsed)) {
    throw new Error("Materialized site snapshot is missing renderable content.");
  }
  const expectedFingerprint = fingerprint(parsed.snapshot);
  if (parsed.fingerprint !== expectedFingerprint) {
    throw new Error("Materialized site snapshot fingerprint mismatch.");
  }
  return deepClone(parsed);
}
