import type { AssetRecord } from "./types";
import type { ProductionAssetService } from "./storage";

export type UploadPrincipal = {
  userId: string;
  workspaceId: string;
};

export type UploadAuthorizer = {
  authorize(args: { userId: string; workspaceId: string; siteId?: string }): Promise<boolean>;
};

export type UploadIntent = {
  uploadId: string;
  assetId: string;
  workspaceId: string;
  siteId?: string;
  fileName: string;
  contentType: string;
  bytes: number;
  objectKey: string;
  expiresAt: string;
};

export type UploadIntentStore = {
  insert(intent: UploadIntent): Promise<void>;
  get(uploadId: string): Promise<UploadIntent | undefined>;
  complete(uploadId: string): Promise<void>;
};

export type DirectUploadSigner = {
  signPut(args: {
    objectKey: string;
    contentType: string;
    bytes: number;
    expiresInSeconds: number;
  }): Promise<{ uploadUrl: string; headers?: Record<string, string> }>;
};

export type UploadedObjectReader = {
  read(args: { objectKey: string }): Promise<{
    bytes: Uint8Array;
    contentType: string;
    fileName: string;
  }>;
};

export type UploadGateway = {
  createIntent(args: {
    principal: UploadPrincipal;
    siteId?: string;
    fileName: string;
    contentType: string;
    bytes: number;
  }): Promise<{
    uploadId: string;
    assetId: string;
    uploadUrl: string;
    headers: Record<string, string>;
    expiresAt: string;
  }>;
  finalize(args: {
    principal: UploadPrincipal;
    uploadId: string;
    name?: string;
  }): Promise<AssetRecord>;
};

export function createUploadGateway(args: {
  authorizer: UploadAuthorizer;
  intents: UploadIntentStore;
  signer: DirectUploadSigner;
  reader: UploadedObjectReader;
  assets: ProductionAssetService;
  maxBytes?: number;
  expiresInSeconds?: number;
  now?: () => Date;
  id?: () => string;
}): UploadGateway {
  const maxBytes = args.maxBytes ?? 15 * 1024 * 1024;
  const ttl = args.expiresInSeconds ?? 15 * 60;
  const now = args.now ?? (() => new Date());
  const makeId = args.id ?? (() => crypto.randomUUID());

  return {
    async createIntent(input) {
      if (!(await args.authorizer.authorize({
        userId: input.principal.userId,
        workspaceId: input.principal.workspaceId,
        ...(input.siteId ? { siteId: input.siteId } : {}),
      }))) throw new Error("UPLOAD_NOT_AUTHORIZED");

      if (!input.contentType.startsWith("image/")) throw new Error("UPLOAD_NOT_IMAGE");
      if (!Number.isInteger(input.bytes) || input.bytes <= 0 || input.bytes > maxBytes) throw new Error("UPLOAD_SIZE_INVALID");

      const uploadId = makeId();
      const assetId = makeId();
      const safeFile = sanitizeFileName(input.fileName);
      const objectKey = `workspaces/${safeSegment(input.principal.workspaceId)}/incoming/${safeSegment(uploadId)}/${safeFile}`;
      const expiresAt = new Date(now().getTime() + ttl * 1000).toISOString();

      const signed = await args.signer.signPut({
        objectKey,
        contentType: input.contentType,
        bytes: input.bytes,
        expiresInSeconds: ttl,
      });

      await args.intents.insert({
        uploadId,
        assetId,
        workspaceId: input.principal.workspaceId,
        ...(input.siteId ? { siteId: input.siteId } : {}),
        fileName: safeFile,
        contentType: input.contentType,
        bytes: input.bytes,
        objectKey,
        expiresAt,
      });

      return {
        uploadId,
        assetId,
        uploadUrl: signed.uploadUrl,
        headers: signed.headers ?? {},
        expiresAt,
      };
    },

    async finalize(input) {
      const intent = await args.intents.get(input.uploadId);
      if (!intent) throw new Error("UPLOAD_INTENT_NOT_FOUND");
      if (intent.workspaceId !== input.principal.workspaceId) throw new Error("UPLOAD_WORKSPACE_MISMATCH");
      if (Date.parse(intent.expiresAt) < now().getTime()) throw new Error("UPLOAD_INTENT_EXPIRED");
      if (!(await args.authorizer.authorize({
        userId: input.principal.userId,
        workspaceId: intent.workspaceId,
        ...(intent.siteId ? { siteId: intent.siteId } : {}),
      }))) throw new Error("UPLOAD_NOT_AUTHORIZED");

      const uploaded = await args.reader.read({ objectKey: intent.objectKey });
      if (uploaded.contentType !== intent.contentType) throw new Error("UPLOAD_CONTENT_TYPE_MISMATCH");
      if (uploaded.bytes.byteLength !== intent.bytes) throw new Error("UPLOAD_SIZE_MISMATCH");

      const asset = await args.assets.ingestUpload({
        id: intent.assetId,
        workspaceId: intent.workspaceId,
        name: input.name?.trim() || intent.fileName,
        original: uploaded,
        sourceReference: intent.objectKey,
      });
      await args.intents.complete(intent.uploadId);
      return asset;
    },
  };
}

function sanitizeFileName(value: string): string {
  const cleaned = value.trim().replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
  return cleaned && cleaned !== "." && cleaned !== ".." ? cleaned : "upload-image";
}

function safeSegment(value: string): string {
  const cleaned = value.trim().replace(/[^a-zA-Z0-9._-]/g, "-");
  if (!cleaned || cleaned === "." || cleaned === "..") throw new Error("INVALID_UPLOAD_SEGMENT");
  return cleaned;
}
