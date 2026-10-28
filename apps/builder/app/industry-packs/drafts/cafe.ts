import type { DraftIndustryPackContract } from "./types";

export const CAFE_DRAFT_CATALOG_VERSION = "cafe-research-2026.10.28" as const;

export const CAFE_DRAFT_PAGE_PATHS = [
  "/",
  "/menu",
  "/visit",
  "/order",
  "/story",
] as const;

export const CAFE_DRAFT_REQUIRED_ACTIONS = [
  "menu.view",
  "maps.navigate",
] as const;

/**
 * Primary sources that define the Cafe pack's discovery, factual-safety and
 * accessibility boundary. They guide the product contract; they do not prove
 * that a merchant meets a local regulatory requirement.
 */
export const CAFE_DRAFT_RESEARCH_BASIS = [
  {
    authority: "Schema.org",
    source: "https://schema.org/CafeOrCoffeeShop",
    appliedRule:
      "Model Cafe as its own FoodEstablishment subtype and expose only supplied menu, cuisine and location facts; the first Cafe release has no reservation journey.",
  },
  {
    authority: "Schema.org",
    source: "https://schema.org/Menu",
    appliedRule:
      "Keep the current menu in semantic sections and items so names, descriptions, prices, currency and supplied dietary evidence remain associated.",
  },
  {
    authority: "Google Business Profile",
    source: "https://support.google.com/business/answer/9455840?hl=en",
    appliedRule:
      "Treat the first-party HTML menu as the canonical public menu and require the business to review current sections, items, descriptions and prices.",
  },
  {
    authority: "Google Business Profile",
    source: "https://support.google.com/business/answer/6218037?hl=en",
    appliedRule:
      "Keep menu, directions and food-ordering actions distinct; an order action must use a merchant-approved link rather than a generated checkout claim.",
  },
  {
    authority: "FSSAI",
    source:
      "https://fssai.gov.in/upload/uploadfiles/files/FAQ-%20Display%20of%20Information.pdf",
    appliedRule:
      "Preserve merchant-supplied allergen, vegetarian, non-vegetarian, nutrition and organic disclosures beside the relevant menu items; never infer them or claim compliance.",
  },
  {
    authority: "W3C WAI",
    source: "https://www.w3.org/TR/WCAG22/",
    appliedRule:
      "Require 320 CSS-pixel reflow, keyboard operation, visible focus, meaningful text alternatives and usable pointer targets across the menu and visit journeys.",
  },
] as const;

/**
 * Research contract for Restaurant / Cafe. It deliberately has no candidates
 * and is not exported through the certified registry. Candidate production can
 * begin only after the factual intake and reference scaffold are accepted.
 */
export const cafeDraftPack = {
  identity: {
    id: "restaurant-cafe",
    label: "Restaurant / Cafe",
    domain: "restaurant",
    subtype: "cafe",
    aliases: [
      "cafe",
      "coffee shop",
      "coffeehouse",
      "tea room",
      "bakery cafe",
      "espresso bar",
    ],
    catalogVersion: CAFE_DRAFT_CATALOG_VERSION,
    candidateIdPrefix: "restaurant-cafe-",
    certification: "draft-unregistered",
  },
  designGrammar: {
    id: "cafe-counter-daypart-utility-v1",
    visualThesis:
      "A quick, daypart-aware counter journey makes the current menu, opening state, arrival details and verified ordering path easy to scan; it must not inherit Restaurant's table-led editorial pacing or reservation funnel.",
    sharedLayer: "primitives-only",
    motifs: [
      "counter-ticket",
      "daypart-band",
      "steam-line",
      "menu-stamp",
      "street-window",
    ],
    disallowedReuse: [
      "candidate-signature",
      "page-section-sequence",
      "hero-composition",
      "palette-only-variation",
    ],
    maximumCrossIndustrySimilarity: 0.52,
    maximumWithinIndustrySimilarity: 0.72,
  },
  pages: [
    {
      path: "/",
      label: "Home",
      purpose:
        "Orient a time-sensitive visitor with the supplied cafe focus, current opening facts, representative menu and fastest truthful next action.",
      sections: [
        { family: "navbar", role: "compact-primary-navigation" },
        { family: "hero", role: "daypart-and-cafe-introduction" },
        { family: "features", role: "open-hours-location-and-service-strip" },
        { family: "services", role: "current-menu-preview" },
        { family: "gallery", role: "product-process-and-place-proof" },
        { family: "cta", role: "directions-or-approved-order-action" },
        { family: "footer", role: "site-footer" },
      ],
      evidencePolicy: "hide-unsupported-evidence",
    },
    {
      path: "/menu",
      label: "Menu",
      purpose:
        "Present a readable current HTML menu by section and daypart, preserving exact descriptions, prices, currency and merchant-reviewed disclosures.",
      sections: [
        { family: "hero", role: "current-menu-introduction" },
        { family: "features", role: "daypart-and-availability-notes" },
        { family: "services", role: "semantic-menu-sections-and-items" },
        { family: "about", role: "merchant-reviewed-disclosure-notes" },
        { family: "cta", role: "visit-or-approved-order-action" },
      ],
      evidencePolicy: "hide-unsupported-evidence",
      futureComponentDecision: {
        plannedFamily: "cafe-menu",
        temporaryFamily: "services",
        note: "Use semantic headings, lists and item-price groups through the supported services family until a Cafe menu component passes reflow, disclosure-association and editor tests. An image or PDF cannot be the only menu.",
      },
    },
    {
      path: "/visit",
      label: "Visit",
      purpose:
        "Put address, directions, opening hours and supplied seating, access or amenity facts ahead of generic venue storytelling.",
      sections: [
        { family: "hero", role: "arrival-and-opening-introduction" },
        { family: "contact", role: "address-directions-hours-and-contact" },
        { family: "gallery", role: "verified-exterior-counter-and-seating" },
        { family: "features", role: "supplied-access-seating-and-amenities" },
        { family: "cta", role: "directions" },
      ],
      evidencePolicy: "hide-unsupported-evidence",
      futureComponentDecision: {
        plannedFamily: "map-and-directions",
        temporaryFamily: "contact",
        note: "Use the supplied address and HTTPS directions URL through the contact family until a privacy-safe, keyboard-operable map component passes every release surface.",
      },
    },
    {
      path: "/order",
      label: "Order",
      purpose:
        "Explain the supplied takeaway, pre-order or delivery path without inventing live stock, preparation times, delivery coverage, checkout or partner availability.",
      sections: [
        { family: "hero", role: "verified-order-path-introduction" },
        { family: "process", role: "merchant-supplied-order-steps" },
        { family: "features", role: "fulfilment-and-policy-facts" },
        { family: "contact", role: "order-enquiry-when-supplied" },
        { family: "cta", role: "external-order-or-call" },
      ],
      evidencePolicy: "hide-unsupported-evidence",
      futureComponentDecision: {
        plannedFamily: "order-handoff",
        temporaryFamily: "contact",
        note: "Use a labelled enquiry form or merchant-approved external HTTPS order link. The Builder must not synthesize cart, payment, stock or confirmed pickup behavior.",
      },
    },
    {
      path: "/story",
      label: "Story",
      purpose:
        "Use only the supplied cafe description, approach, people and sourcing facts, with no invented heritage, roasting, baking or community claims.",
      sections: [
        { family: "hero", role: "approved-cafe-description" },
        { family: "about", role: "supplied-approach-and-story" },
        { family: "gallery", role: "verified-place-process-and-people" },
        { family: "team", role: "verified-people-only" },
        { family: "cta", role: "menu-and-visit-paths" },
      ],
      evidencePolicy: "hide-unsupported-evidence",
    },
  ],
  actions: {
    primary: {
      id: "maps.navigate",
      role: "primary",
      label: "Plan your visit",
      requiresSuppliedFact: "verified-location-link",
    },
    secondary: [
      {
        id: "menu.view",
        role: "secondary",
        label: "View current menu",
        requiresSuppliedFact: "representative-current-html-menu",
      },
      {
        id: "order.external",
        role: "secondary",
        label: "Order online",
        requiresSuppliedFact: "merchant-approved-external-order-link",
      },
      {
        id: "order.enquiry",
        role: "secondary",
        label: "Ask about an order",
        requiresSuppliedFact: "merchant-supplied-order-enquiry-policy",
        completionState: "order-enquiry-received-not-confirmed",
      },
      {
        id: "tel:",
        role: "secondary",
        label: "Call cafe",
        requiresSuppliedFact: "phone-number",
      },
    ],
    consistencyRule:
      "Keep Plan your visit and View current menu available throughout the site. Show Order online, Ask about an order or Call cafe only when the corresponding merchant-approved fact is supplied; never show Request a table by default.",
  },
  palette: {
    id: "oat-counter-mint",
    colors: {
      ink: "#1F2924",
      background: "#F6F0E4",
      surface: "#FFFDF8",
      primary: "#1E6658",
      accent: "#B44727",
      border: "#CFC5B5",
      textMuted: "#5B625D",
      error: "#B42318",
    },
    contrastPairs: [
      {
        foreground: "#FFFFFF",
        background: "#1E6658",
        minimumRatio: 4.5,
        usage: "primary visit actions and selected menu controls",
      },
      {
        foreground: "#1F2924",
        background: "#F6F0E4",
        minimumRatio: 4.5,
        usage: "body copy, menu names and visit details",
      },
      {
        foreground: "#B44727",
        background: "#F6F0E4",
        minimumRatio: 4.5,
        usage: "clay daypart markers and prices on the oat background",
      },
      {
        foreground: "#B44727",
        background: "#FFFDF8",
        minimumRatio: 4.5,
        usage: "clay daypart markers and prices on warm-white surfaces",
      },
    ],
    accentRule:
      "Use clay for daypart markers, prices and small counter-ticket details; never use it as the only state cue or place small white text on it.",
  },
  typography: {
    display: {
      category: "rounded-grotesk-with-utility-mono-accents",
      weightRange: [500, 700],
      prohibitedTreatments: [
        "restaurant-editorial-serif-clone",
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
      size: "clamp(2rem, 9cqi, 2.75rem)",
      lineHeightRange: [1.05, 1.14],
      wordBreak: "normal",
    },
    desktopH1: {
      maximumRem: 4,
      charactersPerLine: [16, 28],
    },
    headingCase: "sentence-case",
    eyebrowRule:
      "Uppercase or mono styling is reserved for short hours, daypart and category labels; headings and menu items remain mixed case.",
  },
  responsive: [
    {
      viewport: 320,
      rules: [
        "single-column-reading-order",
        "no-horizontal-overflow-or-two-dimensional-menu-scroll",
        "minimum-control-size-44px",
        "item-name-description-price-and-disclosures-wrap-together",
        "sticky-actions-never-cover-menu-or-order-status",
      ],
    },
    {
      viewport: 390,
      rules: [
        "single-column-reading-order",
        "no-horizontal-overflow",
        "minimum-control-size-44px",
        "daypart-and-menu-controls-wrap-with-visible-focus",
        "opening-hours-and-directions-remain-before-gallery-content",
      ],
    },
    {
      viewport: 768,
      rules: [
        "menu-columns-appear-only-with-readable-item-measure",
        "prices-and-disclosures-remain-associated-with-items",
        "visit-facts-remain-visible-beside-or-before-imagery",
        "order-handoff-explains-external-destination",
      ],
    },
    {
      viewport: 1024,
      rules: [
        "counter-and-daypart-grid-retains-bounded-copy-measure",
        "primary-visit-action-does-not-dominate-navigation",
        "product-crops-preserve-supplied-focal-points",
      ],
    },
    {
      viewport: 1440,
      rules: [
        "canvas-and-menu-density-use-bounded-maximum-width",
        "do-not-expand-menu-line-lengths-to-fill-screen",
        "do-not-enlarge-headings-to-fill-width",
      ],
    },
  ],
  imagery: {
    distinctSiteImages: [10, 16],
    meaningfulHomeImages: [5, 8],
    maximumUsesPerPage: 1,
    heroMayRepeat: false,
    portraitsRequireVerifiedPeople: true,
    meaningfulAltTextRequired: true,
    decorativeAlt: "",
    rules: [
      "prefer-supplied-product-preparation-counter-interior-exterior-and-arrival-images",
      "generic-library-images-must-be-labelled-illustrative-and-never-named-as-a-menu-item",
      "no-fabricated-drink-food-size-ingredient-garnish-or-availability-representation",
      "no-identifiable-barista-baker-owner-or-staff-impersonation",
      "no-invented-crowds-queues-sold-out-signals-reviews-awards-or-local-landmarks",
      "hide-people-process-seating-or-amenity-proof-when-verified-assets-are-absent",
      "preserve-product-color-labels-and-crop-focal-points-without-misleading-retouching",
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
      "Use a quiet neutral backing or a supplied inverse mark when contrast is insufficient; never recolor, redraw, crop or decorate the canonical logo.",
  },
  contentSafety: {
    requiredFacts: [
      "approved-cafe-name-and-description",
      "verified-address-and-https-directions-link",
      "contact-details",
      "opening-hours-and-exceptions",
      "supplied-cafe-focus-and-service-modes",
      "representative-current-menu-items-descriptions-prices-and-currency",
      "merchant-reviewed-item-disclosures-and-applicable-display-scope",
      "one-explicit-order-journey-with-merchant-approved-policy-or-url",
    ],
    prohibitedInventions: [
      "drinks-food-sizes-modifiers-ingredients-portions-or-prices",
      "currency-menu-daypart-or-item-availability",
      "allergen-dietary-vegetarian-non-vegetarian-or-caffeine-claims",
      "calories-nutrition-organic-fair-trade-sustainable-local-or-health-claims",
      "live-stock-preparation-time-delivery-area-fees-or-confirmed-orders",
      "opening-hours-seating-accessibility-wifi-power-parking-pet-policy-or-amenities",
      "ordering-delivery-reservation-or-payment-partners",
      "baristas-bakers-owners-staff-credentials-history-awards-reviews-or-ratings",
      "fssai-licence-status-or-regulatory-compliance",
    ],
    claimRules: [
      "never-infer-allergens-dietary-status-ingredients-caffeine-or-sizes-from-a-name-photo-or-category",
      "keep-item-disclosures-adjacent-to-the-relevant-menu-item",
      "block-publication-when-applicable-merchant-reviewed-disclosure-data-is-missing",
      "show-order-online-only-for-a-merchant-approved-https-destination",
      "label-order-enquiry-submission-as-received-not-confirmed",
      "never-create-a-reservation-funnel-by-inheriting-the-restaurant-pack",
      "structured-data-must-match-visible-supplied-content",
      "do-not-claim-legal-or-fssai-compliance",
    ],
  },
  certificationPlan: {
    requiredCandidateCount: 20,
    stagedCandidateCount: 0,
    certifiedCandidateCount: 0,
    currentCandidateCount: 0,
    registrationAllowed: false,
    visualReviewRequired: true,
  },
} as const satisfies DraftIndustryPackContract;
