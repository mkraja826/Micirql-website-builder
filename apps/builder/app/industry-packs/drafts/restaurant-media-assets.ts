import type { AssetRecord } from "@micirql/assets";

export type RestaurantDraftMediaRole =
  | "dining-atmosphere"
  | "table-setting"
  | "illustrative-food"
  | "ingredients"
  | "illustrative-preparation";

type RestaurantDraftMediaEntry = {
  asset: AssetRecord;
  role: RestaurantDraftMediaRole;
  evidenceContext: "illustrative-not-merchant-evidence";
  prohibitedFamilies: readonly ["services", "team", "testimonials"];
};

/**
 * Licensed internal visual-QA pool. These images exercise Restaurant density,
 * crop and responsive behavior; they are never evidence of a merchant's real
 * menu, location or staff. Production generation must prefer supplied media.
 */
export const RESTAURANT_DRAFT_MEDIA_ENTRIES = [
  entry({
    id: "mi-restaurant-cozy-empty-tables",
    photoId: "8951877",
    name: "Illustrative dining room with set tables",
    alt: "Illustrative stock photograph of an empty dining room with set tables, not a verified view of this restaurant",
    role: "dining-atmosphere",
    focalPoint: { x: 0.5, y: 0.5 },
    tags: ["dining-room", "set-tables", "empty", "warm-light"],
  }),
  entry({
    id: "mi-restaurant-wood-interior",
    photoId: "2566030",
    name: "Illustrative wood restaurant interior",
    alt: "Illustrative stock photograph of an empty wood-lined restaurant interior, not a verified view of this restaurant",
    role: "dining-atmosphere",
    focalPoint: { x: 0.5, y: 0.48 },
    tags: ["dining-room", "wood", "empty", "interior"],
  }),
  entry({
    id: "mi-restaurant-natural-light-interior",
    photoId: "32450962",
    name: "Illustrative naturally lit dining room",
    alt: "Illustrative stock photograph of a naturally lit empty dining room, not a verified view of this restaurant",
    role: "dining-atmosphere",
    focalPoint: { x: 0.52, y: 0.48 },
    tags: ["dining-room", "natural-light", "empty", "plants"],
  }),
  entry({
    id: "mi-restaurant-window-table",
    photoId: "11384933",
    name: "Illustrative set table by a window",
    alt: "Illustrative stock photograph of a set dining table beside a window, not a verified view of this restaurant",
    role: "table-setting",
    focalPoint: { x: 0.5, y: 0.52 },
    tags: ["table-setting", "window", "plates", "empty"],
  }),
  entry({
    id: "mi-restaurant-modern-bar",
    photoId: "5531428",
    name: "Illustrative modern bar counter",
    alt: "Illustrative stock photograph of a modern empty bar counter, not a verified amenity of this restaurant",
    role: "dining-atmosphere",
    focalPoint: { x: 0.5, y: 0.48 },
    tags: ["bar-counter", "empty", "interior", "seating"],
  }),
  entry({
    id: "mi-restaurant-plate-wall-counter",
    photoId: "12387868",
    name: "Illustrative restaurant counter detail",
    alt: "Illustrative stock photograph of a restaurant counter and decorative plate wall, not a verified view of this restaurant",
    role: "dining-atmosphere",
    focalPoint: { x: 0.5, y: 0.5 },
    tags: ["counter", "plate-wall", "interior", "empty"],
  }),
  entry({
    id: "mi-restaurant-courtyard-dining",
    photoId: "34540011",
    name: "Illustrative restaurant courtyard",
    alt: "Illustrative stock photograph of an indoor restaurant courtyard, not a verified view of this restaurant",
    role: "dining-atmosphere",
    focalPoint: { x: 0.5, y: 0.48 },
    tags: ["courtyard", "architecture", "dining-room", "empty"],
  }),
  entry({
    id: "mi-restaurant-rustic-patio",
    photoId: "14949420",
    name: "Illustrative rustic dining patio",
    alt: "Illustrative stock photograph of a rustic restaurant patio, not a verified view of this restaurant",
    role: "dining-atmosphere",
    focalPoint: { x: 0.52, y: 0.5 },
    tags: ["patio", "stone", "warm-light", "dining-room"],
  }),
  entry({
    id: "mi-restaurant-terrace-dusk",
    photoId: "18823962",
    name: "Illustrative restaurant terrace at dusk",
    alt: "Illustrative stock photograph of an empty restaurant terrace at dusk, not a verified amenity of this restaurant",
    role: "dining-atmosphere",
    focalPoint: { x: 0.5, y: 0.5 },
    tags: ["terrace", "outdoor-dining", "dusk", "empty"],
  }),
  entry({
    id: "mi-restaurant-night-window",
    photoId: "36127951",
    name: "Illustrative restaurant window at night",
    alt: "Illustrative stock photograph of a warmly lit restaurant seen through a window at night, not a verified view of this restaurant",
    role: "dining-atmosphere",
    focalPoint: { x: 0.5, y: 0.5 },
    tags: ["night", "window", "warm-light", "table-setting"],
  }),
  entry({
    id: "mi-restaurant-dark-modern-room",
    photoId: "15627000",
    name: "Illustrative dark modern dining room",
    alt: "Illustrative stock photograph of a dark modern restaurant interior, not a verified view of this restaurant",
    role: "dining-atmosphere",
    focalPoint: { x: 0.5, y: 0.46 },
    tags: ["night", "dark-interior", "wood", "empty"],
  }),
  entry({
    id: "mi-restaurant-evening-dining-room",
    photoId: "17294748",
    name: "Illustrative evening dining room",
    alt: "Illustrative stock photograph of a sophisticated restaurant dining room in evening light, not a verified view of this restaurant",
    role: "dining-atmosphere",
    focalPoint: { x: 0.5, y: 0.52 },
    tags: ["evening", "table-setting", "dining-room", "empty"],
  }),
  entry({
    id: "mi-restaurant-banquet-tables",
    photoId: "10875186",
    name: "Illustrative arranged dining tables",
    alt: "Illustrative stock photograph of arranged restaurant tables, not a verified private-dining or banquet space at this restaurant",
    role: "dining-atmosphere",
    focalPoint: { x: 0.5, y: 0.52 },
    tags: ["banquet", "tables", "dining-room", "empty"],
  }),
  entry({
    id: "mi-restaurant-quiet-cafe",
    photoId: "10511434",
    name: "Illustrative quiet dining room",
    alt: "Illustrative stock photograph of a quiet light-filled dining room, not a verified view of this restaurant",
    role: "dining-atmosphere",
    focalPoint: { x: 0.5, y: 0.48 },
    tags: ["quiet", "minimal", "natural-light", "empty"],
  }),
  entry({
    id: "mi-restaurant-warm-cafe",
    photoId: "40408105",
    name: "Illustrative warm dining room",
    alt: "Illustrative stock photograph of a warm empty dining room with wooden furniture, not a verified view of this restaurant",
    role: "dining-atmosphere",
    focalPoint: { x: 0.5, y: 0.48 },
    tags: ["warm", "family-table", "wood", "empty"],
  }),
  entry({
    id: "mi-restaurant-dal-presentation",
    photoId: "19834445",
    name: "Illustrative Indian dish presentation",
    alt: "Illustrative stock food presentation with dal and ingredients, not a verified menu item or portion from this restaurant",
    role: "illustrative-food",
    focalPoint: { x: 0.5, y: 0.5 },
    tags: ["food-presentation", "indian-food", "table", "ingredients"],
  }),
  entry({
    id: "mi-restaurant-plated-dinner",
    photoId: "18058363",
    name: "Illustrative plated dinner",
    alt: "Illustrative stock photograph of a plated dinner, not a verified menu item or portion from this restaurant",
    role: "illustrative-food",
    focalPoint: { x: 0.5, y: 0.48 },
    tags: ["plated-food", "dinner", "restaurant-style", "presentation"],
  }),
  entry({
    id: "mi-restaurant-noodle-presentation",
    photoId: "11256805",
    name: "Illustrative noodle dish presentation",
    alt: "Illustrative stock photograph of a plated noodle dish, not a verified menu item or portion from this restaurant",
    role: "illustrative-food",
    focalPoint: { x: 0.5, y: 0.5 },
    tags: ["plated-food", "noodles", "garnish", "presentation"],
  }),
  entry({
    id: "mi-restaurant-snack-spread",
    photoId: "30574663",
    name: "Illustrative Indian snack spread",
    alt: "Illustrative stock photograph of assorted Indian snacks, not a verified set of menu items or portions from this restaurant",
    role: "illustrative-food",
    focalPoint: { x: 0.5, y: 0.5 },
    tags: ["indian-food", "snacks", "shared-table", "presentation"],
  }),
  entry({
    id: "mi-restaurant-brass-tray-spread",
    photoId: "7340914",
    name: "Illustrative brass-tray food spread",
    alt: "Illustrative stock photograph of food served on a brass tray, not a verified set of menu items or portions from this restaurant",
    role: "illustrative-food",
    focalPoint: { x: 0.5, y: 0.5 },
    tags: ["indian-food", "brass-tray", "shared-table", "presentation"],
  }),
  entry({
    id: "mi-restaurant-home-style-meal",
    photoId: "35375001",
    name: "Illustrative curry and rice meal",
    alt: "Illustrative stock photograph of curry, rice and side dishes, not a verified set of menu items or portions from this restaurant",
    role: "illustrative-food",
    focalPoint: { x: 0.5, y: 0.5 },
    tags: ["indian-food", "curry", "rice", "shared-table"],
  }),
  entry({
    id: "mi-restaurant-colourful-meal",
    photoId: "36939678",
    name: "Illustrative colourful meal spread",
    alt: "Illustrative stock photograph of a colourful meal spread, not a verified set of menu items or portions from this restaurant",
    role: "illustrative-food",
    focalPoint: { x: 0.5, y: 0.5 },
    tags: ["indian-food", "meal-spread", "colour", "presentation"],
  }),
  entry({
    id: "mi-restaurant-herbs-preparation",
    photoId: "33199884",
    name: "Illustrative herbs and preparation surface",
    alt: "Illustrative stock photograph of herbs and prepared ingredients, not a verified representation of sourcing or ingredients from this restaurant",
    role: "ingredients",
    focalPoint: { x: 0.5, y: 0.52 },
    tags: ["herbs", "ingredients", "preparation", "no-people"],
  }),
  entry({
    id: "mi-restaurant-ingredient-table",
    photoId: "10048328",
    name: "Illustrative fresh ingredient table",
    alt: "Illustrative stock photograph of fresh ingredients on a table, not a verified representation of sourcing or ingredients from this restaurant",
    role: "ingredients",
    focalPoint: { x: 0.5, y: 0.5 },
    tags: ["ingredients", "herbs", "tomatoes", "no-people"],
  }),
  entry({
    id: "mi-restaurant-seasoning-hands",
    photoId: "6223144",
    name: "Illustrative cooking detail",
    alt: "Illustrative stock close-up of hands seasoning food, not a verified staff member or preparation process from this restaurant",
    role: "illustrative-preparation",
    focalPoint: { x: 0.5, y: 0.48 },
    tags: ["hands", "cooking", "seasoning", "close-up"],
  }),
  entry({
    id: "mi-restaurant-open-fire-kitchen",
    photoId: "36539296",
    name: "Illustrative open-fire kitchen detail",
    alt: "Illustrative stock photograph of a person cooking with flame in a professional kitchen, not a verified staff member or preparation process from this restaurant",
    role: "illustrative-preparation",
    focalPoint: { x: 0.54, y: 0.48 },
    tags: ["chef", "fire", "open-kitchen", "cooking"],
  }),
] as const satisfies readonly RestaurantDraftMediaEntry[];

export const RESTAURANT_DRAFT_MEDIA_ASSETS = RESTAURANT_DRAFT_MEDIA_ENTRIES.map(
  (entry) => entry.asset,
);

export const RESTAURANT_DRAFT_MEDIA_IDS = RESTAURANT_DRAFT_MEDIA_ASSETS.map(
  (asset) => asset.id,
);

function entry(input: {
  id: string;
  photoId: string;
  name: string;
  alt: string;
  role: RestaurantDraftMediaRole;
  focalPoint: AssetRecord["focalPoint"];
  tags: string[];
}): RestaurantDraftMediaEntry {
  return {
    role: input.role,
    evidenceContext: "illustrative-not-merchant-evidence",
    prohibitedFamilies: ["services", "team", "testimonials"],
    asset: {
      id: input.id,
      source: "micirql-placeholder",
      kind: "image",
      name: input.name,
      alt: input.alt,
      width: 1600,
      height: 1000,
      orientation: "landscape",
      aspectRatio: 1.6,
      focalPoint: input.focalPoint,
      domains: ["restaurant"],
      subtypes: ["restaurant"],
      sectionFamilies: ["hero", "about", "features", "process", "gallery"],
      themes: ["editorial", "luxury", "cinematic", "organic"],
      tags: [
        "restaurant",
        "licensed",
        "pexels",
        "illustrative-not-merchant-evidence",
        input.role,
        ...input.tags,
      ],
      license: "licensed",
      sourceReference: `https://www.pexels.com/photo/${input.photoId}/`,
      originalUrl: `https://images.pexels.com/photos/${input.photoId}/pexels-photo-${input.photoId}.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1600&h=1000`,
      variants: [],
      active: true,
      createdAt: "2026-10-24T00:00:00.000Z",
    },
  };
}
