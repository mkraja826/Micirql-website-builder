import { expect, test } from "@playwright/test";
import { composeWebsite } from "../apps/builder/app/composition-intelligence";
import { inferGenerationQuality } from "../apps/builder/app/generation-quality-intelligence";
import { executeMediaPlan, type MediaAsset } from "../apps/builder/app/media-execution";
import { planVisualMedia, type VisualMediaPlan } from "../apps/builder/app/visual-media-intelligence";

const dentalProfile = {
  industry: "dental clinic",
  subindustry: "general dentistry",
  goals: ["book appointments", "build trust"],
  style_tags: ["clean", "professional"],
  required_capabilities: ["booking", "contact"],
  services: ["checkups", "root canal", "crowns"],
};

test("a Dental first build can request one truthful generic hero visual when reusable media is unavailable", () => {
  const composition = composeWebsite(dentalProfile);
  const quality = inferGenerationQuality(dentalProfile, composition);
  const plan = planVisualMedia(dentalProfile, composition, quality);
  const execution = executeMediaPlan({ plan, customerAssets: [], libraryAssets: [], licensedAssets: [], allowGeneration: true });

  const hero = execution.requests.find((request) => request.family === "hero");
  expect(hero?.source).toBe("generated");
  expect(hero?.generationPrompt).toContain("generic editorial dental context only");
  expect(hero?.generationPrompt).toContain("not the actual clinic");
  expect(hero?.generationPrompt).toContain("Do not show before-and-after results");
});

test("verified customer Dental media always outranks generation", () => {
  const composition = composeWebsite(dentalProfile);
  const quality = inferGenerationQuality(dentalProfile, composition);
  const plan = planVisualMedia(dentalProfile, composition, quality);
  const heroAsset: MediaAsset = {
    id: "customer-dental-hero",
    url: "https://example.test/customer-dental-hero.jpg",
    source: "customer",
    tags: ["dental", "dentistry", "general-dentistry", "hero", "hero-photo"],
    alt: "Clinic supplied dental care image",
    aspect: "wide",
    verified: true,
  };
  const execution = executeMediaPlan({ plan, customerAssets: [heroAsset], libraryAssets: [], licensedAssets: [], allowGeneration: true });

  const hero = execution.requests.find((request) => request.family === "hero");
  expect(hero?.source).toBe("customer");
  expect(hero?.asset?.id).toBe(heroAsset.id);
});

test("generation permission does not fabricate a real-world business location hero", () => {
  const plan: VisualMediaPlan = {
    style: "photographic",
    rules: [],
    sections: [{
      family: "hero",
      role: "hero-photo",
      prominence: "dominant",
      aspect: "wide",
      subject: "A strong real-world hotel environment establishing the actual property immediately",
      avoid: ["fabricated property imagery"],
    }],
  };
  const execution = executeMediaPlan({ plan, allowGeneration: true });
  expect(execution.requests[0]?.source).toBe("none");
});
