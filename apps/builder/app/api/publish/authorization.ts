import type { NextRequest } from "next/server";
import type { Site } from "@micirql/schema";
import { isDentalCertifiedSection } from "@micirql/sections";
import {
  DENTAL_CATALOG_VERSION,
  DENTAL_REQUIRED_ACTIONS,
  DENTAL_REQUIRED_PAGE_PATHS,
  DENTAL_SUBTYPE,
  listIndustryDesignPresets,
} from "../../industry-design-preset-data";
import {
  selectedCandidateStructureIssues,
  validateSelectedDraft,
} from "../design-review/select/selection-pipeline";
import {
  bearerToken,
  getSupabaseDraft,
  supabaseConfig,
  usesSupabaseDraftStore,
  type DraftRecord,
} from "../drafts/supabase-store";

export class PublishApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "PublishApiError";
  }
}

export async function authorizeSavedSite(
  request: NextRequest,
  input: { workspaceId: string; siteId: string },
): Promise<{ userId: string; draft: DraftRecord }> {
  if (!usesSupabaseDraftStore()) {
    throw new PublishApiError(
      503,
      "PUBLISH_SUPABASE_DRAFT_STORE_REQUIRED",
      "Publishing requires MICIRQL_DRAFT_STORE=supabase so the server can publish an exact, owned saved revision.",
    );
  }

  const userId = await verifiedAuthenticatedUserId(request);
  let draft: DraftRecord | undefined;
  try {
    draft = await getSupabaseDraft(request, input.workspaceId, input.siteId);
  } catch (error) {
    const status = (error as Error & { status?: number }).status;
    if (status === 401) {
      throw new PublishApiError(
        401,
        "AUTH_REQUIRED",
        "A valid Supabase session is required.",
      );
    }
    if (status === 403) {
      throw new PublishApiError(
        403,
        "PUBLISH_OWNERSHIP_LOOKUP_FORBIDDEN",
        "The authenticated role must be authorized by the existing RLS policy to read its own workspace_drafts row.",
      );
    }
    throw error;
  }

  if (!draft) {
    // Do not disclose whether the site exists to a caller without an owned draft.
    throw new PublishApiError(
      403,
      "SITE_ACCESS_FORBIDDEN",
      "The site is not available in this workspace.",
    );
  }
  if (
    draft.workspaceId !== input.workspaceId ||
    draft.siteId !== input.siteId
  ) {
    throw new PublishApiError(
      403,
      "SITE_ACCESS_FORBIDDEN",
      "The site is not available in this workspace.",
    );
  }

  return { userId, draft };
}

export async function verifiedAuthenticatedUserId(
  request: NextRequest,
): Promise<string> {
  let token: string;
  try {
    token = bearerToken(request);
  } catch {
    throw new PublishApiError(
      401,
      "AUTH_REQUIRED",
      "A valid Supabase session is required.",
    );
  }
  const { url, key } = supabaseConfig();
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: {
      apikey: key,
      authorization: `Bearer ${token}`,
      accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new PublishApiError(
      response.status === 403 ? 403 : 401,
      response.status === 403 ? "AUTH_FORBIDDEN" : "AUTH_REQUIRED",
      response.status === 403
        ? "This Supabase account is not authorized for the requested operation."
        : "A valid Supabase session is required.",
    );
  }

  const user = (await response.json()) as { id?: unknown };
  if (typeof user.id !== "string" || !user.id) {
    throw new PublishApiError(
      401,
      "AUTH_REQUIRED",
      "The authenticated Supabase user could not be resolved.",
    );
  }
  return user.id;
}

export function assertExactSavedRevision(
  draft: DraftRecord,
  input: { expectedRevision?: unknown; clientSite?: Site },
) {
  if (input.expectedRevision !== undefined) {
    const expectedRevision = Number(input.expectedRevision);
    if (!Number.isInteger(expectedRevision) || expectedRevision < 1) {
      throw new PublishApiError(
        400,
        "INVALID_EXPECTED_REVISION",
        "expectedRevision must be a positive integer.",
      );
    }
    if (draft.revision !== expectedRevision) {
      throw new PublishApiError(
        409,
        "PUBLISH_REVISION_CONFLICT",
        `The saved draft is revision ${draft.revision}; reload it before publishing.`,
      );
    }
  }

  if (
    input.clientSite &&
    canonicalJson(input.clientSite) !== canonicalJson(draft.snapshot)
  ) {
    throw new PublishApiError(
      409,
      "PUBLISH_SAVED_DRAFT_MISMATCH",
      "The browser snapshot does not match the saved Supabase revision. Save or reload before publishing.",
    );
  }
  if (input.expectedRevision === undefined && !input.clientSite) {
    throw new PublishApiError(
      400,
      "PUBLISH_REVISION_REQUIRED",
      "Provide expectedRevision when the saved snapshot is not included in the request.",
    );
  }
}

export function assertPremiumGate(site: Site) {
  const report = site.generation?.premiumGate;
  if (!report) {
    throw new PublishApiError(
      422,
      "PREMIUM_REPORT_REQUIRED",
      "The exact saved revision does not contain a premium validation report.",
    );
  }
  if (!report.passed) {
    const diagnostics = report.issues
      .filter((issue) => issue.severity === "error")
      .map((issue) => issue.message)
      .slice(0, 3)
      .join(" ");
    throw new PublishApiError(
      422,
      "PREMIUM_GATE_FAILED",
      diagnostics ||
        "The exact saved revision has not passed the premium validation gate.",
    );
  }

  const generation = site.generation;
  const candidateIds = generation?.candidateIds ?? [];
  const selectedCandidateId = generation?.selectedCandidateId;
  const approvedCandidates = listIndustryDesignPresets("clinic", DENTAL_SUBTYPE);
  const approvedCandidateIds = new Set(approvedCandidates.map((candidate) => candidate.id));
  const selectedCandidate = approvedCandidates.find(
    (candidate) => candidate.id === selectedCandidateId,
  );
  const currentReport = validateSelectedDraft(
    site,
    selectedCandidate
      ? selectedCandidateStructureIssues(site, selectedCandidate)
      : [],
  );
  const pagePaths = new Set(site.pages.map((page) => page.path));
  const actionIds = new Set(
    site.pages.flatMap((page) =>
      page.sections.flatMap((section) =>
        Object.values(section.bindings).map((binding) => binding.actionId),
      ),
    ),
  );
  const componentIssues = site.pages.flatMap((page) =>
    page.sections
      .filter(
        (section) =>
          !section.hidden &&
          !isDentalCertifiedSection(
            section.component.componentId,
            section.component.version,
          ),
      )
      .map(
        (section) =>
          `${page.path}:${section.component.componentId}@${section.component.version}`,
      ),
  );
  const invalidCandidateIds = candidateIds.filter(
    (candidateId) => !approvedCandidateIds.has(candidateId),
  );
  const invariantIssues = [
    ...(site.domain === "clinic" ? [] : ["domain must be clinic"]),
    ...(site.subtype?.trim().toLowerCase() === DENTAL_SUBTYPE
      ? []
      : ["subtype must be dental"]),
    ...(generation?.packStatus === "certified"
      ? []
      : ["generation pack must be certified"]),
    ...(generation?.catalogVersion === DENTAL_CATALOG_VERSION
      ? []
      : ["dental catalog version is stale or missing"]),
    ...(candidateIds.length === 20 && new Set(candidateIds).size === 20
      ? []
      : ["ranked candidate set must contain 20 unique IDs"]),
    ...(invalidCandidateIds.length
      ? [`unknown candidate IDs: ${invalidCandidateIds.slice(0, 3).join(", ")}`]
      : []),
    ...(selectedCandidateId &&
    candidateIds.includes(selectedCandidateId) &&
    approvedCandidateIds.has(selectedCandidateId)
      ? []
      : ["selected candidate is missing or unapproved"]),
    ...(currentReport.score >= 85 &&
    !currentReport.issues.some((issue) => issue.severity === "error")
      ? []
      : ["premium score or diagnostics do not satisfy the release threshold"]),
    ...(currentReport.passed && currentReport.score >= 85
      ? []
      : [
          `the exact saved snapshot no longer passes premium validation: ${currentReport.issues
            .filter((issue) => issue.severity === "error")
            .slice(0, 2)
            .map((issue) => issue.message)
            .join(" ") || "score is below 85"}`,
        ]),
    ...DENTAL_REQUIRED_PAGE_PATHS.filter((path) => !pagePaths.has(path)).map(
      (path) => `required page ${path} is missing`,
    ),
    ...DENTAL_REQUIRED_ACTIONS.filter((actionId) => !actionIds.has(actionId)).map(
      (actionId) => `required action ${actionId} is missing`,
    ),
    ...(componentIssues.length
      ? [
          `non-certified components: ${componentIssues.slice(0, 3).join(", ")}`,
        ]
      : []),
  ];
  if (invariantIssues.length) {
    throw new PublishApiError(
      422,
      "PREMIUM_GATE_STALE_OR_TAMPERED",
      invariantIssues.slice(0, 4).join(". "),
    );
  }
}

export function publishErrorResponse(
  error: unknown,
  fallbackCode: string,
  fallbackMessage: string,
) {
  if (error instanceof PublishApiError) {
    return Response.json(
      { ok: false, issues: [{ code: error.code, message: error.message }] },
      { status: error.status },
    );
  }

  const status = (error as Error & { status?: number }).status;
  if (status === 401 || status === 403) {
    return Response.json(
      {
        ok: false,
        issues: [
          {
            code: "PUBLISH_RPC_AUTHORIZATION_REQUIRED",
            message:
              "Configure a server-only Supabase secret/service-role credential authorized to execute the existing publish_site_version and rollback_site_version RPCs. Do not grant these unrestricted SECURITY DEFINER functions to browser roles.",
          },
        ],
      },
      { status: 503 },
    );
  }

  return Response.json(
    {
      ok: false,
      issues: [
        {
          code: fallbackCode,
          message: error instanceof Error ? error.message : fallbackMessage,
        },
      ],
    },
    { status: 500 },
  );
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
    .join(",")}}`;
}
