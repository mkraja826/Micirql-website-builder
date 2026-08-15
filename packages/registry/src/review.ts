import { z } from "zod";

export const visualReviewStatusSchema = z.enum(["pending", "in_review", "approved", "rejected"]);

export const visualReviewRecordSchema = z.object({
  designId: z.string().min(1),
  version: z.string().min(1),
  status: visualReviewStatusSchema.default("pending"),
  reviewer: z.string().min(1).optional(),
  reviewedAt: z.string().datetime().optional(),
  scores: z.object({
    hierarchy: z.number().min(0).max(100),
    spacing: z.number().min(0).max(100),
    typography: z.number().min(0).max(100),
    composition: z.number().min(0).max(100),
    themeFidelity: z.number().min(0).max(100),
    mobileQuality: z.number().min(0).max(100),
  }).optional(),
  notes: z.array(z.string()).default([]),
});

export type VisualReviewRecord = z.infer<typeof visualReviewRecordSchema>;

export function visualReviewScore(record: VisualReviewRecord): number | undefined {
  if (!record.scores) return undefined;
  const values = Object.values(record.scores);
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function visualReviewPassed(record: VisualReviewRecord): boolean {
  const score = visualReviewScore(record);
  return record.status === "approved" && typeof score === "number" && score >= 80;
}
