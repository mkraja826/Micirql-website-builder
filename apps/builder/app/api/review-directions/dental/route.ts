import { NextRequest, NextResponse } from "next/server";
import type { DesignPreferenceProfile } from "@micirql/design-engine";
import {
  diagnoseCertifiedDentalReviewDirections,
  summarizeDentalReviewDiagnostics,
} from "../../../dental-review-diagnostics";
import { buildCertifiedDentalReviewDirections, isDentalReviewProfile } from "../../../dental-review-directions";
import type { OnboardingProfile } from "../../../preset-ranking";
import { getSupabaseDraft } from "../../drafts/supabase-store";

type RequestBody = {
  workspaceId?: unknown;
  siteId?: unknown;
  profile?: unknown;
  preferenceProfile?: unknown;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as RequestBody;
    const workspaceId = text(body.workspaceId);
    const siteId = text(body.siteId);
    if (!workspaceId || !siteId) {
      return NextResponse.json({ error: "WORKSPACE_AND_SITE_REQUIRED" }, { status: 400 });
    }

    const profile = normalizeProfile(body.profile);
    if (!isDentalReviewProfile(profile)) {
      return NextResponse.json({ error: "DENTAL_PROFILE_REQUIRED" }, { status: 400 });
    }

    const draft = await getSupabaseDraft(request, workspaceId, siteId);
    if (!draft) return NextResponse.json({ error: "DRAFT_NOT_FOUND" }, { status: 404 });

    const preferenceProfile = isRecord(body.preferenceProfile)
      ? body.preferenceProfile as unknown as DesignPreferenceProfile
      : undefined;
    const directions = buildCertifiedDentalReviewDirections(
      draft.snapshot,
      profile,
      8,
      preferenceProfile,
    );

    if (!directions.length) {
      const diagnostics = diagnoseCertifiedDentalReviewDirections(draft.snapshot, profile);
      const error = summarizeDentalReviewDiagnostics(diagnostics);
      console.warn("MiCirql Dental review certification produced no directions.", {
        workspaceId,
        siteId,
        revision: draft.revision,
        diagnostics,
      });
      return NextResponse.json(
        {
          error,
          diagnostics,
          revision: draft.revision,
          directions: [],
        },
        { status: 422 },
      );
    }

    return NextResponse.json({
      ok: true,
      revision: draft.revision,
      directions,
    });
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not prepare certified Dental review directions." },
      { status },
    );
  }
}

function normalizeProfile(value: unknown): OnboardingProfile {
  if (!isRecord(value)) return {};
  return {
    business_name: optionalText(value.business_name),
    industry: optionalText(value.industry),
    subindustry: optionalText(value.subindustry),
    location: optionalText(value.location),
    goals: stringArray(value.goals),
    style_tags: stringArray(value.style_tags),
    required_capabilities: stringArray(value.required_capabilities),
    services: stringArray(value.services),
    notes: optionalText(value.notes),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function optionalText(value: unknown): string | null {
  return text(value) || null;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(text).filter(Boolean).slice(0, 48) : [];
}
