import { siteSchema, type Site } from "@micirql/schema";
import type { DesignDna, WebsiteLayoutBlueprint } from "@micirql/design-engine";

export type DentalTasteMutation = {
  id: string;
  label: string;
  site: Site;
  operations: string[];
};

/**
 * Creates a very small set of deterministic visual mutations around an already
 * certified Dental blueprint. Mutations are deliberately limited to properties
 * the blueprint declares safe to vary (density, radius, typography/palette roles
 * and optional proof placement). Shell variants, mobile order, conversion anchors,
 * contrast rules and responsive composition remain untouched.
 */
export function buildDentalTasteMutations(
  site: Site,
  blueprint: WebsiteLayoutBlueprint,
  dna: DesignDna,
): DentalTasteMutation[] {
  const variants: DentalTasteMutation[] = [{ id: "base", label: "Certified base", site, operations: [] }];
  const allowed = blueprint.mutation.allowed.join(" ").toLowerCase();
  const locked = blueprint.mutation.locked.join(" ").toLowerCase();

  const canDensity = /density|spacing/.test(allowed) && !/density/.test(locked);
  const canRadius = /radius|shape/.test(allowed) && !/radius|shape/.test(locked);
  const canTypography = /typography/.test(allowed) && !/typography/.test(locked);
  const canPalette = /palette/.test(allowed) && !/palette/.test(locked);
  const canProofPlacement = /proof placement/.test(allowed) && !/section order|mobile section order/.test(locked);

  // Refined mutation: follows low-density / editorial / luxury DNA.
  if (dna.luxury >= 7 || dna.editorial >= 7 || dna.density <= 4) {
    const refined = structuredClone(site);
    const operations: string[] = [];
    if (canDensity) {
      refined.theme.brand.density = "spacious";
      forEachHomeSection(refined, (section) => {
        if (!isShell(section.component.componentId)) section.props = { ...section.props, layoutDensity: "airy", tasteMutationDensity: true };
      });
      operations.push("airy-density");
    }
    if (canRadius) {
      refined.theme.brand.shape = dna.radius === "square" ? "sharp" : "balanced";
      forEachHomeSection(refined, (section) => {
        if (!isShell(section.component.componentId)) section.props = { ...section.props, layoutRadius: dna.radius === "rounded" ? "rounded" : dna.radius === "square" ? "square" : "soft", tasteMutationRadius: true };
      });
      operations.push("refined-radius-language");
    }
    if (canTypography) {
      applyTypographyMood(refined, dna.typography);
      operations.push(`typography-${dna.typography}`);
    }
    if (canPalette) {
      alternateQuietPaletteRoles(refined);
      operations.push("quiet-palette-rhythm");
    }
    if (canProofPlacement) {
      moveProofEarlier(refined);
      operations.push("proof-near-hero");
    }
    if (operations.length) variants.push({ id: "refined", label: "Refined", site: siteSchema.parse(refined), operations });
  }

  // Conversion mutation: slightly tighter and proof-forward, but never changes
  // shell, CTA anchors or mobile ordering declared by the certified blueprint.
  if (dna.conversionIntensity >= 7 && dna.luxury < 9) {
    const focused = structuredClone(site);
    const operations: string[] = [];
    if (canDensity) {
      focused.theme.brand.density = dna.density >= 7 ? "compact" : "comfortable";
      forEachHomeSection(focused, (section) => {
        if (!isShell(section.component.componentId)) section.props = { ...section.props, layoutDensity: dna.density >= 7 ? "compact" : "balanced", tasteMutationDensity: true };
      });
      operations.push("conversion-density");
    }
    if (canProofPlacement) {
      moveProofEarlier(focused);
      operations.push("proof-forward");
    }
    if (canPalette) {
      emphasizeConversionPalette(focused);
      operations.push("conversion-palette-emphasis");
    }
    if (operations.length) variants.push({ id: "focused", label: "Focused", site: siteSchema.parse(focused), operations });
  }

  return dedupeMutations(variants).slice(0, 3);
}

function forEachHomeSection(site: Site, visit: (section: Site["pages"][number]["sections"][number]) => void) {
  const home = site.pages.find((page) => page.path === "/") ?? site.pages[0];
  for (const section of home?.sections ?? []) visit(section);
}

function moveProofEarlier(site: Site) {
  const home = site.pages.find((page) => page.path === "/") ?? site.pages[0];
  if (!home) return;
  const sections = home.sections;
  const heroIndex = sections.findIndex((section) => /hero/i.test(section.component.componentId));
  const proofIndex = sections.findIndex((section) => /testimonial|proof|trust/i.test(`${section.component.componentId} ${text(section.props.layoutPurpose)} ${text(section.props.layoutPattern)}`));
  if (heroIndex < 0 || proofIndex < 0 || proofIndex <= heroIndex + 1) return;
  const [proof] = sections.splice(proofIndex, 1);
  if (proof) sections.splice(heroIndex + 1, 0, proof);
}

function alternateQuietPaletteRoles(site: Site) {
  let index = 0;
  forEachHomeSection(site, (section) => {
    if (isShell(section.component.componentId)) return;
    if (/cta|contact/i.test(section.component.componentId)) return;
    section.props = { ...section.props, paletteRole: index++ % 2 === 0 ? "background" : "surface", tasteMutationPalette: true };
  });
}

function emphasizeConversionPalette(site: Site) {
  forEachHomeSection(site, (section) => {
    if (/testimonial|proof|trust/i.test(`${section.component.componentId} ${text(section.props.layoutPurpose)}`)) {
      section.props = { ...section.props, paletteRole: "secondary", cardPaletteRole: "secondary", tasteMutationPalette: true };
    }
    if (/cta/i.test(section.component.componentId)) {
      section.props = { ...section.props, paletteRole: "primary", ctaPaletteRole: "accent", tasteMutationPalette: true };
    }
  });
}

function applyTypographyMood(site: Site, typography: DesignDna["typography"]) {
  const sans = 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  if (typography === "luxury-serif" || typography === "editorial-serif") {
    site.theme.brand.typography = { ...site.theme.brand.typography, display: 'Georgia, "Times New Roman", serif', body: sans, ui: sans };
  } else if (typography === "modern-grotesk") {
    site.theme.brand.typography = { ...site.theme.brand.typography, display: '"Avenir Next", Avenir, Montserrat, ui-sans-serif, system-ui, sans-serif', body: sans, ui: sans };
  } else if (typography === "humanist-sans") {
    site.theme.brand.typography = { ...site.theme.brand.typography, display: '"Trebuchet MS", Inter, ui-sans-serif, system-ui, sans-serif', body: sans, ui: sans };
  } else {
    site.theme.brand.typography = { ...site.theme.brand.typography, display: sans, body: sans, ui: sans };
  }
}

function isShell(componentId: string) { return /navbar|nav-|footer/i.test(componentId); }
function text(value: unknown) { return typeof value === "string" ? value.trim().toLowerCase() : ""; }

function dedupeMutations(items: DentalTasteMutation[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = JSON.stringify({ density: item.site.theme.brand.density, shape: item.site.theme.brand.shape, typography: item.site.theme.brand.typography, order: (item.site.pages.find((page) => page.path === "/") ?? item.site.pages[0])?.sections.map((section) => section.id) ?? [] });
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
