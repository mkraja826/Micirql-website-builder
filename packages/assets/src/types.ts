import { z } from "zod";
import { domainSchema, themeFamilySchema } from "@micirql/schema";

export const assetSourceSchema = z.enum(["user-upload", "micirql-placeholder", "ai-generated"]);
export const assetKindSchema = z.enum(["image", "logo", "icon", "illustration"]);
export const assetOrientationSchema = z.enum(["square", "portrait", "landscape", "panoramic"]);
export const assetLicenseSchema = z.enum(["user-owned", "micirql-owned", "licensed", "generated"]);

export const assetVariantSchema = z.object({
  format: z.enum(["avif", "webp", "jpeg", "png", "svg"]),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  url: z.string().min(1),
  bytes: z.number().int().nonnegative().optional(),
});

export const assetRecordSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().optional(),
  source: assetSourceSchema,
  kind: assetKindSchema,
  name: z.string().min(1),
  alt: z.string().default(""),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  orientation: assetOrientationSchema,
  aspectRatio: z.number().positive(),
  focalPoint: z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) }).default({ x: 0.5, y: 0.5 }),
  dominantTone: z.string().optional(),
  domains: z.array(domainSchema).default([]),
  subtypes: z.array(z.string()).default([]),
  sectionFamilies: z.array(z.string()).default([]),
  themes: z.array(themeFamilySchema).default([]),
  tags: z.array(z.string()).default([]),
  license: assetLicenseSchema,
  sourceReference: z.string().optional(),
  originalUrl: z.string().min(1),
  variants: z.array(assetVariantSchema).default([]),
  active: z.boolean().default(true),
  createdAt: z.string().datetime(),
});

export const assetSlotSchema = z.object({
  slotId: z.string().min(1),
  pagePath: z.string().startsWith("/"),
  sectionId: z.string().min(1),
  propPath: z.string().min(1),
  purpose: z.string().min(1),
  requiredKind: assetKindSchema.default("image"),
  preferredOrientation: assetOrientationSchema.optional(),
  preferredAspectRatio: z.number().positive().optional(),
  currentAssetId: z.string().optional(),
  replaceable: z.boolean().default(true),
});

export type AssetRecord = z.infer<typeof assetRecordSchema>;
export type AssetSlot = z.infer<typeof assetSlotSchema>;
export type AssetSource = z.infer<typeof assetSourceSchema>;
export type AssetOrientation = z.infer<typeof assetOrientationSchema>;
