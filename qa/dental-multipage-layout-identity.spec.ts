import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { siteSchema, type Site } from "@micirql/schema";
import { applyDentalMultipageLayoutIdentity } from "../apps/builder/app/dental-multipage-layout-identity";
import { applyDentalMultipageMediaSafety } from "../apps/builder/app/dental-multipage-media-safety";

function site(): Site {
  return siteSchema.parse({
    schemaVersion: "1.0.0",
    siteId: "layout-identity-site",
    workspaceId: "layout-identity-workspace",
    name: "Aurelia Dental",
    domain: "clinic",
    subtype: "dental",
    theme: {
      family: "minimalist",
      modifiers: ["light"],
      brand: {
        colors: {
          primary: "#302b63", secondary: "#514a9d", accent: "#7259d9",
          background: "#ffffff", surface: "#f7f7fb", textPrimary: "#18171f",
          textSecondary: "#5e5b68", border: "#d9d7e2", success: "#147a48",
          warning: "#9a6700", error: "#b42318",
        },
        typography: { display: "Manrope", body: "Inter", ui: "Inter" },
        density: "comfortable",
        shape: "balanced",
        motion: "subtle",
      },
    },
    seoBlueprint: {
      primaryGoal: "appointments", targetLocations: [], priorityTopics: ["dental implants"],
      audiences: ["patients"], languages: ["en"], localSeo: true,
      servicePages: true, locationPages: false, blog: false,
    },
    pages: [
      {
        id: "home", path: "/", name: "Home",
        seo: { title: "Aurelia Dental", description: "Dental care.", canonicalPath: "/", indexable: true, structuredDataTypes: ["Organization"] },
        sections: [section("home-nav", "MIN-NAV-001", {
          title: "Aurelia Dental",
          layoutBlueprintId: "dental-02-implant-luxury",
          layoutArchetype: "minimal-premium",
          layoutDensity: "balanced",
          layoutImageStyle: "editorial-clinical",
          layoutRhythm: "spacious",
          layoutRadius: "rounded",
          layoutPaletteIds: ["premium-neutral"],
          layoutTypographyIds: ["premium-editorial"],
          layoutVisualLocked: true,
          layoutMobileRules: ["stack hero intentionally"],
          layoutSectionId: "navbar",
          layoutPattern: "premium-shell",
        }), section("home-hero", "MIN-HERO-002", { title: "Dental implants", image: { src: "https://images.example/implant.jpg", alt: "Implant consultation" } })],
      },
      {
        id: "treatment-implant", path: "/treatments/dental-implants", name: "Dental Implants",
        seo: { title: "Dental Implants", description: "Implant assessment.", canonicalPath: "/treatments/dental-implants", indexable: true, structuredDataTypes: ["Organization", "BreadcrumbList"] },
        sections: [section("implant-hero", "MIN-HERO-002", { title: "Implant assessment", eyebrow: "Dental Implants", imageSlotMode: "section", layoutBlueprintId: "dental-01-clinical-authority", layoutArchetype: "stale-archetype" }), section("implant-faq", "MIN-FAQ-002", { title: "Questions", items: [{ title: "How is suitability assessed?", description: "After clinical assessment." }] })],
      },
      {
        id: "contact", path: "/contact", name: "Contact",
        seo: { title: "Contact", description: "Contact Aurelia Dental.", canonicalPath: "/contact", indexable: true, structuredDataTypes: ["Organization"] },
        sections: [section("contact-hero", "MIN-HERO-003", { title: "Contact" })],
      },
    ],
    navigation: [{ label: "Home", href: "/" }],
    integrations: [], domains: [],
  });
}

function section(id: string, componentId: string, props: Record<string, unknown>) {
  return { id, component: { componentId, version: "1.0.0" }, props, bindings: {}, hidden: false };
}

test("generated treatment and contact pages inherit the selected homepage blueprint identity", () => {
  const result = applyDentalMultipageLayoutIdentity(site());
  expect(result.applied).toBe(true);
  expect(result.layoutBlueprintId).toBe("dental-02-implant-luxury");
  expect(result.pagesUpdated).toBe(2);

  for (const page of result.site.pages.filter((entry) => entry.path !== "/")) {
    for (const item of page.sections) {
      expect(item.props.layoutBlueprintId).toBe("dental-02-implant-luxury");
      expect(item.props.layoutArchetype).toBe("minimal-premium");
      expect(item.props.layoutRhythm).toBe("spacious");
      expect(item.props.layoutVisualLocked).toBe(true);
      expect(item.props.layoutMobileRules).toEqual(["stack hero intentionally"]);
      expect(item.props.layoutSectionId).toBeUndefined();
      expect(item.props.layoutPattern).toBeUndefined();
    }
  }
});

test("homepage identity overwrites stale secondary-page blueprint metadata after design changes", () => {
  const result = applyDentalMultipageLayoutIdentity(site());
  const implantHero = result.site.pages.find((page) => page.path === "/treatments/dental-implants")?.sections.find((item) => item.id === "implant-hero");
  expect(implantHero?.props.layoutBlueprintId).toBe("dental-02-implant-luxury");
  expect(implantHero?.props.layoutArchetype).toBe("minimal-premium");
  expect(JSON.stringify(implantHero?.props)).not.toContain("stale-archetype");
});

test("the media-safety pass preserves blueprint identity before treatment image decisions", () => {
  const result = applyDentalMultipageMediaSafety(site());
  expect(result.preservedBlueprintIdentity).toBe(true);
  expect(result.layoutIdentityPages).toBe(2);
  const implant = result.site.pages.find((page) => page.path === "/treatments/dental-implants");
  expect(implant?.sections.every((item) => item.props.layoutBlueprintId === "dental-02-implant-luxury")).toBe(true);
});

test("Builder Preview exposes the same layout identity attributes used by published rendering", async () => {
  const [preview, liveRenderer, styles] = await Promise.all([
    readFile("apps/builder/app/renderer-preview.tsx", "utf8"),
    readFile("packages/renderer/src/render.tsx", "utf8"),
    readFile("packages/sections/src/dental-layout-blueprints.css", "utf8"),
  ]);
  expect(preview).toContain('data-mi-layout-blueprint={layoutBlueprintId}');
  expect(preview).toContain('data-mi-layout-archetype={layoutArchetype}');
  expect(preview).toContain('sectionStringProp(preview.sections, "layoutBlueprintId")');
  expect(liveRenderer).toContain("data-mi-layout-blueprint={layoutBlueprintId}");
  expect(styles).toContain('[data-mi-layout-blueprint="dental-01-clinical-authority"]');
});

test("mobile treatment breadcrumbs remain genuine touch targets while FAQ wrapping is not misclassified as CTA wrapping", async () => {
  const [styles, visualSpec] = await Promise.all([
    readFile("packages/sections/src/styles.css", "utf8"),
    readFile("qa/dental-top20-implant-treatment-visual-evidence.spec.ts", "utf8"),
  ]);
  expect(styles).toContain(".mi-breadcrumbs a{display:inline-flex;align-items:center;min-width:44px;min-height:44px");
  expect(visualSpec).toContain('".mi-section__action,.mi-conv-btn,.mi-shell-cta,.mi-section__form button"');
  expect(visualSpec).toContain('"a[href],button,summary,[role=button]"');
});
