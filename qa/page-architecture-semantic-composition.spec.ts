import { expect, test } from "@playwright/test";
import type { Site } from "@micirql/schema";
import { applyPageArchitecture, planPageArchitecture } from "../apps/builder/app/page-architecture-intelligence";

function section(id: string, componentId: string, props: Record<string, unknown> = {}) {
  return { id, component: { componentId, version: "1.0.0" }, props, bindings: {}, hidden: false };
}

function site(): Site {
  return {
    schemaVersion: "1.0.0",
    siteId: "site-semantic-composition",
    workspaceId: "workspace-semantic-composition",
    name: "Pearl Dental",
    domain: "clinic",
    subtype: "dental",
    theme: {
      family: "minimalist",
      modifiers: ["light", "motion-subtle"],
      brand: {
        colors: {
          primary: "#315f68",
          secondary: "#6f8f8c",
          accent: "#b88b5a",
          background: "#ffffff",
          surface: "#f7faf9",
          textPrimary: "#172326",
          textSecondary: "#58686b",
          border: "#d9e2e1",
          success: "#147a48",
          warning: "#9a6700",
          error: "#b42318",
        },
        typography: { display: "Manrope", body: "Inter", ui: "Inter" },
        density: "comfortable",
        shape: "balanced",
        motion: "subtle",
      },
    },
    seoBlueprint: {
      primaryGoal: "appointments",
      targetLocations: ["Hyderabad"],
      priorityTopics: ["dental implants", "family dentistry"],
      audiences: ["patients"],
      languages: ["en"],
      localSeo: true,
      servicePages: true,
      locationPages: false,
      blog: false,
    },
    pages: [{
      id: "home",
      path: "/",
      name: "Home",
      seo: { title: "Pearl Dental", description: "Dental care", canonicalPath: "/", indexable: true, structuredDataTypes: ["Organization"] },
      sections: [
        section("nav", "MIN-NAV-001"),
        section("hero", "MIN-HERO-001", { title: "Pearl Dental" }),
        section("about", "MIN-ABOUT-001", { title: "About Pearl Dental" }),
        section("services", "MIN-SERV-001", { title: "Treatments", items: [{ title: "Dental implants" }, { title: "Family dentistry" }] }),
        section("features", "MIN-FEAT-001", { title: "Why choose us" }),
        section("process", "MIN-PROC-001", { title: "Your visit" }),
        section("testimonials", "MIN-TEST-001", { title: "Patient stories" }),
        section("gallery", "MIN-GALL-001", { title: "Results" }),
        section("team", "MIN-TEAM-001", { title: "Doctors" }),
        section("cta", "MIN-CTA-001", { title: "Book" }),
        section("contact", "MIN-CONT-001", { title: "Contact" }),
        section("footer", "MIN-FOOT-001"),
      ],
    }],
    navigation: [{ label: "Home", href: "/" }],
    integrations: [],
    domains: [],
  };
}

function build() {
  const plan = planPageArchitecture({
    businessName: "Pearl Dental",
    industry: "Dental clinic",
    subindustry: "family and implant dentistry",
    location: "Hyderabad",
    services: ["Dental implants", "Family dentistry"],
    goals: ["book appointments", "rank in search"],
    requiredCapabilities: ["gallery"],
    notes: "Premium reassuring family care with treatment pages",
  });
  return applyPageArchitecture(site(), plan);
}

test("secondary pages select components from semantic registry intent instead of fixed role variants", () => {
  const generated = build();
  const about = generated.pages.find((page) => page.path === "/about")!;
  const detail = generated.pages.find((page) => page.path === "/services/dental-implants")!;

  const aboutHero = about.sections.find((entry) => entry.component.componentId.includes("-HERO-"))!;
  const detailHero = detail.sections.find((entry) => entry.component.componentId.includes("-HERO-"))!;

  expect(aboutHero.component.componentId).toBe("MIN-HERO-002");
  expect(detailHero.component.componentId).toBe("MIN-HERO-005");
  expect(aboutHero.props.pageRole).toBe("about");
  expect(detailHero.props.pageRole).toBe("service-detail");
});

test("semantic composition is deterministic for the same brief and theme", () => {
  const first = build();
  const second = build();
  const signature = (value: Site) => value.pages.map((page) => ({ path: page.path, components: page.sections.map((entry) => entry.component.componentId) }));
  expect(signature(second)).toEqual(signature(first));
});

test("semantic composition keeps canonical theme-family component IDs and the existing safe page journey", () => {
  const generated = build();
  const services = generated.pages.find((page) => page.path === "/services")!;
  const ids = services.sections.map((entry) => entry.component.componentId);

  expect(ids.every((id) => id.startsWith("MIN-"))).toBe(true);
  expect(ids.some((id) => id.includes("-NAV-"))).toBe(true);
  expect(ids.some((id) => id.includes("-HERO-"))).toBe(true);
  expect(ids.some((id) => id.includes("-SERV-"))).toBe(true);
  expect(ids.some((id) => id.includes("-PROC-"))).toBe(true);
  expect(ids.some((id) => id.includes("-CTA-"))).toBe(true);
  expect(ids.some((id) => id.includes("-FOOT-"))).toBe(true);
});
