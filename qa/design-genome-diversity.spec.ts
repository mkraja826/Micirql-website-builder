import { expect, test } from "@playwright/test";
import { selectGenomeDiverse, type DesignGenome, type GenomeCandidate } from "@micirql/design-engine";

const base: DesignGenome = {
  system: "clinical",
  layout: "split",
  navigation: "classic",
  hero: "split",
  typography: "sans",
  density: "balanced",
  imagery: "balanced",
  palette: "light",
  shape: "soft",
  motion: "subtle",
  composition: "hero-services-proof-cta",
};

function candidate(value: string, quality: number, genome: Partial<DesignGenome> = {}): GenomeCandidate<string> {
  return { value, quality, genome: { ...base, ...genome } };
}

test("Top-20 fallback maximizes genome distance instead of filling by raw quality", () => {
  const candidates = [
    candidate("anchor", 100),
    candidate("near-duplicate", 99, { motion: "none" }),
    candidate("distant", 88, {
      system: "editorial",
      layout: "editorial",
      navigation: "editorial",
      hero: "editorial",
      typography: "serif",
      density: "spacious",
      imagery: "dominant",
      palette: "dark",
      shape: "sharp",
      motion: "expressive",
      composition: "hero-story-gallery-contact",
    }),
  ];

  const selected = selectGenomeDiverse(candidates, 2, { maxSimilarity: 0.05 });

  expect(selected).toEqual(["anchor", "distant"]);
});

test("same-business selection still returns requested count when the pool is unavoidably similar", () => {
  const candidates = [
    candidate("one", 100),
    candidate("two", 99, { motion: "none" }),
    candidate("three", 98, { shape: "rounded" }),
    candidate("four", 97, { density: "tight" }),
  ];

  const selected = selectGenomeDiverse(candidates, 4, { maxSimilarity: 0.1 });

  expect(selected).toHaveLength(4);
  expect(new Set(selected).size).toBe(4);
  expect(selected[0]).toBe("one");
});
