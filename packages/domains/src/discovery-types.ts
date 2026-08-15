import { z } from "zod";

export const discoveryQuestionTypeSchema = z.enum([
  "short-text",
  "long-text",
  "single-select",
  "multi-select",
  "boolean",
  "url",
  "location-list",
  "language-list"
]);

export const discoveryQuestionSchema = z.object({
  id: z.string().min(1),
  group: z.enum(["business", "brand", "seo", "functionality", "content"]),
  label: z.string().min(1),
  help: z.string().optional(),
  type: discoveryQuestionTypeSchema,
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(),
  aiPurpose: z.string().min(1)
});

export const discoveryAnswerSchema = z.object({
  questionId: z.string().min(1),
  value: z.union([z.string(), z.boolean(), z.array(z.string())])
});

export type DiscoveryQuestion = z.infer<typeof discoveryQuestionSchema>;
export type DiscoveryAnswer = z.infer<typeof discoveryAnswerSchema>;
