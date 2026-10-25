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
import {
  resolveBrandMarkForSite,
  resolvePersistedBrandMarkForSite,
} from "../../render-brand-mark";
import { nativeFunctionCatalog } from "@micirql/functions";
import { authorizeSavedSite, PublishApiError } from "../publish/authorization";

const previewEntries = seedSectionRegistryEntries.map((entry) => ({
  ...entry,
  protocol: {
    ...entry.protocol,
    passed: true,
    score: Math.max(entry.protocol.score, 90),
    checkedAt: new Date(0).toISOString(),
  },
}));

const components: Record<
  string,
  ComponentType<Record<string, unknown>>
> = Object.fromEntries(
  seedSectionCatalog.map((seed) => [
    seed.id,
    function PreviewComponent() {
      return null;
    },
  ]),
);

const registry = createStaticRendererRegistry({
  entries: previewEntries,
  components,
});
const functions = createFunctionBindingResolver({
  actionIds: nativeFunctionCatalog.map((definition) => definition.id),
  gatewayBasePath: "/api/functions",
});

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { site?: unknown; path?: string };
    const parsed = siteSchema.safeParse(body.site);
    if (!parsed.success) {
      return Response.json(
        {
          ok: false,
          issues: [
            {
              code: "INVALID_SITE",
              message: "Draft failed Site Schema validation.",
            },
          ],
        },
        { status: 400 },
      );
    }

    const site = bridgeLegacyPreviewComponents(parsed.data);
    const path = typeof body.path === "string" ? body.path : "/";
    const brandMark = await resolvePreviewBrandMark(request, site);
    const prepared = await preparePage({
      site,
      path,
      origin: "https://preview.micirql.local",
      registry,
      functions,
      mode: "preview",
      ...(brandMark ? { brandMark } : {}),
    });
    if (!prepared.ok)
      return Response.json(
        { ok: false, issues: prepared.issues },
        { status: 422 },
      );

    return Response.json({
      ok: true,
      pageId: prepared.value.page.id,
      siteId: prepared.value.site.siteId,
      theme: prepared.value.site.theme.family,
      domain: prepared.value.site.domain,
      subtype: prepared.value.site.subtype || undefined,
      candidateId:
        prepared.value.site.generation?.selectedCandidateId || undefined,
      themeStyle: prepared.value.themeStyle,
      sections: prepared.value.sections.map(
        ({ section, component, props }) => ({
          id: section.id,
          componentId: component.registry.id,
          componentVersion: component.registry.version,
          props: normalizeProps(props),
        }),
      ),
      seo: prepared.value.seo,
    });
  } catch (error) {
    if (error instanceof PublishApiError) {
      return Response.json(
        {
          ok: false,
          issues: [{ code: error.code, message: error.message }],
        },
        { status: error.status },
      );
    }
    return Response.json(
      {
        ok: false,
        issues: [
          {
            code: "PREVIEW_FAILED",
            message:
              error instanceof Error
                ? error.message
                : "Preview rendering failed.",
          },
        ],
      },
      { status: 500 },
    );
  }
}

async function resolvePreviewBrandMark(request: Request, site: Site) {
  if (!site.theme.brand.logoAssetId?.trim()) return undefined;

  // Global curated assets contain no tenant-owned data and are safe to resolve
  // before authentication. Workspace assets require an owned saved draft.
  const publicBrandMark = await resolveBrandMarkForSite(site);
  if (publicBrandMark) return publicBrandMark;

  if (process.env.NODE_ENV !== "production") {
    const developmentBrandMark = await resolveBrandMarkForSite(site, {
      allowWorkspaceLocalLookup: true,
    });
    if (developmentBrandMark) return developmentBrandMark;
  }

  await authorizeSavedSite(
    request as Parameters<typeof authorizeSavedSite>[0],
    {
      workspaceId: site.workspaceId,
      siteId: site.siteId,
    },
  );
  return resolvePersistedBrandMarkForSite(site);
}

function bridgeLegacyPreviewComponents(site: Site): Site {
  const next = structuredClone(site);
  for (const page of next.pages) {
    for (const section of page.sections) {
      const family = legacyFamily(section.component.componentId);
      if (family)
        section.component = {
          componentId: sectionDesignId(next.theme.family, family, 1),
          version: "1.0.0",
        };
    }
  }
  return next;
}

function legacyFamily(componentId: string): SectionFamily | undefined {
  const value = componentId.toLowerCase();
  const families: SectionFamily[] = [
    "navbar",
    "hero",
    "about",
    "services",
    "features",
    "process",
    "testimonials",
    "gallery",
    "team",
    "cta",
    "contact",
    "footer",
  ];
  return families.find(
    (family) =>
      value === `${family}.placeholder` || value.startsWith(`${family}.`),
  );
}

function normalizeProps(props: Record<string, unknown>) {
  const title =
    stringValue(props.title) ??
    stringValue(props.heading) ??
    "Untitled section";
  const description = stringValue(props.description) ?? stringValue(props.body);
  const image = resolveImage(props.image);
  const items = Array.isArray(props.items)
    ? props.items.map((item) => normalizeItemImage(item))
    : props.items;
  return {
    ...props,
    title,
    ...(description ? { description } : {}),
    ...(image ? { image } : {}),
    ...(Array.isArray(items) ? { items } : {}),
  };
}

function normalizeItemImage(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const item = value as Record<string, unknown>;
  const image = resolveImage(item.image);
  return image ? { ...item, image } : item;
}

function resolveImage(
  value: unknown,
):
  | { src: string; alt: string; focalPoint?: { x: number; y: number } }
  | undefined {
  if (typeof value === "string" && value.trim()) {
    return { src: value.trim(), alt: "" };
  }
  if (!value || typeof value !== "object") return undefined;
  const record = value as {
    assetId?: unknown;
    src?: unknown;
    originalUrl?: unknown;
    alt?: unknown;
    focalPoint?: unknown;
  };
  const asset =
    typeof record.assetId === "string"
      ? demoAssetById(record.assetId)
      : undefined;
  const source =
    asset?.originalUrl ??
    (typeof record.src === "string" && record.src.trim()
      ? record.src.trim()
      : typeof record.originalUrl === "string" && record.originalUrl.trim()
        ? record.originalUrl.trim()
        : undefined);
  if (!source) return undefined;
  const focalPoint = point(record.focalPoint) ?? asset?.focalPoint;
  return {
    src: source,
    alt:
      typeof record.alt === "string"
        ? record.alt
        : (asset?.alt ?? "Website image"),
    ...(focalPoint ? { focalPoint } : {}),
  };
}

function point(value: unknown): { x: number; y: number } | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as { x?: unknown; y?: unknown };
  if (typeof record.x !== "number" || typeof record.y !== "number")
    return undefined;
  return {
    x: Math.min(1, Math.max(0, record.x)),
    y: Math.min(1, Math.max(0, record.y)),
  };
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}
