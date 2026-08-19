import { expect, test } from "@playwright/test";
import { composeWebsite } from "../apps/builder/app/composition-intelligence";
import { inferGenerationQuality } from "../apps/builder/app/generation-quality-intelligence";
import { executeMediaPlan, perceptualSimilarity, type MediaAsset } from "../apps/builder/app/media-execution";
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
  const heroAsset: MediaAsset = { id:"customer-dental-hero",url:"https://example.test/customer-dental-hero.jpg",source:"customer",tags:["dental","dentistry","general-dentistry","hero","hero-photo"],alt:"Clinic supplied dental care image",aspect:"wide",verified:true };
  const execution = executeMediaPlan({ plan, customerAssets: [heroAsset], libraryAssets: [], licensedAssets: [], allowGeneration: true });
  const hero = execution.requests.find((request) => request.family === "hero");
  expect(hero?.source).toBe("customer");
  expect(hero?.asset?.id).toBe(heroAsset.id);
});

test("generation permission does not fabricate a real-world business location hero", () => {
  const plan: VisualMediaPlan = { style:"photographic",rules:[],sections:[{family:"hero",role:"hero-photo",prominence:"dominant",aspect:"wide",subject:"A strong real-world hotel environment establishing the actual property immediately",avoid:["fabricated property imagery"]}] };
  const execution = executeMediaPlan({ plan, allowGeneration: true });
  expect(execution.requests[0]?.source).toBe("none");
});

test("first-build generation does not silently expand to non-Dental abstract media", () => {
  const plan: VisualMediaPlan = { style:"mixed",rules:[],sections:[{family:"hero",role:"abstract",prominence:"dominant",aspect:"wide",subject:"A distinctive abstract consulting visual supporting the primary promise",avoid:["unrelated decorative imagery"]}] };
  const execution = executeMediaPlan({ plan, allowGeneration: true });
  expect(execution.requests[0]?.source).toBe("none");
  expect(execution.generationCount).toBe(0);
});

test("near-duplicate reusable dental imagery is rejected across primary sections", () => {
  const plan: VisualMediaPlan = { style:"editorial",rules:[],sections:[
    {family:"hero",role:"hero-photo",prominence:"dominant",aspect:"portrait",subject:"Generic premium implant consultation portrait",avoid:[],preferredTags:["implant","consultation","portrait-led"]},
    {family:"services",role:"hero-photo",prominence:"supporting",aspect:"4:3",subject:"Generic restorative implant planning detail",avoid:["repeating the hero visual"],preferredTags:["implant","restorative","planning"]},
  ]};
  const libraryAssets: MediaAsset[] = [
    {id:"portrait-a",url:"https://example.test/portrait-a.jpg",source:"library",tags:["dental","implant","consultation","portrait-led","adult-patient","directional-light","close-portrait"],alt:"Premium implant consultation portrait",aspect:"portrait",verified:true},
    {id:"portrait-b-near-duplicate",url:"https://example.test/portrait-b.jpg",source:"library",tags:["dental","implant","consultation","portrait-led","adult-patient","directional-light","close-portrait","restorative","planning"],alt:"Premium implant consultation portrait variation",aspect:"4:3",verified:true},
    {id:"planning-detail-distinct",url:"https://example.test/planning-detail.jpg",source:"library",tags:["dental","implant","restorative","planning","scan-detail","over-shoulder","technical-detail"],alt:"Restorative implant planning detail",aspect:"4:3",verified:true},
  ];
  const execution = executeMediaPlan({ plan, libraryAssets, allowGeneration: false });
  expect(execution.requests[0]?.asset?.id).toBe("portrait-a");
  expect(execution.requests[1]?.asset?.id).toBe("planning-detail-distinct");
  expect(execution.requests.map((request) => request.asset?.id)).not.toContain("portrait-b-near-duplicate");
});

test("generated dental media gets section-specific composition diversity instructions", () => {
  const plan: VisualMediaPlan = { style:"editorial",rules:[],sections:[
    { family:"hero",role:"hero-photo",prominence:"dominant",aspect:"portrait",subject:"Generic non-identifying implant consultation context",avoid:[] },
    { family:"process",role:"process",prominence:"supporting",aspect:"16:9",subject:"Generic calm implant consultation-to-planning context",avoid:["repeating the hero visual"] },
  ]};
  const execution = executeMediaPlan({ plan, allowGeneration: true });
  expect(execution.requests[0]?.generationPrompt).toContain("campaign-style composition");
  expect(execution.requests[1]?.generationPrompt).toContain("documentary sequence framing");
  expect(execution.requests[1]?.generationPrompt).not.toEqual(execution.requests[0]?.generationPrompt);
});

test("perceptual hashes detect near-identical images even when metadata differs", () => {
  expect(perceptualSimilarity("0000000000000000", "0000000000000001")).toBeGreaterThan(.98);
  expect(perceptualSimilarity("0000000000000000", "ffffffffffffffff")).toBe(0);
});

test("perceptually near-identical stock is rejected despite different tags and filenames", () => {
  const plan: VisualMediaPlan = { style:"editorial",rules:[],sections:[
    {family:"hero",role:"hero-photo",prominence:"dominant",aspect:"portrait",subject:"Generic implant consultation",avoid:[],preferredTags:["implant","consultation"]},
    {family:"services",role:"hero-photo",prominence:"supporting",aspect:"4:3",subject:"Generic restorative planning",avoid:[],preferredTags:["implant","planning"]},
  ]};
  const libraryAssets: MediaAsset[] = [
    {id:"hero",url:"https://example.test/a.jpg",source:"library",tags:["implant","consultation"],aspect:"portrait",perceptualHash:"0123456789abcdef",verified:true},
    {id:"lookalike",url:"https://example.test/b.jpg",source:"library",tags:["restorative","planning","technical"],aspect:"4:3",perceptualHash:"0123456789abcdee",verified:true},
    {id:"distinct",url:"https://example.test/c.jpg",source:"library",tags:["restorative","planning","technical"],aspect:"4:3",perceptualHash:"fedcba9876543210",verified:true},
  ];
  const execution = executeMediaPlan({ plan, libraryAssets, allowGeneration:false });
  expect(execution.requests[0]?.asset?.id).toBe("hero");
  expect(execution.requests[1]?.asset?.id).toBe("distinct");
});
