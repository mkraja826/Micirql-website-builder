import { z } from "zod";
import { domainSchema, themeFamilySchema, themeModifierSchema } from "./core";

export const businessProfileSchema = z.object({
  businessName: z.string().min(1),
  domain: domainSchema,
  subtype: z.string().optional(),
  primaryGoal: z.string().min(1),
  audiences: z.array(z.string()).default([]),
  locations: z.array(z.string()).default([]),
  positioning: z.enum(["budget", "value", "mid-market", "premium", "luxury"]),
  requiredFunctions: z.array(z.string()).default([]),
});

export const brandBlueprintSchema = z.object({
  personalities: z.array(z.string()).min(1),
  logoStyle: z.string().optional(),
  visualWeight: z.enum(["light", "medium", "heavy"]),
  geometry: z.enum(["sharp", "balanced", "rounded", "organic"]),
  preferredSurface: z.enum(["light", "dark", "adaptive"]),
  imageryDirection: z.enum([
    "photography",
    "illustration",
    "mixed",
    "product",
    "architectural",
    "editorial",
  ]),
  motionPreference: z.enum(["none", "subtle", "standard", "rich"]),
});

export const designDecisionSchema = z.object({
  theme: themeFamilySchema,
  modifiers: z.array(themeModifierSchema).max(3),
  rationale: z.array(z.string()).min(1),
});

export const pagePlanSchema = z.object({
  name: z.string().min(1),
  path: z.string().startsWith("/"),
  purpose: z.string().min(1),
  requiredSectionFamilies: z.array(z.string()).min(1),
  requiredFunctions: z.array(z.string()).default([]),
});

export const sitePlanSchema = z.object({
  business: businessProfileSchema,
  brand: brandBlueprintSchema,
  design: designDecisionSchema,
  pages: z.array(pagePlanSchema).min(1),
});

export type BusinessProfile = z.infer<typeof businessProfileSchema>;
export type BrandBlueprint = z.infer<typeof brandBlueprintSchema>;
export type SitePlan = z.infer<typeof sitePlanSchema>;
