import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import {
  createFunctionBindingResolver,
  createStaticRendererRegistry,
  preparePage,
  renderPreparedPage,
  type ResolvedBrandMark,
} from "@micirql/renderer";
import { nativeFunctionCatalog } from "@micirql/functions";
import { SCHEMA_VERSION, siteSchema, type Site } from "@micirql/schema";
import {
  SeedSection,
  seedSectionCatalog,
  seedSectionRegistryEntries,
  type UniversalSectionProps,
} from "@micirql/sections";
import {
  PHYSIOTHERAPY_DRAFT_CANDIDATES,
  PHYSIOTHERAPY_DRAFT_DESIGN_SIGNATURE,
  applyPhysiotherapyDraftCandidate,
  createPhysiotherapyDraftScaffold,
  rankPhysiotherapyDraftCandidates,
  type PhysiotherapyDraftCandidate,
  type PhysiotherapyDraftBrief,
  type PhysiotherapyDraftRankingProfile,
} from "../../../../builder/app/industry-packs/drafts";

type PhysiotherapyPreviewBriefId = "reference" | "calm" | "local" | "process";

const QA_LOGO_QUERY_VALUE = "contract";
const QA_LOGO_ASSET_ID = "qa-only/physiotherapy-supplied-logo-contract";

type PhysiotherapyPreviewBrief = {
  id: PhysiotherapyPreviewBriefId;
  content: PhysiotherapyDraftBrief;
  rankingProfile?: PhysiotherapyDraftRankingProfile;
};

const REFERENCE_PREVIEW_BRIEF: PhysiotherapyPreviewBrief = {
  id: "reference",
  content: {
    businessName: "Radhika Physiotherapy",
    location: "Hyderabad, Telangana",
    services: [
      "Physiotherapy assessment",
      "Sports rehabilitation",
      "Post-operative rehabilitation",
      "Mobility and movement support",
      "Guided exercise planning",
    ],
    conditions: [
      "Sports injuries",
      "Post-operative rehabilitation",
      "Mobility concerns",
      "Muscle and joint concerns",
    ],
    goals: [
      "Help visitors understand services and request an appointment",
      "Explain the assessment journey without diagnosis or outcome promises",
    ],
    languages: ["en"],
    openingHours: ["Monday–Saturday", "Hours confirmed by the clinic"],
  },
};

const RANKED_PREVIEW_BRIEFS = {
  calm: {
    id: "calm",
    content: {
      businessName: "Quiet Path Physiotherapy",
      services: [
        "Physiotherapy assessment",
        "Mobility and movement support",
        "Guided exercise planning",
      ],
      conditions: ["Mobility concerns", "Muscle and joint concerns"],
      goals: [
        "Reduce uncertainty before the first visit",
        "Offer a quiet, low-pressure route to an appointment request",
      ],
      languages: ["en"],
      notes: "A calm first-visit experience with restrained imagery.",
    },
    rankingProfile: {
      domain: "clinic",
      industry: "Physiotherapy",
      goals: ["Reduce uncertainty before the first visit"],
      styleTags: ["calm", "minimalist", "spacious", "restrained"],
      notes: "A quiet, low-pressure arrival experience.",
    },
  },
  local: {
    id: "local",
    content: {
      businessName: "Neighbourhood Motion Physio",
      location: "Hyderabad, Telangana",
      services: [
        "Physiotherapy assessment",
        "Sports rehabilitation",
        "Post-operative rehabilitation",
        "Mobility and movement support",
      ],
      conditions: [
        "Sports injuries",
        "Post-operative rehabilitation",
        "Mobility concerns",
      ],
      goals: [
        "Put location, arrival and accessibility before services",
        "Make practical visit details easy to find",
      ],
      languages: ["en"],
      openingHours: [
        "Monday–Friday, 8:00 AM–6:00 PM",
        "Saturday, 9:00 AM–1:00 PM",
      ],
      notes: "A practical local-clinic brief using supplied visit details.",
    },
    rankingProfile: {
      domain: "clinic",
      industry: "Physiotherapy",
      goals: ["Put location, arrival and accessibility before services"],
      styleTags: ["local", "friendly", "documentary", "practical"],
      location: "Hyderabad, Telangana",
      openingHours: [
        "Monday–Friday, 8:00 AM–6:00 PM",
        "Saturday, 9:00 AM–1:00 PM",
      ],
    },
  },
  process: {
    id: "process",
    content: {
      businessName: "Stepwise Physiotherapy",
      services: [
        "Physiotherapy assessment",
        "Post-operative rehabilitation",
        "Guided exercise planning",
        "Mobility and movement support",
      ],
      conditions: [
        "Post-operative rehabilitation",
        "Mobility concerns",
        "Muscle and joint concerns",
      ],
      goals: [
        "Explain the first assessment process before requesting an appointment",
        "Show clear, people-led next steps without outcome promises",
      ],
      languages: ["en"],
      notes: "A guided assessment journey with clear milestones.",
    },
    rankingProfile: {
      domain: "clinic",
      industry: "Physiotherapy",
      goals: [
        "Explain the first assessment process before requesting an appointment",
      ],
      styleTags: ["guided", "people-led", "milestone", "clear"],
      requiredCapabilities: ["appointment request"],
    },
  },
} satisfies Record<
  Exclude<PhysiotherapyPreviewBriefId, "reference">,
  PhysiotherapyPreviewBrief
>;

const registry = createStaticRendererRegistry({
  entries: seedSectionRegistryEntries,
  components: Object.fromEntries(
    seedSectionCatalog.map((entry) => {
      const Component: ComponentType<Record<string, unknown>> = (props) => (
        <SeedSection
          family={entry.family}
          theme={entry.theme}
          variant={entry.variant}
          props={props as UniversalSectionProps}
        />
      );
      return [entry.id, Component];
    }),
  ),
});

const functions = createFunctionBindingResolver({
  actionIds: nativeFunctionCatalog.map((definition) => definition.id),
  gatewayBasePath: "https://forms.micirql.com/api/functions",
});

export default async function PhysiotherapyDraftPreview({
  params,
  searchParams,
}: {
  params: Promise<{ slug?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ slug = [] }, query] = await Promise.all([params, searchParams]);
  const requestedPath = slug.length ? `/${slug.join("/")}` : "/";
  const previewBrief = previewBriefFromQuery(query.brief);
  const brandMark = qaBrandMarkFromQuery(
    query.logo,
    previewBrief.content.businessName,
  );
  const brandOptions = brandMark
    ? {
        brandInput: { logoAssetId: brandMark.assetId, colors: {} },
        brandProvenance: { logo: "user-upload" as const, colors: {} },
      }
    : undefined;
  const candidate = candidateFromQuery(
    query.candidate,
    previewBrief.rankingProfile,
  );
  const site = rewritePreviewLinks(
    applyPhysiotherapyDraftCandidate(
      generatedPhysiotherapySite(previewBrief, brandOptions),
      candidate,
      brandOptions,
    ),
    "/physiotherapy-draft",
    candidate.recipeId,
    previewBrief.id === "reference" ? undefined : previewBrief.id,
    Boolean(brandMark),
  );
  const prepared = await preparePage({
    site,
    path: requestedPath,
    origin: `https://${previewBrief.id}-physiotherapy.micirql.test`,
    registry,
    functions,
    mode: "production",
    ...(brandMark ? { brandMark } : {}),
  });
  if (!prepared.ok) notFound();

  return (
    <div
      data-mi-physiotherapy-draft="calm-clinical-movement"
      data-mi-physiotherapy-path={requestedPath}
      data-mi-physiotherapy-candidate={candidate.recipeId}
      data-mi-physiotherapy-brief={previewBrief.id}
      data-mi-physiotherapy-logo={brandMark ? QA_LOGO_QUERY_VALUE : undefined}
    >
      {renderPreparedPage(prepared.value)}
    </div>
  );
}

function generatedPhysiotherapySite(
  brief: PhysiotherapyPreviewBrief,
  brandOptions?: {
    brandInput: { logoAssetId: string; colors: {} };
    brandProvenance: { logo: "user-upload"; colors: {} };
  },
): Site {
  return createPhysiotherapyDraftScaffold(
    baseSite(brief),
    brief.content,
    brandOptions?.brandInput,
    brandOptions?.brandProvenance,
  );
}

function rewritePreviewLinks(
  site: Site,
  routePrefix: string,
  candidateRecipeId: string,
  briefId?: Exclude<PhysiotherapyPreviewBriefId, "reference">,
  preserveQaLogo = false,
): Site {
  const next = structuredClone(site);
  next.navigation = next.navigation.map((item) => ({
    ...item,
    href: previewHref(
      item.href,
      routePrefix,
      candidateRecipeId,
      briefId,
      preserveQaLogo,
    ),
  }));
  for (const page of next.pages) {
    for (const section of page.sections) {
      section.props = rewriteValue(
        section.props,
        routePrefix,
        candidateRecipeId,
        briefId,
        preserveQaLogo,
      ) as Record<string, unknown>;
    }
  }
  return siteSchema.parse(next);
}

function rewriteValue(
  value: unknown,
  routePrefix: string,
  candidateRecipeId: string,
  briefId?: Exclude<PhysiotherapyPreviewBriefId, "reference">,
  preserveQaLogo = false,
): unknown {
  if (Array.isArray(value))
    return value.map((item) =>
      rewriteValue(
        item,
        routePrefix,
        candidateRecipeId,
        briefId,
        preserveQaLogo,
      ),
    );
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      key === "href" && typeof item === "string"
        ? previewHref(
            item,
            routePrefix,
            candidateRecipeId,
            briefId,
            preserveQaLogo,
          )
        : rewriteValue(
            item,
            routePrefix,
            candidateRecipeId,
            briefId,
            preserveQaLogo,
          ),
    ]),
  );
}

function previewHref(
  href: string,
  routePrefix: string,
  candidateRecipeId: string,
  briefId?: Exclude<PhysiotherapyPreviewBriefId, "reference">,
  preserveQaLogo = false,
) {
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  const target = new URL(href, "https://preview.micirql.test");
  target.searchParams.set("candidate", candidateRecipeId);
  if (briefId) target.searchParams.set("brief", briefId);
  if (preserveQaLogo) target.searchParams.set("logo", QA_LOGO_QUERY_VALUE);
  const previewPath =
    target.pathname === "/" ? routePrefix : `${routePrefix}${target.pathname}`;
  return `${previewPath}?${target.searchParams.toString()}${target.hash}`;
}

function candidateFromQuery(
  value: string | string[] | undefined,
  rankingProfile?: PhysiotherapyDraftRankingProfile,
): PhysiotherapyDraftCandidate {
  const normalized = (Array.isArray(value) ? value[0] : value)?.trim();
  if (!normalized) {
    if (rankingProfile) {
      const ranked = rankPhysiotherapyDraftCandidates(rankingProfile)[0];
      if (ranked) return ranked.candidate;
      notFound();
    }
    const reference = PHYSIOTHERAPY_DRAFT_CANDIDATES.find(
      (entry) => entry.id === PHYSIOTHERAPY_DRAFT_DESIGN_SIGNATURE.candidateId,
    );
    if (!reference) notFound();
    return reference;
  }
  const candidate = PHYSIOTHERAPY_DRAFT_CANDIDATES.find(
    (entry) => entry.id === normalized || entry.recipeId === normalized,
  );
  if (!candidate) notFound();
  return candidate;
}

function previewBriefFromQuery(
  value: string | string[] | undefined,
): PhysiotherapyPreviewBrief {
  const normalized = (Array.isArray(value) ? value[0] : value)?.trim();
  if (!normalized) return REFERENCE_PREVIEW_BRIEF;
  if (normalized in RANKED_PREVIEW_BRIEFS)
    return RANKED_PREVIEW_BRIEFS[
      normalized as keyof typeof RANKED_PREVIEW_BRIEFS
    ];
  notFound();
}

/**
 * Internal visual-QA fixture only. It represents a resolved user upload without
 * claiming to be a real clinic identity or adding an asset to the product
 * catalog. Default candidate previews remain text-branded.
 */
function qaBrandMarkFromQuery(
  value: string | string[] | undefined,
  businessName: string,
): ResolvedBrandMark | undefined {
  const normalized = (Array.isArray(value) ? value[0] : value)?.trim();
  if (!normalized) return undefined;
  if (normalized !== QA_LOGO_QUERY_VALUE) notFound();
  return {
    assetId: QA_LOGO_ASSET_ID,
    src: qaLogoDataUrl(),
    alt: `${businessName} supplied logo QA fixture`,
    width: 600,
    height: 100,
  };
}

function qaLogoDataUrl() {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="100" viewBox="0 0 600 100"><rect x="2" y="2" width="596" height="96" rx="16" fill="#ffffff" stroke="#12324a" stroke-width="4"/><circle cx="50" cy="50" r="22" fill="#176b87"/><path d="M40 50h20M50 40v20" stroke="#ffffff" stroke-width="5" stroke-linecap="round"/><path d="M94 36h184M94 50h260M94 64h216" stroke="#12324a" stroke-width="8" stroke-linecap="round"/><rect x="494" y="30" width="70" height="40" rx="20" fill="#c96a35"/></svg>';
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function baseSite(brief: PhysiotherapyPreviewBrief): Site {
  const { content } = brief;
  return siteSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    siteId: `${brief.id}-physiotherapy-draft-preview`,
    workspaceId: `workspace-${brief.id}-physiotherapy-draft-preview`,
    name: content.businessName,
    domain: "clinic",
    subtype: "physiotherapy",
    theme: {
      family: "minimalist",
      modifiers: ["light"],
      brand: {
        colors: {
          primary: "#176B87",
          secondary: "#12324A",
          accent: "#C96A35",
          background: "#F7FAFC",
          surface: "#FFFFFF",
          textPrimary: "#12324A",
          textSecondary: "#526474",
          border: "#CBD8E1",
          success: "#287A58",
          warning: "#8A5A18",
          error: "#B42318",
        },
        typography: {
          display: "Manrope, Arial, sans-serif",
          body: "Inter, Arial, sans-serif",
          ui: "Inter, Arial, sans-serif",
        },
        density: "comfortable",
        shape: "soft",
        motion: "subtle",
      },
    },
    seoBlueprint: {
      primaryGoal: "Request a physiotherapy appointment",
      targetLocations: content.location ? [content.location] : [],
      priorityTopics: content.services,
      audiences: ["people seeking physiotherapy information"],
      languages: ["en"],
      localSeo: true,
      servicePages: true,
      locationPages: false,
      blog: false,
    },
    pages: [
      {
        id: "home",
        path: "/",
        name: "Home",
        sections: [],
        seo: {
          title: content.businessName,
          description: content.location
            ? `Physiotherapy information in ${content.location}.`
            : "Physiotherapy information and appointment requests.",
          canonicalPath: "/",
          indexable: true,
          structuredDataTypes: ["MedicalClinic"],
        },
      },
    ],
    navigation: [{ label: "Home", href: "/" }],
    integrations: [],
    domains: [],
  });
}
