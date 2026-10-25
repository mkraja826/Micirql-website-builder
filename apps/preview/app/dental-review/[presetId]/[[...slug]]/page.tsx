import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import {
  createFunctionBindingResolver,
  createStaticRendererRegistry,
  preparePage,
  renderPreparedPage,
} from "@micirql/renderer";
import { SCHEMA_VERSION, siteSchema, type Site } from "@micirql/schema";
import {
  SeedSection,
  seedSectionCatalog,
  seedSectionRegistryEntries,
  type UniversalSectionProps,
} from "@micirql/sections";
import { nativeFunctionCatalog } from "@micirql/functions";
import { applyIndustryPreset } from "../../../../../builder/app/apply-industry-preset";
import { createDentalStructuralScaffold } from "../../../../../builder/app/dental-scaffold";
import { listIndustryDesignPresets } from "../../../../../builder/app/industry-design-preset-data";

const BUSINESS_NAME = "Radhika Dental";
const BUSINESS_LOCATION = "Hyderabad, Telangana";
const REVIEW_LOGO_ASSET_ID = "qa-radhika-dental-logo";

const registry = createStaticRendererRegistry({
  entries: seedSectionRegistryEntries,
  components: Object.fromEntries(
    seedSectionCatalog.map((entry) => {
      const Component: ComponentType<Record<string, unknown>> = (props) => (
        <SeedSection
          family={entry.family}
          theme={entry.theme}
          variant={entry.variant}
          props={props as UniversalSectionProps}
        />
      );
      return [entry.id, Component];
    }),
  ),
});

const functions = createFunctionBindingResolver({
  actionIds: nativeFunctionCatalog.map((definition) => definition.id),
  gatewayBasePath: "https://forms.micirql.com/api/functions",
});

export default async function DentalReviewPage({
  params,
}: {
  params: Promise<{ presetId: string; slug?: string[] }>;
}) {
  const { presetId, slug = [] } = await params;
  const preset = listIndustryDesignPresets("clinic", "dental").find(
    (candidate) => candidate.id === presetId,
  );
  if (!preset) notFound();

  const site = generatedDentalSite(presetId);
  const requestedPath = slug.length ? `/${slug.join("/")}` : "/";
  const prepared = await preparePage({
    site,
    path: requestedPath,
    origin: "https://radhika-dental.micirql.test",
    registry,
    functions,
    mode: "production",
    brandMark: reviewBrandMark(),
  });
  if (!prepared.ok) notFound();

  return (
    <div
      data-mi-dental-review={presetId}
      data-mi-dental-review-path={requestedPath}
    >
      {renderPreparedPage(prepared.value)}
    </div>
  );
}

function generatedDentalSite(presetId: string): Site {
  const preset = listIndustryDesignPresets("clinic", "dental").find(
    (candidate) => candidate.id === presetId,
  );
  if (!preset) notFound();

  const generated = createDentalStructuralScaffold(baseSite(), {
    businessName: BUSINESS_NAME,
    location: BUSINESS_LOCATION,
    services: [
      "Dental implants",
      "Crowns and bridges",
      "Root canal treatment",
      "Clear aligners",
      "Preventive dentistry",
      "Children's dentistry",
    ],
    goals: [
      "Help patients understand treatments and request an appointment",
      "Build confidence before the first visit",
    ],
    languages: ["en"],
    notes:
      "Radhika Dental explains treatment choices clearly and helps patients request the right next step without making unsupported clinical promises.",
  });
  return rewritePreviewLinks(
    siteSchema.parse(applyIndustryPreset(generated, preset)),
    `/dental-review/${presetId}`,
  );
}

function rewritePreviewLinks(site: Site, routePrefix: string): Site {
  const next = structuredClone(site);
  next.navigation = next.navigation.map((item) => ({
    ...item,
    href: previewHref(item.href, routePrefix),
  }));
  for (const page of next.pages) {
    for (const section of page.sections) {
      section.props = rewriteValue(section.props, routePrefix) as Record<
        string,
        unknown
      >;
    }
  }
  return siteSchema.parse(next);
}

function rewriteValue(value: unknown, routePrefix: string): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => rewriteValue(item, routePrefix));
  }
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      key === "href" && typeof item === "string"
        ? previewHref(item, routePrefix)
        : rewriteValue(item, routePrefix),
    ]),
  );
}

function previewHref(href: string, routePrefix: string) {
  if (href === "/") return routePrefix;
  if (href.startsWith("/") && !href.startsWith("//")) {
    return `${routePrefix}${href}`;
  }
  return href;
}

function baseSite(): Site {
  return siteSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    siteId: "radhika-dental-visual-review",
    workspaceId: "workspace-dental-visual-review",
    name: BUSINESS_NAME,
    domain: "clinic",
    subtype: "dental",
    theme: {
      family: "minimalist",
      modifiers: ["light", "rounded"],
      brand: {
        logoAssetId: REVIEW_LOGO_ASSET_ID,
        colors: {
          primary: "#155e75",
          secondary: "#0f766e",
          accent: "#d17d62",
          background: "#fbfefd",
          surface: "#eef7f5",
          textPrimary: "#183334",
          textSecondary: "#587070",
          border: "#d0e2df",
          success: "#168a4a",
          warning: "#9a5b00",
          error: "#b42318",
        },
        typography: {
          display: "Candara, Trebuchet MS, Segoe UI, sans-serif",
          body: "Candara, Trebuchet MS, Segoe UI, sans-serif",
          ui: "Segoe UI, Arial, sans-serif",
        },
        density: "comfortable",
        shape: "soft",
        motion: "subtle",
      },
    },
    seoBlueprint: {
      primaryGoal: "Help patients request a dental appointment",
      targetLocations: [BUSINESS_LOCATION],
      priorityTopics: [
        "dental implants",
        "root canal treatment",
        "clear aligners",
      ],
      audiences: ["families", "working professionals"],
      languages: ["en"],
      localSeo: true,
      servicePages: true,
      locationPages: false,
      blog: false,
    },
    pages: [
      {
        id: "home",
        path: "/",
        name: "Home",
        sections: [],
        seo: {
          title: BUSINESS_NAME,
          description: `Dental care in ${BUSINESS_LOCATION}.`,
          canonicalPath: "/",
          indexable: true,
          structuredDataTypes: ["Dentist"],
        },
      },
    ],
    navigation: [{ label: "Home", href: "/" }],
    integrations: [],
    domains: [],
  });
}

function reviewBrandMark() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="88" viewBox="0 0 360 88" role="img" aria-label="${BUSINESS_NAME}"><rect width="88" height="88" rx="24" fill="#0f766e"/><path d="M27 24c5-6 12-8 17-4 5-4 12-2 17 4 8 10 1 36-8 44-4 4-6-9-9-9s-5 13-9 9c-9-8-16-34-8-44Z" fill="#fff"/><text x="108" y="42" fill="#183334" font-family="Segoe UI,Arial,sans-serif" font-size="26" font-weight="700">Radhika Dental</text><text x="109" y="64" fill="#0f766e" font-family="Segoe UI,Arial,sans-serif" font-size="12" font-weight="600" letter-spacing="2">VISUAL REVIEW</text></svg>`;
  return {
    assetId: REVIEW_LOGO_ASSET_ID,
    src: `data:image/svg+xml,${encodeURIComponent(svg)}`,
    alt: `${BUSINESS_NAME} visual review logo`,
    width: 360,
    height: 88,
    aspectRatio: 360 / 88,
  };
}
