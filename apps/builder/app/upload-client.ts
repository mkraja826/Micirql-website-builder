import type { AssetRecord } from "@micirql/assets";

export type UploadProgress = {
  phase: "authorizing" | "uploading" | "processing" | "complete";
  loaded: number;
  total: number;
  percent: number;
};

export async function uploadWorkspaceImage(args: {
  workspaceId: string;
  siteId: string;
  file: File;
  onProgress?(progress: UploadProgress): void;
}): Promise<AssetRecord> {
  args.onProgress?.({ phase: "authorizing", loaded: 0, total: args.file.size, percent: 0 });

  const intentResponse = await fetch("/api/assets/upload/intent", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      workspaceId: args.workspaceId,
      siteId: args.siteId,
      fileName: args.file.name,
      contentType: args.file.type,
      bytes: args.file.size,
    }),
  });

  if (!intentResponse.ok) {
    const body = await intentResponse.json().catch(() => ({})) as { error?: string; developmentFallback?: boolean };
    if (body.developmentFallback) return uploadDevelopmentFallback(args);
    throw new Error(body.error ?? `Upload authorization failed (${intentResponse.status}).`);
  }

  const intent = await intentResponse.json() as {
    uploadId: string;
    uploadUrl: string;
    headers: Record<string, string>;
  };

  await directPut(intent.uploadUrl, intent.headers, args.file, (loaded, total) => {
    args.onProgress?.({ phase: "uploading", loaded, total, percent: total ? Math.round((loaded / total) * 100) : 0 });
  });

  args.onProgress?.({ phase: "processing", loaded: args.file.size, total: args.file.size, percent: 100 });
  const finalizeResponse = await fetch("/api/assets/upload/finalize", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ workspaceId: args.workspaceId, uploadId: intent.uploadId, name: args.file.name }),
  });
  const finalized = await finalizeResponse.json() as { asset?: AssetRecord; error?: string };
  if (!finalizeResponse.ok || !finalized.asset) throw new Error(finalized.error ?? `Upload processing failed (${finalizeResponse.status}).`);

  args.onProgress?.({ phase: "complete", loaded: args.file.size, total: args.file.size, percent: 100 });
  return finalized.asset;
}

function directPut(url: string, headers: Record<string, string>, file: File, progress: (loaded: number, total: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url, true);
    for (const [key, value] of Object.entries(headers)) xhr.setRequestHeader(key, value);
    xhr.upload.onprogress = (event) => progress(event.loaded, event.lengthComputable ? event.total : file.size);
    xhr.onerror = () => reject(new Error("Direct object upload failed."));
    xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Direct object upload failed (${xhr.status}).`));
    xhr.send(file);
  });
}

async function uploadDevelopmentFallback(args: { workspaceId: string; siteId: string; file: File; onProgress?(progress: UploadProgress): void }): Promise<AssetRecord> {
  const dataUrl = await readDataUrl(args.file);
  const response = await fetch("/api/assets/upload", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ workspaceId: args.workspaceId, name: args.file.name, dataUrl }),
  });
  const body = await response.json() as { asset?: AssetRecord; error?: string };
  if (!response.ok || !body.asset) throw new Error(body.error ?? "Development upload failed.");
  args.onProgress?.({ phase: "complete", loaded: args.file.size, total: args.file.size, percent: 100 });
  return body.asset;
}

function readDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Could not read image."));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}
