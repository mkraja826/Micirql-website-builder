import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const planner = fs.readFileSync(path.join(root, "apps/builder/app/page-architecture-intelligence.ts"), "utf8");
const mediaPlanner = fs.readFileSync(path.join(root, "apps/builder/app/page-media-intelligence.ts"), "utf8");
const mediaExecution = fs.readFileSync(path.join(root, "apps/builder/app/media-execution.ts"), "utf8");
const gate = fs.readFileSync(path.join(root, "apps/builder/app/onboarding-gate.tsx"), "utf8");
const route = fs.readFileSync(path.join(root, "apps/builder/app/api/onboarding/architect/route.ts"), "utf8");

test("brief-driven architecture creates real sitemap primitives", () => {
  expect(planner).toContain('path: "/"');
  expect(planner).toContain('path: "/about"');
  expect(planner).toContain('path: "/services"');
  expect(planner).toContain('`/services/${slug}`');
  expect(planner).toContain('path: healthcare ? "/doctors" : "/team"');
  expect(planner).toContain('path: "/contact"');
  expect(planner).toContain("next.navigation = plan.pages");
});

test("healthcare architecture includes trust and objection handling", () => {
  expect(planner).toContain('healthcare ? "Doctors" : "Team"');
  expect(planner).toContain('name: "FAQs"');
  expect(planner).toContain('healthcare ? "/results" : "/gallery"');
});

test("secondary pages use semantic journeys with deterministic recipe fallback", () => {
  expect(planner).toContain("const JOURNEY_RULES");
  expect(planner).toContain('about: { required: ["about"], optional: ["features", "team", "testimonials"]');
  expect(planner).toContain('"service-detail": { required: ["about", "features"], optional: ["process", "testimonials", "contact"]');
  expect(planner).toContain('gallery: { required: ["gallery"], optional: ["testimonials", "about", "features"]');
  expect(planner).toContain("selectSemanticJourney(role, byFamily, site)");
  expect(planner).toContain("journeyFamilyScore");
  expect(planner).toContain("placementOrder");
  expect(planner).toContain("const PAGE_RECIPES");
  expect(planner).toContain("const fallbackRecipe = PAGE_RECIPES[role]");
  expect(planner).toContain("pagePurpose: purpose");
  expect(planner).toContain("pageRole: role");
});

test("page roles receive semantic registry-driven component profiles", () => {
  expect(planner).toContain("const ROLE_INTENTS");
  expect(planner).toContain('"service-detail": {');
  expect(planner).toContain('hero: intent(["sales", "appointments", "education"], "opening", true, "low", "heavy")');
  expect(planner).toContain('gallery: intent(["portfolio", "visual-proof", "trust"], "visual-break", true, "low", "heavy")');
  expect(planner).toContain("selectSemanticComponentId");
  expect(planner).toContain("semanticRegistryScore");
  expect(planner).toContain("seedSectionRegistryEntries");
  expect(planner).not.toContain("const PAGE_VARIANTS");
});

test("page-specific media protects doctors results and low-value pages", () => {
  expect(mediaPlanner).toContain('role==="team"');
  expect(mediaPlanner).toContain("Verified portraits of the real doctors or team members");
  expect(mediaPlanner).toContain('role==="gallery"');
  expect(mediaPlanner).toContain("never synthesize before-and-after outcomes");
  expect(mediaPlanner).toContain('role==="contact"||role==="faq"');
  expect(mediaPlanner).toContain("no generated image needed");
  expect(mediaPlanner).toContain('role==="service-detail"&&family==="hero"');
  expect(mediaExecution).toContain("pagePath?:string");
});

test("architecture runs page media and content enrichment before review", () => {
  expect(gate).toContain('fetch("/api/onboarding/architect"');
  expect(route).toContain("planPageArchitecture");
  expect(route).toContain("applyPageArchitecture");
  expect(route).toContain("planPageMedia");
  expect(route).toContain("materializeGeneratedMedia");
  expect(route).toContain("applyMediaExecution");
  expect(route).toContain("runGuardedContentGeneration");
});
