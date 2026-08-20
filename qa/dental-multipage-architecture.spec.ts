import { expect, test } from "@playwright/test";
import type { Site } from "@micirql/schema";
import { applyDentalMultipageArchitecture } from "../apps/builder/app/dental-multipage-architecture";
import { evaluateDentalMultipageQuality } from "../apps/builder/app/dental-multipage-quality";
import type { OnboardingProfile } from "../apps/builder/app/preset-ranking";

function site(): Site {
  return {
    schemaVersion: "1.0.0",
    siteId: "site-dental-multipage-test",
    workspaceId: "workspace-test",
    name: "Aurelia Dental",
    domain: "clinic",
    subtype: "dental",
    theme: {
      family: "minimalist",
      modifiers: ["light"],
      brand: {
        colors: {
          primary: "#302b63", secondary: "#514a9d", accent: "#7259d9", background: "#ffffff", surface: "#f7f7fb",
          textPrimary: "#18171f", textSecondary: "#5e5b68", border: "#d9d7e2", success: "#147a48", warning: "#9a6700", error: "#b42318",
        },
        typography: { display: "Manrope", body: "Inter", ui: "Inter" },
        density: "comfortable", shape: "balanced", motion: "subtle",
      },
    },
    seoBlueprint: {
      primaryGoal: "appointments", targetLocations: ["Hyderabad"], priorityTopics: ["dental implants", "clear aligners"], audiences: ["patients"],
      languages: ["en"], localSeo: true, servicePages: true, locationPages: false, blog: false,
    },
    pages: [{
      id: "home", path: "/", name: "Home",
      seo: { title: "Aurelia Dental", description: "Assessment-led dental care and treatment planning.", canonicalPath: "/", indexable: true, structuredDataTypes: ["Organization"] },
      sections: [
        section("nav", "MIN-NAV-001", { title: "Aurelia Dental", items: [{ title: "Home", href: "/" }] }),
        section("hero", "MIN-HERO-001", { title: "Dental care planned around your needs", description: "Clear assessment and treatment planning." }),
        section("services", "MIN-SERV-001", { title: "Treatments", items: [
          { title: "Dental implants", description: "Assessment-led implant planning." },
          { title: "Clear aligners", description: "Orthodontic assessment and alignment planning." },
          { title: "General dentistry", description: "Preventive and restorative dental care." },
        ] }),
        section("process", "MIN-PROC-001", { title: "Your care journey", items: [{ title: "Assessment", description: "Individual clinical assessment." }] }),
        section("contact", "MIN-CONT-001", { title: "Book a consultation", description: "Request an appointment with the clinic." }),
        section("footer", "MIN-FOOT-001", { title: "Aurelia Dental", items: [] }),
      ],
    }],
    navigation: [{ label: "Home", href: "/" }],
    integrations: [], domains: [],
  };
}

function section(id: string, componentId: string, props: Record<string, unknown>) {
  return { id, component: { componentId, version: "1.0.0" }, props, bindings: {}, hidden: false };
}

function profile(overrides: Partial<OnboardingProfile> = {}): OnboardingProfile {
  return {
    business_name: "Aurelia Dental",
    industry: "Dental clinic",
    subindustry: "implant dentistry and orthodontics",
    location: "Hyderabad",
    goals: ["book consultations"],
    services: ["dental implants", "clear aligners"],
    required_capabilities: [], style_tags: ["premium", "clinical"], notes: "Assessment-led care",
    ...overrides,
  };
}

test("explicit Dental treatments become dedicated pages without inventing unrequested specialties", () => {
  const result = applyDentalMultipageArchitecture(site(), profile());
  expect(result.applied).toBe(true);
  expect(result.treatmentPages).toEqual(["/treatments/dental-implants", "/treatments/orthodontics"]);
  expect(result.site.pages.some((page) => page.path === "/contact")).toBe(true);
  expect(result.site.pages.some((page) => page.path === "/treatments/cosmetic-dentistry")).toBe(false);
  expect(result.site.pages.some((page) => page.path === "/treatments/root-canal-treatment")).toBe(false);

  const implant = result.site.pages.find((page) => page.path === "/treatments/dental-implants")!;
  expect(implant.seo.canonicalPath).toBe(implant.path);
  expect(implant.seo.primaryKeyword).toBe("dental implants");
  expect(implant.seo.structuredDataTypes).toContain("BreadcrumbList");
  const hero = implant.sections.find((entry) => entry.component.componentId.includes("-HERO-"))!;
  expect(hero.props.breadcrumbs).toEqual([{ label: "Home", href: "/" }, { label: "Dental Implants", href: implant.path }]);
});

test("homepage treatment cards, global navigation and contact CTAs form a real internal-link graph", () => {
  const result = applyDentalMultipageArchitecture(site(), profile());
  const home = result.site.pages.find((page) => page.path === "/")!;
  const services = home.sections.find((entry) => entry.component.componentId.includes("-SERV-"))!;
  const items = services.props.items as Array<Record<string, unknown>>;
  expect(services.props.sectionAnchor).toBe("treatments");
  expect(items.find((item) => item.title === "Dental implants")?.href).toBe("/treatments/dental-implants");
  expect(items.find((item) => item.title === "Clear aligners")?.href).toBe("/treatments/orthodontics");

  expect(result.site.navigation.map((item) => item.href)).toEqual([
    "/", "/treatments/dental-implants", "/treatments/orthodontics", "/contact",
  ]);
  for (const path of result.treatmentPages) {
    const page = result.site.pages.find((candidate) => candidate.path === path)!;
    expect(JSON.stringify(page.sections)).toContain('"href":"/contact"');
    expect(JSON.stringify(page.sections)).toContain('"href":"/#treatments"');
  }
});

test("whole-site Dental quality gate certifies canonical, breadcrumb, structure and navigation coverage", () => {
  const generated = applyDentalMultipageArchitecture(site(), profile()).site;
  const quality = evaluateDentalMultipageQuality(generated, profile());
  expect(quality.ready).toBe(true);
  expect(quality.score).toBe(100);
  expect(quality.issues).toEqual([]);

  const broken = structuredClone(generated);
  const implant = broken.pages.find((page) => page.path === "/treatments/dental-implants")!;
  implant.seo.canonicalPath = "/wrong-canonical";
  const brokenQuality = evaluateDentalMultipageQuality(broken, profile());
  expect(brokenQuality.ready).toBe(false);
  expect(brokenQuality.issues.some((issue) => issue.code === "PAGE_SEO_INCOMPLETE")).toBe(true);
});

test("general-only Dental briefs and disabled service-page blueprints stay single-page", () => {
  const general = applyDentalMultipageArchitecture(site(), profile({ subindustry: "general dentistry", services: ["general dentistry", "check-ups"], notes: "Family dental care" }));
  expect(general.applied).toBe(false);
  expect(general.site.pages).toHaveLength(1);

  const disabledSite = site();
  disabledSite.seoBlueprint.servicePages = false;
  const disabled = applyDentalMultipageArchitecture(disabledSite, profile());
  expect(disabled.applied).toBe(false);
  expect(disabled.site.pages).toHaveLength(1);
});

test("multi-page generation is idempotent and never duplicates treatment or contact routes", () => {
  const first = applyDentalMultipageArchitecture(site(), profile()).site;
  const second = applyDentalMultipageArchitecture(first, profile()).site;
  const paths = second.pages.map((page) => page.path);
  expect(paths.filter((path) => path === "/treatments/dental-implants")).toHaveLength(1);
  expect(paths.filter((path) => path === "/treatments/orthodontics")).toHaveLength(1);
  expect(paths.filter((path) => path === "/contact")).toHaveLength(1);
});
