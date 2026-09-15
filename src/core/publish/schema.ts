import type { CandidateCapabilityPlan } from "../capabilities/planner";
import type { ContentPlan } from "../content/schema";
import type { SiteCandidatePlan } from "../generation/candidates";

export type DraftReadiness = "ready" | "blocked";
export type DraftCapabilityState = "active" | "disabled_preview" | "disabled_needs_configuration";

export type PublishableDraftCapability = {
  id: string;
  label: string;
  state: DraftCapabilityState;
  href?: string;
  reason: string;
};

export type PublishableDraftPage = {
  slug: string;
  title: string;
  sectionOrder: string[];
  contentSectionTypes: string[];
};

export type PublishableMediaAsset = {
  pageSlug: string;
  sectionType: string;
  role: string;
  index: number;
  src: string;
  alt: string;
  width?: number;
  height?: number;
  focalPoint?: { x: number; y: number };
  provider?: string;
  providerId?: string;
  sourcePageUrl?: string;
  attribution?: string;
};

export type PublishableDraft = {
  version: "1.0";
  candidateId: string;
  readiness: DraftReadiness;
  pages: PublishableDraftPage[];
  content: ContentPlan;
  media: PublishableMediaAsset[];
  selectedSections: SiteCandidatePlan["selectedSections"];
  theme: SiteCandidatePlan["theme"];
  cssVariables: SiteCandidatePlan["cssVariables"];
  /** Deterministic CSS emitted only by the bounded repair executor after post-repair acceptance. */
  certifiedRepairCss?: string;
  primaryCapability: CandidateCapabilityPlan["primary"];
  capabilities: PublishableDraftCapability[];
  blockers: string[];
  warnings: string[];
  source: {
    contentVersion: ContentPlan["version"];
  };
};