import type { Site } from "@micirql/schema";
import type {
  PublishedVersionRecord,
  PublishingStore,
  SnapshotHasher,
  VersionIdFactory,
} from "./types";

export type PublishingSqlDriver = {
  nextVersionNumber(siteId: string): Promise<number>;
  getVersion(siteId: string, versionId: string): Promise<PublishedVersionRecord | undefined>;
  getPublishedVersion(siteId: string): Promise<PublishedVersionRecord | undefined>;
  publishVersion(args: {
    version: PublishedVersionRecord;
    previousPublishedVersionId?: string;
  }): Promise<void>;
  rollbackVersion(args: {
    siteId: string;
    targetVersionId: string;
    previousPublishedVersionId?: string;
  }): Promise<void>;
};

export function createPublishingStore(driver: PublishingSqlDriver): PublishingStore {
  return {
    nextVersionNumber: (siteId) => driver.nextVersionNumber(siteId),
    getVersion: (siteId, versionId) => driver.getVersion(siteId, versionId),
    getPublishedVersion: (siteId) => driver.getPublishedVersion(siteId),
    publishAtomically: (args) => driver.publishVersion(args),
    rollbackAtomically: (args) => driver.rollbackVersion(args),
  };
}

export function createCryptoSnapshotHasher(): SnapshotHasher {
  return {
    async hash(snapshot: Site) {
      const bytes = new TextEncoder().encode(stableSerialize(snapshot));
      const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
      return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    },
  };
}

export function createVersionIdFactory(): VersionIdFactory {
  return {
    create(siteId, versionNumber) {
      return `${siteId}:v${versionNumber}`;
    },
  };
}

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  const record = value as Record<string, unknown>;
  const entries = Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableSerialize(record[key])}`);
  return `{${entries.join(",")}}`;
}
