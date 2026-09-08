import { expect, test } from "@playwright/test";
import { buildAcceptedPearlSite, familyFromId, PEARL_SERVICES } from "./pearl-v3-fixture";

test("Pearl Dental reaches V3 final generation acceptance through automatic composition", () => {
  const { site: generated, composition, acceptance } = buildAcceptedPearlSite();

  expect(composition.layoutCandidate?.layout.status).toBe("certified");
  expect(composition.reasoning.join(" ")).toContain("Shortlisted up to three certified layout fits");
  expect(composition.reasoning.join(" ")).toContain("selected the strongest structural candidate before rendering");
  expect(composition.industryPack?.pack.id).toBe("dental");

  expect(acceptance.ready, acceptance.blockers.join("\n")).toBe(true);
  expect(acceptance.score).toBeGreaterThanOrEqual(90);
  for (const dimension of acceptance.dimensions) {
    expect(dimension.ready, `${dimension.id}: ${dimension.blockers.join(" | ")}`).toBe(true);
    expect(dimension.score, `${dimension.id} score`).toBeGreaterThanOrEqual(90);
  }

  expect(generated.name).toBe("Pearl Dental");
  expect(generated.seoBlueprint.targetLocations).toEqual(["Hyderabad"]);
  expect(generated.seoBlueprint.priorityTopics).toEqual(PEARL_SERVICES);
  expect(generated.theme.brand.motion).toBe("subtle");
  expect(generated.theme.brand.density).not.toBe("compact");

  const home = generated.pages.find((page) => page.path === "/");
  expect(home).toBeTruthy();
  const families = home!.sections.map((section) => familyFromId(section.component.componentId)).filter(Boolean);
  expect(families[0]).toBe("navbar");
  expect(families).toContain("hero");
  expect(families).toContain("services");
  expect(families).toContain("team");
  expect(families).toContain("testimonials");
  expect(families).toContain("cta");
  expect(families).toContain("contact");
  expect(families.at(-1)).toBe("footer");

  const allCopy = JSON.stringify(generated).toLowerCase();
  for (const forbidden of ["5-star", "five-star", "award-winning", "success rate", "best dentist", "top-rated"]) {
    expect(allCopy).not.toContain(forbidden);
  }
});
