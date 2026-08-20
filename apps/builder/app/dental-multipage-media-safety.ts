import { siteSchema, type Site } from "@micirql/schema";

export type DentalMultipageMediaSafetyResult = {
  site: Site;
  changed: boolean;
  reusedQualifiedHero: number;
  removedEmptyHeroSlots: number;
};

/**
 * Treatment pages are composed before the rendered browser certification pass.
 * Reuse an already-selected homepage hero only when it is a real image. If no
 * qualified image exists, remove the empty media slot instead of publishing an
 * "Add hero photo" placeholder. Browser image QA remains the final authority.
 */
export function applyDentalMultipageMediaSafety(site: Site): DentalMultipageMediaSafetyResult {
  const next = structuredClone(site);
  const home = next.pages.find((page) => page.path === "/") ?? next.pages[0];
  const homeHero = home?.sections.find((section) => !section.hidden && isHero(section.component.componentId));
  const homeImage = validImage(homeHero?.props.image);
  let reusedQualifiedHero = 0;
  let removedEmptyHeroSlots = 0;

  for (const page of next.pages) {
    if (!page.path.startsWith("/treatments/")) continue;
    const hero = page.sections.find((section) => !section.hidden && isHero(section.component.componentId));
    if (!hero) continue;
    const props = hero.props as Record<string, unknown>;
    if (homeImage) {
      props.image = { ...homeImage, alt: treatmentAlt(props, homeImage.alt) };
      props.imageSlotMode = "section";
      props.imageFit = homeHero?.props.imageFit ?? "cover";
      props.imageFocalPoint = homeHero?.props.imageFocalPoint ?? "face-safe";
      if (homeHero?.props.imageRatio) props.imageRatio = homeHero.props.imageRatio;
      reusedQualifiedHero += 1;
      continue;
    }

    if (props.imageSlotMode === "section" || props.imageSlotMode === "both") {
      delete props.imageSlotMode;
      delete props.imageRatio;
      delete props.imageFit;
      delete props.imageFocalPoint;
      removedEmptyHeroSlots += 1;
    }
  }

  const changed = reusedQualifiedHero > 0 || removedEmptyHeroSlots > 0;
  return { site: changed ? siteSchema.parse(next) : site, changed, reusedQualifiedHero, removedEmptyHeroSlots };
}

function validImage(value: unknown): { src: string; alt: string } | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  const src = typeof record.src === "string" ? record.src.trim() : "";
  const alt = typeof record.alt === "string" ? record.alt.trim() : "";
  if (!src || /^placeholder:|^pending:/i.test(src)) return undefined;
  return { src, alt };
}

function treatmentAlt(props: Record<string, unknown>, fallback: string): string {
  const title = typeof props.eyebrow === "string" ? props.eyebrow.trim() : "";
  return title ? `${title} consultation and treatment planning` : fallback || "Dental treatment consultation";
}

function isHero(componentId: string): boolean {
  const value = componentId.toLowerCase();
  return value === "hero.placeholder" || value.startsWith("hero.") || value.includes("-hero-");
}
