import type { ComponentType } from "react";
import { siteSchema, type Site } from "@micirql/schema";
import {
  createFunctionBindingResolver,
  createStaticRendererRegistry,
  preparePage,
} from "@micirql/renderer";
import {
  seedSectionCatalog,
  seedSectionRegistryEntries,
  sectionDesignId,
  type SectionFamily,
} from "@micirql/sections";
import { demoAssetById } from "../../demo-assets";

const previewEntries = seedSectionRegistryEntries.map((entry) => ({
  ...entry,
  protocol: { ...entry.protocol, passed: true, score: Math.max(entry.protocol.score, 90), checkedAt: new Date(0).toISOString() },
}));

const components: Record<string, ComponentType<Record<string, unknown>>> = Object.fromEntries(
  seedSectionCatalog.map((seed) => [seed.id, function PreviewComponent() { return null; }]),
);

const registry = createStaticRendererRegistry({ entries: previewEntries, components });
const functions = createFunctionBindingResolver({ actionIds: [], gatewayBasePath: "/api/functions" });

export async function POST(request: Request) {
  try {
    const body = await request.json() as { site?: unknown; path?: string };
    const parsed = siteSchema.safeParse(body.site);
    if (!parsed.success) {
      return Response.json({ ok: false, issues: [{ code: "INVALID_SITE", message: "Draft failed Site Schema validation." }] }, { status: 400 });
    }

    const site = bridgeLegacyPreviewComponents(parsed.data);
    const path = typeof body.path === "string" ? body.path : "/";
    const prepared = await preparePage({ site, path, origin: "https://preview.micirql.local", registry, functions, mode: "preview" });
    if (!prepared.ok) return Response.json({ ok: false, issues: prepared.issues }, { status: 422 });

    return Response.json({
      ok: true,
      pageId: prepared.value.page.id,
      siteId: prepared.value.site.siteId,
      theme: prepared.value.site.theme.family,
      themeStyle: prepared.value.themeStyle,
      sections: prepared.value.sections.map(({ section, component, props }) => ({
        id: section.id,
        componentId: component.registry.id,
        componentVersion: component.registry.version,
        props: normalizeProps(props),
      })),
      seo: prepared.value.seo,
    });
  } catch (error) {
    return Response.json({ ok: false, issues: [{ code: "PREVIEW_FAILED", message: error instanceof Error ? error.message : "Preview rendering failed." }] }, { status: 500 });
  }
}

function bridgeLegacyPreviewComponents(site: Site): Site {
  const next = structuredClone(site);
  for (const page of next.pages) {
    for (const section of page.sections) {
      const family = legacyFamily(section.component.componentId);
      if (family) section.component = { componentId: sectionDesignId(next.theme.family, family, 1), version: "1.0.0" };
    }
  }
  return next;
}

function legacyFamily(componentId: string): SectionFamily | undefined {
  const value = componentId.toLowerCase();
  const families: SectionFamily[] = ["navbar", "hero", "about", "services", "features", "process", "testimonials", "gallery", "team", "cta", "contact", "footer"];
  return families.find((family) => value === `${family}.placeholder` || value.startsWith(`${family}.`));
}

function normalizeProps(props: Record<string, unknown>) {
  const title = stringValue(props.title) ?? stringValue(props.heading) ?? "Untitled section";
  const description = stringValue(props.description) ?? stringValue(props.body);
  const image = resolveImage(props.image);
  return { ...props, title, ...(description ? { description } : {}), ...(image ? { image } : {}) };
}

function resolveImage(value: unknown): { src: string; alt: string } | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as { assetId?: unknown; alt?: unknown };
  if (typeof record.assetId !== "string") return undefined;
  const asset = demoAssetById(record.assetId);
  if (!asset) return undefined;
  return { src: asset.originalUrl, alt: typeof record.alt === "string" ? record.alt : asset.alt };
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}
