import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { DENTAL_LAYOUT_BLUEPRINTS } from "../packages/design-engine/src/dental-layout-blueprints";

test("dental review uses certified blueprint systems instead of generic recipe mutations", () => {
  const review = readFileSync("apps/builder/app/first-build-review.tsx", "utf8");
  const helper = readFileSync("apps/builder/app/dental-review-directions.ts", "utf8");

  expect(review).toContain("isDentalReviewProfile(profile)");
  expect(review).toContain("buildCertifiedDentalReviewDirections(draft.snapshot, profile, 8");
  expect(helper).toContain("DENTAL_LAYOUT_BLUEPRINTS");
  expect(helper).toContain("applyWebsiteLayoutBlueprint(site, blueprint)");
  expect(helper).toContain("const REVIEW_LIMIT = 8");

  const flagshipNames = DENTAL_LAYOUT_BLUEPRINTS.slice(0, 5).map((item) => item.name);
  expect(flagshipNames).toEqual([
    "Clinical Authority",
    "Implant Atelier",
    "Smile Studio",
    "Family Care",
    "Digital Dentistry",
  ]);
  expect(new Set(flagshipNames).size).toBe(5);
});

test("certified dental directions carry materially different composition contracts", () => {
  const flagships = DENTAL_LAYOUT_BLUEPRINTS.slice(0, 5);
  const signatures = flagships.map((item) => [
    item.shell.navbarBlueprintId,
    item.shell.heroBlueprintId,
    item.shell.footerBlueprintId,
    item.archetype,
    item.design.imageStyle,
    item.design.sectionRhythm,
    item.sections.map((section) => `${section.family}:${section.pattern}`).join("|"),
  ].join("::"));

  expect(new Set(signatures).size).toBe(flagships.length);
});
