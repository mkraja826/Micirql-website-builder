import { expect, test } from "@playwright/test";
import { normalizeLayoutSelectionInput, recommendWebsiteLayouts } from "@micirql/design-engine";

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

const AURELIA_BRIEF = `I run a premium dental clinic in Hyderabad called Aurelia Dental. We focus mainly on dental implants, cosmetic dentistry, smile design, full-mouth rehabilitation, crowns and veneers. I want a premium, modern and trustworthy website that feels like a high-end private clinic, not a generic dental template. The website should introduce our doctors, explain our treatments clearly, show before-and-after results, patient testimonials and Google reviews, and make it very easy for patients to book appointments through WhatsApp or a contact form. Use elegant typography, clean spacing, premium photography, subtle animations and a professional luxury colour palette. The homepage should strongly focus on implants and smile transformation while still showing our other dental services. The website should work beautifully on mobile and desktop and should feel comparable to a professionally designed international dental clinic website.`;

test("Aurelia premium implant brief selects Implant Atelier even from a broad interpreted subtype", () => {
  const input = {
    industry: "dental clinic",
    subindustryId: "general dentistry",
    goals: ["book appointments", "build trust", "show outcomes"],
    priorities: ["whatsapp", "contact form", "patient testimonials"],
    styleTags: ["premium", "modern", "trustworthy"],
    context: AURELIA_BRIEF,
  };

  const normalized = normalizeLayoutSelectionInput(input);
  expect(normalized.industry).toBe("dental");
  expect(normalized.subindustryId).toBe("implant-dentistry");
  expect(normalized.goals).toContain("implant consultation");
  expect(normalized.priorities).toContain("implant expertise");
  expect(normalized.styleTags).toEqual(expect.arrayContaining(["implant", "premium", "luxury", "elegant"]));

  const ranked = recommendWebsiteLayouts(input, 3);
  expect(ranked[0]?.layout.id).toBe("dental-02-implant-luxury");
  expect(ranked[0]?.layout.name).toBe("Implant Atelier");
  expect(ranked[0]?.reasons.some((reason) => reason.includes("subindustry: implant-dentistry"))).toBe(true);
});

test("general dentistry is not forced into implant layout without dominant implant intent", () => {
  const normalized = normalizeLayoutSelectionInput({
    industry: "dentist",
    subindustryId: "general dentistry",
    goals: ["book appointment"],
    styleTags: ["professional", "clean"],
    context: "A general dental clinic offering checkups, fillings, crowns and preventive dentistry for local families.",
  });

  expect(normalized.subindustryId).toBe("general-dentistry");
});
