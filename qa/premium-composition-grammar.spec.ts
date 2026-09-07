import { expect, test } from "@playwright/test";
import { applyPremiumCompositionGrammar, evaluatePremiumCompositionGrammar } from "../apps/builder/app/premium-composition-grammar";

function siteWithFamilies(families: string[], locked = false) {
  return {
    schemaVersion: "1.0.0",
    siteId: "site-1",
    workspaceId: "workspace-1",
    name: "Pearl Dental",
    domain: "clinic",
    theme: {
      family: "minimalist",
      modifiers: [],
      brand: {
        colors: {
          primary: "#123B4A", secondary: "#6B8C94", accent: "#2A9D8F", background: "#F8FBFA", surface: "#FFFFFF",
          textPrimary: "#17313A", textSecondary: "#52646B", border: "#D8E1E1", success: "#2D7D5D", warning: "#A36316", error: "#A33A3A",
        },
        typography: { display: "DM Serif Display", body: "Inter", ui: "Inter" },
        density: "spacious",
        shape: "balanced",
        motion: "subtle",
      },
    },
    seoBlueprint: { primaryGoal: "Book appointments", targetLocations: [], priorityTopics: [], audiences: [], languages: ["en"], localSeo: false, servicePages: true, locationPages: false, blog: false },
    pages: [{
      id: "home", path: "/", name: "Home",
      seo: { title: "Pearl Dental", description: "Pearl Dental", canonicalPath: "/", indexable: true, structuredDataTypes: [] },
      sections: families.map((family, index) => ({
        id: `${family}-${index}`,
        hidden: false,
        component: { componentId: `${family}.placeholder`, version: "1.0.0" },
        props: locked && family !== "navbar" && family !== "footer" ? { layoutVisualLock: true, layoutBlueprintId: "dental-certified" } : {},
        bindings: {},
      })),
    }],
    navigation: [{ label: "Home", href: "/" }],
    integrations: [],
    domains: [],
  } as any;
}

function contentFamilies(site: any) {
  return site.pages[0].sections
    .map((section: any) => section.component.componentId.replace(".placeholder", ""))
    .filter((family: string) => family !== "navbar" && family !== "footer");
}

test("grammar moves hero first and conversion to the tail", () => {
  const source = siteWithFamilies(["navbar", "services", "hero", "cta", "about", "features", "contact", "footer"]);
  const result = applyPremiumCompositionGrammar(source);
  expect(result.changed).toBe(true);
  expect(contentFamilies(result.site)).toEqual(["hero", "about", "services", "features", "cta", "contact"]);
  expect(result.ready).toBe(true);
});

test("grammar breaks a three-section dense card/grid run when a narrative breaker exists", () => {
  const source = siteWithFamilies(["hero", "services", "features", "team", "process", "cta", "contact"]);
  const result = applyPremiumCompositionGrammar(source);
  expect(result.ready).toBe(true);
  expect(contentFamilies(result.site).slice(0, 5)).toEqual(["hero", "team", "services", "features", "process"]);
  expect(evaluatePremiumCompositionGrammar(result.site).some((issue) => issue.code === "DENSE_SECTION_RUN")).toBe(false);
});

test("grammar reports repetitive dense runs when no breaker can repair them", () => {
  const source = siteWithFamilies(["hero", "services", "features", "team", "gallery", "cta", "contact"]);
  const result = applyPremiumCompositionGrammar(source);
  expect(result.ready).toBe(false);
  expect(result.issues.some((issue) => issue.code === "DENSE_SECTION_RUN")).toBe(true);
});

test("render-certified blueprint locks are validated but never reordered", () => {
  const source = siteWithFamilies(["services", "hero", "features", "team", "cta", "contact"], true);
  const result = applyPremiumCompositionGrammar(source);
  expect(result.changed).toBe(false);
  expect(contentFamilies(result.site)).toEqual(["services", "hero", "features", "team", "cta", "contact"]);
  expect(result.issues.some((issue) => issue.code === "HERO_NOT_FIRST")).toBe(true);
});
