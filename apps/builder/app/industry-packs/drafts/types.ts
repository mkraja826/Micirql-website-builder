import type { Domain } from "@micirql/schema";
import type { SectionFamily } from "@micirql/sections";
import type { IndustryDesignGrammar } from "../types";

export type DraftPackSection = {
  family: SectionFamily;
  role: string;
};

export type DraftFutureComponentDecision = {
  plannedFamily: string;
  temporaryFamily: SectionFamily;
  note: string;
};

export type DraftPackPage = {
  path: `/${string}` | "/";
  label: string;
  purpose: string;
  sections: readonly DraftPackSection[];
  evidencePolicy: "hide-unsupported-evidence";
  futureComponentDecision?: DraftFutureComponentDecision;
};

export type DraftPackAction = {
  id: string;
  role: "primary" | "secondary";
  label: string;
  requiresSuppliedFact?: string;
  completionState?: string;
};

export type DraftPackResponsiveRule = {
  viewport: 320 | 390 | 768 | 1024 | 1440;
  rules: readonly string[];
};

export type DraftIndustryPackContract = {
  identity: {
    id: string;
    label: string;
    domain: Domain;
    subtype: string;
    aliases: readonly string[];
    catalogVersion: string;
    candidateIdPrefix: string;
    certification: "draft-unregistered";
  };
  designGrammar: IndustryDesignGrammar;
  pages: readonly DraftPackPage[];
  actions: {
    primary: DraftPackAction;
    secondary: readonly DraftPackAction[];
    consistencyRule: string;
  };
  palette: {
    id: string;
    colors: {
      ink: `#${string}`;
      background: `#${string}`;
      surface: `#${string}`;
      primary: `#${string}`;
      accent: `#${string}`;
      border: `#${string}`;
      textMuted: `#${string}`;
      error: `#${string}`;
    };
    contrastPairs: readonly {
      foreground: `#${string}`;
      background: `#${string}`;
      minimumRatio: number;
      usage: string;
    }[];
    accentRule: string;
  };
  typography: {
    display: {
      category: string;
      weightRange: readonly [number, number];
      prohibitedTreatments: readonly string[];
    };
    body: {
      category: string;
      weightRange: readonly [number, number];
    };
    mobileH1: {
      size: string;
      lineHeightRange: readonly [number, number];
      wordBreak: "normal";
    };
    desktopH1: {
      maximumRem: number;
      charactersPerLine: readonly [number, number];
    };
    headingCase: "sentence-case";
    eyebrowRule: string;
  };
  responsive: readonly DraftPackResponsiveRule[];
  imagery: {
    distinctSiteImages: readonly [number, number];
    meaningfulHomeImages: readonly [number, number];
    maximumUsesPerPage: number;
    heroMayRepeat: false;
    portraitsRequireVerifiedPeople: true;
    meaningfulAltTextRequired: true;
    decorativeAlt: "";
    rules: readonly string[];
  };
  logo: {
    canonicalPlacements: readonly ["header", "footer"];
    requiredSurfaces: readonly ["preview", "editor", "live", "export"];
    testRatios: readonly {
      label: "square" | "wide" | "extra-wide" | "tall";
      widthToHeight: number;
    }[];
    objectFit: "contain";
    preserve: readonly ["asset-id", "pixels", "intrinsic-ratio", "colors"];
    textFallback: "only-when-no-logo-supplied";
    unresolvedLogo: "blocking-error";
    contrastRule: string;
  };
  contentSafety: {
    requiredFacts: readonly string[];
    prohibitedInventions: readonly string[];
    claimRules: readonly string[];
  };
  certificationPlan: {
    requiredCandidateCount: 20;
    stagedCandidateCount: number;
    certifiedCandidateCount: 0;
    /** Compatibility field: counts candidates that completed certification. */
    currentCandidateCount: 0;
    registrationAllowed: false;
    visualReviewRequired: true;
  };
};
