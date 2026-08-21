import { expect, test } from "@playwright/test";
import type { Site } from "@micirql/schema";
import type { MediaExecutionPlan } from "../apps/builder/app/media-execution";
import { evaluateHeroCoherence } from "../apps/builder/app/hero-coherence-quality";

const profile = {
  business_name: "Aurelia Dental",
  industry: "Dental clinic",
  subindustry: "implant dentistry",
  services: ["Dental implants", "Smile design", "Crowns", "Veneers"],
  goals: ["Book appointments"],
  notes: "Premium implant-focused dental clinic",
};

function site(): Site {
  return {
    id: "site",
    name: "Aurelia Dental",
    locale: "en",
    theme: {
      family: "minimal",
      mode: "light",
      colors: { background: "#fff", surface: "#fff", text: "#111", mutedText: "#666", primary: "#111", secondary: "#666", accent: "#999", border: "#ddd" },
      brand: { density: "comfortable", shape: "rounded", motion: "subtle", typography: { display: "sans", body: "sans" } },
    },
    pages: [{
      id: "home",
      name: "Home",
      path: "/",
      seo: { title: "Aurelia Dental", description: "Dental implants in Hyderabad" },
      sections: [{
        id: "hero",
        hidden: false,
        component: { componentId: "hero.placeholder", version: "1" },
        props: {
          title: "Dental implants planned around your needs",
          description: "Start with a consultation to discuss implant options and restorative planning.",
          primaryAction: { label: "Book consultation", href: "/contact" },
        },
      }],
    }],
    seoBlueprint: { targetLocations: [], priorityTopics: [] },
  } as Site;
}

function media(tags: string[]): MediaExecutionPlan {
  return {
    requests: [{
      family: "hero",
      pagePath: "/",
      source: "library",
      asset: { id: "hero", url: "https://example.com/hero.jpg", source: "library", tags, alt: tags.join(" ") },
      preferredTags: tags,
      desiredAspect: "portrait",
      alt: tags.join(" "),
      reason: "test",
    }],
    generationCount: 0,
    rules: [],
  };
}

test("implant hero copy and implant media form a coherent first screen", () => {
  const result = evaluateHeroCoherence(site(), media(["dental", "implant", "implant-planning", "restorative"]), profile);
  expect(result.primaryIntent).toBe("implant");
  expect(result.issues.filter((issue) => issue.severity === "error")).toHaveLength(0);
  expect(result.score).toBeGreaterThanOrEqual(82);
});

test("certified Dental hero heading/body aliases remain coherent", () => {
  const candidate = site();
  const hero = candidate.pages[0]!.sections[0]!;
  hero.component.componentId = "LUX-HERO-002";
  hero.props = {
    heading: "Dental implants planned around your needs",
    body: "Start with a consultation to discuss implant options and restorative planning.",
    primaryAction: { label: "Book consultation", href: "/contact" },
  };

  const result = evaluateHeroCoherence(candidate, media(["dental", "implant", "implant-planning", "restorative"]), profile);
  const codes = result.issues.map((issue) => issue.code);
  expect(codes).not.toContain("HERO_COHERENCE_MISSING_HERO");
  expect(codes).not.toContain("HERO_COPY_MISSES_PRIMARY_INTENT");
  expect(result.issues.filter((issue) => issue.severity === "error")).toHaveLength(0);
  expect(result.score).toBeGreaterThanOrEqual(82);
});

test("implant copy paired with cosmetic smile media is rejected", () => {
  const result = evaluateHeroCoherence(site(), media(["dental", "cosmetic", "natural-smile", "beauty", "smile-portrait"]), profile);
  const codes = result.issues.map((issue) => issue.code);
  expect(codes).toContain("HERO_MEDIA_MISSES_PRIMARY_INTENT");
  expect(codes).toContain("HERO_MEDIA_CONFLICTS_WITH_IMPLANT_COPY");
  expect(result.score).toBeLessThan(82);
});
