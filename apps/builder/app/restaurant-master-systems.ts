import type { SectionFamily, SectionVariant } from "@micirql/sections";

export type RestaurantMasterSystem = {
  name: string;
  description: string;
  palette: string;
  variants: Partial<Record<SectionFamily, SectionVariant>>;
  sequence: SectionFamily[];
  intent: {
    layout: "centered" | "split" | "editorial" | "grid" | "cinematic" | "story";
    navigation: "compact" | "classic" | "overlay" | "editorial" | "utility";
    hero: "centered" | "split" | "image-led" | "editorial" | "full-bleed";
    imagery: "supporting" | "balanced" | "dominant";
    density: "tight" | "balanced" | "spacious";
  };
};

export const RESTAURANT_MASTER_SYSTEMS: RestaurantMasterSystem[] = [
  {
    name: "Cinematic Dining",
    description: "Full-bleed atmosphere, dramatic food photography and a direct reservation journey.",
    palette: "dark-premium",
    variants: { navbar: 5, hero: 5, about: 2, services: 5, features: 2, gallery: 5, testimonials: 2, team: 4, process: 2, cta: 5, contact: 5, footer: 3 },
    sequence: ["navbar", "hero", "gallery", "services", "about", "testimonials", "cta", "contact", "footer"],
    intent: { layout: "cinematic", navigation: "overlay", hero: "full-bleed", imagery: "dominant", density: "spacious" },
  },
  {
    name: "Menu First",
    description: "A practical food-led composition that gets signature dishes and menu choices in front of guests immediately.",
    palette: "light-corporate",
    variants: { navbar: 2, hero: 1, about: 2, services: 1, features: 3, gallery: 2, testimonials: 3, team: 2, process: 1, cta: 2, contact: 4, footer: 4 },
    sequence: ["navbar", "hero", "services", "features", "gallery", "about", "testimonials", "cta", "contact", "footer"],
    intent: { layout: "grid", navigation: "utility", hero: "split", imagery: "balanced", density: "balanced" },
  },
  {
    name: "Chef Story Editorial",
    description: "A magazine-like narrative built around the chef, origin story, ingredients and signature plates.",
    palette: "editorial",
    variants: { navbar: 4, hero: 4, about: 4, services: 4, features: 4, gallery: 4, testimonials: 2, team: 4, process: 4, cta: 4, contact: 2, footer: 5 },
    sequence: ["navbar", "hero", "about", "team", "services", "gallery", "features", "testimonials", "cta", "contact", "footer"],
    intent: { layout: "editorial", navigation: "editorial", hero: "editorial", imagery: "dominant", density: "spacious" },
  },
  {
    name: "Reservation First",
    description: "Conversion-first restaurant design that keeps booking, hours and location continuously easy to reach.",
    palette: "brand-heavy",
    variants: { navbar: 2, hero: 1, about: 2, services: 2, features: 1, gallery: 3, testimonials: 3, team: 2, process: 2, cta: 2, contact: 2, footer: 3 },
    sequence: ["navbar", "hero", "cta", "services", "gallery", "testimonials", "about", "contact", "footer"],
    intent: { layout: "split", navigation: "utility", hero: "split", imagery: "balanced", density: "balanced" },
  },
  {
    name: "Neighborhood Bistro",
    description: "Warm, approachable and local, with personality, opening hours, familiar dishes and community proof.",
    palette: "color-block",
    variants: { navbar: 3, hero: 3, about: 3, services: 3, features: 2, gallery: 3, testimonials: 1, team: 3, process: 3, cta: 3, contact: 3, footer: 2 },
    sequence: ["navbar", "hero", "about", "services", "gallery", "testimonials", "contact", "cta", "footer"],
    intent: { layout: "centered", navigation: "classic", hero: "centered", imagery: "balanced", density: "balanced" },
  },
  {
    name: "Luxury Tasting",
    description: "Restrained fine-dining art direction with generous whitespace, selective imagery and quiet conversion.",
    palette: "editorial",
    variants: { navbar: 5, hero: 3, about: 3, services: 3, features: 2, gallery: 4, testimonials: 2, team: 3, process: 4, cta: 4, contact: 3, footer: 5 },
    sequence: ["navbar", "hero", "about", "services", "team", "gallery", "testimonials", "cta", "contact", "footer"],
    intent: { layout: "story", navigation: "compact", hero: "centered", imagery: "supporting", density: "spacious" },
  },
  {
    name: "Social Food Gallery",
    description: "A visual, energetic composition for highly photogenic restaurants where dishes and atmosphere sell the experience.",
    palette: "color-block",
    variants: { navbar: 4, hero: 2, about: 4, services: 4, features: 3, gallery: 3, testimonials: 4, team: 4, process: 3, cta: 5, contact: 4, footer: 5 },
    sequence: ["navbar", "hero", "gallery", "services", "testimonials", "about", "cta", "contact", "footer"],
    intent: { layout: "grid", navigation: "overlay", hero: "image-led", imagery: "dominant", density: "tight" },
  },
  {
    name: "Modern Casual",
    description: "Fast, clear and youthful with bold typography, category-led food choices and strong takeaway or booking actions.",
    palette: "brand-heavy",
    variants: { navbar: 4, hero: 2, about: 2, services: 5, features: 5, gallery: 2, testimonials: 4, team: 2, process: 3, cta: 5, contact: 4, footer: 3 },
    sequence: ["navbar", "hero", "services", "features", "gallery", "cta", "testimonials", "contact", "footer"],
    intent: { layout: "grid", navigation: "compact", hero: "image-led", imagery: "balanced", density: "tight" },
  },
  {
    name: "Heritage House",
    description: "Story-rich hospitality design for established restaurants with history, regional cuisine and a strong sense of place.",
    palette: "editorial",
    variants: { navbar: 1, hero: 4, about: 5, services: 2, features: 4, gallery: 4, testimonials: 3, team: 3, process: 4, cta: 4, contact: 1, footer: 5 },
    sequence: ["navbar", "hero", "about", "features", "services", "gallery", "testimonials", "contact", "cta", "footer"],
    intent: { layout: "story", navigation: "classic", hero: "editorial", imagery: "balanced", density: "spacious" },
  },
  {
    name: "Chef Counter",
    description: "Intimate and premium, emphasizing craft, tasting progression, chef interaction and limited-seat reservations.",
    palette: "dark-premium",
    variants: { navbar: 5, hero: 5, about: 4, services: 3, features: 5, gallery: 5, testimonials: 2, team: 5, process: 4, cta: 5, contact: 5, footer: 3 },
    sequence: ["navbar", "hero", "team", "process", "services", "gallery", "testimonials", "cta", "contact", "footer"],
    intent: { layout: "cinematic", navigation: "overlay", hero: "full-bleed", imagery: "dominant", density: "spacious" },
  },
  {
    name: "Local Favourite",
    description: "Trust-led and approachable, surfacing reviews, popular dishes, location and practical visit information early.",
    palette: "light-corporate",
    variants: { navbar: 1, hero: 3, about: 2, services: 2, features: 1, gallery: 2, testimonials: 3, team: 2, process: 2, cta: 2, contact: 4, footer: 4 },
    sequence: ["navbar", "hero", "testimonials", "services", "gallery", "about", "contact", "cta", "footer"],
    intent: { layout: "centered", navigation: "classic", hero: "centered", imagery: "supporting", density: "balanced" },
  },
  {
    name: "Event Dining",
    description: "Hospitality composition for venues balancing regular dining with private events, celebrations and group enquiries.",
    palette: "brand-heavy",
    variants: { navbar: 2, hero: 1, about: 2, services: 4, features: 4, gallery: 5, testimonials: 3, team: 3, process: 2, cta: 2, contact: 2, footer: 3 },
    sequence: ["navbar", "hero", "features", "gallery", "services", "about", "testimonials", "cta", "contact", "footer"],
    intent: { layout: "split", navigation: "utility", hero: "split", imagery: "dominant", density: "balanced" },
  },
];
