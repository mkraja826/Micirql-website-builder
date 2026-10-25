import type { AssetRecord } from "@micirql/assets";
import {
  normalizeWorkspaceUploadFailure,
  uploadFailureFromPayload,
  validateWorkspaceUpload,
  WorkspaceUploadError,
  type WorkspaceUploadErrorPayload,
} from "./upload-errors";

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
  kind?: "image" | "logo";
  onProgress?(progress: UploadProgress): void;
}): Promise<AssetRecord> {
  const validationFailure = validateWorkspaceUpload(
    args.file,
    args.kind ?? "image",
  );
  if (validationFailure) throw new WorkspaceUploadError(validationFailure);

  args.onProgress?.({
    phase: "authorizing",
    loaded: 0,
    total: args.file.size,
    percent: 0,
  });

  let intentResponse: Response;
  try {
    intentResponse = await fetch("/api/assets/upload/intent", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        workspaceId: args.workspaceId,
        siteId: args.siteId,
        fileName: args.file.name,
        contentType: args.file.type,
        bytes: args.file.size,
        kind: args.kind ?? "image",
      }),
    });
  } catch {
    throw new WorkspaceUploadError(
      normalizeWorkspaceUploadFailure(
        { code: "UPLOAD_NETWORK_FAILED" },
        "UPLOAD_NETWORK_FAILED",
      ),
    );
  }

  if (!intentResponse.ok) {
    const body = (await intentResponse
      .json()
      .catch(() => ({}))) as WorkspaceUploadErrorPayload & {
      developmentFallback?: boolean;
    };
    if (body.developmentFallback) return uploadDevelopmentFallback(args);
    throw new WorkspaceUploadError(
      uploadFailureFromPayload(body, intentResponse.status, "UPLOAD_FAILED"),
    );
  }

  const intent = (await intentResponse.json().catch(() => ({}))) as {
    uploadId: string;
    uploadUrl: string;
    headers: Record<string, string>;
    bodyFormat?: "raw" | "multipart";
  };
  if (
    !intent.uploadId ||
    !intent.uploadUrl ||
    !intent.headers ||
    typeof intent.headers !== "object"
  ) {
    throw new WorkspaceUploadError(
      normalizeWorkspaceUploadFailure(
        { code: "UPLOAD_FAILED" },
        "UPLOAD_FAILED",
      ),
    );
  }

  await directPut(
    intent.uploadUrl,
    intent.headers,
    args.file,
    intent.bodyFormat ?? "raw",
    (loaded, total) => {
      args.onProgress?.({
        phase: "uploading",
        loaded,
        total,
        percent: total ? Math.round((loaded / total) * 100) : 0,
      });
    },
  );

  args.onProgress?.({
    phase: "processing",
    loaded: args.file.size,
    total: args.file.size,
    percent: 100,
  });
  let finalizeResponse: Response;
  try {
    finalizeResponse = await fetch("/api/assets/upload/finalize", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        workspaceId: args.workspaceId,
        siteId: args.siteId,
        uploadId: intent.uploadId,
        name: args.file.name,
        kind: args.kind ?? "image",
      }),
    });
  } catch {
    throw new WorkspaceUploadError(
      normalizeWorkspaceUploadFailure(
        { code: "UPLOAD_NETWORK_FAILED" },
        "UPLOAD_NETWORK_FAILED",
      ),
    );
  }
  const finalized = (await finalizeResponse.json().catch(() => ({}))) as {
    asset?: AssetRecord;
  } & WorkspaceUploadErrorPayload;
  if (!finalizeResponse.ok || !finalized.asset) {
    throw new WorkspaceUploadError(
      uploadFailureFromPayload(
        finalized,
        finalizeResponse.status,
        "UPLOAD_PROCESSING_FAILED",
      ),
    );
  }

  args.onProgress?.({
    phase: "complete",
    loaded: args.file.size,
    total: args.file.size,
    percent: 100,
  });
  return finalized.asset;
}

function directPut(
  url: string,
  headers: Record<string, string>,
  file: File,
  bodyFormat: "raw" | "multipart",
  progress: (loaded: number, total: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url, true);
    xhr.timeout = 120_000;
    for (const [key, value] of Object.entries(headers))
      xhr.setRequestHeader(key, value);
    xhr.upload.onprogress = (event) =>
      progress(
        bodyFormat === "multipart"
          ? Math.min(file.size, event.loaded)
          : event.loaded,
        bodyFormat === "multipart"
          ? file.size
          : event.lengthComputable
            ? event.total
            : file.size,
      );
    const fail = () =>
      reject(
        new WorkspaceUploadError(
          normalizeWorkspaceUploadFailure(
            { code: "UPLOAD_TRANSFER_FAILED" },
            "UPLOAD_TRANSFER_FAILED",
          ),
        ),
      );
    xhr.onerror = fail;
    xhr.ontimeout = fail;
    xhr.onabort = fail;
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300 ? resolve() : fail();
    if (bodyFormat === "multipart") {
      const form = new FormData();
      form.append("cacheControl", "3600");
      form.append("", file, file.name);
      xhr.send(form);
    } else {
      xhr.send(file);
    }
  });
}

async function uploadDevelopmentFallback(args: {
  workspaceId: string;
  siteId: string;
  file: File;
  kind?: "image" | "logo";
  onProgress?(progress: UploadProgress): void;
}): Promise<AssetRecord> {
  let dataUrl: string;
  let dimensions: { width: number; height: number };
  try {
    dataUrl = await readDataUrl(args.file);
    dimensions = await readImageDimensions(dataUrl);
  } catch {
    throw new WorkspaceUploadError(
      normalizeWorkspaceUploadFailure(
        { code: "UPLOAD_PROCESSING_FAILED" },
        "UPLOAD_PROCESSING_FAILED",
      ),
    );
  }
  let response: Response;
  try {
    response = await fetch("/api/assets/upload", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        workspaceId: args.workspaceId,
        name: args.file.name,
        dataUrl,
        kind: args.kind ?? "image",
        width: dimensions.width,
        height: dimensions.height,
      }),
    });
  } catch {
    throw new WorkspaceUploadError(
      normalizeWorkspaceUploadFailure(
        { code: "UPLOAD_NETWORK_FAILED" },
        "UPLOAD_NETWORK_FAILED",
      ),
    );
  }
  const body = (await response.json().catch(() => ({}))) as {
    asset?: AssetRecord;
  } & WorkspaceUploadErrorPayload;
  if (!response.ok || !body.asset) {
    throw new WorkspaceUploadError(
      uploadFailureFromPayload(body, response.status, "UPLOAD_FAILED"),
    );
  }
  args.onProgress?.({
    phase: "complete",
    loaded: args.file.size,
    total: args.file.size,
    percent: 100,
  });
  return body.asset;
}

function readImageDimensions(
  dataUrl: string,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onerror = () => reject(new Error("Could not read image dimensions."));
    image.onload = () => {
      if (!image.naturalWidth || !image.naturalHeight) {
        reject(new Error("The uploaded image has invalid dimensions."));
        return;
      }
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.src = dataUrl;
  });
}

function readDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () =>
      reject(reader.error ?? new Error("Could not read image."));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}
