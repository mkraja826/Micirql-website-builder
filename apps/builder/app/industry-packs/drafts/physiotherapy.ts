import type { DraftIndustryPackContract } from "./types";
import type { SectionFamily, SectionVariant } from "@micirql/sections";
import type { IndustryDesignSignature } from "../design-distinctness";

export const PHYSIOTHERAPY_DRAFT_CATALOG_VERSION =
  "physiotherapy-draft-2026.10.18" as const;

export const PHYSIOTHERAPY_DRAFT_PAGE_PATHS = [
  "/",
  "/therapies",
  "/conditions",
  "/therapists",
  "/about",
  "/contact",
] as const;

export const PHYSIOTHERAPY_DRAFT_REQUIRED_ACTIONS = [
  "appointment.request",
] as const;

export const PHYSIOTHERAPY_DRAFT_PROTOTYPE_VARIANTS = {
  navbar: 2,
  hero: 2,
  about: 4,
  services: 2,
  features: 3,
  process: 4,
  testimonials: 2,
  gallery: 3,
  team: 2,
  cta: 2,
  contact: 2,
  footer: 2,
} as const satisfies Record<SectionFamily, SectionVariant>;

export const PHYSIOTHERAPY_DRAFT_HOME_SECTION_ORDER = [
  "navbar",
  "hero",
  "services",
  "features",
  "process",
  "team",
  "contact",
  "cta",
  "footer",
] as const satisfies readonly SectionFamily[];

/**
 * Archived planning contract for the Physiotherapy pilot. This historical
 * record remains outside the registry and cannot be selected directly; the
 * promoted pack owns a separate certified contract and runtime.
 */
export const physiotherapyDraftPack = {
  identity: {
    id: "clinic-physiotherapy",
    label: "Clinic / Physiotherapy",
    domain: "clinic",
    subtype: "physiotherapy",
    aliases: [
      "physiotherapy",
      "physiotherapist",
      "physical therapy",
      "physical therapist",
      "rehabilitation clinic",
      "sports physiotherapy",
    ],
    catalogVersion: PHYSIOTHERAPY_DRAFT_CATALOG_VERSION,
    candidateIdPrefix: "clinic-physiotherapy-",
    certification: "draft-unregistered",
  },
  designGrammar: {
    id: "clinic-physiotherapy-movement-pathway-v1",
    visualThesis:
      "Movement-led pathways use asymmetric organic frames, staggered exercise cards and a connected assessment journey instead of Dental's treatment-and-proof grammar.",
    sharedLayer: "primitives-only",
    motifs: [
      "movement-arc",
      "staggered-exercise-cadence",
      "connected-assessment-path",
      "warm-kinetic-accent",
    ],
    disallowedReuse: [
      "candidate-signature",
      "page-section-sequence",
      "hero-composition",
      "palette-only-variation",
    ],
    maximumCrossIndustrySimilarity: 0.64,
    maximumWithinIndustrySimilarity: 0.76,
  },
  pages: [
    {
      path: "/",
      label: "Home",
      purpose:
        "Answer whether the clinic is relevant, credible, nearby, and easy to contact without encouraging self-diagnosis.",
      sections: [
        { family: "navbar", role: "primary-navigation" },
        { family: "hero", role: "benefit-led-introduction" },
        { family: "services", role: "conditions-and-therapies-split" },
        { family: "features", role: "why-choose-us" },
        { family: "process", role: "care-process" },
        { family: "team", role: "verified-therapist-preview" },
        { family: "contact", role: "location-and-opening-hours" },
        { family: "cta", role: "appointment-request" },
        { family: "footer", role: "site-footer" },
      ],
      evidencePolicy: "hide-unsupported-evidence",
    },
    {
      path: "/therapies",
      label: "Therapies",
      purpose:
        "Let visitors compare only the supplied services in plain language.",
      sections: [
        { family: "hero", role: "therapy-overview" },
        { family: "services", role: "therapy-cards" },
        { family: "process", role: "what-to-expect" },
        { family: "about", role: "suitability-and-limitations-note" },
        { family: "cta", role: "appointment-request" },
      ],
      evidencePolicy: "hide-unsupported-evidence",
    },
    {
      path: "/conditions",
      label: "Conditions",
      purpose:
        "Support intent-led discovery without presenting diagnosis or cure claims.",
      sections: [
        { family: "hero", role: "conditions-overview" },
        { family: "services", role: "condition-groups" },
        { family: "about", role: "when-to-seek-assessment" },
        { family: "features", role: "frequently-asked-questions" },
        { family: "cta", role: "appointment-request" },
      ],
      evidencePolicy: "hide-unsupported-evidence",
      futureComponentDecision: {
        plannedFamily: "faq",
        temporaryFamily: "features",
        note: "Render supplied question-and-answer items through the supported features family until a dedicated FAQ family passes the component protocol; do not emit an unsupported FAQ family.",
      },
    },
    {
      path: "/therapists",
      label: "Therapists",
      purpose:
        "Establish real professional authority using supplied and verified profiles only.",
      sections: [
        { family: "hero", role: "therapist-introduction" },
        { family: "team", role: "verified-profile-cards" },
        { family: "features", role: "qualifications-and-special-interests" },
        { family: "about", role: "clinic-approach" },
        { family: "cta", role: "appointment-request" },
      ],
      evidencePolicy: "hide-unsupported-evidence",
    },
    {
      path: "/about",
      label: "About",
      purpose:
        "Build trust without inventing history, facilities, technology, or awards.",
      sections: [
        { family: "hero", role: "clinic-introduction" },
        { family: "about", role: "clinic-story" },
        { family: "gallery", role: "facilities-and-accessibility" },
        { family: "features", role: "care-principles" },
        { family: "contact", role: "location-prompt" },
      ],
      evidencePolicy: "hide-unsupported-evidence",
    },
    {
      path: "/contact",
      label: "Contact",
      purpose:
        "Complete an appointment request using the least necessary personal data.",
      sections: [
        { family: "hero", role: "concise-contact-introduction" },
        { family: "contact", role: "appointment-request-form" },
        { family: "features", role: "phone-address-and-opening-hours" },
        { family: "about", role: "map-and-directions" },
        { family: "cta", role: "response-expectation" },
      ],
      evidencePolicy: "hide-unsupported-evidence",
    },
  ],
  actions: {
    primary: {
      id: "appointment.request",
      role: "primary",
      label: "Request appointment",
      completionState: "request-received-not-confirmed",
    },
    secondary: [
      {
        id: "tel:",
        role: "secondary",
        label: "Call clinic",
        requiresSuppliedFact: "phone-number",
      },
    ],
    consistencyRule:
      "Use the same primary CTA label in the navbar, page body, and footer, and never imply a confirmed appointment slot.",
  },
  palette: {
    id: "calm-clinical-movement",
    colors: {
      ink: "#12324A",
      background: "#F7FAFC",
      surface: "#FFFFFF",
      primary: "#176B87",
      accent: "#C96A35",
      border: "#CBD8E1",
      textMuted: "#526474",
      error: "#B42318",
    },
    contrastPairs: [
      {
        foreground: "#FFFFFF",
        background: "#176B87",
        minimumRatio: 4.5,
        usage: "primary actions and interactive emphasis",
      },
      {
        foreground: "#12324A",
        background: "#F7FAFC",
        minimumRatio: 4.5,
        usage: "main reading surface",
      },
    ],
    accentRule:
      "Use the warm accent for small highlights, diagrams, and tags; never use small white text on it.",
  },
  typography: {
    display: {
      category: "humanist-or-geometric-sans",
      weightRange: [600, 700],
      prohibitedTreatments: [
        "condensed-all-caps",
        "ultra-black-display",
        "forced-word-fragmentation",
      ],
    },
    body: {
      category: "high-legibility-humanist-sans",
      weightRange: [400, 650],
    },
    mobileH1: {
      size: "clamp(2rem, 9cqi, 2.75rem)",
      lineHeightRange: [1.08, 1.14],
      wordBreak: "normal",
    },
    desktopH1: {
      maximumRem: 4.5,
      charactersPerLine: [15, 18],
    },
    headingCase: "sentence-case",
    eyebrowRule:
      "Uppercase is allowed only for short eyebrow text, never for the H1, H2, or H3.",
  },
  responsive: [
    {
      viewport: 320,
      rules: [
        "single-column-reading-order",
        "no-horizontal-overflow",
        "minimum-control-size-44px",
        "hero-image-follows-proposition",
      ],
    },
    {
      viewport: 390,
      rules: [
        "single-column-reading-order",
        "no-horizontal-overflow",
        "minimum-control-size-44px",
        "bounded-heading-measure",
      ],
    },
    {
      viewport: 768,
      rules: [
        "two-columns-only-when-readable",
        "form-labels-remain-visible",
        "reserve-form-error-space",
      ],
    },
    {
      viewport: 1024,
      rules: [
        "asymmetric-5-7-or-6-6-grids",
        "bounded-text-measure",
        "deliberate-whitespace",
      ],
    },
    {
      viewport: 1440,
      rules: [
        "asymmetric-5-7-or-6-6-grids",
        "bounded-text-measure",
        "do-not-enlarge-headings-to-fill-width",
      ],
    },
  ],
  imagery: {
    distinctSiteImages: [10, 14],
    meaningfulHomeImages: [5, 8],
    maximumUsesPerPage: 1,
    heroMayRepeat: false,
    portraitsRequireVerifiedPeople: true,
    meaningfulAltTextRequired: true,
    decorativeAlt: "",
    rules: [
      "prefer-supplied-clinic-therapist-assessment-equipment-exercise-and-accessibility-images",
      "generic-stock-must-not-imply-employment-or-outcomes",
      "no-before-after-images",
      "no-visible-patient-records",
      "no-invented-awards-or-exaggerated-pain-imagery",
      "hide-therapist-profiles-when-no-verified-people-are-supplied",
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
      "Use a neutral surface or an explicitly supplied inverse mark when contrast is insufficient; never recolor the canonical logo.",
  },
  contentSafety: {
    requiredFacts: [
      "clinic-name",
      "address-or-service-area",
      "contact-details",
      "opening-hours",
      "supplied-therapies-and-conditions",
      "supplied-appointment-request-policy",
    ],
    prohibitedInventions: [
      "clinicians",
      "credentials-or-registration",
      "patient-outcomes-or-testimonials",
      "live-availability",
      "awards",
      "facilities-or-technology",
    ],
    claimRules: [
      "do-not-diagnose-visitors",
      "do-not-promise-recovery-or-guaranteed-pain-relief",
      "do-not-substitute-site-copy-for-professional-advice",
      "label-submission-as-request-or-enquiry-not-confirmation",
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

export const PHYSIOTHERAPY_DRAFT_DESIGN_SIGNATURE = {
  packId: physiotherapyDraftPack.identity.id,
  grammarId: physiotherapyDraftPack.designGrammar.id,
  candidateId: "clinic-physiotherapy-movement-pathway",
  themeFamily: "organic",
  variants: PHYSIOTHERAPY_DRAFT_PROTOTYPE_VARIANTS,
  sectionOrder: PHYSIOTHERAPY_DRAFT_HOME_SECTION_ORDER,
  typographyStrategy: "movement-humanist",
  imageStrategy: "guided-movement-documentary",
  motifs: physiotherapyDraftPack.designGrammar.motifs,
} as const satisfies IndustryDesignSignature;
