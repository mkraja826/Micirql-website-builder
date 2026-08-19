import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { siteSchema } from "@micirql/schema";
import { persistFirstScreenRepair, persistedFirstScreenRepairCss } from "../apps/builder/app/persisted-first-screen-repair";
import { planRenderedFirstScreenRepair } from "../apps/builder/app/rendered-first-screen-repair";

function baseSite() {
  return siteSchema.parse({
    siteId: "site-1",
    workspaceId: "workspace-1",
    name: "Aurelia Dental",
    theme: {
      family: "clinical",
      brand: {
        colors: {
          primary: "#111111", secondary: "#eeeeee", accent: "#777777", background: "#ffffff",
          surface: "#f7f7f7", textPrimary: "#111111", textSecondary: "#555555", border: "#dddddd",
        },
        typography: { display: "Inter", body: "Inter", ui: "Inter" },
        density: "comfortable", shape: "balanced", motion: "subtle",
      },
    },
    seoBlueprint: { targetLocations: [], priorityTopics: [] },
    pages: [{
      id: "home", name: "Home", path: "/", seo: { title: "Aurelia Dental", description: "Dental care" },
      sections: [
        { id: "nav", hidden: false, component: { componentId: "DENTAL-NAV-01", version: "1" }, props: {} },
        { id: "hero", hidden: false, component: { componentId: "DENTAL-HERO-01", version: "1" }, props: { title: "Dental implants planned around you" } },
      ],
    }],
  });
}

test("successful first-screen repair persists on the hero and survives schema parsing", () => {
  const plan = planRenderedFirstScreenRepair({ width: 390, failures: ["headline-too-small:24px<28px"] });
  expect(plan.required).toBe(true);
  const repaired = persistFirstScreenRepair(baseSite(), plan);
  const reparsed = siteSchema.parse(JSON.parse(JSON.stringify(repaired)));
  expect(persistedFirstScreenRepairCss(reparsed, "mobile")).toContain("28px");
  const hero = reparsed.pages[0]!.sections.find((section) => section.id === "hero")!;
  expect((hero.props as any).renderedFirstScreenRepairs.mobile.operations).toContain("increase-headline-scale");
});

test("repair metadata remains viewport-specific", () => {
  const mobile = planRenderedFirstScreenRepair({ width: 390, failures: ["headline-too-small:24px<28px"] });
  const desktop = planRenderedFirstScreenRepair({ width: 1440, failures: ["navbar-too-tall:140px>116px"] });
  const site = persistFirstScreenRepair(persistFirstScreenRepair(baseSite(), mobile), desktop);
  expect(persistedFirstScreenRepairCss(site, "mobile")).toContain("28px");
  expect(persistedFirstScreenRepairCss(site, "desktop")).toContain("104px");
  expect(persistedFirstScreenRepairCss(site, "tablet")).toBe("");
});

test("RendererPreview consumes persisted repair CSS from the saved site", () => {
  const renderer = readFileSync("apps/builder/app/renderer-preview.tsx", "utf8");
  expect(renderer).toContain("persistedFirstScreenRepairCss(site, viewport, path)");
  expect(renderer).toContain("data-mi-persisted-first-screen-repair");
  expect(renderer).toContain("data-mi-first-screen-repair={repairCss ? \"1\" : undefined}");
});
