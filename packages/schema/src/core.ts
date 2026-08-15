import { z } from "zod";

export const SCHEMA_VERSION = "1.0.0" as const;

export const domainSchema = z.enum([
  "clinic",
  "landing-page",
  "real-estate",
  "restaurant",
  "corporate",
  "saas",
  "portfolio",
  "construction",
  "education",
  "hospitality",
]);

export const themeFamilySchema = z.enum([
  "minimalist",
  "corporate",
  "luxury",
  "editorial",
  "glass",
  "maximalist",
  "organic",
  "futuristic",
  "playful",
  "cinematic",
]);

export const themeModifierSchema = z.enum([
  "liquid",
  "dark",
  "light",
  "monochrome",
  "gradient",
  "rounded",
  "sharp",
  "neon-glow",
  "3d-depth",
  "motion-rich",
  "motion-subtle",
  "illustrative",
  "photography-led",
  "geometric",
  "texture-grain",
]);

export const lifecycleStatusSchema = z.enum([
  "draft",
  "review",
  "approved",
  "production",
  "deprecated",
]);

export const actionBindingSchema = z.object({
  actionId: z.string().min(1),
  inputMap: z.record(z.string(), z.string()).default({}),
});

export const seoPageSchema = z.object({
  title: z.string().min(1).max(70),
  description: z.string().min(1).max(180),
  canonicalPath: z.string().startsWith("/"),
  indexable: z.boolean().default(true),
  primaryKeyword: z.string().optional(),
  structuredDataTypes: z.array(z.string()).default([]),
});

export const componentReferenceSchema = z.object({
  componentId: z.string().min(1),
  version: z.string().min(1),
});

export const assetReferenceSchema = z.object({
  assetId: z.string().min(1),
  alt: z.string().optional(),
  focalPoint: z
    .object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) })
    .optional(),
});

export type Domain = z.infer<typeof domainSchema>;
export type ThemeFamily = z.infer<typeof themeFamilySchema>;
export type ThemeModifier = z.infer<typeof themeModifierSchema>;
export type ActionBinding = z.infer<typeof actionBindingSchema>;
export type ComponentReference = z.infer<typeof componentReferenceSchema>;
