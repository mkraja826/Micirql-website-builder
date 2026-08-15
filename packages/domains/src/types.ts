import { z } from "zod";
import { domainSchema } from "@micirql/schema";

export const pageBlueprintSchema = z.object({
  slug: z.string().startsWith("/"),
  label: z.string().min(1),
  required: z.boolean(),
  purpose: z.string().min(1),
  sectionFamilies: z.array(z.string().min(1)).min(1),
  seoIntent: z.enum(["commercial", "transactional", "informational", "local", "brand"]),
});

export const domainPackSchema = z.object({
  domain: domainSchema,
  label: z.string().min(1),
  primaryGoals: z.array(z.string().min(1)).min(1),
  commonSubtypes: z.array(z.string().min(1)).default([]),
  requiredBusinessFacts: z.array(z.string().min(1)).min(1),
  recommendedTrustSignals: z.array(z.string().min(1)).default([]),
  defaultPages: z.array(pageBlueprintSchema).min(1),
  requiredActions: z.array(z.string().min(1)).default([]),
  optionalActions: z.array(z.string().min(1)).default([]),
  seo: z.object({
    defaultScope: z.enum(["local", "regional", "national", "international", "mixed"]),
    askLocations: z.boolean(),
    askLanguages: z.boolean(),
    serviceOrTopicPages: z.boolean(),
    locationPages: z.boolean(),
    blogRecommended: z.boolean(),
    structuredDataTypes: z.array(z.string()).default([]),
  }),
  preferredSectionOrder: z.array(z.string().min(1)).min(1),
  avoidByDefault: z.array(z.string().min(1)).default([]),
});

export type PageBlueprint = z.infer<typeof pageBlueprintSchema>;
export type DomainPack = z.infer<typeof domainPackSchema>;
