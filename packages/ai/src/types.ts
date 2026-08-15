import { z } from "zod";
import type { DesignRegistryEntry } from "@micirql/registry";
import { sitePlanSchema, type SitePlan } from "@micirql/schema";

export const selectionConfidenceSchema = z.enum(["high", "medium", "low"]);
export type SelectionConfidence = z.infer<typeof selectionConfidenceSchema>;

export const aiPlannerModeSchema = z.enum(["library-only", "library-preferred"]);
export type AiPlannerMode = z.infer<typeof aiPlannerModeSchema>;

export type SectionRequirement = {
  pagePath: string;
  family: string;
  requiredCapabilities?: string[];
};

export type SectionSelection = {
  pagePath: string;
  family: string;
  componentId: string;
  version: string;
  score: number;
  confidence: SelectionConfidence;
  alternatives: Array<{ componentId: string; version: string; score: number }>;
};

export type LibraryGap = {
  pagePath: string;
  family: string;
  reason: "NO_PRODUCTION_MATCH" | "LOW_CONFIDENCE" | "MISSING_CAPABILITY";
  requiredCapabilities: string[];
  allowCodeGeneration: boolean;
};

export type AiDecisionInput = {
  sitePlan: SitePlan;
  registryEntries: readonly DesignRegistryEntry[];
  mode?: AiPlannerMode;
  minimumSelectionScore?: number;
};

export type AiDecisionOutput = {
  plan: SitePlan;
  selections: SectionSelection[];
  gaps: LibraryGap[];
  requiresNewComponent: boolean;
};

export function validateSitePlan(value: unknown): SitePlan {
  return sitePlanSchema.parse(value);
}
