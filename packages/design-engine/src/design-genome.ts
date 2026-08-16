export type DesignGenome = {
  system: string;
  layout: "centered" | "split" | "editorial" | "grid" | "cinematic" | "story";
  navigation: "compact" | "classic" | "overlay" | "editorial" | "utility";
  hero: "centered" | "split" | "image-led" | "editorial" | "full-bleed";
  typography: "sans" | "serif" | "mixed" | "display";
  density: "tight" | "balanced" | "spacious";
  imagery: "supporting" | "balanced" | "dominant";
  palette: "light" | "dark" | "brand" | "editorial" | "color-block";
  shape: "sharp" | "soft" | "rounded";
  motion: "none" | "subtle" | "expressive";
  composition: string;
};

export type GenomeCandidate<T> = {
  value: T;
  genome: DesignGenome;
  quality: number;
};

export function genomeSimilarity(a: DesignGenome, b: DesignGenome): number {
  const weighted: Array<[keyof DesignGenome, number]> = [
    ["system", 0.18],
    ["layout", 0.14],
    ["navigation", 0.08],
    ["hero", 0.12],
    ["typography", 0.1],
    ["density", 0.06],
    ["imagery", 0.08],
    ["palette", 0.08],
    ["shape", 0.05],
    ["motion", 0.04],
    ["composition", 0.07],
  ];
  return weighted.reduce((score, [key, weight]) => score + (a[key] === b[key] ? weight : 0), 0);
}

export function selectGenomeDiverse<T>(
  candidates: GenomeCandidate<T>[],
  limit: number,
  options: { maxSimilarity?: number; minimumQuality?: number } = {},
): T[] {
  const maxSimilarity = options.maxSimilarity ?? 0.72;
  const minimumQuality = options.minimumQuality ?? 0;
  const ranked = [...candidates]
    .filter((candidate) => candidate.quality >= minimumQuality)
    .sort((a, b) => b.quality - a.quality);
  const selected: GenomeCandidate<T>[] = [];

  for (const candidate of ranked) {
    if (selected.length >= limit) break;
    const nearest = selected.length
      ? Math.max(...selected.map((picked) => genomeSimilarity(candidate.genome, picked.genome)))
      : 0;
    if (nearest <= maxSimilarity) selected.push(candidate);
  }

  if (selected.length < limit) {
    for (const candidate of ranked) {
      if (selected.length >= limit) break;
      if (!selected.includes(candidate)) selected.push(candidate);
    }
  }

  return selected.map((candidate) => candidate.value);
}

export function genomeKey(genome: DesignGenome): string {
  return [
    genome.system,
    genome.layout,
    genome.navigation,
    genome.hero,
    genome.typography,
    genome.density,
    genome.imagery,
    genome.palette,
    genome.shape,
    genome.motion,
    genome.composition,
  ].join("|");
}
