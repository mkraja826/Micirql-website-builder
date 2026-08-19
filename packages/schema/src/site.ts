import { z } from "zod";
import {
  SCHEMA_VERSION,
  actionBindingSchema,
  componentReferenceSchema,
  domainSchema,
  seoPageSchema,
  themeFamilySchema,
  themeModifierSchema,
} from "./core";

const logoPresentationSchema = z.object({
  shape: z.enum(["horizontal", "square", "vertical"]),
  treatment: z.enum(["direct", "neutral-container", "cleanup-recommended"]),
  navbarMaxHeight: z.number().positive(),
  footerMaxHeight: z.number().positive(),
  paddingScale: z.number().positive(),
  preserveOriginal: z.literal(true),
  cleanupApplied: z.boolean().optional(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  hasTransparency: z.boolean().optional(),
  edgeBackgroundRatio: z.number().min(0).max(1).optional(),
  backgroundSignal: z.enum(["transparent", "embedded", "clean-opaque", "unknown"]).optional(),
  edgeColor: z.string().optional(),
  reasons: z.array(z.string()).default([]),
});

const brandColorsSchema = z.object({
  primary: z.string().min(1),
  secondary: z.string().min(1),
  accent: z.string().min(1),
  background: z.string().min(1),
  surface: z.string().min(1),
  textPrimary: z.string().min(1),
  textSecondary: z.string().min(1),
  border: z.string().min(1),
  success: z.string().min(1),
  warning: z.string().min(1),
  error: z.string().min(1),
});

const brandIntelligenceSchema = z.object({
  tone: z.enum(["clinical", "corporate", "premium", "friendly", "bold", "editorial", "neutral"]),
  typographyMood: z.enum(["technical", "humanist", "editorial", "geometric", "classic"]),
  buttonStyle: z.enum(["solid", "soft", "outline-accent", "high-contrast"]),
  imageryStyle: z.enum([
    "clean-realistic",
    "editorial-lifestyle",
    "product-led",
    "architectural",
    "minimal-illustrative",
    "portrait-led",
    "editorial",
    "clean-product",
    "human-lifestyle",
  ]),
  recommendations: z.array(z.string()).max(12).default([]),
}).optional();

export const brandHistoryEntrySchema = z.object({
  id: z.string().min(1),
  createdAt: z.string().datetime(),
  reason: z.enum(["logo-replacement", "brand-restore", "manual-palette"]),
  logoAssetId: z.string().optional(),
  logoOriginalAssetId: z.string().optional(),
  logoCleanupAssetId: z.string().optional(),
  faviconAssetId: z.string().optional(),
  faviconStrategy: z.enum(["reuse-logo", "derive-symbol", "initial-mark"]).optional(),
  socialImageAssetId: z.string().optional(),
  socialImageStrategy: z.enum(["generated-card", "logo-fallback", "favicon-fallback"]).optional(),
  logoPresentation: logoPresentationSchema.optional(),
  colors: brandColorsSchema,
});

export const brandTokensSchema = z.object({
  logoAssetId: z.string().optional(),
  logoOriginalAssetId: z.string().optional(),
  logoCleanupAssetId: z.string().optional(),
  faviconAssetId: z.string().optional(),
  faviconStrategy: z.enum(["reuse-logo", "derive-symbol", "initial-mark"]).optional(),
  socialImageAssetId: z.string().optional(),
  socialImageStrategy: z.enum(["generated-card", "logo-fallback", "favicon-fallback"]).optional(),
  logoPresentation: logoPresentationSchema.optional(),
  intelligence: brandIntelligenceSchema,
  history: z.array(brandHistoryEntrySchema).max(5).optional(),
  colors: brandColorsSchema,
  typography: z.object({
    display: z.string().min(1),
    body: z.string().min(1),
    ui: z.string().min(1),
    mono: z.string().optional(),
  }),
  density: z.enum(["compact", "comfortable", "spacious"]),
  shape: z.enum(["sharp", "balanced", "soft"]),
  motion: z.enum(["none", "subtle", "standard", "rich"]),
});

export const themeConfigSchema = z.object({
  family: themeFamilySchema,
  modifiers: z.array(themeModifierSchema).max(3).default([]),
  brand: brandTokensSchema,
});

export const sectionSchema = z.object({
  id: z.string().min(1),
  component: componentReferenceSchema,
  props: z.record(z.string(), z.unknown()).default({}),
  bindings: z.record(z.string(), actionBindingSchema).default({}),
  hidden: z.boolean().default(false),
});

export const pageSchema = z.object({
  id: z.string().min(1),
  path: z.string().startsWith("/"),
  name: z.string().min(1),
  sections: z.array(sectionSchema),
  seo: seoPageSchema,
});

export const seoBlueprintSchema = z.object({
  primaryGoal: z.string().min(1),
  targetLocations: z.array(z.string()).default([]),
  priorityTopics: z.array(z.string()).default([]),
  audiences: z.array(z.string()).default([]),
  languages: z.array(z.string()).min(1).default(["en"]),
  localSeo: z.boolean().default(false),
  servicePages: z.boolean().default(true),
  locationPages: z.boolean().default(false),
  blog: z.boolean().default(false),
});

export const integrationReferenceSchema = z.object({
  integrationId: z.string().min(1),
  provider: z.string().min(1),
  enabled: z.boolean().default(true),
});

export const domainConnectionSchema = z.object({
  hostname: z.string().min(1),
  mode: z.enum(["micirql-subdomain", "custom-domain", "managed-dns"]),
  status: z.enum(["pending", "verifying", "active", "failed"]),
  sslStatus: z.enum(["pending", "active", "failed"]),
  primary: z.boolean().default(false),
});

export const siteSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  siteId: z.string().min(1),
  workspaceId: z.string().min(1),
  name: z.string().min(1),
  domain: domainSchema,
  subtype: z.string().optional(),
  theme: themeConfigSchema,
  seoBlueprint: seoBlueprintSchema,
  pages: z.array(pageSchema).min(1),
  navigation: z.array(
    z.object({ label: z.string().min(1), href: z.string().min(1) }),
  ),
  integrations: z.array(integrationReferenceSchema).default([]),
  domains: z.array(domainConnectionSchema).default([]),
});

export const siteVersionSchema = z.object({
  versionId: z.string().min(1),
  siteId: z.string().min(1),
  versionNumber: z.number().int().positive(),
  status: z.enum(["draft", "preview", "published", "archived"]),
  createdAt: z.string().datetime(),
  createdBy: z.string().min(1),
  snapshot: siteSchema,
});

export type Site = z.infer<typeof siteSchema>;
export type SiteVersion = z.infer<typeof siteVersionSchema>;
export type SitePage = z.infer<typeof pageSchema>;
export type SiteSection = z.infer<typeof sectionSchema>;
export type ThemeConfig = z.infer<typeof themeConfigSchema>;
export type BrandTokens = z.infer<typeof brandTokensSchema>;
export type BrandHistoryEntry = z.infer<typeof brandHistoryEntrySchema>;
