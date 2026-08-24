import { expect, test } from "@playwright/test";
import { generatedMediaBudget, generatedMediaPriority, selectGeneratedMediaIndexes } from "../apps/builder/app/materialize-media-execution";

function siteFor(layoutBlueprintId: string) {
  return {
    pages: [{
      id: "home",
      path: "/",
      sections: [{
        id: "hero",
        hidden: false,
        component: { componentId: "hero.placeholder" },
        props: { layoutBlueprintId, layoutVisualLock: true },
      }],
    }],
  } as any;
}

const FLAGSHIP = [
  "dental-01-clinical-authority",
  "dental-02-implant-luxury",
  "dental-03-smile-studio",
  "dental-05-digital-dentistry",
  "dental-08-boutique-cosmetic",
] as const;

for (const blueprintId of FLAGSHIP) {
  test(`${blueprintId} reserves three generated-media fallback slots`, () => {
    expect(generatedMediaBudget(siteFor(blueprintId))).toBe(3);
  });
}

test("Implant Atelier prioritizes three visually distinct non-identity slots", () => {
  const site = siteFor("dental-02-implant-luxury");
  expect(generatedMediaPriority(site).slice(0, 4)).toEqual(["hero", "process", "features", "services"]);

  const requests = [
    { family: "team", source: "none" },
    { family: "services", source: "generated", generationPrompt: "service detail" },
    { family: "features", source: "generated", generationPrompt: "technical detail" },
    { family: "hero", source: "generated", generationPrompt: "campaign hero" },
    { family: "process", source: "generated", generationPrompt: "planning journey" },
  ] as any;

  const selected = selectGeneratedMediaIndexes(site, requests, generatedMediaBudget(site));
  expect([...selected].sort((a, b) => a - b)).toEqual([2, 3, 4]);
});

test("a caller requesting only one generated image cannot collapse a flagship blueprint budget", () => {
  const site = siteFor("dental-03-smile-studio");
  const requestedCap = 1;
  expect(Math.max(requestedCap, generatedMediaBudget(site))).toBe(3);
});
