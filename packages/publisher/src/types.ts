import type { Site, SiteVersion } from "@micirql/schema";
import type { FunctionBindingResolver, RendererRegistry } from "@micirql/renderer";

export type PublishDraft = {
  site: Site;
  createdBy: string;
};

export type PublishedVersionRecord = SiteVersion & {
  snapshotHash: string;
};

export type PublishingStore = {
  nextVersionNumber(siteId: string): Promise<number>;
  getVersion(siteId: string, versionId: string): Promise<PublishedVersionRecord | undefined>;
  getPublishedVersion(siteId: string): Promise<PublishedVersionRecord | undefined>;
  publishAtomically(args: {
    version: PublishedVersionRecord;
    previousPublishedVersionId?: string;
  }): Promise<void>;
  rollbackAtomically(args: {
    siteId: string;
    targetVersionId: string;
    previousPublishedVersionId?: string;
  }): Promise<void>;
};

export type SnapshotHasher = {
  hash(snapshot: Site): Promise<string>;
};

export type VersionIdFactory = {
  create(siteId: string, versionNumber: number): string;
};

export type PublishCache = {
  invalidateSite(siteId: string): Promise<void>;
};

export type DomainActivator = {
  activate(site: Site): Promise<{ ok: true } | { ok: false; reason: string }>;
};

export type PublishingDependencies = {
  store: PublishingStore;
  registry: RendererRegistry;
  functions: FunctionBindingResolver;
  hasher: SnapshotHasher;
  versionIds: VersionIdFactory;
  cache?: PublishCache;
  domains?: DomainActivator;
};

export type PublishIssue = {
  code:
    | "INVALID_DRAFT"
    | "NO_PAGES"
    | "PAGE_VALIDATION_FAILED"
    | "DOMAIN_ACTIVATION_FAILED"
    | "VERSION_NOT_FOUND"
    | "VERSION_NOT_ROLLBACK_ELIGIBLE";
  message: string;
  pagePath?: string;
};

export type PublishResult =
  | { ok: true; version: PublishedVersionRecord }
  | { ok: false; issues: PublishIssue[] };
