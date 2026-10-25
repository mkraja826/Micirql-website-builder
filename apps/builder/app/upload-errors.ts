export const MAX_WORKSPACE_UPLOAD_BYTES = 15 * 1024 * 1024;

export const LOGO_UPLOAD_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
] as const;

// Keep this stricter than the private `workspace-assets` bucket. The live
// bucket does not currently accept AVIF; PDF/GIF are intentionally excluded
// even though Storage permits them because this product surface is images only.
export const IMAGE_UPLOAD_TYPES = [...LOGO_UPLOAD_TYPES] as const;

export type WorkspaceUploadKind = "image" | "logo";

export type WorkspaceUploadFailureCode =
  | "UPLOAD_FILE_EMPTY"
  | "UPLOAD_UNSUPPORTED_TYPE"
  | "UPLOAD_TOO_LARGE"
  | "UPLOAD_INVALID_REQUEST"
  | "UPLOAD_AUTH_REQUIRED"
  | "UPLOAD_FORBIDDEN"
  | "UPLOAD_SERVICE_UNAVAILABLE"
  | "UPLOAD_TRANSFER_FAILED"
  | "UPLOAD_EXPIRED"
  | "UPLOAD_PROCESSING_FAILED"
  | "UPLOAD_NETWORK_FAILED"
  | "UPLOAD_FAILED";

export type WorkspaceUploadFailure = {
  code: WorkspaceUploadFailureCode;
  message: string;
  retryable: boolean;
  status: number;
};

export type WorkspaceUploadErrorPayload = {
  code?: unknown;
  error?: unknown;
  message?: unknown;
  retryable?: unknown;
};

export class WorkspaceUploadError extends Error {
  readonly code: WorkspaceUploadFailureCode;
  readonly retryable: boolean;
  readonly status: number;

  constructor(failure: WorkspaceUploadFailure) {
    super(failure.message);
    this.name = "WorkspaceUploadError";
    this.code = failure.code;
    this.retryable = failure.retryable;
    this.status = failure.status;
  }
}

const FAILURE_DETAILS: Record<
  WorkspaceUploadFailureCode,
  Omit<WorkspaceUploadFailure, "code">
> = {
  UPLOAD_FILE_EMPTY: {
    message: "This file is empty. Choose another image.",
    retryable: false,
    status: 400,
  },
  UPLOAD_UNSUPPORTED_TYPE: {
    message: "Choose a PNG, JPG, WebP or SVG image.",
    retryable: false,
    status: 415,
  },
  UPLOAD_TOO_LARGE: {
    message: "This image is larger than 15 MB. Choose a smaller file.",
    retryable: false,
    status: 413,
  },
  UPLOAD_INVALID_REQUEST: {
    message: "The upload request was incomplete. Choose the file again.",
    retryable: false,
    status: 400,
  },
  UPLOAD_AUTH_REQUIRED: {
    message: "Your session expired. Sign in again before uploading.",
    retryable: false,
    status: 401,
  },
  UPLOAD_FORBIDDEN: {
    message: "You do not have permission to upload to this website.",
    retryable: false,
    status: 403,
  },
  UPLOAD_SERVICE_UNAVAILABLE: {
    message:
      "Uploads are temporarily unavailable. Your current design is unchanged.",
    retryable: true,
    status: 503,
  },
  UPLOAD_TRANSFER_FAILED: {
    message:
      "The image could not be transferred. Check your connection and try again.",
    retryable: true,
    status: 502,
  },
  UPLOAD_EXPIRED: {
    message: "The upload took too long to start. Try the same file again.",
    retryable: true,
    status: 409,
  },
  UPLOAD_PROCESSING_FAILED: {
    message:
      "We could not process this image. Try another exported copy of the file.",
    retryable: false,
    status: 422,
  },
  UPLOAD_NETWORK_FAILED: {
    message:
      "We could not reach the upload service. Check your connection and try again.",
    retryable: true,
    status: 503,
  },
  UPLOAD_FAILED: {
    message: "The image was not uploaded. Your current design is unchanged.",
    retryable: true,
    status: 500,
  },
};

export function workspaceUploadFailure(
  code: WorkspaceUploadFailureCode,
): WorkspaceUploadFailure {
  return { code, ...FAILURE_DETAILS[code] };
}

export function validateWorkspaceUpload(
  file: Pick<File, "size" | "type">,
  kind: WorkspaceUploadKind = "image",
): WorkspaceUploadFailure | undefined {
  if (!Number.isFinite(file.size) || file.size <= 0) {
    return workspaceUploadFailure("UPLOAD_FILE_EMPTY");
  }
  if (file.size > MAX_WORKSPACE_UPLOAD_BYTES) {
    return workspaceUploadFailure("UPLOAD_TOO_LARGE");
  }
  const allowed: readonly string[] =
    kind === "logo" ? LOGO_UPLOAD_TYPES : IMAGE_UPLOAD_TYPES;
  if (!allowed.includes(file.type.toLowerCase())) {
    return workspaceUploadFailure("UPLOAD_UNSUPPORTED_TYPE");
  }
  return undefined;
}

export function normalizeWorkspaceUploadFailure(
  error: unknown,
  fallbackCode: WorkspaceUploadFailureCode = "UPLOAD_FAILED",
): WorkspaceUploadFailure {
  if (error instanceof WorkspaceUploadError) {
    return {
      code: error.code,
      message: error.message,
      retryable: error.retryable,
      status: error.status,
    };
  }

  const record = isRecord(error) ? error : undefined;
  const rawCode =
    stringValue(record?.code) ??
    stringValue(record?.error) ??
    (error instanceof Error ? stringValue(error.message) : undefined);
  const status = numberValue(record?.status);
  const code = publicCode(rawCode, status, fallbackCode);
  return workspaceUploadFailure(code);
}

export function uploadErrorPayload(failure: WorkspaceUploadFailure) {
  return {
    ok: false as const,
    code: failure.code,
    error: failure.message,
    message: failure.message,
    retryable: failure.retryable,
  };
}

export function uploadFailureFromPayload(
  payload: WorkspaceUploadErrorPayload,
  status: number,
  fallbackCode: WorkspaceUploadFailureCode,
) {
  return normalizeWorkspaceUploadFailure(
    {
      code: payload.code,
      error: payload.error,
      status,
    },
    fallbackCode,
  );
}

function publicCode(
  rawCode: string | undefined,
  status: number | undefined,
  fallbackCode: WorkspaceUploadFailureCode,
): WorkspaceUploadFailureCode {
  switch (rawCode) {
    case "UPLOAD_FILE_EMPTY":
    case "UPLOAD_UNSUPPORTED_TYPE":
    case "UPLOAD_TOO_LARGE":
    case "UPLOAD_INVALID_REQUEST":
    case "UPLOAD_AUTH_REQUIRED":
    case "UPLOAD_FORBIDDEN":
    case "UPLOAD_SERVICE_UNAVAILABLE":
    case "UPLOAD_TRANSFER_FAILED":
    case "UPLOAD_EXPIRED":
    case "UPLOAD_PROCESSING_FAILED":
    case "UPLOAD_NETWORK_FAILED":
    case "UPLOAD_FAILED":
      return rawCode;
    case "AUTH_REQUIRED":
    case "AUTHENTICATION_REQUIRED":
    case "INVALID_AUTH_TOKEN":
      return "UPLOAD_AUTH_REQUIRED";
    case "AUTH_FORBIDDEN":
    case "UPLOAD_NOT_AUTHORIZED":
    case "UPLOAD_WORKSPACE_MISMATCH":
      return "UPLOAD_FORBIDDEN";
    case "ASSET_UPLOAD_GATEWAY_NOT_CONFIGURED":
      return "UPLOAD_SERVICE_UNAVAILABLE";
    case "UPLOAD_NOT_IMAGE":
    case "UPLOAD_CONTENT_TYPE_MISMATCH":
      return "UPLOAD_UNSUPPORTED_TYPE";
    case "UPLOAD_SIZE_INVALID":
    case "UPLOAD_SIZE_MISMATCH":
      return "UPLOAD_TOO_LARGE";
    case "UPLOAD_INTENT_EXPIRED":
    case "UPLOAD_INTENT_NOT_FOUND":
      return "UPLOAD_EXPIRED";
    case "UPLOAD_FINALIZE_FAILED":
      return "UPLOAD_PROCESSING_FAILED";
  }

  if (rawCode?.startsWith("Asset ingestion failed")) {
    return "UPLOAD_PROCESSING_FAILED";
  }
  if (status === 401) return "UPLOAD_AUTH_REQUIRED";
  if (status === 403) return "UPLOAD_FORBIDDEN";
  if (status === 413) return "UPLOAD_TOO_LARGE";
  if (status === 415) return "UPLOAD_UNSUPPORTED_TYPE";
  if (status === 409) return "UPLOAD_EXPIRED";
  if (status === 422) return "UPLOAD_PROCESSING_FAILED";
  if (status === 502) return "UPLOAD_TRANSFER_FAILED";
  if (status === 503 || status === 504) return "UPLOAD_SERVICE_UNAVAILABLE";
  return fallbackCode;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}
