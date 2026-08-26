import { expect, test } from "@playwright/test";
import { evaluateFlagshipVisualQuality, evaluatePremiumQualityGate } from "@micirql/design-engine";

const section = (id: string, componentId: string, props: Record<string, unknown> = {}) => ({
  id,
  component: { componentId, version: "1.0.0" },
  props,
  bindings: {},
  hidden: false,
});

test("quality gates recognize canonical MIN runtime family codes", () => {
  const site = {
    schemaVersion: "1.0.0",
    siteId: "quality-runtime-family-regression",
    workspaceId: "quality-runtime-family-regression",
    name: "Pearl Dental",
    domain: "clinic",
    subtype: "family-dental",
    theme: {
      family: "minimalist",
      modifiers: ["light"],
      brand: {
        colors: {
          primary: "#0B3B4A",
          secondary: "#153C4A",
          accent: "#1B8A8F",
          background: "#FAFCFC",
          surface: "#FFFFFF",
          textPrimary: "#102A32",
          textSecondary: "#536A70",
          border: "#D8E4E5",
          success: "#168A4A",
          warning: "#AD6A00",
          error: "#C93636",
        },
        typography: { display: "Manrope", body: "Inter", ui: "Inter" },
        density: "comfortable",
        shape: "balanced",
        motion: "subtle",
      },
    },
    seoBlueprint: {
      primaryGoal: "Request appointments",
      targetLocations: [],
      priorityTopics: [],
      audiences: [],
      languages: ["en"],
      localSeo: false,
      servicePages: true,
      locationPages: false,
      blog: false,
    },
    pages: [{
      id: "home",
      path: "/",
      name: "Home",
      seo: { title: "Pearl Dental", description: "Family dental care website.", canonicalPath: "/", indexable: true, structuredDataTypes: [] },
      sections: [
        section("nav", "MIN-NAV-003"),
        section("hero", "MIN-HERO-004", { title: "Pearl Dental family dentistry", image: "/images/dental-hero.webp", primaryAction: { label: "Book appointment", href: "#contact" } }),
        section("gallery", "MIN-GALL-002", { image: "/images/clinic.webp" }),
        section("services", "MIN-SERV-003", { image: "/images/treatment.webp" }),
        section("team", "MIN-TEAM-002"),
        section("testimonials", "MIN-TEST-002"),
        section("process", "MIN-PROC-003"),
        section("cta", "MIN-CTA-002", { primaryAction: { label: "Book appointment", href: "#contact" }, paletteRole: "primary" }),
        section("contact", "MIN-CONT-002", { primaryAction: { label: "Send request", href: "#contact-form" }, paletteRole: "background" }),
        section("footer", "MIN-FOOT-005"),
      ],
    }],
    navigation: [{ label: "Home", href: "/" }],
    integrations: [],
    domains: [],
  } as any;

  const flagship = evaluateFlagshipVisualQuality(site);
  const premium = evaluatePremiumQualityGate(site);

  expect(flagship.metrics.firstFourFamilies).toEqual(["hero", "gallery", "services", "team"]);
  expect(flagship.metrics.distinctFamilies).toBeGreaterThanOrEqual(6);
  expect(flagship.blockers.map((issue) => issue.code)).not.toContain("FLAGSHIP_LOW_COMPOSITION_DIVERSITY");
  expect(flagship.metrics.contentSections).toBe(8);
  expect(premium.metrics.homeVisibleSections).toBe(10);
  expect(premium.metrics.homeContentSections).toBe(8);
});
