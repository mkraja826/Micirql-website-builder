import { z } from "zod";
import type { DesignRegistryEntry } from "./design";

export const qaViewportResultSchema = z.object({
  width: z.number().int().positive(),
  passed: z.boolean(),
  overflowPx: z.number().nonnegative().default(0),
  undersizedTargets: z.number().int().nonnegative().default(0),
  missingAltImages: z.number().int().nonnegative().default(0),
  screenshotUrl: z.string().url().optional(),
});

export const designQaEvidenceSchema = z.object({
  designId: z.string().min(1),
  version: z.string().min(1),
  commitSha: z.string().regex(/^[a-f0-9]{40}$/),
  runId: z.string().min(1),
  checkedAt: z.string().datetime(),
  viewports: z.array(qaViewportResultSchema).min(1),
  accessibilityPassed: z.boolean(),
  functionalityPassed: z.boolean(),
  performancePassed: z.boolean(),
  visualReviewed: z.boolean().default(false),
  visualScore: z.number().min(0).max(100).optional(),
  notes: z.array(z.string()).default([]),
});

export type DesignQaEvidence = z.infer<typeof designQaEvidenceSchema>;

const requiredWidths = [320, 360, 390, 430, 1280] as const;

export function qaEvidenceCoversRequiredWidths(evidence: DesignQaEvidence): boolean {
  const passedWidths = new Set(evidence.viewports.filter((v) => v.passed).map((v) => v.width));
  return requiredWidths.every((width) => passedWidths.has(width));
}

export function canPromoteWithEvidence(entry: DesignRegistryEntry, evidence: DesignQaEvidence): { allowed: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (evidence.designId !== entry.id || evidence.version !== entry.version) reasons.push("QA evidence does not match design id/version");
  if (!qaEvidenceCoversRequiredWidths(evidence)) reasons.push("QA evidence must pass 320/360/390/430/1280 widths");
  if (!evidence.accessibilityPassed) reasons.push("Accessibility QA has not passed");
  if (!evidence.functionalityPassed) reasons.push("Functionality QA has not passed");
  if (!evidence.performancePassed) reasons.push("Performance QA has not passed");
  if (!evidence.visualReviewed || (evidence.visualScore ?? 0) < 80) reasons.push("Visual review score must be at least 80");
  return { allowed: reasons.length === 0, reasons };
}
