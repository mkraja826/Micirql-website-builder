import type { ObjectStorage, StoredObject } from "./storage";

export type S3CompatibleClient = {
  putObject(args: {
    bucket: string;
    key: string;
    body: Uint8Array;
    contentType: string;
    cacheControl?: string;
  }): Promise<{ etag?: string }>;
  deleteObject(args: { bucket: string; key: string }): Promise<void>;
};

export function createS3CompatibleObjectStorage(args: {
  client: S3CompatibleClient;
  bucket: string;
  publicBaseUrl: string;
}): ObjectStorage {
  const base = args.publicBaseUrl.replace(/\/$/, "");
  return {
    async put(input): Promise<StoredObject> {
      const result = await args.client.putObject({
        bucket: args.bucket,
        key: input.key,
        body: input.bytes,
        contentType: input.contentType,
        ...(input.cacheControl ? { cacheControl: input.cacheControl } : {}),
      });
      return {
        key: input.key,
        url: `${base}/${encodeKey(input.key)}`,
        contentType: input.contentType,
        bytes: input.bytes.byteLength,
        ...(result.etag ? { etag: result.etag } : {}),
      };
    },
    async delete(key) {
      await args.client.deleteObject({ bucket: args.bucket, key });
    },
  };
}

function encodeKey(key: string): string {
  return key.split("/").map((segment) => encodeURIComponent(segment)).join("/");
}
