import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const planner = fs.readFileSync(path.join(root, "apps/builder/app/page-architecture-intelligence.ts"), "utf8");
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

test("secondary pages use purpose-specific section recipes", () => {
  expect(planner).toContain("const PAGE_RECIPES");
  expect(planner).toContain('about: ["navbar", "hero", "about", "features", "team", "testimonials", "cta", "footer"]');
  expect(planner).toContain('"service-detail": ["navbar", "hero", "about", "features", "process", "testimonials", "cta", "contact", "footer"]');
  expect(planner).toContain('team: ["navbar", "hero", "team", "about", "testimonials", "cta", "footer"]');
  expect(planner).toContain('gallery: ["navbar", "hero", "gallery", "testimonials", "about", "cta", "footer"]');
  expect(planner).toContain('faq: ["navbar", "hero", "features", "process", "cta", "contact", "footer"]');
  expect(planner).toContain('contact: ["navbar", "hero", "contact", "cta", "footer"]');
  expect(planner).toContain("pagePurpose: purpose");
  expect(planner).toContain("pageRole: role");
});

test("architecture runs after base onboarding and before review", () => {
  expect(gate).toContain('fetch("/api/onboarding/architect"');
  expect(route).toContain("planPageArchitecture");
  expect(route).toContain("applyPageArchitecture");
  expect(route).toContain("runGuardedContentGeneration");
});
