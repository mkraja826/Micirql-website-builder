import { expect, test } from "@playwright/test";
import type { Site } from "@micirql/schema";
import { designSimilarity, fingerprintDesign } from "@micirql/design-engine";

function siteWithTheme(family: Site["theme"]["family"]): Site {
  return {
    pages: [
      {
        id: "home",
        path: "/",
        sections: [
          { id: "hero", component: { componentId: "COR-HERO-003", version: "1.0.0" }, props: { paletteRole: "surface" } },
          { id: "services", component: { componentId: "COR-SERV-003", version: "1.0.0" }, props: { paletteRole: "primary" } },
          { id: "cta", component: { componentId: "COR-CTA-003", version: "1.0.0" }, props: { paletteRole: "surface" } },
        ],
      },
    ],
    theme: {
      family,
      brand: {
        typography: { display: "Inter", body: "Inter", ui: "Inter" },
        density: "comfortable",
        shape: "soft",
      },
      modifiers: [],
    },
  } as unknown as Site;
}

test("theme family is part of the design fingerprint", () => {
  const corporate = fingerprintDesign(siteWithTheme("corporate"));
  const cinematic = fingerprintDesign(siteWithTheme("cinematic"));

  expect(corporate.system).toBe("corporate");
  expect(cinematic.system).toBe("cinematic");
  expect(corporate.structure).toBe(cinematic.structure);
  expect(designSimilarity(corporate, cinematic)).toBeLessThan(1);
});
