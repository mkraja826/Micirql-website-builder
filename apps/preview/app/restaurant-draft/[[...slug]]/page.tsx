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
  type RestaurantDraftCandidate,
  type RestaurantDraftBrief,
} from "../../../../builder/app/industry-packs/drafts";

const ROUTE_PREFIX = "/restaurant-draft";
const QA_LOGO_ASSET_ID = "qa-only/restaurant-supplied-logo-contract";

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
  const candidate = candidateFromQuery(query.candidate);
  const brandMark = qaBrandMark();
  const site = rewritePreviewLinks(
    applyRestaurantDraftCandidate(
      createRestaurantDraftScaffold(
        baseSite(),
        REFERENCE_BRIEF,
        { logoAssetId: brandMark.assetId, colors: {} },
        { logo: "user-upload", colors: {} },
      ),
      candidate,
      {
        brandInput: { logoAssetId: brandMark.assetId, colors: {} },
        brandProvenance: { logo: "user-upload", colors: {} },
      },
    ),
    candidate.recipeId,
  );
  const prepared = await preparePage({
    site,
    path: requestedPath,
    origin: "https://restaurant-reference.micirql.test",
    registry,
    functions,
    mode: "production",
    brandMark,
  });
  if (!prepared.ok) notFound();

  return (
    <div
      data-mi-restaurant-draft={candidate.recipeId}
      data-mi-restaurant-path={requestedPath}
      data-mi-restaurant-candidate={candidate.recipeId}
    >
      {renderPreparedPage(prepared.value)}
    </div>
  );
}

function rewritePreviewLinks(site: Site, candidateRecipeId: string): Site {
  const next = structuredClone(site);
  next.navigation = next.navigation.map((item) => ({
    ...item,
    href: previewHref(item.href, candidateRecipeId),
  }));
  for (const page of next.pages) {
    for (const section of page.sections) {
      section.props = rewriteValue(section.props, candidateRecipeId) as Record<
        string,
        unknown
      >;
    }
  }
  return siteSchema.parse(next);
}

function rewriteValue(value: unknown, candidateRecipeId: string): unknown {
  if (Array.isArray(value))
    return value.map((item) => rewriteValue(item, candidateRecipeId));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      key === "href" && typeof item === "string"
        ? previewHref(item, candidateRecipeId)
        : rewriteValue(item, candidateRecipeId),
    ]),
  );
}

function previewHref(href: string, candidateRecipeId: string) {
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  const target = new URL(href, "https://preview.micirql.test");
  target.searchParams.set("candidate", candidateRecipeId);
  const route =
    target.pathname === "/"
      ? ROUTE_PREFIX
      : `${ROUTE_PREFIX}${target.pathname}`;
  return `${route}${target.search}${target.hash}`;
}

function candidateFromQuery(
  value: string | string[] | undefined,
): RestaurantDraftCandidate {
  const normalized = (Array.isArray(value) ? value[0] : value)?.trim();
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

/** Internal QA identity: proves an exact supplied mark survives every page. */
export function qaBrandMark(): ResolvedBrandMark {
  return {
    assetId: QA_LOGO_ASSET_ID,
    src: qaLogoDataUrl(),
    alt: "Aarunya Table supplied logo QA fixture",
    width: 560,
    height: 120,
  };
}

export function qaLogoDataUrl() {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="560" height="120" viewBox="0 0 560 120"><rect width="560" height="120" fill="#fff9f1"/><circle cx="58" cy="60" r="36" fill="#7a2e1f"/><path d="M39 68c12-26 25-26 38 0M43 76h31" fill="none" stroke="#fff9f1" stroke-width="6" stroke-linecap="round"/><path d="M118 42h212M118 61h310M118 80h242" stroke="#25180f" stroke-width="10" stroke-linecap="round"/><circle cx="488" cy="60" r="20" fill="#d39a37"/></svg>';
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function baseSite(): Site {
  return siteSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    siteId: "restaurant-draft-reference",
    workspaceId: "workspace-restaurant-draft-reference",
    name: REFERENCE_BRIEF.businessName,
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
      primaryGoal: "Explore the menu and request a table",
      targetLocations: ["Hyderabad, Telangana"],
      priorityTopics: ["Restaurant menu", "Visit information"],
      audiences: ["restaurant visitors"],
      languages: ["en"],
      localSeo: true,
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
          title: REFERENCE_BRIEF.businessName,
          description:
            "Explore Aarunya Table's menu, location, opening hours and table-request options.",
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
