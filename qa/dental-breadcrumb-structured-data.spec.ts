import { expect, test } from "@playwright/test";
import type { Site, SitePage } from "@micirql/schema";
import { buildRenderedSeo } from "@micirql/renderer";

function page(): SitePage {
  return {
    id: "treatment-implant",
    path: "/treatments/dental-implants",
    name: "Dental Implants",
    seo: {
      title: "Dental Implants | Aurelia Dental",
      description: "Assessment-led information about dental implant planning and treatment stages.",
      canonicalPath: "/treatments/dental-implants",
      indexable: true,
      primaryKeyword: "dental implants",
      structuredDataTypes: ["Organization", "BreadcrumbList"],
    },
    sections: [
      {
        id: "hero",
        component: { componentId: "MIN-HERO-001", version: "1.0.0" },
        bindings: {}, hidden: false,
        props: {
          title: "Dental implant care begins with assessment",
          breadcrumbs: [
            { label: " Home ", href: "/" },
            { label: " Dental Implants ", href: "/treatments/dental-implants" },
          ],
        },
      },
      {
        id: "faq",
        component: { componentId: "MIN-FAQ-002", version: "1.0.0" },
        bindings: {}, hidden: false,
        props: { title: "Questions", items: [{ title: "How is suitability assessed?", description: "A clinician assesses individual oral health and treatment factors." }] },
      },
    ],
  };
}

function site(treatment: SitePage): Site {
  return {
    schemaVersion: "1.0.0",
    siteId: "site-breadcrumb-test",
    workspaceId: "workspace-test",
    name: "Aurelia Dental",
    domain: "clinic",
    theme: {
      family: "minimalist", modifiers: [],
      brand: {
        colors: { primary: "#302b63", secondary: "#514a9d", accent: "#7259d9", background: "#fff", surface: "#f7f7fb", textPrimary: "#18171f", textSecondary: "#5e5b68", border: "#d9d7e2", success: "#147a48", warning: "#9a6700", error: "#b42318" },
        typography: { display: "Manrope", body: "Inter", ui: "Inter" }, density: "comfortable", shape: "balanced", motion: "subtle",
      },
    },
    seoBlueprint: { primaryGoal: "appointments", targetLocations: [], priorityTopics: [], audiences: [], languages: ["en"], localSeo: true, servicePages: true, locationPages: false, blog: false },
    pages: [treatment],
    navigation: [{ label: "Dental Implants", href: treatment.path }],
    integrations: [], domains: [],
  };
}

function breadcrumbSchema(rendered: ReturnType<typeof buildRenderedSeo>) {
  return rendered.structuredData.find((entry) => entry["@type"] === "BreadcrumbList") as Record<string, unknown> | undefined;
}

test("BreadcrumbList mirrors the exact visible hero breadcrumb order", () => {
  const treatment = page();
  const rendered = buildRenderedSeo(site(treatment), treatment, "https://aurelia.example");
  expect(breadcrumbSchema(rendered)?.itemListElement).toEqual([
    { "@type": "ListItem", position: 1, name: "Home", item: "https://aurelia.example/" },
    { "@type": "ListItem", position: 2, name: "Dental Implants", item: "https://aurelia.example/treatments/dental-implants" },
  ]);
});

test("requested BreadcrumbList without a valid visible breadcrumb trail emits no invented schema", () => {
  const treatment = page();
  treatment.sections[0]!.props.breadcrumbs = [{ label: "Dental Implants", href: treatment.path }];
  const rendered = buildRenderedSeo(site(treatment), treatment, "https://aurelia.example");
  expect(breadcrumbSchema(rendered)).toBeUndefined();
});

test("hidden hero breadcrumbs cannot leak into structured data", () => {
  const treatment = page();
  treatment.sections[0]!.hidden = true;
  const rendered = buildRenderedSeo(site(treatment), treatment, "https://aurelia.example");
  expect(breadcrumbSchema(rendered)).toBeUndefined();
});
