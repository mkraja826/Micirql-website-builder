import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  competeWebsiteLayoutCandidates,
  scoreStructuralCandidate,
  type RankedLayout,
  type WebsiteLayoutBlueprint,
} from "@micirql/design-engine";

function layout(id: string, families: string[], rhythm: WebsiteLayoutBlueprint["design"]["sectionRhythm"] = "alternating"): WebsiteLayoutBlueprint {
  const sections = families.map((family, index) => ({ id: `${family}-${index}`, family, pattern: family, purpose: family, required: ["navbar", "hero", "cta", "contact", "footer"].includes(family) }));
  const order = sections.map((section) => section.id);
  return {
    id,
    industry: "dental",
    name: id,
    description: id,
    archetype: "test",
    origin: "curated",
    status: "certified",
    version: 1,
    styleTags: [],
    fit: { subindustryIds: [], goals: [], priorities: [] },
    shell: { navbarBlueprintId: "nav", heroBlueprintId: "hero", footerBlueprintId: "footer" },
    design: { preferredPaletteIds: [], preferredTypographyIds: [], density: "balanced", imageStyle: "clinical", radius: "soft", sectionRhythm: rhythm },
    sections,
    responsive: {
      mobile: { sectionOrder: order, rules: ["stack intentionally"] },
      tablet: { sectionOrder: order, rules: ["limit columns"] },
      desktop: { sectionOrder: order, rules: ["preserve hierarchy"] },
    },
    mutation: { allowed: [], locked: [] },
    quality: { minimumDesktopScore: 9, minimumMobileScore: 9, requiredViewports: [360, 390, 430, 768, 1024, 1440], hardRules: [] },
  };
}

test("structural scoring rewards coherent premium narrative", () => {
  const strong = scoreStructuralCandidate(layout("strong", ["navbar", "hero", "about", "services", "process", "team", "cta", "contact", "footer"]));
  const weak = scoreStructuralCandidate(layout("weak", ["navbar", "services", "services", "features", "hero", "cta", "team", "contact", "footer"], "conversion"));
  expect(strong.score).toBeGreaterThan(weak.score);
  expect(strong.dimensions.narrative).toBeGreaterThan(weak.dimensions.narrative);
  expect(strong.dimensions.rhythm).toBeGreaterThan(weak.dimensions.rhythm);
});

test("candidate competition keeps factual fit dominant while using structure as tie breaker", () => {
  const structurallyStrong: RankedLayout = { layout: layout("strong", ["navbar", "hero", "about", "services", "process", "cta", "contact", "footer"]), score: 92, reasons: ["fit"] };
  const structurallyWeak: RankedLayout = { layout: layout("weak", ["navbar", "services", "services", "hero", "cta", "contact", "footer"]), score: 94, reasons: ["fit"] };
  const competed = competeWebsiteLayoutCandidates([structurallyWeak, structurallyStrong]);
  expect(competed[0]!.layout.id).toBe("strong");
  expect(competed[0]!.fitScore).toBe(92);
  expect(competed[0]!.reasons.some((reason) => reason.includes("candidate competition"))).toBe(true);
});

test("unclamped semantic specificity remains authoritative above structural preference", () => {
  const moreSpecific: RankedLayout = {
    layout: layout("specific", ["navbar", "hero", "services", "gallery", "process", "cta", "contact", "footer"]),
    score: 100,
    selectionScore: 138,
    reasons: ["specific fit"],
  };
  const moreStructural: RankedLayout = {
    layout: layout("structural", ["navbar", "hero", "about", "services", "process", "team", "cta", "contact", "footer"]),
    score: 100,
    selectionScore: 122,
    reasons: ["broader fit"],
  };
  const competed = competeWebsiteLayoutCandidates([moreSpecific, moreStructural]);
  expect(competed[0]!.layout.id).toBe("specific");
  expect(competed[0]!.reasons).toContain("semantic specificity 138");
});

test("composition only competes automatic layouts and preserves planner locks", () => {
  const source = readFileSync(resolve(process.cwd(), "apps/builder/app/composition-intelligence.ts"), "utf8");
  expect(source).toContain("competeWebsiteLayoutCandidates(recommendWebsiteLayouts(layoutInput,3))");
  expect(source).toContain("options.selectedLayoutId?plannerLockedLayout(profile,options)");
  expect(source).toContain("Preserved render-certified layout variant behavior");
});
