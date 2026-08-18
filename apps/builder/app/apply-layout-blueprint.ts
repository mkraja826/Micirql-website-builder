import { siteSchema, type Site } from "@micirql/schema";
import type { WebsiteLayoutBlueprint, WebsiteLayoutSection } from "@micirql/design-engine";
import { FAMILY_CODES, SECTION_FAMILIES, sectionDesignId, type SectionFamily, type SectionVariant } from "@micirql/sections";

type SiteSection = Site["pages"][number]["sections"][number];

/**
 * Applies a complete curated website layout on top of generated content.
 *
 * The blueprint is authoritative for home-page section order and responsive
 * design metadata, but this layer never invents business copy. It only reuses
 * sections already present in the generated draft. Missing families are left
 * absent and remain a QA blocker until the planner can materialize them.
 */
export function applyWebsiteLayoutBlueprint(site: Site, layout: WebsiteLayoutBlueprint): Site {
  const next = structuredClone(site);
  const themeFamily = next.theme.family;

  for (const page of next.pages) {
    if (page.path !== "/" || !page.sections.length) continue;

    const buckets = new Map<SectionFamily, SiteSection[]>();
    const unknown: SiteSection[] = [];
    for (const existing of page.sections) {
      const family = familyFromId(existing.component.componentId);
      if (!family) {
        unknown.push(existing);
        continue;
      }
      const bucket = buckets.get(family) ?? [];
      bucket.push(existing);
      buckets.set(family, bucket);
    }

    const ordered: SiteSection[] = [];
    for (const layoutSection of layout.sections) {
      const family = layoutFamily(layoutSection.family);
      if (!family) continue;
      const bucket = buckets.get(family);
      const source = bucket?.shift();
      if (!source) continue;
      if (!bucket?.length) buckets.delete(family);

      const variant = layoutVariant(layout, layoutSection, family);
      const section = structuredClone(source);
      section.component = {
        componentId: sectionDesignId(themeFamily, family, variant),
        version: source.component.version,
      };
      section.props = {
        ...section.props,
        layoutBlueprintId: layout.id,
        layoutArchetype: layout.archetype,
        layoutSectionId: layoutSection.id,
        layoutPattern: layoutSection.pattern,
        layoutPurpose: layoutSection.purpose,
        layoutDensity: layout.design.density,
        layoutImageStyle: layout.design.imageStyle,
        layoutRhythm: layout.design.sectionRhythm,
        layoutMobileRules: [...layout.responsive.mobile.rules],
        ...presentationFor(layoutSection, family),
      };
      ordered.push(section);
    }

    // Unknown renderer extensions are preserved at the end. Known section
    // families outside the curated blueprint are intentionally excluded so a
    // random planner section cannot break the certified visual rhythm.
    page.sections = [...ordered, ...unknown.map((section) => ({
      ...section,
      props: { ...section.props, layoutBlueprintId: layout.id, layoutArchetype: layout.archetype },
    }))];
  }

  return siteSchema.parse(next);
}

export function layoutCoverage(site: Site, layout: WebsiteLayoutBlueprint): {
  expected: number;
  matched: number;
  missing: string[];
  complete: boolean;
} {
  const home = site.pages.find((page) => page.path === "/") ?? site.pages[0];
  const counts = new Map<SectionFamily, number>();
  for (const section of home?.sections ?? []) {
    const family = familyFromId(section.component.componentId);
    if (family) counts.set(family, (counts.get(family) ?? 0) + 1);
  }
  const missing: string[] = [];
  for (const blueprintSection of layout.sections) {
    const family = layoutFamily(blueprintSection.family);
    if (!family) continue;
    const available = counts.get(family) ?? 0;
    if (available <= 0) missing.push(blueprintSection.id);
    else counts.set(family, available - 1);
  }
  return {
    expected: layout.sections.length,
    matched: layout.sections.length - missing.length,
    missing,
    complete: missing.length === 0,
  };
}

function presentationFor(section: WebsiteLayoutSection, family: SectionFamily): Record<string, unknown> {
  const base: Record<string, unknown> = {};
  if (family === "hero") Object.assign(base, { imageSlotMode: "section", imageRatio: "4:5", imageFit: "cover", imageFocalPoint: "face-safe" });
  if (family === "team") Object.assign(base, { imageSlotMode: "items", itemImageRatio: "4:5", imageFit: "cover", imageFocalPoint: "face-safe" });
  if (family === "services") Object.assign(base, { itemImageRatio: "4:3", imageFit: "cover", imageFocalPoint: "center" });
  if (family === "gallery") Object.assign(base, { imageSlotMode: "items", itemImageRatio: "4:3", imageFit: "cover", imageFocalPoint: "center" });

  switch (section.pattern) {
    case "trust-strip": return { ...base, paletteRole: "secondary", cardPaletteRole: "secondary" };
    case "technology-proof": return { ...base, paletteRole: "surface", cardPaletteRole: "background" };
    case "appointment-conversion": return { ...base, paletteRole: "primary", ctaPaletteRole: "accent" };
    case "clinic-contact": return { ...base, paletteRole: "background", cardPaletteRole: "surface" };
    default: return base;
  }
}

function layoutVariant(layout: WebsiteLayoutBlueprint, section: WebsiteLayoutSection, family: SectionFamily): SectionVariant {
  if (family === "navbar") return navbarVariant(layout.shell.navbarBlueprintId);
  if (family === "hero") return heroVariant(layout.shell.heroBlueprintId);
  if (family === "footer") return footerVariant(layout.shell.footerBlueprintId);

  const pattern = section.pattern.toLowerCase();
  if (family === "testimonials") {
    if (/trust-strip|metric|proof-strip/.test(pattern)) return 3;
    if (/wall|reviews-wall/.test(pattern)) return 4;
    if (/dark/.test(pattern)) return 5;
    return 2;
  }
  if (family === "services") {
    if (/editorial/.test(pattern)) return 4;
    if (/band/.test(pattern)) return 5;
    if (/list/.test(pattern)) return 2;
    return 3;
  }
  if (family === "team") {
    if (/editorial/.test(pattern)) return 4;
    if (/profile-list/.test(pattern)) return 3;
    if (/dark/.test(pattern)) return 5;
    return 2;
  }
  if (family === "features") {
    if (/bento/.test(pattern)) return 3;
    if (/editorial/.test(pattern)) return 4;
    if (/dark/.test(pattern)) return 5;
    return 2;
  }
  if (family === "process") {
    if (/timeline|journey/.test(pattern)) return 3;
    if (/sticky/.test(pattern)) return 4;
    if (/band/.test(pattern)) return 5;
    return 2;
  }
  if (family === "gallery") {
    if (/rail/.test(pattern)) return 3;
    if (/editorial/.test(pattern)) return 4;
    if (/full|immersive/.test(pattern)) return 5;
    return 2;
  }
  if (family === "cta") {
    if (/center/.test(pattern)) return 3;
    if (/panel/.test(pattern)) return 4;
    if (/brand/.test(pattern)) return 5;
    return 2;
  }
  if (family === "contact") {
    if (/center/.test(pattern)) return 3;
    if (/panel/.test(pattern)) return 4;
    if (/dark/.test(pattern)) return 5;
    return 2;
  }
  if (family === "about") {
    if (/story/.test(pattern)) return 2;
    if (/center/.test(pattern)) return 3;
    if (/editorial/.test(pattern)) return 4;
    if (/statement/.test(pattern)) return 5;
  }
  return 1;
}

function navbarVariant(id: string): SectionVariant {
  const number = blueprintNumber(id);
  if ([2, 6].includes(number)) return 2;
  if (number === 3) return 3;
  if ([4, 5].includes(number)) return 4;
  if ([9, 15, 16].includes(number)) return 5;
  return 1;
}

function heroVariant(id: string): SectionVariant {
  const number = blueprintNumber(id);
  if ([2, 8, 11, 20, 21].includes(number)) return 2;
  if ([3, 6, 7, 9, 10, 18, 19].includes(number)) return 3;
  if ([5, 13, 15, 17, 22, 23].includes(number)) return 4;
  if ([4, 12, 16, 24].includes(number)) return 5;
  return 1;
}

function footerVariant(id: string): SectionVariant {
  const number = blueprintNumber(id);
  if (number === 2) return 2;
  if ([3, 10].includes(number)) return 3;
  if ([4, 8].includes(number)) return 4;
  if ([7, 9].includes(number)) return 5;
  return 1;
}

function blueprintNumber(id: string): number {
  const match = id.match(/-(\d{2})$/);
  return match ? Number(match[1]) : 1;
}

function layoutFamily(value: string): SectionFamily | undefined {
  const normalized = value.trim().toLowerCase();
  return SECTION_FAMILIES.find((family) => family === normalized);
}

function familyFromId(componentId: string): SectionFamily | undefined {
  const normalized = componentId.toLowerCase();
  const legacy = SECTION_FAMILIES.find((family) => normalized === `${family}.placeholder` || normalized.startsWith(`${family}.`));
  if (legacy) return legacy;
  const upper = componentId.toUpperCase();
  return SECTION_FAMILIES.find((family) => upper.includes(`-${FAMILY_CODES[family]}-`));
}
