import { expect, test } from "@playwright/test";
import { SCHEMA_VERSION, siteSchema, type Site } from "@micirql/schema";
import { applyPremiumCorrectivePass } from "../apps/builder/app/premium-corrective-pass";

type SiteSection = Site["pages"][number]["sections"][number];

function section(id: string, family: string, props: Record<string, unknown> = {}): SiteSection {
  return {
    id,
    component: { componentId: `${family}.planner-v1`, version: "1.0.0" },
    props,
    bindings: {},
    hidden: false,
  };
}

function buildLockedSite(): Site {
  return siteSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    siteId: "certified-visual-lock-regression",
    workspaceId: "certified-visual-lock-qa",
    name: "Harbor Dental Care",
    domain: "clinic",
    subtype: "dental",
    theme: {
      family: "minimalist",
      modifiers: ["light"],
      brand: {
        colors: {
          primary: "#315E62",
          secondary: "#173B40",
          accent: "#C49A64",
          background: "#FFFFFF",
          surface: "#F3F7F6",
          textPrimary: "#FFFFFF",
          textSecondary: "#FDFDFD",
          border: "#D8E2E0",
          success: "#167A55",
          warning: "#9A6500",
          error: "#B42318"
        },
        typography: { display: "Inter", body: "Inter", ui: "Inter" },
        density: "comfortable",
        shape: "balanced",
        motion: "subtle"
      }
    },
    seoBlueprint: {
      primaryGoal: "Book dental appointments",
      targetLocations: ["Hyderabad"],
      priorityTopics: ["Preventive dentistry"],
      audiences: ["Dental patients"],
      languages: ["en"],
      localSeo: true,
      servicePages: true,
      locationPages: false,
      blog: false
    },
    pages: [{
      id: "home",
      path: "/",
      name: "Home",
      sections: [
        section("global-navbar", "navbar", { brandName: "Harbor Dental Care" }),
        section("hero", "hero", {
          heading: "Dental care in Hyderabad",
          paletteRole: "secondary",
          cardPaletteRole: "surface",
          ctaPaletteRole: "accent",
          layoutVisualLock: true,
          layoutBlueprintId: "dental-01-clinical-authority",
          layoutSectionId: "hero"
        }),
        section("services-a", "services", {
          heading: "Treatments",
          paletteRole: "primary",
          cardPaletteRole: "background",
          ctaPaletteRole: "accent",
          layoutVisualLock: true,
          layoutBlueprintId: "dental-01-clinical-authority",
          layoutSectionId: "services-a"
        }),
        section("services-b", "services", {
          heading: "Specialist care",
          paletteRole: "accent",
          cardPaletteRole: "surface",
          ctaPaletteRole: "secondary",
          layoutVisualLock: true,
          layoutBlueprintId: "dental-01-clinical-authority",
          layoutSectionId: "services-b"
        }),
        section("cta", "cta", {
          heading: "Book a consultation",
          paletteRole: "secondary",
          cardPaletteRole: "background",
          ctaPaletteRole: "accent",
          layoutVisualLock: true,
          layoutBlueprintId: "dental-01-clinical-authority",
          layoutSectionId: "cta"
        }),
        section("global-footer", "footer", { brandName: "Harbor Dental Care" })
      ],
      seo: {
        title: "Harbor Dental Care | Hyderabad",
        description: "Dental care in Hyderabad.",
        canonicalPath: "/",
        indexable: true,
        primaryKeyword: "dentist Hyderabad",
        structuredDataTypes: ["Dentist", "MedicalClinic"]
      }
    }],
    navigation: [{ label: "Home", href: "/" }],
    integrations: [],
    domains: []
  });
}

function visualFingerprint(section: SiteSection) {
  return {
    componentId: section.component.componentId,
    paletteRole: section.props.paletteRole,
    cardPaletteRole: section.props.cardPaletteRole,
    ctaPaletteRole: section.props.ctaPaletteRole,
    layoutVisualLock: section.props.layoutVisualLock,
    layoutBlueprintId: section.props.layoutBlueprintId,
    layoutSectionId: section.props.layoutSectionId
  };
}

test("premium corrective pass preserves certified blueprint visual locks", () => {
  const source = buildLockedSite();
  const home = source.pages[0]!;
  const lockedBefore = home.sections
    .filter((item) => item.props.layoutVisualLock === true)
    .map(visualFingerprint);

  const result = applyPremiumCorrectivePass(source);
  const repairedHome = result.site.pages[0]!;
  const lockedAfter = repairedHome.sections
    .filter((item) => item.props.layoutVisualLock === true)
    .map(visualFingerprint);

  expect(result.before.premiumReady).toBe(false);
  expect(result.corrected).toBe(true);
  expect(result.corrections).toContain("repaired premium text contrast");
  expect(lockedAfter).toEqual(lockedBefore);
  expect(result.corrections).not.toContain("normalized premium surface rhythm outside blueprint-locked sections");
  expect(result.corrections).not.toContain("diversified repeated section layouts outside blueprint locks");
});
