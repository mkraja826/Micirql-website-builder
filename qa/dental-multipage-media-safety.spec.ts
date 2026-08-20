import { expect, test } from "@playwright/test";
import type { Site } from "@micirql/schema";
import { applyDentalMultipageMediaSafety } from "../apps/builder/app/dental-multipage-media-safety";

function site(homeImage?: { src: string; alt: string }): Site {
  return {
    schemaVersion: "1.0.0",
    siteId: "site-multipage-media-test",
    workspaceId: "workspace-test",
    name: "Aurelia Dental",
    domain: "clinic",
    theme: {
      family: "minimalist", modifiers: [],
      brand: {
        colors: { primary: "#302b63", secondary: "#514a9d", accent: "#7259d9", background: "#ffffff", surface: "#f7f7fb", textPrimary: "#18171f", textSecondary: "#5e5b68", border: "#d9d7e2", success: "#147a48", warning: "#9a6700", error: "#b42318" },
        typography: { display: "Manrope", body: "Inter", ui: "Inter" }, density: "comfortable", shape: "balanced", motion: "subtle",
      },
    },
    seoBlueprint: { primaryGoal: "appointments", targetLocations: [], priorityTopics: [], audiences: [], languages: ["en"], localSeo: true, servicePages: true, locationPages: false, blog: false },
    pages: [
      {
        id: "home", path: "/", name: "Home",
        seo: { title: "Aurelia Dental", description: "Dental care.", canonicalPath: "/", indexable: true, structuredDataTypes: [] },
        sections: [{
          id: "home-hero", component: { componentId: "MIN-HERO-001", version: "1.0.0" }, bindings: {}, hidden: false,
          props: { title: "Dental care", ...(homeImage ? { image: homeImage, imageFit: "cover", imageFocalPoint: "face-safe", imageRatio: "4:5" } : {}) },
        }],
      },
      {
        id: "treatment-implant", path: "/treatments/dental-implants", name: "Dental Implants",
        seo: { title: "Dental Implants", description: "Dental implant assessment.", canonicalPath: "/treatments/dental-implants", indexable: true, structuredDataTypes: [] },
        sections: [{
          id: "implant-hero", component: { componentId: "MIN-HERO-001", version: "1.0.0" }, bindings: {}, hidden: false,
          props: { eyebrow: "Dental Implants", title: "Implant care", imageSlotMode: "section", imageRatio: "4:5", imageFit: "cover", imageFocalPoint: "face-safe" },
        }],
      },
    ],
    navigation: [{ label: "Home", href: "/" }], integrations: [], domains: [],
  };
}

test("treatment pages reuse a real already-qualified homepage hero instead of a placeholder", () => {
  const result = applyDentalMultipageMediaSafety(site({ src: "https://cdn.example/clinic.jpg", alt: "Dental clinic" }));
  expect(result.reusedQualifiedHero).toBe(1);
  expect(result.removedEmptyHeroSlots).toBe(0);
  const hero = result.site.pages[1]!.sections[0]!;
  expect(hero.props.image).toEqual({ src: "https://cdn.example/clinic.jpg", alt: "Dental Implants consultation and treatment planning" });
  expect(hero.props.imageSlotMode).toBe("section");
});

test("treatment pages become intentionally text-led when no qualified hero exists", () => {
  const result = applyDentalMultipageMediaSafety(site());
  expect(result.reusedQualifiedHero).toBe(0);
  expect(result.removedEmptyHeroSlots).toBe(1);
  const props = result.site.pages[1]!.sections[0]!.props;
  expect(props.imageSlotMode).toBeUndefined();
  expect(props.imageRatio).toBeUndefined();
  expect(props.imageFit).toBeUndefined();
  expect(props.imageFocalPoint).toBeUndefined();
});

test("pending and placeholder assets are never promoted to treatment pages", () => {
  for (const src of ["pending:hero", "placeholder:hero"]) {
    const result = applyDentalMultipageMediaSafety(site({ src, alt: "Pending" }));
    expect(result.reusedQualifiedHero).toBe(0);
    expect(result.removedEmptyHeroSlots).toBe(1);
  }
});
