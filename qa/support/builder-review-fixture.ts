import {
  SCHEMA_VERSION,
  siteSchema,
  type BrandInput,
  type BrandProvenance,
  type CompositionGateReport,
  type Site,
} from "@micirql/schema";
import { resolveCertifiedIndustryPackRuntimeById } from "../../apps/builder/app/industry-packs";

export const BUILDER_REVIEW_WORKSPACE_ID =
  "11111111-1111-4111-8111-111111111111";
export const BUILDER_REVIEW_SITE_ID = "22222222-2222-4222-8222-222222222222";
export const BUILDER_REVIEW_USER_ID = "00000000-0000-4000-8000-000000000001";

export const BUILDER_REVIEW_SESSION = {
  access_token: "qa-access-token",
  refresh_token: "qa-refresh-token",
  expires_in: 3600,
  expires_at: 4_102_444_800,
  token_type: "bearer",
  user: {
    id: BUILDER_REVIEW_USER_ID,
    email: "qa@micirql.test",
  },
};

export const BUILDER_REVIEW_BRAND_INPUT = {
  colors: {
    primary: "#0F766E",
    secondary: "#164E63",
    accent: "#14B8A6",
  },
} satisfies BrandInput;

const BUILDER_REVIEW_BRAND_PROVENANCE = {
  colors: {
    primary: "user-supplied",
    secondary: "user-supplied",
    accent: "user-supplied",
  },
} satisfies BrandProvenance;

export const BUILDER_REVIEW_PROFILE = {
  workspace_id: BUILDER_REVIEW_WORKSPACE_ID,
  site_id: BUILDER_REVIEW_SITE_ID,
  created_by: BUILDER_REVIEW_USER_ID,
  business_name: "Radhika Dental",
  industry: "dental",
  subindustry: "dental",
  location: "Hyderabad, Telangana",
  services: ["Dental implants", "crowns", "root canal treatment"],
  goals: ["generate leads", "book appointments"],
  style_tags: ["professional", "modern"],
  required_capabilities: ["contact form", "booking"],
  languages: ["en"],
  notes: "Practice focus: Implants, family dentistry.",
  plan_id: "qa-dental-plan",
  build_id: "qa-dental-build",
  completed_at: "2026-10-21T00:00:00.000Z",
  updated_at: "2026-10-21T00:00:00.000Z",
} as const;

export type BuilderReviewDraft = {
  workspaceId: string;
  siteId: string;
  revision: number;
  snapshot: Site;
  updatedAt: string;
  updatedBy: string;
};

export type BuilderReviewFixture = {
  catalogVersion: string;
  candidateIds: string[];
  candidateNames: string[];
  draft: BuilderReviewDraft;
  profile: typeof BUILDER_REVIEW_PROFILE;
  select(
    candidateId: string,
    revision?: number,
  ): {
    draft: BuilderReviewDraft;
    gate: CompositionGateReport;
  };
};

/**
 * Builds the browser fixture through the same certified runtime used by
 * onboarding and selection. No hand-written candidate list is allowed here:
 * a catalog/ranking change must be reflected by the production runtime first.
 */
export function createBuilderReviewFixture(): BuilderReviewFixture {
  const runtime = resolveCertifiedIndustryPackRuntimeById("clinic-dental");
  if (!runtime) throw new Error("The certified Dental runtime is unavailable.");

  const source = baseSite();
  const snapshot = runtime.createStructuralScaffold(
    source,
    {
      businessName: BUILDER_REVIEW_PROFILE.business_name,
      industry: BUILDER_REVIEW_PROFILE.industry,
      subindustry: BUILDER_REVIEW_PROFILE.subindustry,
      location: BUILDER_REVIEW_PROFILE.location,
      services: [...BUILDER_REVIEW_PROFILE.services],
      goals: [...BUILDER_REVIEW_PROFILE.goals],
      languages: [...BUILDER_REVIEW_PROFILE.languages],
      notes: BUILDER_REVIEW_PROFILE.notes,
    },
    BUILDER_REVIEW_BRAND_INPUT,
    BUILDER_REVIEW_BRAND_PROVENANCE,
  );
  const ranked = runtime.rankCandidates(BUILDER_REVIEW_PROFILE);
  const candidateIds = ranked.map(({ candidate }) => candidate.id);
  const candidateNames = ranked.map(({ candidate }) => candidate.name);
  snapshot.generation = {
    catalogVersion: runtime.pack.catalogVersion,
    packStatus: "certified",
    candidateIds: [...candidateIds],
    brandInput: structuredClone(BUILDER_REVIEW_BRAND_INPUT),
    brandProvenance: structuredClone(BUILDER_REVIEW_BRAND_PROVENANCE),
  };

  const reviewSnapshot = siteSchema.parse(snapshot);
  const draft: BuilderReviewDraft = {
    workspaceId: BUILDER_REVIEW_WORKSPACE_ID,
    siteId: BUILDER_REVIEW_SITE_ID,
    revision: 7,
    snapshot: reviewSnapshot,
    updatedAt: "2026-10-21T00:00:00.000Z",
    updatedBy: BUILDER_REVIEW_USER_ID,
  };

  return {
    catalogVersion: runtime.pack.catalogVersion,
    candidateIds,
    candidateNames,
    draft,
    profile: BUILDER_REVIEW_PROFILE,
    select(candidateId, revision = draft.revision + 1) {
      if (!candidateIds.includes(candidateId)) {
        throw new Error(`Unknown ranked Dental candidate ${candidateId}.`);
      }
      let selected = runtime.applySelectedCandidate(
        reviewSnapshot,
        candidateId,
      );
      selected = runtime.applyCertifiedMedia(selected, candidateId);
      selected = runtime.applyContentHygiene(selected).site;
      selected = runtime.repairContentFit(selected).site;
      const gate = runtime.validateDraft(selected);
      if (!gate.passed) {
        throw new Error(
          `QA selection fixture failed the certified gate: ${gate.issues
            .map(({ code }) => code)
            .join(", ")}`,
        );
      }
      selected.generation!.premiumGate = gate;
      const selectedSnapshot = siteSchema.parse(selected);
      return {
        gate,
        draft: {
          workspaceId: BUILDER_REVIEW_WORKSPACE_ID,
          siteId: BUILDER_REVIEW_SITE_ID,
          revision,
          snapshot: selectedSnapshot,
          updatedAt: "2026-10-21T00:05:00.000Z",
          updatedBy: BUILDER_REVIEW_USER_ID,
        },
      };
    },
  };
}

function baseSite(): Site {
  return siteSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    siteId: BUILDER_REVIEW_SITE_ID,
    workspaceId: BUILDER_REVIEW_WORKSPACE_ID,
    name: "Radhika Dental",
    domain: "landing-page",
    theme: {
      family: "minimalist",
      modifiers: ["light"],
      brand: {
        colors: {
          primary: "#6D5DFC",
          secondary: "#171717",
          accent: "#8B7FFF",
          background: "#FFFFFF",
          surface: "#F5F5F7",
          textPrimary: "#111111",
          textSecondary: "#65656B",
          border: "#DDDDE3",
          success: "#168A4A",
          warning: "#AD6A00",
          error: "#C93636",
        },
        typography: {
          display: "Arial, sans-serif",
          body: "Arial, sans-serif",
          ui: "Arial, sans-serif",
        },
        density: "comfortable",
        shape: "balanced",
        motion: "subtle",
      },
    },
    seoBlueprint: {
      primaryGoal: "Present the business clearly and convert visitors",
      targetLocations: [],
      priorityTopics: [],
      audiences: [],
      languages: ["en"],
      localSeo: false,
      servicePages: true,
      locationPages: false,
      blog: false,
    },
    pages: [
      {
        id: "home",
        path: "/",
        name: "Home",
        sections: [
          {
            id: "hero-1",
            component: {
              componentId: "hero.placeholder",
              version: "1.0.0",
            },
            props: {
              heading: "Radhika Dental",
              body: "Dental care in Hyderabad.",
            },
            bindings: {},
            hidden: false,
          },
        ],
        seo: {
          title: "Radhika Dental",
          description: "Dental care in Hyderabad.",
          canonicalPath: "/",
          indexable: true,
          structuredDataTypes: [],
        },
      },
    ],
    navigation: [{ label: "Home", href: "/" }],
    integrations: [],
    domains: [],
  });
}
