import { siteSchema, type Site } from "@micirql/schema";
import type { WebsiteLayoutBlueprint, WebsiteLayoutSection } from "@micirql/design-engine";
import { FAMILY_CODES, SECTION_FAMILIES, sectionDesignId, type SectionFamily, type SectionVariant } from "@micirql/sections";

type SiteSection = Site["pages"][number]["sections"][number];

/**
 * Applies a complete curated website layout on top of generated content.
 * The blueprint is authoritative for home-page order, shell variants and the
 * visual design language that is safe to vary without replacing user brand facts.
 */
export function applyWebsiteLayoutBlueprint(site: Site, layout: WebsiteLayoutBlueprint): Site {
  const next = structuredClone(site);
  applyLayoutDesignLanguage(next, layout);
  const themeFamily = next.theme.family;

  for (const page of next.pages) {
    if (page.path !== "/" || !page.sections.length) continue;

    const buckets = new Map<SectionFamily, SiteSection[]>();
    const unknown: SiteSection[] = [];
    for (const existing of page.sections) {
      const family = familyFromId(existing.component.componentId);
      if (!family) { unknown.push(existing); continue; }
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
      section.component = { componentId: sectionDesignId(themeFamily, family, variant), version: source.component.version };
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
        layoutRadius: layout.design.radius,
        layoutPaletteIds: [...layout.design.preferredPaletteIds],
        layoutTypographyIds: [...layout.design.preferredTypographyIds],
        layoutVisualLocked: true,
        layoutMobileRules: [...layout.responsive.mobile.rules],
        ...presentationFor(layoutSection, family),
      };
      ordered.push(section);
    }

    page.sections = [...ordered, ...unknown.map((section) => ({
      ...section,
      props: {
        ...section.props,
        layoutBlueprintId: layout.id,
        layoutArchetype: layout.archetype,
        layoutDensity: layout.design.density,
        layoutImageStyle: layout.design.imageStyle,
        layoutRhythm: layout.design.sectionRhythm,
        layoutRadius: layout.design.radius,
        layoutPaletteIds: [...layout.design.preferredPaletteIds],
        layoutTypographyIds: [...layout.design.preferredTypographyIds],
        layoutVisualLocked: true,
      },
    }))];
  }

  return siteSchema.parse(next);
}

function applyLayoutDesignLanguage(site: Site, layout: WebsiteLayoutBlueprint) {
  const brand = site.theme.brand;
  brand.density = densityFor(layout.design.density);
  brand.shape = shapeFor(layout.design.radius);
  brand.typography = typographyForLayout(layout.design.preferredTypographyIds, brand.typography);

  const previous = brand.intelligence;
  brand.intelligence = {
    tone: toneForArchetype(layout.archetype),
    typographyMood: typographyMoodFor(layout.design.preferredTypographyIds),
    buttonStyle: buttonStyleFor(layout.archetype, layout.design.radius),
    imageryStyle: imageryStyleFor(layout.design.imageStyle),
    recommendations: [
      `Visual system locked to certified layout: ${layout.name}`,
      `Palette family lock: ${layout.design.preferredPaletteIds.join(" / ") || "brand-resolved"}`,
      `Typography family lock: ${layout.design.preferredTypographyIds.join(" / ") || "brand-resolved"}`,
      `Section rhythm lock: ${layout.design.sectionRhythm}`,
      `Image direction lock: ${layout.design.imageStyle}`,
      `Density lock: ${layout.design.density}`,
      `Radius lock: ${layout.design.radius}`,
      ...(previous?.recommendations ?? []).filter((item) => !/palette family|typography|section rhythm|image direction|density|radius/i.test(item)),
      ...layout.responsive.mobile.rules.slice(0, 3),
    ].slice(0, 12),
  };
}

function densityFor(value: WebsiteLayoutBlueprint["design"]["density"]): Site["theme"]["brand"]["density"] {
  if (value === "compact") return "compact";
  if (value === "airy") return "spacious";
  return "comfortable";
}

function shapeFor(value: WebsiteLayoutBlueprint["design"]["radius"]): Site["theme"]["brand"]["shape"] {
  if (value === "square") return "sharp";
  if (value === "rounded") return "soft";
  return "balanced";
}

function typographyForLayout(ids: string[], fallback: Site["theme"]["brand"]["typography"]): Site["theme"]["brand"]["typography"] {
  const id = ids[0]?.toLowerCase() ?? "";
  const sans = 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  if (id.includes("premium")) return { ...fallback, display: 'Georgia, "Times New Roman", serif', body: sans, ui: sans };
  if (id.includes("modern")) return { ...fallback, display: '"Avenir Next", Avenir, Montserrat, ui-sans-serif, system-ui, sans-serif', body: sans, ui: sans };
  if (id.includes("humanist")) return { ...fallback, display: '"Trebuchet MS", Inter, ui-sans-serif, system-ui, sans-serif', body: sans, ui: sans };
  return { ...fallback, display: sans, body: sans, ui: sans };
}

function typographyMoodFor(ids: string[]): NonNullable<Site["theme"]["brand"]["intelligence"]>["typographyMood"] {
  const id = ids[0]?.toLowerCase() ?? "";
  if (id.includes("premium")) return "editorial";
  if (id.includes("modern")) return "geometric";
  return "humanist";
}

function toneForArchetype(archetype: string): NonNullable<Site["theme"]["brand"]["intelligence"]>["tone"] {
  const value = archetype.toLowerCase();
  if (/editorial|brand-led/.test(value)) return "editorial";
  if (/minimal-premium|visual-image-led/.test(value)) return "premium";
  if (/modern-experimental/.test(value)) return "innovative";
  if (/conversion/.test(value)) return "professional";
  return "professional";
}

function buttonStyleFor(archetype: string, radius: WebsiteLayoutBlueprint["design"]["radius"]): NonNullable<Site["theme"]["brand"]["intelligence"]>["buttonStyle"] {
  const value = archetype.toLowerCase();
  if (/editorial|minimal-premium/.test(value)) return "outline-accent";
  if (/conversion/.test(value)) return "high-contrast";
  if (radius === "rounded") return "soft";
  return "solid";
}

function imageryStyleFor(value: WebsiteLayoutBlueprint["design"]["imageStyle"]): NonNullable<Site["theme"]["brand"]["intelligence"]>["imageryStyle"] {
  const normalized = String(value).toLowerCase();
  if (/portrait/.test(normalized)) return "portrait-led";
  if (/outcome/.test(normalized)) return "editorial";
  if (/technology|clinical/.test(normalized)) return "clean-product";
  if (/lifestyle/.test(normalized)) return "human-lifestyle";
  return "editorial";
}

export function layoutCoverage(site: Site, layout: WebsiteLayoutBlueprint): { expected: number; matched: number; missing: string[]; complete: boolean } {
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
  return { expected: layout.sections.length, matched: layout.sections.length - missing.length, missing, complete: missing.length === 0 };
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
  if (family === "testimonials" && layout.id === "dental-18-proof-first" && section.id === "proof") return 4;
  const pattern = section.pattern.toLowerCase();
  if (family === "testimonials") { if (/trust-strip|metric|proof-strip/.test(pattern)) return 3; if (/wall|reviews-wall/.test(pattern)) return 4; if (/dark/.test(pattern)) return 5; return 2; }
  if (family === "services") { if (/editorial/.test(pattern)) return 4; if (/band/.test(pattern)) return 5; if (/list/.test(pattern)) return 2; return 3; }
  if (family === "team") { if (/editorial/.test(pattern)) return 4; if (/profile-list/.test(pattern)) return 3; if (/dark/.test(pattern)) return 5; return 2; }
  if (family === "features") { if (/bento/.test(pattern)) return 3; if (/editorial/.test(pattern)) return 4; if (/dark/.test(pattern)) return 5; return 2; }
  if (family === "process") { if (/timeline|journey/.test(pattern)) return 3; if (/sticky/.test(pattern)) return 4; if (/band/.test(pattern)) return 5; return 2; }
  if (family === "gallery") { if (/rail/.test(pattern)) return 3; if (/editorial/.test(pattern)) return 4; if (/full|immersive/.test(pattern)) return 5; return 2; }
  if (family === "cta") { if (/center/.test(pattern)) return 3; if (/panel/.test(pattern)) return 4; if (/brand/.test(pattern)) return 5; return 2; }
  if (family === "contact") { if (/center/.test(pattern)) return 3; if (/panel/.test(pattern)) return 4; if (/dark/.test(pattern)) return 5; return 2; }
  if (family === "about") { if (/story/.test(pattern)) return 2; if (/center/.test(pattern)) return 3; if (/editorial/.test(pattern)) return 4; if (/statement/.test(pattern)) return 5; }
  return 1;
}

function navbarVariant(id: string): SectionVariant { const number = blueprintNumber(id); if ([2, 6].includes(number)) return 2; if (number === 3) return 3; if ([4, 5].includes(number)) return 4; if ([9, 15, 16].includes(number)) return 5; return 1; }
function heroVariant(id: string): SectionVariant { const number = blueprintNumber(id); if ([2, 8, 11, 20, 21].includes(number)) return 2; if ([3, 6, 7, 9, 10, 18, 19].includes(number)) return 3; if ([5, 13, 15, 17, 22, 23].includes(number)) return 4; if ([4, 12, 16, 24].includes(number)) return 5; return 1; }
function footerVariant(id: string): SectionVariant { const number = blueprintNumber(id); if (number === 2) return 2; if ([3, 10].includes(number)) return 3; if ([4, 8].includes(number)) return 4; if ([7, 9].includes(number)) return 5; return 1; }
function blueprintNumber(id: string): number { const match = id.match(/-(\d{2})$/); return match ? Number(match[1]) : 1; }
function layoutFamily(value: string): SectionFamily | undefined { const normalized = value.trim().toLowerCase(); return SECTION_FAMILIES.find((family) => family === normalized); }
function familyFromId(componentId: string): SectionFamily | undefined { const normalized = componentId.toLowerCase(); const legacy = SECTION_FAMILIES.find((family) => normalized === `${family}.placeholder` || normalized.startsWith(`${family}.`)); if (legacy) return legacy; const upper = componentId.toUpperCase(); return SECTION_FAMILIES.find((family) => upper.includes(`-${FAMILY_CODES[family]}-`)); }
