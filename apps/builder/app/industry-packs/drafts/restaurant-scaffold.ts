import {
  siteSchema,
  type BrandInput,
  type BrandProvenance,
  type Site,
  type SiteSection,
} from "@micirql/schema";
import {
  CERTIFIED_SECTION_COMPONENT_VERSION,
  sectionDesignId,
  type SectionFamily,
} from "@micirql/sections";
import { applyBrandInput } from "../../brand-provenance";
import { applyRestaurantDraftContentHygiene } from "./restaurant-content-hygiene";
import {
  RESTAURANT_DRAFT_PAGE_PATHS,
  RESTAURANT_DRAFT_PROTOTYPE_VARIANTS,
  restaurantDraftPack,
} from "./restaurant";

export type RestaurantDraftPagePath =
  (typeof RESTAURANT_DRAFT_PAGE_PATHS)[number];

export type SuppliedRestaurantMenuItem = {
  name: string;
  description?: string | null;
  price?: string | null;
  currency?: string | null;
  disclosures?: readonly string[] | null;
};

export type SuppliedRestaurantMenuCategory = {
  name: string;
  description?: string | null;
  items: readonly SuppliedRestaurantMenuItem[];
};

/**
 * Menu data must be explicitly supplied as the restaurant's representative,
 * current menu. The scaffold never infers prices, ingredients or disclosures.
 */
export type SuppliedCurrentRestaurantMenu = {
  suppliedAsCurrent: true;
  categories: readonly SuppliedRestaurantMenuCategory[];
  notes?: readonly string[] | null;
  disclosureNotes?: readonly string[] | null;
};

export type VerifiedRestaurantProfile = {
  name: string;
  role?: string | null;
  biography?: string | null;
  verified: true;
};

export type VerifiedRestaurantImage = {
  assetId: string;
  src: string;
  alt: string;
  caption?: string | null;
  page: RestaurantDraftPagePath;
  placement: "hero" | "support";
  role:
    | "dish"
    | "dining-room"
    | "exterior"
    | "arrival"
    | "ingredients"
    | "process"
    | "person";
  focalPoint?: { x: number; y: number } | null;
  verified: true;
};

export type RestaurantDraftBrief = {
  businessName: string;
  cuisines?: readonly string[] | null;
  serviceModes?: readonly string[] | null;
  menu?: SuppliedCurrentRestaurantMenu | null;
  address?: string | null;
  mapUrl?: string | null;
  directions?: readonly string[] | null;
  openingHours?: readonly string[] | null;
  accessibility?: readonly string[] | null;
  parking?: readonly string[] | null;
  transit?: readonly string[] | null;
  visitDetails?: readonly string[] | null;
  phone?: string | null;
  email?: string | null;
  reservationPolicy?: readonly string[] | null;
  partyDetails?: readonly string[] | null;
  specialRequestNotes?: readonly string[] | null;
  story?: {
    heading?: string | null;
    paragraphs: readonly string[];
    principles?: readonly string[] | null;
    people?: readonly VerifiedRestaurantProfile[] | null;
  } | null;
  images?: readonly VerifiedRestaurantImage[] | null;
  goals: readonly string[];
  languages: readonly string[];
};

export const RESTAURANT_RESERVATION_COMPLETION_STATE =
  "reservation-request-received-not-confirmed" as const;

type NormalizedRestaurantBrief = {
  businessName: string;
  cuisines: string[];
  serviceModes: string[];
  menu?: {
    categories: Array<{
      name: string;
      description?: string;
      items: Array<{
        name: string;
        description?: string;
        price?: string;
        currency?: string;
        disclosures: string[];
      }>;
    }>;
    notes: string[];
    disclosureNotes: string[];
  };
  address?: string;
  mapUrl?: string;
  directions: string[];
  openingHours: string[];
  accessibility: string[];
  parking: string[];
  transit: string[];
  visitDetails: string[];
  phone?: string;
  email?: string;
  reservationPolicy: string[];
  partyDetails: string[];
  specialRequestNotes: string[];
  story?: {
    heading?: string;
    paragraphs: string[];
    principles: string[];
    people: Array<{
      name: string;
      role?: string;
      biography?: string;
    }>;
  };
  images: Array<{
    assetId: string;
    src: string;
    alt: string;
    caption?: string;
    page: RestaurantDraftPagePath;
    placement: "hero" | "support";
    role: VerifiedRestaurantImage["role"];
    focalPoint?: { x: number; y: number };
  }>;
  goals: string[];
  languages: string[];
};

/**
 * Builds the factual six-route Restaurant reference site without registering
 * or enabling the draft pack. Merchant facts only come from `brief`; absent
 * menu, visit, story, people and media evidence stays hidden.
 */
export function createRestaurantDraftScaffold(
  source: Site,
  brief: RestaurantDraftBrief,
  brandInput?: BrandInput,
  brandProvenance?: BrandProvenance,
): Site {
  const facts = normalizeBrief(brief);
  const next = structuredClone(source);
  const navigation = restaurantDraftPack.pages.map((page) => ({
    label: page.label,
    href: page.path,
  }));

  next.name = facts.businessName;
  next.domain = restaurantDraftPack.identity.domain;
  next.subtype = restaurantDraftPack.identity.subtype;
  next.navigation = navigation;
  delete next.generation;
  next.theme = applyBrandInput(
    {
      family: "editorial",
      modifiers: ["light", "photography-led", "texture-grain"],
      brand: {
        colors: {
          primary: restaurantDraftPack.palette.colors.primary,
          secondary: restaurantDraftPack.palette.colors.ink,
          accent: restaurantDraftPack.palette.colors.accent,
          background: restaurantDraftPack.palette.colors.background,
          surface: restaurantDraftPack.palette.colors.surface,
          textPrimary: restaurantDraftPack.palette.colors.ink,
          textSecondary: restaurantDraftPack.palette.colors.textMuted,
          border: restaurantDraftPack.palette.colors.border,
          success: "#2F6B45",
          warning: "#8A5A18",
          error: restaurantDraftPack.palette.colors.error,
        },
        typography: {
          display:
            '"Source Serif 4", Georgia, Cambria, "Times New Roman", serif',
          body: "Inter, Segoe UI Variable Text, Segoe UI, Arial, sans-serif",
          ui: "Inter, Segoe UI Variable Text, Segoe UI, Arial, sans-serif",
        },
        density: "comfortable",
        shape: "balanced",
        motion: "subtle",
      },
    },
    brandInput,
    brandProvenance,
  );
  next.seoBlueprint = {
    ...next.seoBlueprint,
    primaryGoal:
      facts.goals[0] ??
      "Help visitors read supplied restaurant facts and request a table",
    targetLocations: facts.address ? [facts.address] : [],
    priorityTopics: uniquePublicLabels([
      ...facts.cuisines,
      ...facts.serviceModes,
      ...(facts.menu?.categories.map((category) => category.name) ?? []),
    ]),
    audiences: ["restaurant visitors"],
    languages: facts.languages.length ? facts.languages : ["en"],
    localSeo: Boolean(facts.address),
    servicePages: false,
    locationPages: false,
    blog: false,
  };
  next.pages = restaurantDraftPack.pages.map((page) => {
    const pageKey = page.path === "/" ? "home" : page.path.slice(1);
    const planned = page.sections.map((section) => section.family);
    const families =
      page.path === "/"
        ? planned
        : uniqueFamilies(["navbar", ...planned, "footer"]);

    return {
      id: pageKey,
      path: page.path,
      name: page.label,
      sections: families.map((family, index) =>
        sectionFor({
          family,
          pagePath: page.path,
          pageKey,
          index,
          facts,
          navigation,
        }),
      ),
      seo: {
        title: truncate(
          page.path === "/"
            ? `${facts.businessName} | Menu, visit and table requests`
            : `${page.label} | ${facts.businessName}`,
          70,
        ),
        description: truncate(pageDescription(page.path, facts), 180),
        canonicalPath: page.path,
        indexable: true,
        structuredDataTypes:
          page.path === "/"
            ? ["Restaurant", "LocalBusiness"]
            : ["Restaurant", "BreadcrumbList"],
      },
    };
  });

  const parsed = siteSchema.parse(next);
  return siteSchema.parse(applyRestaurantDraftContentHygiene(parsed).site);
}

function sectionFor(input: {
  family: SectionFamily;
  pagePath: RestaurantDraftPagePath;
  pageKey: string;
  index: number;
  facts: NormalizedRestaurantBrief;
  navigation: Site["navigation"];
}): SiteSection {
  const { family, pagePath, pageKey, index, facts } = input;
  const common = {
    id: `${pageKey}-${family}-${index + 1}`,
    component: {
      componentId: sectionDesignId(
        "editorial",
        family,
        RESTAURANT_DRAFT_PROTOTYPE_VARIANTS[family],
      ),
      version: CERTIFIED_SECTION_COMPONENT_VERSION,
    },
    bindings: {},
    hidden: false,
  };

  switch (family) {
    case "navbar":
      return {
        ...common,
        props: {
          title: facts.businessName,
          verifiedFields: ["title"],
          items: input.navigation.map((item) => ({
            title: item.label,
            href: item.href,
          })),
          primaryAction: requestTableAction(),
        },
      };
    case "hero": {
      const content = heroContent(pagePath, facts);
      const image = pageImages(pagePath, facts).find(
        (candidate) => candidate.placement === "hero",
      );
      return {
        ...common,
        props: {
          ...content,
          ...(image ? { image: imageReference(image) } : {}),
          verified: true,
        },
      };
    }
    case "services": {
      const items = menuItems(facts, pagePath === "/" ? 6 : undefined);
      return {
        ...common,
        props: {
          title: pagePath === "/" ? "Explore the menu" : "Current menu",
          ...(facts.menu?.notes.length
            ? { description: facts.menu.notes.join(" ") }
            : {}),
          items,
          menuCategories: facts.menu?.categories ?? [],
          verifiedFields: [
            "menuCategories",
            ...(facts.menu?.notes.length ? ["description"] : []),
          ],
        },
        hidden: items.length === 0,
      };
    }
    case "gallery": {
      const items = pageImages(pagePath, facts)
        .filter((image) => image.placement === "support")
        .map((image) => ({
          title: image.caption ?? image.alt,
          image: imageReference(image),
          verified: true,
        }));
      return {
        ...common,
        props: {
          title: galleryTitle(pagePath),
          items,
        },
        hidden: items.length === 0,
      };
    }
    case "features": {
      const content = featureContent(pagePath, facts);
      return {
        ...common,
        props: { ...content, verified: true },
        hidden: content.items.length === 0,
      };
    }
    case "about": {
      const content = aboutContent(pagePath, facts);
      return {
        ...common,
        props: { ...content, verified: true },
        hidden: !content.description && content.items.length === 0,
      };
    }
    case "process":
      return {
        ...common,
        props: {
          title: "How a table request works",
          description:
            "Submitting the form sends a request. It does not reserve or confirm a table.",
          items: [
            {
              title: "Send a request",
              description:
                "Provide the requested date, time, party size and contact details.",
            },
            {
              title: "Request received",
              description:
                "The submission records a request only; availability has not been confirmed.",
            },
            {
              title: "Restaurant response",
              description:
                "The restaurant responds separately to confirm availability or discuss another option.",
            },
          ],
          completionState: RESTAURANT_RESERVATION_COMPLETION_STATE,
        },
      };
    case "team": {
      const profiles = facts.story?.people ?? [];
      return {
        ...common,
        props: {
          title: "People",
          items: profiles.map((profile) => ({
            title: profile.name,
            description: [profile.role, profile.biography]
              .filter(Boolean)
              .join(" · "),
            verified: true,
          })),
        },
        hidden: profiles.length === 0,
      };
    }
    case "contact":
      return contactSection(common, pagePath, facts);
    case "cta":
      return {
        ...common,
        props: ctaContent(pagePath, facts),
      };
    case "footer":
      return {
        ...common,
        props: {
          title: facts.businessName,
          verified: true,
          description: `Menu, visit information and table-request options for ${facts.businessName}.`,
          footerLinks: input.navigation,
        },
      };
    case "testimonials":
      return {
        ...common,
        props: { title: "Reviews", items: [] },
        hidden: true,
      };
  }
}

function contactSection(
  common: {
    id: string;
    component: { componentId: string; version: string };
    bindings: Record<string, never>;
    hidden: boolean;
  },
  pagePath: RestaurantDraftPagePath,
  facts: NormalizedRestaurantBrief,
): SiteSection {
  if (pagePath === "/reservations") {
    return {
      ...common,
      props: {
        title: `Request a table at ${facts.businessName}`,
        description:
          "Send a table request. Receipt does not confirm a reservation; the restaurant must respond and confirm availability separately.",
        formBindingKey: "reservation",
        formSubmitLabel: "Request a table",
        completionState: RESTAURANT_RESERVATION_COMPLETION_STATE,
        receiptMessage:
          "Request received. Your table is not confirmed until the restaurant responds.",
      },
      bindings: {
        reservation: { actionId: "reservation.request", inputMap: {} },
      },
    };
  }

  if (pagePath === "/contact") {
    return {
      ...common,
      props: {
        title: `Send a general enquiry to ${facts.businessName}`,
        description:
          "Use this form for a general question. To request a table, use the separate Reservations page.",
        formBindingKey: "enquiry",
        formSubmitLabel: "Send enquiry",
        verified: true,
      },
      bindings: {
        enquiry: { actionId: "lead.create", inputMap: {} },
      },
    };
  }

  const description = contactDescription(pagePath, facts);
  return {
    ...common,
    props: {
      title:
        pagePath === "/"
          ? "Request a table"
          : pagePath === "/visit"
            ? `Visit ${facts.businessName}`
            : `Contact ${facts.businessName}`,
      ...(description ? { description } : {}),
      primaryAction: requestTableAction(),
      ...(facts.phone
        ? {
            secondaryAction: {
              label: "Call restaurant",
              href: phoneHref(facts.phone),
            },
          }
        : {}),
      verified: true,
    },
  };
}

function heroContent(
  pagePath: RestaurantDraftPagePath,
  facts: NormalizedRestaurantBrief,
) {
  const common = {
    primaryAction:
      pagePath === "/reservations"
        ? { label: "Request a table", href: "#contact-form" }
        : requestTableAction(),
  };
  if (pagePath === "/") {
    const suppliedFacts = [
      facts.cuisines.length ? facts.cuisines.join(" · ") : undefined,
      facts.address,
    ].filter(Boolean);
    return {
      ...common,
      eyebrow: suppliedFacts.join(" · ") || "Restaurant",
      title: facts.businessName,
      description:
        "Explore the current menu, plan your visit and send a table request. The restaurant confirms availability separately.",
      ...(facts.menu
        ? {
            secondaryAction: { label: "View menu", href: "/menu" },
          }
        : {}),
    };
  }
  if (pagePath === "/menu") {
    return {
      ...common,
      eyebrow: facts.cuisines.join(" · ") || "Menu",
      title: `Menu from ${facts.businessName}`,
      ...(facts.menu?.notes.length
        ? { description: facts.menu.notes.join(" ") }
        : {}),
    };
  }
  if (pagePath === "/visit") {
    return {
      ...common,
      eyebrow: "Visit",
      title: `Plan a visit to ${facts.businessName}`,
      ...(facts.address ? { description: facts.address } : {}),
      ...(facts.mapUrl
        ? {
            secondaryAction: {
              label: "Get directions",
              href: facts.mapUrl,
            },
          }
        : {}),
    };
  }
  if (pagePath === "/reservations") {
    return {
      ...common,
      eyebrow: "Table requests",
      title: `Request a table at ${facts.businessName}`,
      description:
        "Submitting a request does not confirm a table. The restaurant responds separately about availability.",
    };
  }
  if (pagePath === "/story") {
    return {
      ...common,
      eyebrow: "Story",
      title: facts.story?.heading ?? `About ${facts.businessName}`,
      ...(facts.story?.paragraphs[0]
        ? { description: facts.story.paragraphs[0] }
        : {}),
      ...(facts.menu
        ? { secondaryAction: { label: "View menu", href: "/menu" } }
        : {}),
    };
  }
  return {
    ...common,
    eyebrow: "Contact",
    title: `Contact ${facts.businessName}`,
    ...(facts.address ? { description: facts.address } : {}),
    ...(facts.phone
      ? {
          secondaryAction: {
            label: "Call restaurant",
            href: phoneHref(facts.phone),
          },
        }
      : {}),
  };
}

function featureContent(
  pagePath: RestaurantDraftPagePath,
  facts: NormalizedRestaurantBrief,
) {
  if (pagePath === "/menu") {
    return {
      title: "Menu notes and disclosures",
      items: (facts.menu?.disclosureNotes ?? []).map((description) => ({
        title: "Allergy and dietary information",
        description,
      })),
    };
  }
  if (pagePath === "/visit") {
    return {
      title: "Arrival details",
      items: [
        ...facts.accessibility.map((description) => ({
          title: "Accessibility",
          description,
        })),
        ...facts.parking.map((description) => ({
          title: "Parking",
          description,
        })),
        ...facts.transit.map((description) => ({
          title: "Public transport",
          description,
        })),
      ],
    };
  }
  if (pagePath === "/reservations") {
    return {
      title: "Before sending a request",
      items: [
        ...facts.reservationPolicy.map((description) => ({
          title: "Reservation policy",
          description,
        })),
        ...facts.partyDetails.map((description) => ({
          title: "Party details",
          description,
        })),
      ],
    };
  }
  if (pagePath === "/story") {
    return {
      title: "Principles",
      items: (facts.story?.principles ?? []).map((description) => ({
        title: description,
      })),
    };
  }
  if (pagePath === "/contact") {
    return {
      title: "Contact details",
      items: [
        ...(facts.phone ? [{ title: "Phone", description: facts.phone }] : []),
        ...(facts.email ? [{ title: "Email", description: facts.email }] : []),
        ...(facts.address
          ? [{ title: "Address", description: facts.address }]
          : []),
        ...facts.openingHours.map((description) => ({
          title: "Opening hours",
          description,
        })),
      ],
    };
  }
  return {
    title: "Restaurant details",
    items: [
      ...(facts.address
        ? [{ title: "Location", description: facts.address }]
        : []),
      ...(facts.cuisines.length
        ? [{ title: "Cuisine", description: facts.cuisines.join(" · ") }]
        : []),
      ...(facts.serviceModes.length
        ? [
            {
              title: "Service",
              description: facts.serviceModes.join(" · "),
            },
          ]
        : []),
      ...facts.openingHours.map((description) => ({
        title: "Opening hours",
        description,
      })),
    ],
  };
}

function aboutContent(
  pagePath: RestaurantDraftPagePath,
  facts: NormalizedRestaurantBrief,
) {
  if (pagePath === "/menu") {
    const notes = facts.menu?.notes ?? [];
    return {
      title: "Menu information",
      ...(notes.length ? { description: notes.join(" ") } : {}),
      items: [],
    };
  }
  if (pagePath === "/visit") {
    return {
      title: "Visit details",
      ...(facts.visitDetails.length
        ? { description: facts.visitDetails.join(" ") }
        : {}),
      items: [],
    };
  }
  if (pagePath === "/reservations") {
    return {
      title: "Special requests",
      ...(facts.specialRequestNotes.length
        ? { description: facts.specialRequestNotes.join(" ") }
        : {}),
      items: [],
    };
  }
  if (pagePath === "/contact") {
    return {
      title: "Directions",
      ...(facts.directions.length
        ? { description: facts.directions.join(" ") }
        : {}),
      items: [],
    };
  }
  const paragraphs = facts.story?.paragraphs ?? [];
  return {
    title: facts.story?.heading ?? `About ${facts.businessName}`,
    ...(paragraphs.length ? { description: paragraphs.join(" ") } : {}),
    items: [],
  };
}

function ctaContent(
  pagePath: RestaurantDraftPagePath,
  facts: NormalizedRestaurantBrief,
) {
  if (pagePath === "/reservations") {
    return {
      title: "A request is not a confirmed table",
      description:
        "The restaurant must respond separately and confirm availability.",
      primaryAction: { label: "Request a table", href: "#contact-form" },
      ...(facts.phone
        ? {
            secondaryAction: {
              label: "Call restaurant",
              href: phoneHref(facts.phone),
            },
          }
        : {}),
    };
  }
  if (pagePath === "/" || pagePath === "/story") {
    return {
      title: `Plan a visit to ${facts.businessName}`,
      description:
        "Find the location, opening hours and practical arrival information before you visit.",
      primaryAction: { label: "Plan your visit", href: "/visit" },
      ...(facts.menu
        ? { secondaryAction: { label: "View menu", href: "/menu" } }
        : {}),
    };
  }
  return {
    title: "Ready to request a table?",
    description:
      "Send a request and wait for the restaurant to confirm availability.",
    primaryAction: requestTableAction(),
  };
}

function menuItems(facts: NormalizedRestaurantBrief, limit?: number) {
  const items = (facts.menu?.categories ?? []).flatMap((category) =>
    category.items.map((item) => ({
      title: item.name,
      description: [
        item.description,
        item.disclosures.length
          ? `Disclosures: ${item.disclosures.join(" · ")}`
          : undefined,
      ]
        .filter(Boolean)
        .join(" · "),
      group: category.name,
      ...((item.price || item.currency) && {
        meta: [item.currency, item.price].filter(Boolean).join(" "),
      }),
      verified: true,
    })),
  );
  return typeof limit === "number" ? items.slice(0, limit) : items;
}

function pageImages(
  path: RestaurantDraftPagePath,
  facts: NormalizedRestaurantBrief,
) {
  return facts.images.filter((image) => image.page === path);
}

function imageReference(image: NormalizedRestaurantBrief["images"][number]) {
  return {
    assetId: image.assetId,
    src: image.src,
    alt: image.alt,
    ...(image.focalPoint ? { focalPoint: image.focalPoint } : {}),
  };
}

function galleryTitle(path: RestaurantDraftPagePath) {
  const titles: Record<RestaurantDraftPagePath, string> = {
    "/": "Food and space",
    "/menu": "From the menu",
    "/visit": "The restaurant and arrival",
    "/reservations": "Dining spaces",
    "/story": "Place and process",
    "/contact": "Find the restaurant",
  };
  return titles[path];
}

function contactDescription(
  path: RestaurantDraftPagePath,
  facts: NormalizedRestaurantBrief,
) {
  if (path === "/") {
    return "Send a table request. The restaurant confirms availability separately.";
  }
  if (path === "/visit") {
    return [facts.address, ...facts.openingHours].filter(Boolean).join(" · ");
  }
  if (path === "/contact") {
    return [facts.address, facts.phone, facts.email]
      .filter(Boolean)
      .join(" · ");
  }
  return undefined;
}

function pageDescription(
  path: RestaurantDraftPagePath,
  facts: NormalizedRestaurantBrief,
) {
  const descriptions: Record<RestaurantDraftPagePath, string> = {
    "/": `${facts.businessName}: menu and visit information with a clear way to request a table.`,
    "/menu": `Explore the current menu from ${facts.businessName}, including prices and dietary disclosures.`,
    "/visit": `Find location, opening hours and arrival details for ${facts.businessName}.`,
    "/reservations": `Send a table request to ${facts.businessName}; submission does not confirm a reservation.`,
    "/story": `Discover the story and people behind ${facts.businessName}.`,
    "/contact": `Find contact and location information for ${facts.businessName}.`,
  };
  return descriptions[path];
}

function requestTableAction() {
  return { label: "Request a table", href: "/reservations" };
}

function phoneHref(phone: string) {
  return `tel:${phone.replace(/[^+\d,;*#]/g, "")}`;
}

function normalizeBrief(
  brief: RestaurantDraftBrief,
): NormalizedRestaurantBrief {
  const businessName = clean(brief.businessName);
  if (!businessName) {
    throw new Error("Restaurant businessName is required.");
  }
  const menu = normalizeMenu(brief.menu);
  const address = clean(brief.address);
  const mapUrl = clean(brief.mapUrl);
  const phone = clean(brief.phone);
  const email = clean(brief.email);
  const story = normalizeStory(brief.story);

  return {
    businessName,
    cuisines: uniquePublicLabels(brief.cuisines ?? []),
    serviceModes: uniquePublicLabels(brief.serviceModes ?? []),
    ...(menu ? { menu } : {}),
    ...(address ? { address } : {}),
    ...(mapUrl ? { mapUrl } : {}),
    directions: uniquePublicLabels(brief.directions ?? []),
    openingHours: uniquePublicLabels(brief.openingHours ?? []),
    accessibility: uniquePublicLabels(brief.accessibility ?? []),
    parking: uniquePublicLabels(brief.parking ?? []),
    transit: uniquePublicLabels(brief.transit ?? []),
    visitDetails: uniquePublicLabels(brief.visitDetails ?? []),
    ...(phone ? { phone } : {}),
    ...(email ? { email } : {}),
    reservationPolicy: uniquePublicLabels(brief.reservationPolicy ?? []),
    partyDetails: uniquePublicLabels(brief.partyDetails ?? []),
    specialRequestNotes: uniquePublicLabels(brief.specialRequestNotes ?? []),
    ...(story ? { story } : {}),
    images: normalizeImages(brief.images ?? []),
    goals: uniquePublicLabels(brief.goals),
    languages: uniquePublicLabels(brief.languages),
  };
}

function normalizeMenu(
  menu: SuppliedCurrentRestaurantMenu | null | undefined,
): NormalizedRestaurantBrief["menu"] {
  if (!menu || menu.suppliedAsCurrent !== true) return undefined;
  const categories = menu.categories.flatMap((category) => {
    const name = clean(category.name);
    if (!name) return [];
    const items = category.items.flatMap((item) => {
      const itemName = clean(item.name);
      if (!itemName) return [];
      const description = clean(item.description);
      const price = clean(item.price);
      const currency = clean(item.currency);
      return [
        {
          name: itemName,
          ...(description ? { description } : {}),
          ...(price ? { price } : {}),
          ...(currency ? { currency } : {}),
          disclosures: uniquePublicLabels(item.disclosures ?? []),
        },
      ];
    });
    if (!items.length) return [];
    const description = clean(category.description);
    return [
      {
        name,
        ...(description ? { description } : {}),
        items,
      },
    ];
  });
  if (!categories.length) return undefined;
  return {
    categories,
    notes: uniquePublicLabels(menu.notes ?? []),
    disclosureNotes: uniquePublicLabels(menu.disclosureNotes ?? []),
  };
}

function normalizeStory(
  story: RestaurantDraftBrief["story"],
): NormalizedRestaurantBrief["story"] {
  if (!story) return undefined;
  const paragraphs = uniquePublicLabels(story.paragraphs);
  const principles = uniquePublicLabels(story.principles ?? []);
  const people = (story.people ?? []).flatMap((profile) => {
    const name = clean(profile.name);
    if (!profile.verified || !name) return [];
    const role = clean(profile.role);
    const biography = clean(profile.biography);
    return [
      {
        name,
        ...(role ? { role } : {}),
        ...(biography ? { biography } : {}),
      },
    ];
  });
  if (!paragraphs.length && !principles.length && !people.length) {
    return undefined;
  }
  const heading = clean(story.heading);
  return {
    ...(heading ? { heading } : {}),
    paragraphs,
    principles,
    people,
  };
}

function normalizeImages(
  images: readonly VerifiedRestaurantImage[],
): NormalizedRestaurantBrief["images"] {
  const seen = new Set<string>();
  return images.flatMap((image) => {
    const assetId = clean(image.assetId);
    const src = clean(image.src);
    const alt = clean(image.alt);
    if (
      !image.verified ||
      !assetId ||
      !src ||
      !alt ||
      seen.has(assetId) ||
      !RESTAURANT_DRAFT_PAGE_PATHS.includes(image.page)
    ) {
      return [];
    }
    seen.add(assetId);
    const caption = clean(image.caption);
    const focalPoint = validFocalPoint(image.focalPoint)
      ? image.focalPoint
      : undefined;
    return [
      {
        assetId,
        src,
        alt,
        ...(caption ? { caption } : {}),
        page: image.page,
        placement: image.placement,
        role: image.role,
        ...(focalPoint ? { focalPoint } : {}),
      },
    ];
  });
}

function validFocalPoint(
  value: VerifiedRestaurantImage["focalPoint"],
): value is { x: number; y: number } {
  return Boolean(
    value &&
    Number.isFinite(value.x) &&
    Number.isFinite(value.y) &&
    value.x >= 0 &&
    value.x <= 1 &&
    value.y >= 0 &&
    value.y <= 1,
  );
}

function uniqueFamilies(families: SectionFamily[]): SectionFamily[] {
  return families.filter((family, index) => families.indexOf(family) === index);
}

function uniquePublicLabels(values: readonly string[]): string[] {
  const seen = new Set<string>();
  return values.flatMap((value) => {
    const label = clean(value);
    if (!label) return [];
    const key = label.toLocaleLowerCase("en-US");
    if (seen.has(key)) return [];
    seen.add(key);
    return [label];
  });
}

function clean(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function truncate(value: string, maximum: number) {
  if (value.length <= maximum) return value;
  return `${value.slice(0, Math.max(0, maximum - 1)).trimEnd()}…`;
}
