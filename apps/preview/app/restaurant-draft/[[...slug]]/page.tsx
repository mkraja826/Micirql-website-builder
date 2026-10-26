import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import { nativeFunctionCatalog } from "@micirql/functions";
import {
  createFunctionBindingResolver,
  createStaticRendererRegistry,
  preparePage,
  renderPreparedPage,
  type ResolvedBrandMark,
} from "@micirql/renderer";
import { SCHEMA_VERSION, siteSchema, type Site } from "@micirql/schema";
import {
  SeedSection,
  seedSectionCatalog,
  seedSectionRegistryEntries,
  type UniversalSectionProps,
} from "@micirql/sections";
import {
  RESTAURANT_DRAFT_CANDIDATES,
  RESTAURANT_DRAFT_DESIGN_SIGNATURE,
  applyRestaurantDraftCandidate,
  createRestaurantDraftScaffold,
  rankRestaurantDraftCandidates,
  type RestaurantDraftCandidate,
  type RestaurantDraftBrief,
} from "../../../../builder/app/industry-packs/drafts";
import {
  RESTAURANT_MATRIX_BRIEFS,
  type RestaurantPreviewBrief,
  type RestaurantPreviewBriefId,
} from "../preview-briefs";

const ROUTE_PREFIX = "/restaurant-draft";
const QA_LOGO_ASSET_ID = "qa-only/restaurant-supplied-logo-contract";
type RestaurantQaLogoId =
  "contract" | "none" | "square" | "wide-3x1" | "wide-6x1" | "portrait";

export const REFERENCE_BRIEF: RestaurantDraftBrief = {
  businessName: "Aarunya Table",
  cuisines: ["South Indian", "Contemporary Indian"],
  serviceModes: ["Lunch", "Dinner", "Dine-in"],
  menu: {
    suppliedAsCurrent: true,
    categories: [
      {
        name: "Small plates",
        description: "Vegetable-led plates for the table.",
        items: [
          {
            name: "Pepper mushroom roast",
            description: "Mushroom, black pepper and curry leaf.",
            price: "340",
            currency: "INR",
          },
          {
            name: "Charred baby corn",
            description: "Baby corn, chilli and lime.",
            price: "310",
            currency: "INR",
          },
          {
            name: "Millet cutlet",
            description: "Millet, seasonal vegetables and mint chutney.",
            price: "290",
            currency: "INR",
          },
        ],
      },
      {
        name: "From the kitchen",
        items: [
          {
            name: "Smoked tomato rice",
            description: "Short-grain rice, smoked tomato and roasted peanuts.",
            price: "460",
            currency: "INR",
            disclosures: ["Contains peanuts"],
          },
          {
            name: "Coconut vegetable stew",
            description: "Seasonal vegetables, coconut and warm spices.",
            price: "440",
            currency: "INR",
          },
          {
            name: "Pepper chicken curry",
            description: "Chicken, black pepper, shallot and curry leaf.",
            price: "560",
            currency: "INR",
          },
        ],
      },
      {
        name: "Dessert",
        items: [
          {
            name: "Jaggery payasam",
            description: "Rice, jaggery, cardamom and milk.",
            price: "250",
            currency: "INR",
            disclosures: ["Contains dairy"],
          },
          {
            name: "Tender coconut pudding",
            description: "Tender coconut and coconut milk.",
            price: "270",
            currency: "INR",
          },
        ],
      },
    ],
    notes: [
      "The menu follows familiar regional flavours in a concise contemporary format.",
    ],
    disclosureNotes: [
      "Tell the restaurant about allergies or dietary needs before ordering. The team can explain the disclosures listed with each dish.",
    ],
  },
  address: "Banjara Hills, Hyderabad, Telangana",
  mapUrl:
    "https://www.google.com/maps/search/?api=1&query=Banjara+Hills+Hyderabad",
  directions: [
    "Use the map link for turn-by-turn directions to the Banjara Hills location.",
  ],
  openingHours: [
    "Monday–Thursday, 12:00 PM–10:30 PM",
    "Friday–Sunday, 12:00 PM–11:00 PM",
  ],
  accessibility: ["A step-free entrance is available"],
  parking: ["Valet parking is available after 6:00 PM"],
  transit: ["Bus stops on Road No. 12 are within walking distance"],
  visitDetails: [
    "The dining room is indoors; contact the restaurant with access questions before visiting.",
  ],
  phone: "+91 40 4000 2026",
  email: "hello@aarunya.example",
  reservationPolicy: [
    "A submitted request is not a confirmed reservation.",
    "The restaurant responds separately after checking availability.",
  ],
  partyDetails: [
    "For parties larger than eight, add the party size and preferred time in the message.",
  ],
  specialRequestNotes: [
    "Add seating, celebration or access requests to the message; the restaurant confirms what it can accommodate.",
  ],
  story: {
    heading: "A table shaped by the Deccan",
    paragraphs: [
      "Aarunya Table brings familiar Deccan flavours into a relaxed contemporary dining room in Banjara Hills.",
      "The menu pairs regional ingredients and remembered recipes with a concise approach designed for sharing.",
    ],
    principles: [
      "Keep the menu readable",
      "Make arrival details easy to find",
      "Treat a reservation submission as a request",
    ],
    people: [
      {
        name: "Anika Rao",
        role: "Host",
        biography:
          "Anika welcomes guests and helps coordinate table requests and special occasions.",
        verified: true,
      },
    ],
  },
  goals: [
    "Help visitors read the current menu and request a table",
    "Make location and arrival details easy to find",
  ],
  languages: ["en"],
};

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

export default async function RestaurantDraftPreview({
  params,
  searchParams,
}: {
  params: Promise<{ slug?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ slug = [] }, query] = await Promise.all([params, searchParams]);
  const requestedPath = slug.length ? `/${slug.join("/")}` : "/";
  const previewBrief = previewBriefFromQuery(query.brief);
  const candidate = candidateFromQuery(
    query.candidate,
    previewBrief.rankingProfile,
  );
  const selectedLogo = qaLogoFromQuery(
    query.logo,
    previewBrief.content.businessName,
  );
  const brandMark = selectedLogo.brandMark;
  const brandOptions = brandMark
    ? {
        brandInput: { logoAssetId: brandMark.assetId, colors: {} },
        brandProvenance: { logo: "user-upload" as const, colors: {} },
      }
    : undefined;
  const site = rewritePreviewLinks(
    applyRestaurantDraftCandidate(
      createRestaurantDraftScaffold(
        baseSite(previewBrief),
        previewBrief.content,
        brandOptions?.brandInput,
        brandOptions?.brandProvenance,
      ),
      candidate,
      brandOptions,
    ),
    candidate.recipeId,
    previewBrief.id === "reference" ? undefined : previewBrief.id,
    selectedLogo.preserveInLinks ? selectedLogo.id : undefined,
  );
  const prepared = await preparePage({
    site,
    path: requestedPath,
    origin: `https://restaurant-${previewBrief.id}.micirql.test`,
    registry,
    functions,
    mode: "production",
    ...(brandMark ? { brandMark } : {}),
  });
  if (!prepared.ok) notFound();

  return (
    <div
      data-mi-restaurant-draft={candidate.recipeId}
      data-mi-restaurant-path={requestedPath}
      data-mi-restaurant-candidate={candidate.recipeId}
      data-mi-restaurant-brief={previewBrief.id}
      data-mi-restaurant-logo={selectedLogo.id}
    >
      {renderPreparedPage(prepared.value)}
    </div>
  );
}

function rewritePreviewLinks(
  site: Site,
  candidateRecipeId: string,
  briefId?: Exclude<RestaurantPreviewBriefId, "reference">,
  logoId?: RestaurantQaLogoId,
): Site {
  const next = structuredClone(site);
  next.navigation = next.navigation.map((item) => ({
    ...item,
    href: previewHref(item.href, candidateRecipeId, briefId, logoId),
  }));
  for (const page of next.pages) {
    for (const section of page.sections) {
      section.props = rewriteValue(
        section.props,
        candidateRecipeId,
        briefId,
        logoId,
      ) as Record<string, unknown>;
    }
  }
  return siteSchema.parse(next);
}

function rewriteValue(
  value: unknown,
  candidateRecipeId: string,
  briefId?: Exclude<RestaurantPreviewBriefId, "reference">,
  logoId?: RestaurantQaLogoId,
): unknown {
  if (Array.isArray(value))
    return value.map((item) =>
      rewriteValue(item, candidateRecipeId, briefId, logoId),
    );
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      key === "href" && typeof item === "string"
        ? previewHref(item, candidateRecipeId, briefId, logoId)
        : rewriteValue(item, candidateRecipeId, briefId, logoId),
    ]),
  );
}

function previewHref(
  href: string,
  candidateRecipeId: string,
  briefId?: Exclude<RestaurantPreviewBriefId, "reference">,
  logoId?: RestaurantQaLogoId,
) {
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  const target = new URL(href, "https://preview.micirql.test");
  target.searchParams.set("candidate", candidateRecipeId);
  if (briefId) target.searchParams.set("brief", briefId);
  if (logoId) target.searchParams.set("logo", logoId);
  const route =
    target.pathname === "/"
      ? ROUTE_PREFIX
      : `${ROUTE_PREFIX}${target.pathname}`;
  return `${route}${target.search}${target.hash}`;
}

function candidateFromQuery(
  value: string | string[] | undefined,
  rankingProfile?: RestaurantPreviewBrief["rankingProfile"],
): RestaurantDraftCandidate {
  const normalized = (Array.isArray(value) ? value[0] : value)?.trim();
  if (!normalized && rankingProfile) {
    const ranked = rankRestaurantDraftCandidates(rankingProfile)[0];
    if (ranked) return ranked.candidate;
    notFound();
  }
  const candidate = normalized
    ? RESTAURANT_DRAFT_CANDIDATES.find(
        (entry) => entry.id === normalized || entry.recipeId === normalized,
      )
    : RESTAURANT_DRAFT_CANDIDATES.find(
        (entry) => entry.id === RESTAURANT_DRAFT_DESIGN_SIGNATURE.candidateId,
      );
  if (!candidate) notFound();
  return candidate;
}

function previewBriefFromQuery(
  value: string | string[] | undefined,
): RestaurantPreviewBrief {
  const normalized = (Array.isArray(value) ? value[0] : value)?.trim();
  if (!normalized) return { id: "reference", content: REFERENCE_BRIEF };
  const previewBrief = RESTAURANT_MATRIX_BRIEFS.find(
    ({ id }) => id === normalized,
  );
  if (!previewBrief) notFound();
  return previewBrief;
}

function qaLogoFromQuery(
  value: string | string[] | undefined,
  businessName: string,
): {
  id: RestaurantQaLogoId;
  preserveInLinks: boolean;
  brandMark?: ResolvedBrandMark;
} {
  const normalized = (Array.isArray(value) ? value[0] : value)?.trim();
  const id = (normalized || "contract") as RestaurantQaLogoId;
  const supported = new Set<RestaurantQaLogoId>([
    "contract",
    "none",
    "square",
    "wide-3x1",
    "wide-6x1",
    "portrait",
  ]);
  if (!supported.has(id)) notFound();
  return {
    id,
    preserveInLinks: Boolean(normalized),
    ...(id === "none" ? {} : { brandMark: qaBrandMark(businessName, id) }),
  };
}

/** Internal QA identity: proves an exact supplied mark survives every page. */
export function qaBrandMark(
  businessName = REFERENCE_BRIEF.businessName,
  logoId: Exclude<RestaurantQaLogoId, "none"> = "contract",
): ResolvedBrandMark {
  const dimensions = qaLogoDimensions(logoId);
  return {
    assetId:
      logoId === "contract"
        ? QA_LOGO_ASSET_ID
        : `qa-only/restaurant-logo-${logoId}`,
    src: qaLogoDataUrl(logoId),
    alt: `${businessName} supplied logo QA fixture`,
    ...dimensions,
  };
}

export function qaLogoDataUrl(
  logoId: Exclude<RestaurantQaLogoId, "none"> = "contract",
) {
  if (logoId === "contract") {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="560" height="120" viewBox="0 0 560 120"><rect width="560" height="120" fill="#fff9f1"/><circle cx="58" cy="60" r="36" fill="#7a2e1f"/><path d="M39 68c12-26 25-26 38 0M43 76h31" fill="none" stroke="#fff9f1" stroke-width="6" stroke-linecap="round"/><path d="M118 42h212M118 61h310M118 80h242" stroke="#25180f" stroke-width="10" stroke-linecap="round"/><circle cx="488" cy="60" r="20" fill="#d39a37"/></svg>';
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  }
  const { width, height } = qaLogoDimensions(logoId);
  const unit = Math.min(width, height);
  const circleRadius = Math.round(unit * 0.19);
  const circleX = Math.round(width / 2);
  const circleY = Math.round(height * 0.3);
  const barX = Math.round(width * 0.16);
  const barWidth = Math.round(width * 0.68);
  const barHeight = Math.max(6, Math.round(unit * 0.07));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" rx="${Math.round(unit * 0.08)}" fill="#fff9f1"/><circle cx="${circleX}" cy="${circleY}" r="${circleRadius}" fill="#7a2e1f"/><path d="M${circleX - circleRadius / 2} ${circleY + circleRadius / 4}c${circleRadius / 3}-${circleRadius * 0.8} ${circleRadius * 0.7}-${circleRadius * 0.8} ${circleRadius} 0" fill="none" stroke="#fff9f1" stroke-width="${Math.max(4, Math.round(unit * 0.035))}" stroke-linecap="round"/><rect x="${barX}" y="${Math.round(height * 0.58)}" width="${barWidth}" height="${barHeight}" rx="${barHeight / 2}" fill="#25180f"/><rect x="${barX}" y="${Math.round(height * 0.72)}" width="${Math.round(barWidth * 0.78)}" height="${barHeight}" rx="${barHeight / 2}" fill="#25180f"/><circle cx="${Math.round(width * 0.84)}" cy="${Math.round(height * 0.84)}" r="${Math.max(5, Math.round(unit * 0.06))}" fill="#d39a37"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function qaLogoDimensions(logoId: Exclude<RestaurantQaLogoId, "none">): {
  width: number;
  height: number;
} {
  const dimensions = {
    contract: { width: 560, height: 120 },
    square: { width: 160, height: 160 },
    "wide-3x1": { width: 480, height: 160 },
    "wide-6x1": { width: 600, height: 100 },
    portrait: { width: 120, height: 240 },
  } as const;
  return dimensions[logoId];
}

export function baseSite(
  previewBrief: RestaurantPreviewBrief = {
    id: "reference",
    content: REFERENCE_BRIEF,
  },
): Site {
  const { content, id } = previewBrief;
  return siteSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    siteId: `restaurant-draft-${id}`,
    workspaceId: `workspace-restaurant-draft-${id}`,
    name: content.businessName,
    domain: "restaurant",
    subtype: "restaurant",
    theme: {
      family: "editorial",
      modifiers: ["light"],
      brand: {
        colors: {
          primary: "#7A2E1F",
          secondary: "#25180F",
          accent: "#D39A37",
          background: "#FFF9F1",
          surface: "#FFFFFF",
          textPrimary: "#25180F",
          textSecondary: "#6B5A4B",
          border: "#D9C8B6",
          success: "#2F6B45",
          warning: "#8A5A18",
          error: "#B42318",
        },
        typography: {
          display: "Source Serif 4, Georgia, serif",
          body: "Inter, Segoe UI, Arial, sans-serif",
          ui: "Inter, Segoe UI, Arial, sans-serif",
        },
        density: "comfortable",
        shape: "balanced",
        motion: "subtle",
      },
    },
    seoBlueprint: {
      primaryGoal:
        content.goals[0] ?? "Explore supplied facts and request a table",
      targetLocations: content.address ? [content.address] : [],
      priorityTopics: [
        ...(content.cuisines ?? []),
        ...(content.serviceModes ?? []),
        ...(content.menu?.categories.map(({ name }) => name) ?? []),
      ],
      audiences: ["restaurant visitors"],
      languages: content.languages.length ? [...content.languages] : ["en"],
      localSeo: Boolean(content.address),
      servicePages: false,
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
          description: `Explore supplied restaurant information and table-request options for ${content.businessName}.`,
          canonicalPath: "/",
          indexable: false,
          structuredDataTypes: [],
        },
      },
    ],
    navigation: [{ label: "Home", href: "/" }],
    integrations: [],
    domains: [],
  });
}
