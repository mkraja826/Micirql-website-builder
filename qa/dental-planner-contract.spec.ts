import { expect, test } from "@playwright/test";
import { DENTAL_LAYOUT_BLUEPRINTS, industryPlannerContext } from "@micirql/design-engine";

const ALLOWED_FAMILIES = new Set([
  "navbar", "hero", "about", "services", "features", "process",
  "testimonials", "gallery", "team", "cta", "contact", "footer",
]);

test("Dental planner context exposes the complete certified layout library", () => {
  const context = industryPlannerContext("dental", "implant dentistry");
  expect(context).toBeTruthy();

  const candidates = context?.certifiedLayoutCandidates ?? [];
  const sourceCertified = DENTAL_LAYOUT_BLUEPRINTS.filter((layout) => layout.status === "certified");

  expect(candidates).toHaveLength(20);
  expect(candidates.map((layout) => layout.id).sort()).toEqual(sourceCertified.map((layout) => layout.id).sort());
  expect(new Set(candidates.map((layout) => layout.id)).size).toBe(candidates.length);

  for (const layout of candidates) {
    expect(layout.industry).toBe("dental");
    expect(layout.status).toBe("certified");
    expect(layout.sections.length, `${layout.id} must carry its complete section contract into planning`).toBeGreaterThanOrEqual(8);
    expect(layout.sections.some((section) => section.family === "navbar"), `${layout.id} navbar`).toBe(true);
    expect(layout.sections.some((section) => section.family === "hero"), `${layout.id} hero`).toBe(true);
    expect(layout.sections.some((section) => section.family === "footer"), `${layout.id} footer`).toBe(true);
    expect(layout.sections.some((section) => section.family === "cta" || section.family === "contact"), `${layout.id} conversion`).toBe(true);
    for (const section of layout.sections) {
      expect(ALLOWED_FAMILIES.has(section.family), `${layout.id}/${section.id} has unsupported family ${section.family}`).toBe(true);
      expect(section.id.trim()).not.toBe("");
      expect(section.purpose.trim()).not.toBe("");
    }
  }
});
