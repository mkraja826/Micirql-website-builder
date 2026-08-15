import type { AssetRecord } from "./types";
import type { AssetBinary, AssetIngestionPipeline } from "./ingestion";

export type StoredObject = {
  key: string;
  url: string;
  contentType: string;
  bytes: number;
  etag?: string;
};

export type ObjectStorage = {
  put(args: {
    key: string;
    bytes: Uint8Array;
    contentType: string;
    cacheControl?: string;
  }): Promise<StoredObject>;
  delete(key: string): Promise<void>;
};

export type AssetRegistryPersistence = {
  get(assetId: string): Promise<AssetRecord | undefined>;
  insert(asset: AssetRecord, storage: AssetStorageMetadata): Promise<void>;
  deactivate(assetId: string, deletedAt: string): Promise<void>;
  listPlaceholders(): Promise<AssetRecord[]>;
};

export type AssetReferenceInspector = {
  countReferences(assetId: string): Promise<number>;
};

export type AssetStorageMetadata = {
  provider: string;
  originalKey: string;
  variantKeys: string[];
};

export type ProductionAssetService = {
  ingestUpload(args: {
    id: string;
    workspaceId: string;
    name: string;
    original: AssetBinary;
    sourceReference?: string;
  }): Promise<AssetRecord>;
  deleteAsset(args: { workspaceId: string; assetId: string }): Promise<{ deleted: true }>;
};

export function assetObjectPrefix(workspaceId: string | undefined, assetId: string): string {
  const owner = workspaceId?.trim() ? `workspaces/${safeSegment(workspaceId)}` : "global";
  return `${owner}/assets/${safeSegment(assetId)}`;
}

export function createObjectStorageAssetAdapter(args: {
  storage: ObjectStorage;
  publicBaseUrl?: string;
}) {
  return {
    async putOriginal(input: { id: string; binary: AssetBinary }): Promise<string> {
      const extension = safeExtension(input.binary.fileName, input.binary.contentType);
      const key = `assets/${safeSegment(input.id)}/original.${extension}`;
      const stored = await args.storage.put({
        key,
        bytes: input.binary.bytes,
        contentType: input.binary.contentType,
        cacheControl: "public, max-age=31536000, immutable",
      });
      return args.publicBaseUrl ? `${args.publicBaseUrl.replace(/\/$/, "")}/${stored.key}` : stored.url;
    },
  };
}

export function createProductionAssetService(args: {
  ingestion: AssetIngestionPipeline;
  registry: AssetRegistryPersistence;
  references: AssetReferenceInspector;
  storage: ObjectStorage;
  storageMetadata(asset: AssetRecord): Promise<AssetStorageMetadata>;
  now?: () => Date;
}): ProductionAssetService {
  const now = args.now ?? (() => new Date());
  return {
    async ingestUpload(input) {
      const result = await args.ingestion.ingest({
        id: input.id,
        source: "user-upload",
        workspaceId: input.workspaceId,
        name: input.name,
        original: input.original,
        license: "user-owned",
        ...(input.sourceReference ? { sourceReference: input.sourceReference } : {}),
      });
      if (!result.ok) throw new Error(`Asset ingestion failed at ${result.stage}: ${result.reason}`);
      return result.asset;
    },

    async deleteAsset({ workspaceId, assetId }) {
      const asset = await args.registry.get(assetId);
      if (!asset || !asset.active) throw new Error("Asset not found.");
      if (asset.source === "micirql-placeholder") throw new Error("Global MiCirql placeholders cannot be deleted from a workspace.");
      if (asset.workspaceId !== workspaceId) throw new Error("Asset belongs to another workspace.");

      const references = await args.references.countReferences(assetId);
      if (references > 0) throw new Error(`Asset is still used by ${references} site reference${references === 1 ? "" : "s"}. Replace it before deleting.`);

      const metadata = await args.storageMetadata(asset);
      const keys = [metadata.originalKey, ...metadata.variantKeys].filter(Boolean);
      await Promise.all(keys.map((key) => args.storage.delete(key)));
      await args.registry.deactivate(assetId, now().toISOString());
      return { deleted: true as const };
    },
  };
}

function safeSegment(value: string): string {
  const sanitized = value.trim().replace(/[^a-zA-Z0-9._-]/g, "-");
  if (!sanitized || sanitized === "." || sanitized === "..") throw new Error("Invalid asset storage segment.");
  return sanitized;
}

function safeExtension(fileName: string, contentType: string): string {
  const fromName = fileName.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (fromName && fromName.length <= 5) return fromName;
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  if (contentType === "image/avif") return "avif";
  return "jpg";
}
