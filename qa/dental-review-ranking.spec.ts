import { expect, test } from "@playwright/test";
import { buildCertifiedDentalReviewDirections } from "../apps/builder/app/dental-review-directions";
import { SCHEMA_VERSION, siteSchema } from "@micirql/schema";

const baseSite = siteSchema.parse({
  schemaVersion: SCHEMA_VERSION,
  siteId: "aurelia-ranking-test",
  workspaceId: "qa-dental-ranking",
  name: "Aurelia Dental",
  domain: "clinic",
  theme: {
    family: "corporate",
    modifiers: [],
    brand: {
      colors: {
        primary: "#132238",
        secondary: "#e9eef3",
        accent: "#b89b67",
        background: "#ffffff",
        surface: "#f6f7f8",
        textPrimary: "#111827",
        textSecondary: "#5b6470",
        border: "#d9dde3",
        success: "#16794b",
        warning: "#a16207",
        error: "#b42318",
      },
      typography: { display: "Inter", body: "Inter", ui: "Inter" },
      density: "comfortable",
      shape: "balanced",
      motion: "subtle",
    },
  },
  seoBlueprint: {
    primaryGoal: "Book dental implant consultations",
    targetLocations: ["Hyderabad"],
    priorityTopics: ["dental implants", "smile design"],
    audiences: ["implant patients"],
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
    seo: {
      title: "Aurelia Dental | Premium Implant Dentistry",
      description: "Premium dental implants, cosmetic dentistry and smile transformation in Hyderabad.",
      canonicalPath: "/",
      indexable: true,
      structuredDataTypes: ["Dentist"],
    },
    sections: [
      { id: "nav", hidden: false, component: { componentId: "ORG-NAV-001", version: "1" }, props: { title: "Aurelia Dental" } },
      { id: "hero", hidden: false, component: { componentId: "ORG-HERO-001", version: "1" }, props: { title: "Premium implant dentistry in Hyderabad", description: "Dental implants, cosmetic dentistry and full-mouth rehabilitation." } },
      { id: "services", hidden: false, component: { componentId: "ORG-SERV-001", version: "1" }, props: { title: "Treatments" } },
      { id: "team", hidden: false, component: { componentId: "ORG-TEAM-001", version: "1" }, props: { title: "Doctors" } },
      { id: "features", hidden: false, component: { componentId: "ORG-FEAT-001", version: "1" }, props: { title: "Technology" } },
      { id: "process", hidden: false, component: { componentId: "ORG-PROC-001", version: "1" }, props: { title: "Treatment journey" } },
      { id: "testimonials", hidden: false, component: { componentId: "ORG-TEST-001", version: "1" }, props: { title: "Patient stories" } },
      { id: "cta", hidden: false, component: { componentId: "ORG-CTA-001", version: "1" }, props: { title: "Book a consultation" } },
      { id: "contact", hidden: false, component: { componentId: "ORG-CONT-001", version: "1" }, props: { title: "Contact" } },
      { id: "footer", hidden: false, component: { componentId: "ORG-FOOT-001", version: "1" }, props: { title: "Aurelia Dental" } },
    ],
  }],
  navigation: [
    { label: "Home", href: "/" },
    { label: "Treatments", href: "/#treatments" },
    { label: "Contact", href: "/#contact" },
  ],
});

test("Aurelia premium implant brief ranks an implant-specialist direction first", () => {
  const directions = buildCertifiedDentalReviewDirections(baseSite, {
    business_name: "Aurelia Dental",
    industry: "dental clinic",
    subindustry: "implant dentistry",
    goals: ["implant consultation", "book appointment", "show outcomes"],
    style_tags: ["premium", "luxury", "editorial", "modern", "trustworthy"],
    services: ["dental implants", "cosmetic dentistry", "smile design", "full-mouth rehabilitation", "crowns", "veneers"],
    required_capabilities: ["appointment booking", "whatsapp", "before and after gallery", "testimonials"],
    notes: "High-end private dental clinic in Hyderabad focused mainly on dental implants and smile transformation.",
  }, 8);

  expect(directions.length).toBeGreaterThan(0);
  expect(directions[0]?.name).toMatch(/^Implant (Atelier|Results)/);
  expect(directions[0]?.id).toMatch(/dental-(02-implant-luxury|13-implant-results)/);
  expect(directions[0]?.reasons.some((reason) => /implant dentistry match/i.test(reason))).toBeTruthy();
});
