import type { ComponentType, ReactNode } from "react";
import type { DesignRegistryEntry } from "@micirql/registry";
import type { Site, SitePage, SiteSection } from "@micirql/schema";

export type RendererMode = "preview" | "production";

export type RenderableComponent = {
  registry: DesignRegistryEntry;
  Component: ComponentType<Record<string, unknown>>;
};

export type RendererRegistry = {
  resolve(
    componentId: string,
    version: string,
  ): Promise<RenderableComponent | undefined>;
};

export type FunctionBindingResolver = {
  isRegistered(actionId: string): Promise<boolean>;
  endpointFor(args: { siteId: string; actionId: string }): string;
};

/**
 * A user-supplied logo after the owning application has resolved its asset ID
 * to a renderable URL. Asset storage stays outside the renderer; this value is
 * deliberately small, serializable, and safe to pass to preview or live
 * components unchanged.
 */
export type ResolvedBrandMark = {
  assetId: string;
  src: string;
  alt?: string;
  width: number;
  height: number;
  aspectRatio?: number;
};

export type PreparedSection = {
  section: SiteSection;
  component: RenderableComponent;
  props: Record<string, unknown>;
};

export type PreparedPage = {
  site: Site;
  page: SitePage;
  sections: PreparedSection[];
  themeStyle: Record<string, string>;
  seo: RenderedSeo;
};

export type RenderedSeo = {
  title: string;
  description: string;
  canonical: string;
  robots: "index,follow" | "noindex,nofollow";
  structuredData: Record<string, unknown>[];
};

export type RendererIssue = {
  code:
    | "INVALID_SITE"
    | "PAGE_NOT_FOUND"
    | "BRAND_LOGO_UNRESOLVED"
    | "COMPONENT_NOT_FOUND"
    | "COMPONENT_NOT_PRODUCTION"
    | "COMPONENT_PROTOCOL_FAILED"
    | "THEME_MISMATCH"
    | "ACTION_NOT_REGISTERED";
  message: string;
  sectionId?: string;
};

export type PrepareResult =
  { ok: true; value: PreparedPage } | { ok: false; issues: RendererIssue[] };

export type PageRenderer = (page: PreparedPage) => ReactNode;
