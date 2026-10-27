import { NextRequest, NextResponse } from "next/server";
import type { CompositionGateIssue } from "@micirql/schema";
import {
  resolveCertifiedIndustryPackRuntimeForSite,
  type RegisteredIndustryPackRuntime,
} from "../../../industry-packs";
import { normalizeServiceInput } from "../../../service-normalization";
import {
  getSupabaseDraft,
  saveSupabaseDraft,
  supabaseConfig,
  supabaseHeaders,
  type DraftRecord,
} from "../../drafts/supabase-store";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REPAIRABLE_ISSUES = new Set([
  "CONTENT_HEADING_TOO_LONG",
  "CONTENT_BODY_TOO_LONG",
  "CONTENT_ACTION_LABEL_TOO_LONG",
  "SEO_TITLE_TOO_LONG",
  "SEO_DESCRIPTION_TOO_LONG",
]);
const PRE_CONTENT_BLOCKERS = new Set([
  "SITE_SCHEMA_INVALID",
  "DENTAL_DOMAIN_MISMATCH",
  "DENTAL_PACK_NOT_CERTIFIED",
  "INDUSTRY_DOMAIN_MISMATCH",
  "INDUSTRY_PACK_NOT_CERTIFIED",
  "DESIGN_SELECTION_MISSING",
  "REQUIRED_PAGE_MISSING",
  "REQUIRED_ACTION_MISSING",
  "UNAPPROVED_COMPONENT",
  "SUPPLIED_LOGO_CHANGED",
  "SUPPLIED_COLOR_CHANGED",
  "CANDIDATE_PROTOCOL_GATE_FAILED",
  "DESIGN_SYSTEM_MISMATCH",
  "TYPOGRAPHY_MISMATCH",
  "DESIGN_TOKEN_MISMATCH",
  "PALETTE_MISMATCH",
  "COMPONENT_FAMILY_UNKNOWN",
  "CANDIDATE_COMPONENT_MISMATCH",
  "CANDIDATE_SECTION_ORDER_MISMATCH",
  "PHYSIOTHERAPY_PAGE_ANATOMY_UNKNOWN",
  "RESTAURANT_PAGE_ANATOMY_UNKNOWN",
  "RESTAURANT_PAGE_SET_MISMATCH",
  "RESTAURANT_PAGE_ANATOMY_MISMATCH",
  "RESTAURANT_CANDIDATE_REQUIRED_FACT_MISSING",
  "RESTAURANT_FACTS_REQUIRED",
  "RESTAURANT_FACTS_VERSION_UNSUPPORTED",
  "RESTAURANT_BUSINESS_NAME_REQUIRED",
  "RESTAURANT_CUISINE_REQUIRED",
  "RESTAURANT_SERVICE_MODE_REQUIRED",
  "RESTAURANT_ADDRESS_REQUIRED",
  "RESTAURANT_OPENING_HOURS_REQUIRED",
  "RESTAURANT_RESERVATION_POLICY_REQUIRED",
  "RESTAURANT_STORY_REQUIRED",
  "RESTAURANT_CURRENT_MENU_REQUIRED",
  "RESTAURANT_MENU_DESCRIPTION_REQUIRED",
  "RESTAURANT_MENU_PRICE_REQUIRED",
  "RESTAURANT_MENU_CURRENCY_REQUIRED",
  "RESTAURANT_MAP_URL_REQUIRED",
  "RESTAURANT_MAP_URL_INVALID",
  "RESTAURANT_CONTACT_REQUIRED",
  "RESTAURANT_PHONE_INVALID",
  "RESTAURANT_EMAIL_INVALID",
  "RESTAURANT_PAGE_ID_DUPLICATE",
  "RESTAURANT_SECTION_ID_DUPLICATE",
  "RESTAURANT_SUPPLIED_FACTS_CHANGED",
]);

type OnboardingProfile = {
  workspace_id?: unknown;
  site_id?: unknown;
  business_name?: unknown;
  industry?: unknown;
  subindustry?: unknown;
  location?: unknown;
  services?: unknown;
  goals?: unknown;
  style_tags?: unknown;
  required_capabilities?: unknown;
  languages?: unknown;
  notes?: unknown;
  build_id?: unknown;
};

type FunctionResult = {
  ok: boolean;
  status: number;
  payload?: Record<string, unknown>;
  issue?: CompositionGateIssue;
};

export async function POST(request: NextRequest) {
  try {
    const input = await parseSelectionRequest(request);
    const { url } = supabaseConfig();
    const headers = supabaseHeaders(request);

    await requireAuthenticatedUser(url, headers);
    const current = await getSupabaseDraft(
      request,
      input.workspaceId,
      input.siteId,
    );
    if (!current) {
      throw selectionError(
        403,
        "DRAFT_ACCESS_DENIED",
        "The authenticated user does not have access to this workspace draft.",
      );
    }
    if (current.revision !== input.expectedRevision) {
      return NextResponse.json(
        {
          error: "REVISION_CONFLICT",
          code: "REVISION_CONFLICT",
          currentRevision: current.revision,
        },
        { status: 409 },
      );
    }

    const profile = await loadOnboardingProfile(
      url,
      headers,
      input.workspaceId,
      input.siteId,
    );
    const industryRuntime = assertCertifiedPackContext(
      current,
      profile,
      input.candidateId,
    );
    const industryPack = industryRuntime.pack;
    const brief = profileBrief(
      profile,
      current.snapshot.generation?.industryFacts,
    );
    const rankedCandidates = industryRuntime
      .rankCandidates(brief)
      .map((item) => item.candidate);
    assertCandidateSetMatchesCatalog(current, rankedCandidates);
    if (
      current.snapshot.generation?.catalogVersion !==
      industryPack.catalogVersion
    ) {
      throw selectionError(
        409,
        "CATALOG_VERSION_MISMATCH",
        "The ranked designs were produced by a different catalog version. Regenerate the design review before selecting.",
      );
    }

    const candidate = industryRuntime.resolveCandidate(input.candidateId);
    if (
      !candidate ||
      candidate.domain !== industryPack.domain ||
      candidate.subtype !== industryPack.subtype
    ) {
      throw selectionError(
        422,
        "CANDIDATE_NOT_IN_CERTIFIED_INDUSTRY_CATALOG",
        "The requested design is not part of this certified industry catalog.",
      );
    }
    if (candidate.catalogVersion !== industryPack.catalogVersion) {
      throw selectionError(
        409,
        "CATALOG_VERSION_MISMATCH",
        "The ranked designs were produced by a different catalog version. Regenerate the design review before selecting.",
      );
    }

    const selectedSnapshot = industryRuntime.applySelectedCandidate(
      current.snapshot,
      input.candidateId,
    );
    const structuralGate = industryRuntime.validateDraft(
      selectedSnapshot,
      industryRuntime.candidateStructureIssues(
        selectedSnapshot,
        input.candidateId,
      ),
    );
    const structuralBlockers = structuralGate.issues.filter((issue) =>
      PRE_CONTENT_BLOCKERS.has(issue.code),
    );
    if (structuralBlockers.length) {
      if (!selectedSnapshot.generation) {
        throw selectionError(
          500,
          "GENERATION_METADATA_MISSING",
          "The selected draft has no generation metadata.",
        );
      }
      selectedSnapshot.generation.premiumGate = {
        passed: false,
        score: structuralGate.score,
        issues: structuralBlockers,
      };
      const blockedDraft = await saveSupabaseDraft(request, {
        snapshot: selectedSnapshot,
        expectedRevision: current.revision,
      });
      return NextResponse.json(
        {
          ok: false,
          error: "STRUCTURAL_GATE_FAILED",
          code: "STRUCTURAL_GATE_FAILED",
          draft: blockedDraft,
          gate: selectedSnapshot.generation.premiumGate,
          content: { ok: false, skipped: true },
          images: { ok: false, skipped: true },
        },
        { status: 422 },
      );
    }
    let saved = await saveSupabaseDraft(request, {
      snapshot: selectedSnapshot,
      expectedRevision: current.revision,
    });

    const pipelineIssues: CompositionGateIssue[] = [];
    const contentResult = await invokeFunction(
      url,
      headers,
      industryRuntime.functionPolicy.contentEnrichment.functionName,
      {
        workspace_id: input.workspaceId,
        site_id: input.siteId,
        build_id: optionalString(profile.build_id),
        brief,
      },
    );
    let protectedContentMutation = false;
    if (!contentResult.ok && contentResult.issue) {
      pipelineIssues.push(contentResult.issue);
    } else {
      saved = await reloadSelectedDraft(
        request,
        input.workspaceId,
        input.siteId,
      );
      protectedContentMutation = industryRuntime.protectedStructureChanged(
        selectedSnapshot,
        saved.snapshot,
      );
      if (protectedContentMutation) {
        pipelineIssues.push({
          code: "CONTENT_MUTATED_PROTECTED_STRUCTURE",
          message:
            "Content generation changed protected structure, branding, bindings, or business identity. The editor remains blocked.",
          severity: "error",
        });
        saved = await saveSupabaseDraft(request, {
          snapshot: industryRuntime.restoreProtectedStructure(
            selectedSnapshot,
            saved.snapshot,
          ),
          expectedRevision: saved.revision,
        });
      }
      const contentMode = optionalString(contentResult.payload?.mode);
      if (
        contentMode &&
        !industryRuntime.functionPolicy.contentEnrichment.certifiedModes.includes(
          contentMode,
        ) &&
        !industryRuntime.functionPolicy.contentEnrichment.fallbackIsCertifiable
      ) {
        pipelineIssues.push({
          code: "CONTENT_GENERATION_AUTHORIZATION_REQUIRED",
          message:
            "Configure a server-side credential authorized for the production text endpoint and model. The returned fallback mode cannot pass this industry pack’s certification gate.",
          severity: "error",
        });
      }
    }

    const hygiene = industryRuntime.applyContentHygiene(saved.snapshot);
    if (hygiene.changed) {
      saved = await saveSupabaseDraft(request, {
        snapshot: hygiene.site,
        expectedRevision: saved.revision,
      });
    }

    let imageResult: FunctionResult | undefined;
    // Certified pack media is deterministic and does not depend on the text
    // provider. A text timeout must not collapse a content-rich composition to
    // a single hero image.
    if (!protectedContentMutation) {
      const mediaSnapshot = industryRuntime.applyCertifiedMedia(
        saved.snapshot,
        input.candidateId,
      );
      pipelineIssues.push(
        ...industryRuntime.certifiedMediaIssues(mediaSnapshot),
      );
      if (
        industryRuntime.protectedStructureChanged(saved.snapshot, mediaSnapshot)
      ) {
        pipelineIssues.push({
          code: "IMAGERY_MUTATED_PROTECTED_STRUCTURE",
          message:
            "Certified imagery changed protected structure, branding, bindings, or business identity. The editor remains blocked.",
          severity: "error",
        });
      } else {
        saved = await saveSupabaseDraft(request, {
          snapshot: mediaSnapshot,
          expectedRevision: saved.revision,
        });
        imageResult = {
          ok: true,
          status: 200,
          payload: {
            mode: industryRuntime.functionPolicy.certifiedMedia.mode,
            ...(industryRuntime.functionPolicy.certifiedMedia.provider
              ? {
                  provider:
                    industryRuntime.functionPolicy.certifiedMedia.provider,
                }
              : {}),
          },
        };
      }
    }

    let gate = industryRuntime.validateDraft(saved.snapshot, pipelineIssues);
    if (gate.issues.some((issue) => REPAIRABLE_ISSUES.has(issue.code))) {
      const repair = industryRuntime.repairContentFit(saved.snapshot);
      if (repair.changed) {
        saved = await saveSupabaseDraft(request, {
          snapshot: repair.site,
          expectedRevision: saved.revision,
        });
        gate = industryRuntime.validateDraft(saved.snapshot, pipelineIssues);
      }
    }

    const gatedSnapshot = structuredClone(saved.snapshot);
    if (!gatedSnapshot.generation) {
      throw selectionError(
        500,
        "GENERATION_METADATA_MISSING",
        "The selected draft lost its generation metadata before validation completed.",
      );
    }
    gatedSnapshot.generation.selectedCandidateId = input.candidateId;
    gatedSnapshot.generation.premiumGate = gate;
    saved = await saveSupabaseDraft(request, {
      snapshot: gatedSnapshot,
      expectedRevision: saved.revision,
    });

    const response = {
      ok: gate.passed,
      ...(gate.passed
        ? {}
        : { error: "PREMIUM_GATE_FAILED", code: "PREMIUM_GATE_FAILED" }),
      draft: saved,
      gate,
      content: functionSummary(contentResult),
      images: imageResult
        ? functionSummary(imageResult)
        : { ok: false, skipped: true },
    };
    return NextResponse.json(response, { status: gate.passed ? 200 : 422 });
  } catch (error) {
    return selectionErrorResponse(error);
  }
}

async function parseSelectionRequest(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw selectionError(
      400,
      "INVALID_JSON",
      "The design selection request must contain valid JSON.",
    );
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw selectionError(
      400,
      "INVALID_REQUEST",
      "The design selection request is invalid.",
    );
  }
  const record = body as Record<string, unknown>;
  const workspaceId = requiredString(record.workspaceId, "workspaceId");
  const siteId = requiredString(record.siteId, "siteId");
  const candidateId = requiredString(record.candidateId, "candidateId");
  const expectedRevision = Number(record.expectedRevision);
  if (!UUID_RE.test(workspaceId) || !UUID_RE.test(siteId)) {
    throw selectionError(
      400,
      "INVALID_DRAFT_IDENTITY",
      "workspaceId and siteId must be valid UUIDs.",
    );
  }
  if (!Number.isInteger(expectedRevision) || expectedRevision < 0) {
    throw selectionError(
      400,
      "INVALID_EXPECTED_REVISION",
      "expectedRevision must be a non-negative integer.",
    );
  }
  return { workspaceId, siteId, candidateId, expectedRevision };
}

async function requireAuthenticatedUser(
  url: string,
  headers: Record<string, string>,
) {
  const response = await fetch(`${url}/auth/v1/user`, {
    headers,
    cache: "no-store",
  });
  if (!response.ok) {
    throw selectionError(
      401,
      "AUTH_REQUIRED",
      "Sign in again before selecting a design.",
    );
  }
  const user = await safeJson(response);
  if (!user || Array.isArray(user) || typeof user.id !== "string" || !user.id) {
    throw selectionError(
      401,
      "AUTH_REQUIRED",
      "The authenticated user could not be verified.",
    );
  }
}

async function loadOnboardingProfile(
  url: string,
  headers: Record<string, string>,
  workspaceId: string,
  siteId: string,
): Promise<OnboardingProfile> {
  const query = new URLSearchParams({
    workspace_id: `eq.${workspaceId}`,
    site_id: `eq.${siteId}`,
    select:
      "workspace_id,site_id,business_name,industry,subindustry,location,services,goals,style_tags,required_capabilities,languages,notes,build_id",
    limit: "1",
  });
  const response = await fetch(
    `${url}/rest/v1/business_onboarding_profiles?${query}`,
    {
      headers,
      cache: "no-store",
    },
  );
  if (!response.ok) {
    throw selectionError(
      response.status === 401 ? 401 : 403,
      "ONBOARDING_PROFILE_ACCESS_DENIED",
      "The authenticated user cannot access the business brief for this draft.",
    );
  }
  const rows = await safeJson(response);
  const profile = Array.isArray(rows) ? rows[0] : undefined;
  if (!profile || typeof profile !== "object") {
    throw selectionError(
      403,
      "ONBOARDING_PROFILE_ACCESS_DENIED",
      "The authenticated user cannot access the business brief for this draft.",
    );
  }
  return profile as OnboardingProfile;
}

function assertCertifiedPackContext(
  draft: DraftRecord,
  profile: OnboardingProfile,
  candidateId: string,
): RegisteredIndustryPackRuntime {
  const generation = draft.snapshot.generation;
  if (
    string(profile.workspace_id) !== draft.workspaceId ||
    string(profile.site_id) !== draft.siteId
  ) {
    throw selectionError(
      403,
      "ONBOARDING_PROFILE_ACCESS_DENIED",
      "The business brief does not belong to this workspace draft.",
    );
  }
  const industryRuntime = resolveCertifiedIndustryPackRuntimeForSite({
    domain: draft.snapshot.domain,
    subtype: draft.snapshot.subtype ?? null,
  });
  if (
    !industryRuntime ||
    !industryRuntime.pack.matchesProfile({
      domain: draft.snapshot.domain,
      industry: profile.industry,
      subindustry: profile.subindustry,
      services: profile.services,
    })
  ) {
    throw selectionError(
      409,
      "INDUSTRY_PACK_NOT_CERTIFIED",
      "This draft and business brief do not match the same certified industry pack.",
    );
  }
  if (!generation || generation.packStatus !== "certified") {
    throw selectionError(
      409,
      "INDUSTRY_PACK_NOT_READY",
      `Generate the certified ${industryRuntime.pack.label} design review before selecting a design.`,
    );
  }
  const industryFactIssues = industryRuntime.industryFactsIssues(
    generation.industryFacts,
  );
  if (industryFactIssues.length) {
    throw selectionError(
      409,
      "INDUSTRY_FACTS_MISSING_OR_INVALID",
      industryFactIssues.map((issue) => issue.message).join(" "),
    );
  }
  if (
    generation.candidateIds.length !== industryRuntime.pack.reviewCount ||
    new Set(generation.candidateIds).size !== industryRuntime.pack.reviewCount
  ) {
    throw selectionError(
      409,
      "CANDIDATE_SET_INCOMPLETE",
      `The stored review does not contain ${industryRuntime.pack.reviewCount} unique certified candidates. Regenerate the review.`,
    );
  }
  if (!generation.candidateIds.includes(candidateId)) {
    throw selectionError(
      422,
      "CANDIDATE_NOT_IN_RANKED_SET",
      "The requested design is not in this draft’s ranked candidate set.",
    );
  }
  return industryRuntime;
}

function assertCandidateSetMatchesCatalog(
  draft: DraftRecord,
  candidates: readonly { id: string }[],
) {
  const storedIds = draft.snapshot.generation?.candidateIds ?? [];
  const catalogIds = candidates.map((candidate) => candidate.id);
  if (
    storedIds.length !== catalogIds.length ||
    storedIds.some((candidateId, index) => candidateId !== catalogIds[index])
  ) {
    throw selectionError(
      409,
      "CANDIDATE_SET_CATALOG_MISMATCH",
      "The stored ranked designs do not match the active certified industry catalog and order. Regenerate the design review before selecting.",
    );
  }
}

async function invokeFunction(
  url: string,
  headers: Record<string, string>,
  functionName: string,
  body: Record<string, unknown>,
): Promise<FunctionResult> {
  let response: Response;
  try {
    response = await fetch(`${url}/functions/v1/${functionName}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    return {
      ok: false,
      status: 503,
      issue: functionIssue(functionName, 503, "FUNCTION_UNREACHABLE"),
    };
  }
  const rawPayload = await safeJson(response);
  const payload =
    rawPayload && !Array.isArray(rawPayload) ? rawPayload : undefined;
  if (!response.ok) {
    const remoteCode =
      optionalString(payload?.code) ||
      optionalString(payload?.error) ||
      `HTTP_${response.status}`;
    return {
      ok: false,
      status: response.status,
      ...(payload ? { payload } : {}),
      issue: functionIssue(functionName, response.status, remoteCode),
    };
  }
  return { ok: true, status: response.status, ...(payload ? { payload } : {}) };
}

function functionIssue(
  functionName: string,
  status: number,
  remoteCode: string,
): CompositionGateIssue {
  if (functionName === "generate-site-images") {
    const authorizationRequired =
      status === 401 ||
      status === 403 ||
      status === 503 ||
      /AUTH|CREDENTIAL|PROVIDER|CONFIG/i.test(remoteCode);
    return {
      code: authorizationRequired
        ? "IMAGE_GENERATION_AUTHORIZATION_REQUIRED"
        : "IMAGE_GENERATION_FAILED",
      message: authorizationRequired
        ? "Configure a server-side credential authorized for the production image-generation endpoint and model, then retry design selection."
        : `Image generation failed (${status}). Retry selection after the image service is healthy.`,
      severity: "error",
    };
  }
  const authorizationRequired =
    status === 401 ||
    status === 403 ||
    status === 503 ||
    /AUTH|CREDENTIAL|PROVIDER|CONFIG|PERMISSION/i.test(remoteCode);
  return {
    code: authorizationRequired
      ? "CONTENT_GENERATION_AUTHORIZATION_REQUIRED"
      : "CONTENT_GENERATION_FAILED",
    message: authorizationRequired
      ? "Configure a server-side credential authorized for the production text-generation endpoint and configured model, then retry design selection."
      : `Content generation failed (${status}). Retry selection after the content service is healthy.`,
    severity: "error",
  };
}

async function reloadSelectedDraft(
  request: NextRequest,
  workspaceId: string,
  siteId: string,
) {
  const draft = await getSupabaseDraft(request, workspaceId, siteId);
  if (!draft) {
    throw selectionError(
      403,
      "DRAFT_ACCESS_DENIED",
      "The selected draft could not be reloaded with the authenticated user.",
    );
  }
  return draft;
}

function profileBrief(profile: OnboardingProfile, industryFacts?: unknown) {
  const industry = string(profile.industry);
  const subindustry = optionalString(profile.subindustry);
  return {
    businessName: string(profile.business_name),
    industry,
    subindustry,
    location: optionalString(profile.location),
    services: normalizeServiceInput(profile.services, {
      industry,
      subindustry,
    }),
    goals: stringArray(profile.goals),
    styleTags: stringArray(profile.style_tags),
    requiredCapabilities: stringArray(profile.required_capabilities),
    languages: stringArray(profile.languages).length
      ? stringArray(profile.languages)
      : ["en"],
    notes: optionalString(profile.notes),
    industryFacts,
  };
}

function functionSummary(result: FunctionResult) {
  return {
    ok: result.ok,
    status: result.status,
    ...(optionalString(result.payload?.mode)
      ? { mode: optionalString(result.payload?.mode) }
      : {}),
    ...(optionalString(result.payload?.provider)
      ? { provider: optionalString(result.payload?.provider) }
      : {}),
    ...(optionalString(result.payload?.model)
      ? { model: optionalString(result.payload?.model) }
      : {}),
  };
}

async function safeJson(
  response: Response,
): Promise<Record<string, unknown> | unknown[] | undefined> {
  try {
    const value = (await response.json()) as unknown;
    if (value && typeof value === "object")
      return value as Record<string, unknown> | unknown[];
  } catch {}
  return undefined;
}

function requiredString(value: unknown, name: string) {
  const result = string(value);
  if (!result)
    throw selectionError(400, "MISSING_REQUIRED_FIELD", `${name} is required.`);
  return result;
}

function string(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function optionalString(value: unknown) {
  const result = string(value);
  return result || null;
}

function stringArray(value: unknown) {
  if (Array.isArray(value)) return value.map(string).filter(Boolean);
  if (typeof value === "string")
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  return [];
}

function selectionError(status: number, code: string, message: string) {
  const error = new Error(message) as Error & {
    status?: number;
    code?: string;
  };
  error.status = status;
  error.code = code;
  return error;
}

function selectionErrorResponse(error: unknown) {
  const typed = error as Error & { status?: number; code?: string };
  const status =
    typed.status ?? (typed.message === "REVISION_CONFLICT" ? 409 : 500);
  const code =
    typed.code ??
    (typed.message === "REVISION_CONFLICT"
      ? "REVISION_CONFLICT"
      : "DESIGN_SELECTION_FAILED");
  const message =
    status >= 500 && code === "DESIGN_SELECTION_FAILED"
      ? "Design selection could not be completed."
      : typed.message;
  return NextResponse.json({ error: code, code, message }, { status });
}
