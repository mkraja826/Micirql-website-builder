import { expect, test } from "@playwright/test";
import type { DesignScore } from "@micirql/design-engine";
import { selectDiverseDesigns } from "@micirql/design-engine";

type Candidate = { name: string; designScore: DesignScore };

function score(name: string, system: string, structure: string, total = 96): Candidate {
  return {
    name,
    designScore: {
      total,
      readiness: 100,
      content: 100,
      archetypeFit: 100,
      structuralVariety: 90,
      visualVariety: 90,
      fingerprint: {
        system,
        structure,
        palette: system,
        typography: system,
        density: "balanced",
        shape: "soft",
        modifiers: "",
      },
    },
  };
}

test("review selection prefers fewer genuinely distinct directions over quota-filling lookalikes", () => {
  const lookalikes = Array.from({ length: 20 }, (_, index) => score(
    `Corporate Minimal · variation ${index + 1}`,
    "corporate",
    "navbar:1|hero:1|about:1|services:2|team:1|cta:2|footer:1",
    100 - index,
  ));

  const distinct = [
    score("Brand Immersion", "cinematic", "navbar:5|hero:5|gallery:5|services:5|cta:5|footer:3", 94),
    score("Editorial Authority", "editorial", "navbar:5|hero:4|about:4|services:4|process:4|cta:4|footer:5", 93),
    score("Clinical Authority", "minimalist", "navbar:2|hero:3|testimonials:3|team:2|services:2|cta:2|footer:4", 92),
    score("Architectural", "luxury", "navbar:5|hero:4|features:4|services:2|gallery:2|cta:4|footer:5", 91),
    score("Warm Organic", "organic", "navbar:3|hero:2|about:3|team:3|services:3|cta:3|footer:2", 90),
  ];

  const selected = selectDiverseDesigns([...lookalikes, ...distinct], 20);

  expect(selected.length).toBeLessThanOrEqual(8);
  expect(selected.filter((item) => item.name.startsWith("Corporate Minimal")).length).toBe(1);
  expect(new Set(selected.map((item) => item.designScore.fingerprint.system)).size).toBeGreaterThanOrEqual(5);
});
