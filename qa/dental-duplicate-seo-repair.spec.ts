import { expect, test } from "@playwright/test";
import { SCHEMA_VERSION, siteSchema } from "@micirql/schema";
import { repairExistingDentalContactPage } from "../apps/builder/app/dental-contact-page-repair";

const colors = {
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
};

function page(path: string, name: string, componentId: string, title = "Pearl Dental Implant Centre") {
  return {
    id: path === "/" ? "home" : path.replace(/^\//, "").replace(/\//g, "-") || "page",
    path,
    name,
    seo: {
      title,
      description: `${name} information and consultation details for Pearl Dental Implant Centre in Hyderabad.`.padEnd(60, "."),
      canonicalPath: path,
      indexable: true,
      primaryKeyword: name.toLowerCase(),
      structuredDataTypes: ["Organization"],
    },
    sections: [
      { id: `${name}-nav`, hidden: false, component: { componentId: "ORG-NAV-001", version: "1" }, props: { title: "Pearl Dental Implant Centre" } },
      { id: `${name}-hero`, hidden: false, component: { componentId, version: "1" }, props: { title: name, description: `${name} at Pearl Dental Implant Centre.` } },
      ...(path === "/contact" ? [{ id: "contact-details", hidden: false, component: { componentId: "ORG-CONT-001", version: "1" }, props: { title: "Contact" } }] : []),
      { id: `${name}-footer`, hidden: false, component: { componentId: "ORG-FOOT-001", version: "1" }, props: { title: "Pearl Dental Implant Centre" } },
    ],
  };
}

test("recovered Dental multipage drafts repair inherited duplicate SEO titles", () => {
  const site = siteSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    siteId: "pearl-duplicate-seo",
    workspaceId: "qa-dental-duplicate-seo",
    name: "Pearl Dental Implant Centre",
    domain: "clinic",
    theme: {
      family: "corporate",
      modifiers: [],
      brand: {
        colors,
        typography: { display: "Inter", body: "Inter", ui: "Inter" },
        density: "comfortable",
        shape: "balanced",
        motion: "subtle",
      },
    },
    seoBlueprint: {
      primaryGoal: "Book dental implant consultations",
      targetLocations: ["Hyderabad"],
      priorityTopics: ["dental implants", "full-mouth rehabilitation", "cosmetic dentistry", "root canal treatment"],
      audiences: ["implant patients"],
      languages: ["en"],
      localSeo: true,
      servicePages: true,
      locationPages: false,
      blog: false,
    },
    pages: [
      page("/", "Home", "ORG-HERO-001"),
      page("/treatments/dental-implants", "Dental Implants", "ORG-HERO-001"),
      page("/treatments/full-mouth-rehabilitation", "Full-Mouth Rehabilitation", "ORG-HERO-001"),
      page("/treatments/cosmetic-dentistry", "Cosmetic Dentistry", "ORG-HERO-001"),
      page("/treatments/root-canal-treatment", "Root Canal Treatment", "ORG-HERO-001"),
      page("/contact", "Contact", "ORG-HERO-001"),
    ],
    navigation: [
      { label: "Home", href: "/" },
      { label: "Contact", href: "/contact" },
    ],
  });

  const before = site.pages.map((entry) => entry.seo.title);
  expect(new Set(before).size).toBe(1);

  const repaired = repairExistingDentalContactPage(site);
  expect(repaired.repaired).toBe(true);

  const titles = repaired.site.pages.map((entry) => entry.seo.title);
  expect(new Set(titles.map((title) => title.toLowerCase())).size).toBe(titles.length);
  expect(repaired.site.pages.find((entry) => entry.path === "/")?.seo.title).toBe("Pearl Dental Implant Centre");
  expect(titles.every((title) => title.length <= 70)).toBe(true);
  expect(repaired.site.pages.find((entry) => entry.path === "/contact")?.seo.canonicalPath).toBe("/contact");
});
