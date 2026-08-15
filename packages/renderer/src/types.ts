import type { ComponentType, ReactNode } from "react";
import type { DesignRegistryEntry } from "@micirql/registry";
import type { Site, SitePage, SiteSection } from "@micirql/schema";

export type RendererMode = "preview" | "production";

export type RenderableComponent = {
  registry: DesignRegistryEntry;
  Component: ComponentType<Record<string, unknown>>;
};

export type RendererRegistry = {
  resolve(componentId: string, version: string): Promise<RenderableComponent | undefined>;
};

export type FunctionBindingResolver = {
  isRegistered(actionId: string): Promise<boolean>;
  endpointFor(args: { siteId: string; actionId: string }): string;
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
    | "COMPONENT_NOT_FOUND"
    | "COMPONENT_NOT_PRODUCTION"
    | "COMPONENT_PROTOCOL_FAILED"
    | "THEME_MISMATCH"
    | "ACTION_NOT_REGISTERED";
  message: string;
  sectionId?: string;
};

export type PrepareResult =
  | { ok: true; value: PreparedPage }
  | { ok: false; issues: RendererIssue[] };

export type PageRenderer = (page: PreparedPage) => ReactNode;
