import { expect, test } from "@playwright/test";
import { assertRenderedVisualRepairOwnership } from "../apps/builder/app/rendered-visual-repair-transaction";

const baseline = {
  canonicalBrief: { businessName: "Pearl Dental", services: ["Implants"] },
  artDirection: { direction: "quiet-luxury-healthcare" },
  theme: { palette: { surface: "#f8f5ef", text: "#17202a", accent: "#2a7f7f" } },
  pages: [{
    path: "/",
    sections: [{
      id: "hero",
      component: { componentId: "DENTAL-HERO-001", variant: "editorial" },
      props: { title: "Calm, precise dental care", image: { src: "/hero.jpg", alt: "Dental clinic" } },
    }],
  }],
};

test("rendered visual repair ownership allows only its exact repair dimension", () => {
  const typography = structuredClone(baseline) as any;
  typography.pages[0].sections[0].props.renderedTypographyRepairs = { mobile: { css: "h1{font-size:2rem}" } };
  typography.pages[0].sections[0].props.pageTypographyRepair = { renderedResponsive: { mobile: { css: "h1{font-size:2rem}" } } };
  expect(() => assertRenderedVisualRepairOwnership(baseline, typography, "typography")).not.toThrow();

  const composition = structuredClone(baseline) as any;
  composition.pages[0].sections[0].props.responsiveCompositionRepairs = { tablet: { css: ".grid{grid-template-columns:1fr 1fr}" } };
  expect(() => assertRenderedVisualRepairOwnership(baseline, composition, "responsive-composition")).not.toThrow();

  const image = structuredClone(baseline) as any;
  image.pages[0].sections[0].props.image = { src: "/hero-qualified.jpg", alt: "Pearl Dental treatment room" };
  image.pages[0].sections[0].props.imageFit = "cover";
  image.pages[0].sections[0].props.renderedImageRepair = { operations: ["reselect-qualified-alternate"] };
  expect(() => assertRenderedVisualRepairOwnership(baseline, image, "image")).not.toThrow();
});

test("rendered visual repair fails closed on canonical facts, art direction, palette or layout mutation", () => {
  for (const mutate of [
    (next: any) => { next.canonicalBrief.services.push("Veneers"); },
    (next: any) => { next.artDirection.direction = "bold-saas"; },
    (next: any) => { next.theme.palette.accent = "#7c3aed"; },
    (next: any) => { next.pages[0].sections[0].component.variant = "cards"; },
    (next: any) => { next.pages[0].sections[0].props.title = "Best rated dentist"; },
  ]) {
    const next = structuredClone(baseline) as any;
    mutate(next);
    expect(() => assertRenderedVisualRepairOwnership(baseline, next, "typography")).toThrow(/escaped typography ownership/);
  }
});

test("one repair dimension cannot mutate another repair dimension", () => {
  const next = structuredClone(baseline) as any;
  next.pages[0].sections[0].props.renderedTypographyRepairs = { mobile: { css: "h1{font-size:2rem}" } };
  expect(() => assertRenderedVisualRepairOwnership(baseline, next, "responsive-composition")).toThrow(/escaped responsive-composition ownership/);
});
