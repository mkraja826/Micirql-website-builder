import { expect, test } from "@playwright/test";
import { evaluateAboveFoldComposition } from "../apps/builder/app/above-fold-composition-quality";

function site(overrides: Partial<any> = {}) {
  return {
    id: "site-1",
    name: "Aurelia Dental",
    theme: { family: "clinical" },
    seoBlueprint: { targetLocations: [], priorityTopics: [] },
    pages: [{
      id: "home",
      name: "Home",
      path: "/",
      sections: [
        { id: "nav", hidden: false, component: { componentId: "DENTAL-NAV-01" }, props: {} },
        { id: "hero", hidden: false, component: { componentId: "DENTAL-HERO-01" }, props: {
          title: "Dental implants planned around your needs",
          description: "Consultation-led implant care with clear assessment, planning and next steps.",
          primaryAction: { label: "Book consultation", href: "/contact" },
          image: { src: "https://example.com/implant-hero.jpg", ratio: "portrait" },
          imageRatio: "portrait",
        } },
      ],
    }],
    ...overrides,
  } as any;
}

test("strong first-screen composition passes", () => {
  const result = evaluateAboveFoldComposition(site());
  expect(result.ready).toBe(true);
  expect(result.score).toBeGreaterThanOrEqual(84);
});

test("missing hero is blocked", () => {
  const value = site();
  value.pages[0].sections = value.pages[0].sections.filter((section: any) => section.id !== "hero");
  const result = evaluateAboveFoldComposition(value);
  expect(result.ready).toBe(false);
  expect(result.issues.some((issue) => issue.code === "HOME_HERO_MISSING")).toBe(true);
});

test("overlong headline and missing CTA are blocked", () => {
  const value = site();
  const hero = value.pages[0].sections[1];
  hero.props.title = "A very long homepage hero headline that keeps going far beyond the intended premium visual hierarchy for this dental website";
  delete hero.props.primaryAction;
  const result = evaluateAboveFoldComposition(value);
  expect(result.ready).toBe(false);
  expect(result.issues.some((issue) => issue.code === "HERO_TITLE_TOO_LONG")).toBe(true);
  expect(result.issues.some((issue) => issue.code === "HERO_PRIMARY_CTA_MISSING")).toBe(true);
});

test("hero too low and nav after hero are blocked", () => {
  const value = site();
  value.pages[0].sections = [
    { id: "trust", hidden: false, component: { componentId: "DENTAL-TRUST-01" }, props: {} },
    { id: "about", hidden: false, component: { componentId: "DENTAL-ABOUT-01" }, props: {} },
    value.pages[0].sections[1],
    value.pages[0].sections[0],
  ];
  const result = evaluateAboveFoldComposition(value);
  expect(result.ready).toBe(false);
  expect(result.issues.some((issue) => issue.code === "HOME_HERO_TOO_LOW")).toBe(true);
  expect(result.issues.some((issue) => issue.code === "NAVIGATION_AFTER_HERO")).toBe(true);
});
