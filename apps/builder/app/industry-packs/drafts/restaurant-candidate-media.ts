import type { AssetRecord } from "@micirql/assets";
import { siteSchema, type Site } from "@micirql/schema";
import {
  FAMILY_CODES,
  SECTION_FAMILIES,
  type SectionFamily,
} from "@micirql/sections";
import type { RestaurantDraftCandidate } from "./restaurant-candidate-data";
import {
  RESTAURANT_DRAFT_MEDIA_ENTRIES,
  RESTAURANT_DRAFT_MEDIA_IDS,
  type RestaurantDraftMediaRole,
} from "./restaurant-media-assets";

const AUDITED_MEDIA_IDS = new Set<string>(RESTAURANT_DRAFT_MEDIA_IDS);
const AUDITED_MEDIA = RESTAURANT_DRAFT_MEDIA_ENTRIES.map(
  (entry) => entry.asset,
);

const VISITOR_DISCLOSURE =
  "Preview imagery is illustrative and may not show this restaurant or its menu.";
const AUDIT_DISCLOSURE =
  "Illustrative stock photography for layout review; not a verified dish, portion, venue, amenity, ingredient, process, or staff image from this restaurant.";

/**
 * The selection order is a stable semantic contract consumed by
 * `applyRestaurantCandidateMedia`:
 *
 * 0–5   Home, Menu, Visit, Reservations, Story and Contact heroes
 * 6–10  Home supporting gallery
 * 11–12 Menu supporting gallery
 * 13–14 Visit supporting gallery
 * 15    Story supporting gallery
 *
 * Every selection uses 16 unique assets from the broader audited pool.
 * Candidate-owned Home heroes make the Top-20 review visually honest while
 * deterministic role selection keeps inner-route media meaningful and prevents
 * a hero from reappearing as supporting content within the same site.
 */
const PAGE_MEDIA_SLOTS = {
  "/": { hero: 0, support: [6, 7, 8, 9, 10] },
  "/menu": { hero: 1, support: [11, 12] },
  "/visit": { hero: 2, support: [13, 14] },
  "/reservations": { hero: 3, support: [] },
  "/story": { hero: 4, support: [15] },
  "/contact": { hero: 5, support: [] },
} as const;

export const RESTAURANT_CANDIDATE_HOME_HERO_IDS = {
  "table-story-editorial": "mi-restaurant-cozy-empty-tables",
  "market-ledger": "mi-restaurant-plate-wall-counter",
  "courtyard-threshold": "mi-restaurant-courtyard-dining",
  "tasting-sequence": "mi-restaurant-plated-dinner",
  "neighbourhood-window": "mi-restaurant-night-window",
  "open-fire": "mi-restaurant-open-fire-kitchen",
  "seasonal-journal": "mi-restaurant-herbs-preparation",
  "family-table": "mi-restaurant-warm-cafe",
  "ingredient-atlas": "mi-restaurant-ingredient-table",
  "counter-rhythm": "mi-restaurant-modern-bar",
  "night-passage": "mi-restaurant-dark-modern-room",
  "linen-and-light": "mi-restaurant-natural-light-interior",
  "brass-and-spice": "mi-restaurant-brass-tray-spread",
  "menu-poster": "mi-restaurant-dal-presentation",
  "reservation-concierge": "mi-restaurant-evening-dining-room",
  "terrace-air": "mi-restaurant-terrace-dusk",
  "banquet-plan": "mi-restaurant-banquet-tables",
  "kitchen-pass": "mi-restaurant-seasoning-hands",
  "dual-script": "mi-restaurant-rustic-patio",
  "quiet-room": "mi-restaurant-quiet-cafe",
} as const satisfies Record<string, string>;

/**
 * Returns one deterministic, route-semantic 16-image selection. The candidate
 * Home hero is unique across the Top 20; the remaining slots prefer the right
 * semantic role and fall back only within the audited pool. Each site still has
 * six distinct heroes, no hero/support reuse, six Home images and sixteen site
 * images.
 */
export function restaurantCandidateMediaSelection(
  candidate: RestaurantDraftCandidate,
): AssetRecord[] {
  const offset = candidate.rankSeed - 1;
  const homeHeroId = (
    RESTAURANT_CANDIDATE_HOME_HERO_IDS as Record<string, string>
  )[candidate.recipeId];
  const homeHero = AUDITED_MEDIA.find((asset) => asset.id === homeHeroId);
  if (!homeHero) {
    throw new Error(
      `Restaurant candidate ${candidate.recipeId} does not have an audited Home hero.`,
    );
  }
  const used = new Set<string>([homeHero.id]);
  const take = (
    roles: readonly RestaurantDraftMediaRole[],
    label: string,
  ): AssetRecord => {
    const preferred = roles.flatMap((role) => rotatedAssets(role, offset));
    const asset = [...preferred, ...rotate(AUDITED_MEDIA, offset)].find(
      (candidateAsset) => !used.has(candidateAsset.id),
    );
    if (!asset) {
      throw new Error(
        `Restaurant candidate ${candidate.recipeId} cannot fill its ${label} media slot.`,
      );
    }
    used.add(asset.id);
    return asset;
  };

  const selected = [
    homeHero,
    take(["illustrative-food"], "Menu hero"),
    take(["dining-atmosphere"], "Visit hero"),
    take(["table-setting", "dining-atmosphere"], "Reservations hero"),
    take(["ingredients", "illustrative-preparation"], "Story hero"),
    take(["dining-atmosphere"], "Contact hero"),
    take(["illustrative-food"], "Home support 1"),
    take(["illustrative-food"], "Home support 2"),
    take(["illustrative-food"], "Home support 3"),
    take(["dining-atmosphere"], "Home support 4"),
    take(["ingredients", "illustrative-preparation"], "Home support 5"),
    take(["illustrative-food"], "Menu support 1"),
    take(["illustrative-food"], "Menu support 2"),
    take(["dining-atmosphere"], "Visit support 1"),
    take(["dining-atmosphere"], "Visit support 2"),
    take(["ingredients", "illustrative-preparation"], "Story support"),
  ];

  const selectedIds = selected.map((asset) => asset.id);
  if (selected.length !== 16 || new Set(selectedIds).size !== selected.length) {
    throw new Error(
      `Restaurant candidate ${candidate.recipeId} must select 16 unique audited assets.`,
    );
  }
  if (selectedIds.some((assetId) => !AUDITED_MEDIA_IDS.has(assetId))) {
    throw new Error(
      `Restaurant candidate ${candidate.recipeId} selected media outside the audited draft pool.`,
    );
  }
  return selected;
}

/**
 * Applies candidate-owned visual-QA media by page and semantic slot. Merchant
 * media always wins: a non-pool image is never replaced, removed or mixed with
 * newly injected stock. Audited stock galleries are rebuilt canonically, so
 * applying A then B produces the same candidate-owned media as applying B
 * directly, and applying B twice is idempotent.
 */
export function applyRestaurantCandidateMedia(
  site: Site,
  candidate: RestaurantDraftCandidate,
): Site {
  if (site.domain !== "restaurant" || site.subtype !== "restaurant") {
    throw new Error(
      "Restaurant candidate media can only be applied to a restaurant/restaurant scaffold.",
    );
  }

  const selection = restaurantCandidateMediaSelection(candidate);
  const next = structuredClone(site);

  for (const page of next.pages) {
    const plan = PAGE_MEDIA_SLOTS[page.path as keyof typeof PAGE_MEDIA_SLOTS];
    if (!plan) continue;

    const hero = page.sections.find(
      (section) => sectionFamily(section.component.componentId) === "hero",
    );
    if (hero && replaceableImage(hero.props.image)) {
      hero.props.image = assetReference(selection[plan.hero]!);
      hero.props.description = appendVisitorDisclosure(hero.props.description);
    }

    if (!plan.support.length) continue;
    const gallery = page.sections.find(
      (section) => sectionFamily(section.component.componentId) === "gallery",
    );
    if (!gallery) continue;

    const supportAssets = plan.support.map((slot) => selection[slot]!);
    const items = recordList(gallery.props.items);
    const candidateOwnedGallery =
      items.length === 0 || items.every(isAuditedMediaItem);

    if (candidateOwnedGallery) {
      gallery.hidden = false;
      gallery.props = {
        ...gallery.props,
        title: galleryTitle(page.path),
        description: VISITOR_DISCLOSURE,
        items: supportAssets.map(stockGalleryItem),
      };
      continue;
    }

    // A mixed gallery can occur after an editor or content pass. Replace only
    // the audited candidate-owned slots and preserve every merchant item byte
    // for byte. Do not append additional stock beside merchant evidence.
    let supportIndex = 0;
    let replaced = false;
    const preservedItems = items.flatMap((item) => {
      if (!isAuditedMediaItem(item)) return [item];
      const asset = supportAssets[supportIndex++];
      if (!asset) return [];
      replaced = true;
      return [stockGalleryItem(asset)];
    });
    if (replaced) {
      gallery.hidden = false;
      gallery.props = {
        ...gallery.props,
        description: VISITOR_DISCLOSURE,
        items: preservedItems,
      };
    }
  }

  return siteSchema.parse(next);
}

function assetsForRole(role: RestaurantDraftMediaRole): AssetRecord[] {
  return RESTAURANT_DRAFT_MEDIA_ENTRIES.filter(
    (entry) => entry.role === role,
  ).map((entry) => entry.asset);
}

function rotatedAssets(role: RestaurantDraftMediaRole, offset: number) {
  return rotate(assetsForRole(role), offset);
}

function rotate<T>(values: readonly T[], offset: number): T[] {
  if (!values.length) return [];
  const normalized = normalizeOffset(offset, values.length);
  return [...values.slice(normalized), ...values.slice(0, normalized)];
}

function stockGalleryItem(asset: AssetRecord) {
  return {
    title: asset.name,
    description: AUDIT_DISCLOSURE,
    image: assetReference(asset),
  };
}

function assetReference(asset: AssetRecord) {
  return {
    assetId: asset.id,
    src: asset.originalUrl,
    alt: asset.alt,
    focalPoint: asset.focalPoint,
    license: asset.license,
    ...(asset.sourceReference
      ? { sourceReference: asset.sourceReference }
      : {}),
  };
}

function replaceableImage(value: unknown): boolean {
  const references = imageReferences(value);
  return (
    references.length === 0 ||
    references.every((reference) => AUDITED_MEDIA_IDS.has(reference.assetId))
  );
}

function isAuditedMediaItem(value: Record<string, unknown>): boolean {
  const references = imageReferences(value);
  return (
    references.length > 0 &&
    references.every((reference) => AUDITED_MEDIA_IDS.has(reference.assetId))
  );
}

function imageReferences(value: unknown): Array<{ assetId: string }> {
  if (Array.isArray(value)) return value.flatMap(imageReferences);
  if (!isRecord(value)) return [];
  const assetId = text(value.assetId);
  const source = text(value.src) || text(value.originalUrl);
  // A source without a catalog ID is still merchant media and must not be
  // mistaken for an empty slot. Its empty ID deliberately fails the audited
  // pool membership check used by the replacement predicates.
  if (source) return [{ assetId }];
  return Object.values(value).flatMap(imageReferences);
}

function recordList(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function galleryTitle(path: string) {
  if (path === "/menu") return "Food imagery";
  if (path === "/visit") return "Atmosphere";
  if (path === "/story") return "Ingredients and craft";
  return "Food and atmosphere";
}

function appendVisitorDisclosure(value: unknown) {
  const current = text(value);
  if (current.toLocaleLowerCase("en-US").includes("imagery is illustrative")) {
    return current;
  }
  return current ? `${current} ${VISITOR_DISCLOSURE}` : VISITOR_DISCLOSURE;
}

function sectionFamily(componentId: string): SectionFamily | undefined {
  const normalized = componentId.toLowerCase();
  const legacy = SECTION_FAMILIES.find(
    (family) =>
      normalized === `${family}.placeholder` ||
      normalized.startsWith(`${family}.`),
  );
  if (legacy) return legacy;
  const upper = componentId.toUpperCase();
  return SECTION_FAMILIES.find((family) =>
    upper.includes(`-${FAMILY_CODES[family]}-`),
  );
}

function normalizeOffset(value: number, length: number) {
  return ((Math.trunc(value) % length) + length) % length;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
