import { z } from "zod";
import {
  domainSchema,
  lifecycleStatusSchema,
  themeFamilySchema,
  themeModifierSchema,
} from "@micirql/schema";

export const componentFamilySchema = z.enum([
  "navbar",
  "hero",
  "about",
  "services",
  "features",
  "process",
  "testimonials",
  "gallery",
  "portfolio",
  "team",
  "pricing",
  "cta",
  "contact",
  "blog",
  "footer",
  "card",
  "carousel",
  "faq",
  "tabs",
  "stats",
  "page-header",
  "lead-capture",
  "map",
  "form",
  "table",
  "modal",
  "drawer",
  "search",
  "filter",
  "pagination",
  "stepper",
  "date-picker",
]);

export const contentFieldSchema = z.object({
  key: z.string().min(1),
  type: z.enum(["string", "rich-text", "image", "video", "action", "list", "number", "boolean"]),
  required: z.boolean().default(false),
  recommendedMaxCharacters: z.number().int().positive().optional(),
});

export const componentIntelligenceSchema = z.object({
  conversionGoals: z.array(z.string()).default([]),
  placementRoles: z.array(z.enum(["opening", "early-proof", "core-content", "visual-break", "decision-support", "conversion", "closing"])).default([]),
  visualWeight: z.enum(["light", "medium", "heavy"]),
  contentDensity: z.enum(["low", "medium", "high"]),
  imageRequirement: z.enum(["none", "optional", "recommended", "required"]),
  preferredImageRatios: z.array(z.string()).default([]),
  idealPredecessors: z.array(componentFamilySchema).default([]),
  idealSuccessors: z.array(componentFamilySchema).default([]),
  avoidAdjacent: z.array(componentFamilySchema).default([]),
  maxRecommendedPerPage: z.number().int().positive().default(1),
  aiPriority: z.number().min(0).max(100).default(50),
  mobileSuitability: z.number().min(0).max(100).default(90),
  contentCapacity: z.object({
    headlineMaxWords: z.number().int().positive().optional(),
    bodyMaxWords: z.number().int().positive().optional(),
    minItems: z.number().int().nonnegative().optional(),
    maxItems: z.number().int().positive().optional(),
  }).default({}),
}).optional();

export const designRegistryEntrySchema = z.object({
  id: z.string().regex(/^[A-Z]{3,5}-[A-Z-]+-\d{3}$/),
  family: componentFamilySchema,
  theme: themeFamilySchema,
  version: z.string().min(1),
  status: lifecycleStatusSchema,
  displayName: z.string().min(1),
  description: z.string().min(1),
  tags: z.array(z.string()).default([]),
  layoutTraits: z.array(z.string()).default([]),
  brandPersonalities: z.array(z.string()).default([]),
  modifiers: z.array(themeModifierSchema).default([]),
  domainCompatibility: z.record(domainSchema, z.number().min(0).max(100)),
  capabilities: z.record(z.string(), z.boolean()).default({}),
  contentSchema: z.array(contentFieldSchema).default([]),
  intelligence: componentIntelligenceSchema,
  quality: z.object({
    mobile: z.number().min(0).max(100),
    performance: z.number().min(0).max(100),
    accessibility: z.number().min(0).max(100),
    visual: z.number().min(0).max(100),
    conversion: z.number().min(0).max(100).optional(),
  }),
  technical: z.object({
    clientJavascript: z.enum(["none", "low", "medium", "high"]),
    animationCost: z.enum(["none", "low", "medium", "high"]),
    requiresBackend: z.boolean(),
    requiresThirdParty: z.boolean(),
  }),
  protocol: z.object({
    passed: z.boolean(),
    score: z.number().min(0).max(100),
    checkedAt: z.string().datetime(),
  }),
  dependencies: z.array(z.string()).default([]),
  previews: z.object({
    thumbnail: z.string().url(),
    mobile: z.string().url().optional(),
    desktop: z.string().url().optional(),
    video: z.string().url().optional(),
  }),
  usage: z.object({
    selected: z.number().int().nonnegative().default(0),
    published: z.number().int().nonnegative().default(0),
    replaced: z.number().int().nonnegative().default(0),
  }).default({ selected: 0, published: 0, replaced: 0 }),
});

export type DesignRegistryEntry = z.infer<typeof designRegistryEntrySchema>;
export type ComponentFamily = z.infer<typeof componentFamilySchema>;
export type ComponentIntelligence = z.infer<typeof componentIntelligenceSchema>;
