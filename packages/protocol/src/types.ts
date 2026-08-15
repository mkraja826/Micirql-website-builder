export type ProtocolCategory =
  | "functionality"
  | "mobile"
  | "performance"
  | "accessibility"
  | "seo"
  | "security";

export type ProtocolSeverity = "warning" | "error";

export type ProtocolIssue = {
  code: string;
  category: ProtocolCategory;
  severity: ProtocolSeverity;
  message: string;
};

export type FunctionalProtocolInput = {
  interactive: boolean;
  actionsDeclared: boolean;
  states: {
    loading: boolean;
    error: boolean;
    success: boolean;
  };
};

export type MobileProtocolInput = {
  testedWidths: number[];
  hasHorizontalOverflow: boolean;
  minTapTargetPx: number;
  mobileNavigationVerified: boolean;
};

export type PerformanceProtocolInput = {
  clientJsKb: number;
  imageKbAboveFold: number;
  totalFontKb: number;
  thirdPartyScriptCount: number;
  animationCost: "none" | "low" | "medium" | "high";
};

export type AccessibilityProtocolInput = {
  keyboardNavigable: boolean;
  focusVisible: boolean;
  labelsPresent: boolean;
  contrastPass: boolean;
  reducedMotionSupported: boolean;
};

export type SeoProtocolInput = {
  indexable: boolean;
  titlePresent: boolean;
  metaDescriptionPresent: boolean;
  logicalH1: boolean;
  headingHierarchyPass: boolean;
  canonicalPresent: boolean;
  altTextPass: boolean;
  structuredDataValid: boolean;
};

export type SecurityProtocolInput = {
  exposesSecrets: boolean;
  registeredActionsOnly: boolean;
  serverValidationPresent: boolean;
  publicPermissionsExplicit: boolean;
  rateLimitConfigured: boolean;
};

export type ProtocolInput = {
  functionality: FunctionalProtocolInput;
  mobile: MobileProtocolInput;
  performance: PerformanceProtocolInput;
  accessibility: AccessibilityProtocolInput;
  seo: SeoProtocolInput;
  security: SecurityProtocolInput;
};

export type ProtocolResult = {
  passed: boolean;
  publishBlocked: boolean;
  score: number;
  issues: ProtocolIssue[];
};
