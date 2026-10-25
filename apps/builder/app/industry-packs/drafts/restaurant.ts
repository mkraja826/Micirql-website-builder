import type { SectionFamily, SectionVariant } from "@micirql/sections";
import type { IndustryDesignSignature } from "../design-distinctness";
import type { DraftIndustryPackContract } from "./types";

export const RESTAURANT_DRAFT_CATALOG_VERSION =
  "restaurant-draft-2026.10.24" as const;

export const RESTAURANT_DRAFT_PAGE_PATHS = [
  "/",
  "/menu",
  "/visit",
  "/reservations",
  "/story",
  "/contact",
] as const;

export const RESTAURANT_DRAFT_REQUIRED_ACTIONS = [
  "reservation.request",
] as const;

/**
 * Official sources that define the draft's factual, discovery and
 * accessibility boundary. They do not certify a merchant's compliance; each
 * generated site still needs current, location-specific facts and review.
 */
export const RESTAURANT_DRAFT_RESEARCH_BASIS = [
  {
    authority: "FSSAI",
    source:
      "https://www.fssai.gov.in/food-law/regulations/amendments/labelling-display",
    appliedRule:
      "Collect the establishment's current licence and outlet scope before applying menu-labelling requirements; never present calorie, allergen, vegetarian, non-vegetarian or compliance statements as generated facts.",
  },
  {
    authority: "FSSAI",
    source:
      "https://fssai.gov.in/upload/advisories/2024/04/66190c9343fe0Letter%20dated%2012Apr2024_Display%20of%20Information_FSE_compressed.pdf",
    appliedRule:
      "Keep menu disclosures attached to the relevant items and preserve the permitted display method; block release when applicable merchant-supplied disclosure data is missing.",
  },
  {
    authority: "Google Business Profile",
    source: "https://support.google.com/business/answer/3038177?hl=en",
    appliedRule:
      "Expose a representative first-party menu URL and keep menu items, descriptions and prices accurate; never substitute a delivery-provider URL for the menu page.",
  },
  {
    authority: "Google Search Central",
    source:
      "https://developers.google.com/search/docs/appearance/structured-data/local-business",
    appliedRule:
      "Use Restaurant structured data only for supplied name, address, menu URL, hours, cuisine, telephone and price-range facts, with one location represented per location page.",
  },
  {
    authority: "W3C WAI",
    source: "https://www.w3.org/TR/WCAG22/",
    appliedRule:
      "Preserve semantic reading order, 320 CSS-pixel reflow, keyboard operation, visible focus, text alternatives and labelled reservation controls.",
  },
] as const;

export const RESTAURANT_DRAFT_PROTOTYPE_VARIANTS = {
  navbar: 4,
  hero: 5,
  about: 2,
  services: 4,
  features: 5,
  process: 1,
  testimonials: 3,
  gallery: 5,
  team: 1,
  cta: 4,
  contact: 5,
  footer: 4,
} as const satisfies Record<SectionFamily, SectionVariant>;

export const RESTAURANT_DRAFT_HOME_SECTION_ORDER = [
  "navbar",
  "hero",
  "gallery",
  "services",
  "about",
  "features",
  "contact",
  "cta",
  "footer",
] as const satisfies readonly SectionFamily[];

/**
 * Research-backed planning contract for the first Restaurant pack. It stays
 * outside the certified registry and runtime until 20 candidates and the full
 * visual, content, responsive, accessibility and cross-surface gates pass.
 */
export const restaurantDraftPack = {
  identity: {
    id: "restaurant-restaurant",
    label: "Restaurant / Restaurant",
    domain: "restaurant",
    subtype: "restaurant",
    aliases: [
      "restaurant",
      "dining",
      "dining room",
      "eatery",
      "bistro",
      "brasserie",
      "fine dining",
      "casual dining",
    ],
    catalogVersion: RESTAURANT_DRAFT_CATALOG_VERSION,
    candidateIdPrefix: "restaurant-restaurant-",
    certification: "draft-unregistered",
  },
  designGrammar: {
    id: "restaurant-table-story-editorial-v1",
    visualThesis:
      "A table-led editorial journey pairs real dishes, menu rhythm and arrival context with warm material surfaces; it must not inherit a clinic's treatment cards, care pathways or appointment-proof composition.",
    sharedLayer: "primitives-only",
    motifs: [
      "table-edge-frame",
      "menu-column-rhythm",
      "ingredient-note",
      "arrival-threshold",
      "warm-material-field",
    ],
    disallowedReuse: [
      "candidate-signature",
      "page-section-sequence",
      "hero-composition",
      "palette-only-variation",
    ],
    maximumCrossIndustrySimilarity: 0.56,
    maximumWithinIndustrySimilarity: 0.74,
  },
  pages: [
    {
      path: "/",
      label: "Home",
      purpose:
        "Establish the supplied cuisine, atmosphere, location and next action through real menu and venue evidence.",
      sections: [
        { family: "navbar", role: "primary-navigation" },
        { family: "hero", role: "venue-and-cuisine-introduction" },
        { family: "gallery", role: "dish-and-space-editorial-lead" },
        { family: "services", role: "menu-category-preview" },
        { family: "about", role: "supplied-hospitality-positioning" },
        { family: "features", role: "location-hours-and-service-facts" },
        { family: "contact", role: "reservation-request-preview" },
        { family: "cta", role: "reservation-request" },
        { family: "footer", role: "site-footer" },
      ],
      evidencePolicy: "hide-unsupported-evidence",
    },
    {
      path: "/menu",
      label: "Menu",
      purpose:
        "Present the representative, current menu as readable HTML using only supplied items, descriptions, prices and disclosures.",
      sections: [
        { family: "hero", role: "menu-introduction" },
        { family: "services", role: "structured-menu-categories-and-items" },
        { family: "features", role: "verified-dietary-and-allergen-legend" },
        { family: "gallery", role: "supplied-dish-imagery" },
        { family: "about", role: "menu-availability-and-disclosure-notes" },
        { family: "cta", role: "reservation-request" },
      ],
      evidencePolicy: "hide-unsupported-evidence",
      futureComponentDecision: {
        plannedFamily: "menu",
        temporaryFamily: "services",
        note: "Render categories, item names, descriptions, prices and supplied disclosures as semantic HTML through the supported services family until a dedicated menu family passes the component protocol. A PDF or image must never be the only menu surface.",
      },
    },
    {
      path: "/visit",
      label: "Visit",
      purpose:
        "Answer where the restaurant is, when it is open and how to arrive using supplied location facts only.",
      sections: [
        { family: "hero", role: "arrival-introduction" },
        { family: "gallery", role: "verified-exterior-and-interior" },
        { family: "contact", role: "address-directions-and-opening-hours" },
        { family: "features", role: "verified-access-parking-and-transit" },
        { family: "about", role: "verified-service-and-seating-details" },
        { family: "cta", role: "reservation-request" },
      ],
      evidencePolicy: "hide-unsupported-evidence",
      futureComponentDecision: {
        plannedFamily: "map-and-directions",
        temporaryFamily: "contact",
        note: "Use supplied address and map links through the contact family until a dedicated map component passes privacy, keyboard and responsive review.",
      },
    },
    {
      path: "/reservations",
      label: "Reservations",
      purpose:
        "Collect the least information needed for a table request and clearly separate receipt from restaurant confirmation.",
      sections: [
        { family: "hero", role: "reservation-request-introduction" },
        { family: "contact", role: "reservation-request-form" },
        { family: "process", role: "request-review-and-confirmation-steps" },
        { family: "features", role: "verified-party-and-policy-details" },
        { family: "about", role: "special-request-expectation" },
        { family: "cta", role: "phone-alternative-when-supplied" },
      ],
      evidencePolicy: "hide-unsupported-evidence",
      futureComponentDecision: {
        plannedFamily: "reservation-request-form",
        temporaryFamily: "contact",
        note: "Use an explicitly labelled contact-form variant until a reservation component can preserve request-not-confirmed semantics and accessible status feedback on every surface.",
      },
    },
    {
      path: "/story",
      label: "Story",
      purpose:
        "Explain the restaurant's supplied origin, approach and people without inventing heritage, sourcing or credentials.",
      sections: [
        { family: "hero", role: "restaurant-story-introduction" },
        { family: "about", role: "supplied-origin-and-approach" },
        { family: "gallery", role: "verified-process-and-place" },
        { family: "team", role: "verified-chef-and-host-profiles" },
        { family: "features", role: "supplied-principles-and-practices" },
        { family: "cta", role: "menu-and-reservation-paths" },
      ],
      evidencePolicy: "hide-unsupported-evidence",
    },
    {
      path: "/contact",
      label: "Contact",
      purpose:
        "Provide factual contact and location options plus a general enquiry path distinct from a reservation request.",
      sections: [
        { family: "hero", role: "concise-contact-introduction" },
        { family: "contact", role: "general-enquiry-form" },
        { family: "features", role: "verified-phone-email-and-hours" },
        { family: "about", role: "verified-map-and-directions" },
        { family: "cta", role: "reservation-request" },
      ],
      evidencePolicy: "hide-unsupported-evidence",
    },
  ],
  actions: {
    primary: {
      id: "reservation.request",
      role: "primary",
      label: "Request a table",
      completionState: "reservation-request-received-not-confirmed",
    },
    secondary: [
      {
        id: "menu.view",
        role: "secondary",
        label: "View menu",
        requiresSuppliedFact: "representative-current-menu",
      },
      {
        id: "maps.navigate",
        role: "secondary",
        label: "Get directions",
        requiresSuppliedFact: "verified-location-link",
      },
      {
        id: "tel:",
        role: "secondary",
        label: "Call restaurant",
        requiresSuppliedFact: "phone-number",
      },
    ],
    consistencyRule:
      "Use ‘Request a table’ for the primary CTA in navigation, page bodies and footer. Submission confirms receipt only; the restaurant confirms availability separately.",
  },
  palette: {
    id: "warm-table-editorial",
    colors: {
      ink: "#25180F",
      background: "#FFF9F1",
      surface: "#FFFFFF",
      primary: "#7A2E1F",
      accent: "#D39A37",
      border: "#D9C8B6",
      textMuted: "#6B5A4B",
      error: "#B42318",
    },
    contrastPairs: [
      {
        foreground: "#FFFFFF",
        background: "#7A2E1F",
        minimumRatio: 4.5,
        usage: "primary reservation actions and focused interactive emphasis",
      },
      {
        foreground: "#25180F",
        background: "#FFF9F1",
        minimumRatio: 4.5,
        usage: "main reading and menu surfaces",
      },
    ],
    accentRule:
      "Use the ochre accent for rules, category markers and small graphic details; never place small white text on it.",
  },
  typography: {
    display: {
      category: "editorial-serif-or-soft-grotesk",
      weightRange: [500, 650],
      prohibitedTreatments: [
        "condensed-all-caps",
        "ultra-black-display",
        "forced-word-fragmentation",
        "oversized-menu-item-names",
      ],
    },
    body: {
      category: "high-legibility-humanist-sans",
      weightRange: [400, 600],
    },
    mobileH1: {
      size: "clamp(2.1rem, 10cqi, 2.85rem)",
      lineHeightRange: [1.04, 1.12],
      wordBreak: "normal",
    },
    desktopH1: {
      maximumRem: 4.25,
      charactersPerLine: [14, 24],
    },
    headingCase: "sentence-case",
    eyebrowRule:
      "Uppercase is reserved for short cuisine, service or location eyebrows; menu items and headings remain mixed case.",
  },
  responsive: [
    {
      viewport: 320,
      rules: [
        "single-column-reading-order",
        "no-horizontal-overflow-or-two-dimensional-menu-scroll",
        "minimum-control-size-44px",
        "menu-item-name-description-and-price-wrap-without-collision",
        "reservation-form-keeps-visible-labels-and-error-space",
      ],
    },
    {
      viewport: 390,
      rules: [
        "single-column-reading-order",
        "no-horizontal-overflow",
        "minimum-control-size-44px",
        "bounded-heading-and-menu-measure",
        "sticky-actions-never-obscure-menu-or-form-content",
      ],
    },
    {
      viewport: 768,
      rules: [
        "menu-columns-only-when-each-column-retains-readable-measure",
        "prices-remain-associated-with-their-item-names",
        "reservation-form-labels-and-status-remain-visible",
        "venue-imagery-does-not-displace-visit-facts",
      ],
    },
    {
      viewport: 1024,
      rules: [
        "editorial-menu-and-venue-grids-use-bounded-copy-measure",
        "reservation-action-remains-visible-without-dominating-navigation",
        "dish-crops-preserve-supplied-focal-points",
      ],
    },
    {
      viewport: 1440,
      rules: [
        "editorial-canvas-has-a-bounded-maximum-width",
        "menu-density-does-not-expand-line-lengths-to-fill-the-screen",
        "do-not-enlarge-headings-to-fill-width",
      ],
    },
  ],
  imagery: {
    distinctSiteImages: [12, 18],
    meaningfulHomeImages: [6, 9],
    maximumUsesPerPage: 1,
    heroMayRepeat: false,
    portraitsRequireVerifiedPeople: true,
    meaningfulAltTextRequired: true,
    decorativeAlt: "",
    rules: [
      "prefer-supplied-dishes-dining-room-exterior-arrival-ingredients-and-process-images",
      "generic-stock-must-not-be-labelled-as-a-menu-item-or-the-merchant-location",
      "no-fabricated-dish-portion-plating-or-ingredient-representation",
      "no-identifiable-chef-host-or-staff-impersonation",
      "no-invented-awards-reviews-crowds-or-fully-booked-signals",
      "hide-team-gallery-or-venue-proof-when-verified-assets-are-absent",
      "preserve-food-color-and-crop-focal-points-without-misleading-retouching",
    ],
  },
  logo: {
    canonicalPlacements: ["header", "footer"],
    requiredSurfaces: ["preview", "editor", "live", "export"],
    testRatios: [
      { label: "square", widthToHeight: 1 },
      { label: "wide", widthToHeight: 3 },
      { label: "extra-wide", widthToHeight: 6 },
      { label: "tall", widthToHeight: 0.5 },
    ],
    objectFit: "contain",
    preserve: ["asset-id", "pixels", "intrinsic-ratio", "colors"],
    textFallback: "only-when-no-logo-supplied",
    unresolvedLogo: "blocking-error",
    contrastRule:
      "Use a quiet neutral surface or a supplied inverse mark when contrast is insufficient; never recolor, redraw or crop the canonical logo.",
  },
  contentSafety: {
    requiredFacts: [
      "restaurant-name",
      "verified-address-and-location-link",
      "contact-details",
      "opening-hours-and-exceptions",
      "supplied-cuisine-and-service-modes",
      "representative-current-menu-items-descriptions-prices-and-currency",
      "reservation-request-policy-and-response-expectation",
      "applicable-food-service-disclosure-scope-and-verified-menu-disclosures",
    ],
    prohibitedInventions: [
      "dishes-ingredients-portions-or-prices",
      "currency-or-menu-availability",
      "allergen-dietary-vegetarian-or-non-vegetarian-claims",
      "calories-nutrition-organic-or-health-claims",
      "live-table-availability-or-confirmed-reservations",
      "opening-hours-seating-capacity-accessibility-or-amenities",
      "delivery-ordering-or-reservation-partners",
      "chefs-hosts-staff-credentials-history-awards-reviews-or-ratings",
      "fssai-licence-status-or-regulatory-compliance",
    ],
    claimRules: [
      "never-infer-allergens-dietary-status-or-ingredients-from-a-name-photo-or-cuisine",
      "treat-calorie-and-serving-size-display-as-a-scoped-requirement-not-a-universal-generated-default",
      "block-publication-when-applicable-menu-disclosure-data-is-missing",
      "keep-seasonal-market-and-sold-out-language-conditional-on-merchant-supplied-facts",
      "label-submission-as-a-reservation-request-not-a-confirmed-table",
      "structured-data-must-match-visible-supplied-content",
      "do-not-claim-legal-or-fssai-compliance",
    ],
  },
  certificationPlan: {
    requiredCandidateCount: 20,
    stagedCandidateCount: 20,
    certifiedCandidateCount: 0,
    currentCandidateCount: 0,
    registrationAllowed: false,
    visualReviewRequired: true,
  },
} as const satisfies DraftIndustryPackContract;

export const RESTAURANT_DRAFT_DESIGN_SIGNATURE = {
  packId: restaurantDraftPack.identity.id,
  grammarId: restaurantDraftPack.designGrammar.id,
  candidateId: "restaurant-restaurant-table-story-editorial",
  themeFamily: "editorial",
  variants: RESTAURANT_DRAFT_PROTOTYPE_VARIANTS,
  sectionOrder: [
    "navbar",
    "hero",
    "testimonials",
    "team",
    "gallery",
    "services",
    "process",
    "about",
    "features",
    "contact",
    "cta",
    "footer",
  ],
  typographyStrategy: "editorial-serif",
  imageStrategy: "editorial-crop",
  motifs: restaurantDraftPack.designGrammar.motifs,
} as const satisfies IndustryDesignSignature;
