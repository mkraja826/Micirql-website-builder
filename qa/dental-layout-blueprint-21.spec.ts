import { expect, test } from "@playwright/test";
import { recommendWebsiteLayouts } from "@micirql/design-engine";

const cases = [
  {
    name: "clinical authority",
    brief: "I want a clean minimal clinical dental website with authoritative specialist trust, restrained whitespace and modern treatment technology.",
    expected: "dental-01-clinical-authority",
  },
  {
    name: "implant atelier",
    brief: "I run a high-end implant dentistry clinic and want a sophisticated luxury editorial website with premium typography, implant expertise and consultation focus.",
    expected: "dental-02-implant-luxury",
  },
  {
    name: "smile studio",
    brief: "I want an elegant visual cosmetic dentistry website focused on smile makeovers, before and after transformations, photography and patient outcomes.",
    expected: "dental-03-smile-studio",
  },
  {
    name: "digital dentistry",
    brief: "I want an advanced modern digital dentistry website focused on 3D scanning, digital treatment planning, technology and precision care.",
    expected: "dental-05-digital-dentistry",
  },
  {
    name: "boutique cosmetic",
    brief: "I run a boutique cosmetic dental studio and want a soft refined premium website with bespoke smile design, calm whitespace and an exclusive feel.",
    expected: "dental-08-boutique-cosmetic",
  },
] as const;

for (const entry of cases) {
  test(`natural-language ranking selects ${entry.name}`, () => {
    const ranked = recommendWebsiteLayouts({
      industry: "dental",
      priorities: [entry.brief],
      styleTags: [entry.brief],
      goals: [entry.brief],
    }, 5);

    expect(ranked.length).toBeGreaterThan(0);
    expect(ranked[0]?.layout.id).toBe(entry.expected);
    expect(ranked[0]?.reasons.some((reason) => /style|priority|goal/i.test(reason))).toBeTruthy();
  });
}

test("flagship briefs do not collapse to one dental layout", () => {
  const selected = cases.map((entry) => recommendWebsiteLayouts({
    industry: "dental",
    priorities: [entry.brief],
    styleTags: [entry.brief],
    goals: [entry.brief],
  }, 1)[0]?.layout.id);

  expect(new Set(selected).size).toBe(cases.length);
});
