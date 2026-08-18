import { expect, test } from "@playwright/test";
import type { Site } from "@micirql/schema";
import { designSimilarity, fingerprintDesign } from "@micirql/design-engine";

function siteWith(componentIds: string[]): Site {
  return {
    pages: [
      {
        id: "home",
        path: "/",
        sections: componentIds.map((componentId, index) => ({
          id: `section-${index + 1}`,
          component: { componentId, version: "1.0.0" },
          props: { paletteRole: index % 2 === 0 ? "surface" : "primary" },
        })),
      },
    ],
    theme: {
      brand: {
        typography: { display: "Inter", body: "Inter", ui: "Inter" },
        density: "comfortable",
        shape: "soft",
      },
      modifiers: [],
    },
  } as unknown as Site;
}

test("diversity fingerprint preserves premium component variants above five", () => {
  const variant5 = fingerprintDesign(siteWith(["CIN-HERO-005", "CIN-SERV-003", "CIN-CTA-004"]));
  const variant12 = fingerprintDesign(siteWith(["CIN-HERO-012", "CIN-SERV-003", "CIN-CTA-004"]));
  const variant20 = fingerprintDesign(siteWith(["CIN-HERO-020", "CIN-SERV-003", "CIN-CTA-004"]));

  expect(variant5.structure).toContain("hero:5");
  expect(variant12.structure).toContain("hero:12");
  expect(variant20.structure).toContain("hero:20");
  expect(variant5.structure).not.toBe(variant12.structure);
  expect(variant12.structure).not.toBe(variant20.structure);
  expect(designSimilarity(variant5, variant12)).toBeLessThan(1);
  expect(designSimilarity(variant12, variant20)).toBeLessThan(1);
});

test("legacy dotted component IDs also retain variants above five", () => {
  const fingerprint = fingerprintDesign(siteWith(["hero.17", "services.11", "cta.9"]));

  expect(fingerprint.structure).toBe("hero:17|services:11|cta:9");
});
