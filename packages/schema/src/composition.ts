import { z } from "zod";
import { domainSchema, themeFamilySchema, themeModifierSchema } from "./core";

const hexColorSchema = z.string().regex(/^#[0-9a-f]{6}$/i, "Expected a six-digit hex color.");

export const websiteArchetypeSchema = z.enum([
  "local-service",
  "professional-services",
  "healthcare-clinic",
  "restaurant-hospitality",
  "real-estate",
  "ecommerce-retail",
  "saas-technology",
  "portfolio-creative",
  "education-training",
  "corporate-company",
]);

export const paletteStrategySchema = z.enum([
  "light-corporate",
  "brand-heavy",
  "editorial",
  "dark-premium",
  "color-block",
  "soft-tint",
]);

export const typographyStrategySchema = z.enum([
  "corporate-sans",
  "humanist-sans",
  "editorial-serif",
  "geometric-modern",
  "luxury-serif",
  "technical",
  "friendly-rounded",
  "high-impact-display",
]);

export const imageStrategySchema = z.enum([
  "documentary",
  "editorial-crop",
  "immersive",
  "product-detail",
  "people-led",
  "restrained",
]);

export const brandInputSchema = z.object({
  logoAssetId: z.string().min(1).optional(),
  colors: z.object({
    primary: hexColorSchema.optional(),
    secondary: hexColorSchema.optional(),
    accent: hexColorSchema.optional(),
  }).default({}),
});

export const brandProvenanceSchema = z.object({
  logo: z.literal("user-upload").optional(),
  colors: z.object({
    primary: z.literal("user-supplied").optional(),
    secondary: z.literal("user-supplied").optional(),
    accent: z.literal("user-supplied").optional(),
  }).default({}),
});

export const compositionComponentSchema = z.object({
  family: z.string().min(1),
  componentId: z.string().min(1),
  version: z.string().min(1),
});

export const compositionIdentitySchema = z.object({
  id: z.string().min(1),
  catalogVersion: z.string().min(1),
  archetype: websiteArchetypeSchema,
  domain: domainSchema,
  subtype: z.string().min(1),
  recipeId: z.string().min(1),
  sectionOrder: z.array(z.string().min(1)).min(1),
  components: z.array(compositionComponentSchema).min(1),
  designSystem: themeFamilySchema,
  modifiers: z.array(themeModifierSchema).max(3).default([]),
  paletteStrategy: paletteStrategySchema,
  typographyStrategy: typographyStrategySchema,
  density: z.enum(["compact", "comfortable", "spacious"]),
  imageStrategy: imageStrategySchema,
  motionStrategy: z.enum(["none", "subtle", "standard", "rich"]),
});

export const compositionGateIssueSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  severity: z.enum(["error", "warning"]),
});

export const compositionGateReportSchema = z.object({
  passed: z.boolean(),
  score: z.number().min(0).max(100),
  issues: z.array(compositionGateIssueSchema).default([]),
});

export const compositionCandidateSchema = z.object({
  identity: compositionIdentitySchema,
  score: z.number().min(0).max(100),
  reasons: z.array(z.string()).default([]),
  gate: compositionGateReportSchema,
});

export const top20ResultSchema = z.object({
  catalogVersion: z.string().min(1),
  domain: domainSchema,
  subtype: z.string().min(1),
  status: z.enum(["certified", "legacy", "unavailable"]),
  candidates: z.array(compositionCandidateSchema).max(20),
  rejected: z.array(z.object({ candidateId: z.string().min(1), issues: z.array(compositionGateIssueSchema) })).default([]),
});

export const generationMetadataSchema = z.object({
  catalogVersion: z.string().min(1),
  packStatus: z.enum(["certified", "legacy", "unavailable"]),
  candidateIds: z.array(z.string().min(1)).max(20).default([]),
  selectedCandidateId: z.string().min(1).optional(),
  brandInput: brandInputSchema.optional(),
  brandProvenance: brandProvenanceSchema.optional(),
  premiumGate: compositionGateReportSchema.optional(),
});

export type WebsiteArchetype = z.infer<typeof websiteArchetypeSchema>;
export type PaletteStrategy = z.infer<typeof paletteStrategySchema>;
export type TypographyStrategy = z.infer<typeof typographyStrategySchema>;
export type ImageStrategy = z.infer<typeof imageStrategySchema>;
export type BrandInput = z.infer<typeof brandInputSchema>;
export type BrandProvenance = z.infer<typeof brandProvenanceSchema>;
export type CompositionIdentity = z.infer<typeof compositionIdentitySchema>;
export type CompositionGateIssue = z.infer<typeof compositionGateIssueSchema>;
export type CompositionGateReport = z.infer<typeof compositionGateReportSchema>;
export type CompositionCandidate = z.infer<typeof compositionCandidateSchema>;
export type Top20Result = z.infer<typeof top20ResultSchema>;
export type GenerationMetadata = z.infer<typeof generationMetadataSchema>;
