import type { Site } from "@micirql/schema";
import {
  FAMILY_CODES,
  SECTION_FAMILIES,
  type SectionFamily,
} from "@micirql/sections";

export type RestaurantCandidateHomeFrame = {
  menuTitle: string;
  galleryTitle: string;
  storyLabel: string;
  detailsTitle: string;
  conversionLabel: string;
};

/**
 * Customer-facing Home labels for the staged Restaurant compositions. These
 * labels provide editorial identity without introducing restaurant facts. In
 * particular, the story and conversion labels are rendered as eyebrows so a
 * supplied story heading and the factual CTA title remain unchanged.
 */
export const RESTAURANT_CANDIDATE_HOME_FRAMES = {
  "restaurant-restaurant-table-story-editorial": {
    menuTitle: "The menu from the table",
    galleryTitle: "Food and place in frames",
    storyLabel: "The table story",
    detailsTitle: "Details for your visit",
    conversionLabel: "Choose your next chapter",
  },
  "restaurant-restaurant-market-ledger": {
    menuTitle: "Current menu ledger",
    galleryTitle: "Food and place record",
    storyLabel: "From the restaurant",
    detailsTitle: "Visit ledger",
    conversionLabel: "Check the details before you visit",
  },
  "restaurant-restaurant-courtyard-threshold": {
    menuTitle: "Menu beyond the threshold",
    galleryTitle: "A sense of place",
    storyLabel: "The story inside",
    detailsTitle: "Arrival and opening details",
    conversionLabel: "Plan the route to your visit",
  },
  "restaurant-restaurant-tasting-sequence": {
    menuTitle: "The menu programme",
    galleryTitle: "A visual interlude",
    storyLabel: "The restaurant sequence",
    detailsTitle: "Practical notes",
    conversionLabel: "Continue the dining plan",
  },
  "restaurant-restaurant-neighbourhood-window": {
    menuTitle: "The neighbourhood menu",
    galleryTitle: "Food and place nearby",
    storyLabel: "A local restaurant story",
    detailsTitle: "Local visit details",
    conversionLabel: "Plan a neighbourhood visit",
  },
  "restaurant-restaurant-open-fire": {
    menuTitle: "The menu in focus",
    galleryTitle: "Food and place, full frame",
    storyLabel: "The restaurant's approach",
    detailsTitle: "Essential visit details",
    conversionLabel: "Explore before you visit",
  },
  "restaurant-restaurant-seasonal-journal": {
    menuTitle: "Current menu journal",
    galleryTitle: "Food and place notes",
    storyLabel: "From the restaurant's story",
    detailsTitle: "The visit register",
    conversionLabel: "Turn to the visit details",
  },
  "restaurant-restaurant-family-table": {
    menuTitle: "Menu for the table",
    galleryTitle: "Food and room views",
    storyLabel: "The story around the table",
    detailsTitle: "What to know before visiting",
    conversionLabel: "Plan the table request",
  },
  "restaurant-restaurant-ingredient-atlas": {
    menuTitle: "Current menu index",
    galleryTitle: "Food details and place",
    storyLabel: "Notes from the restaurant",
    detailsTitle: "Place and visit index",
    conversionLabel: "Map out your visit",
  },
  "restaurant-restaurant-counter-rhythm": {
    menuTitle: "The menu board",
    galleryTitle: "Food and place signals",
    storyLabel: "About this restaurant",
    detailsTitle: "Quick visit facts",
    conversionLabel: "Choose your next stop",
  },
  "restaurant-restaurant-night-passage": {
    menuTitle: "The menu after the opening scene",
    galleryTitle: "Atmosphere in frames",
    storyLabel: "The restaurant story",
    detailsTitle: "Arrival notes",
    conversionLabel: "Continue to the visit guide",
  },
  "restaurant-restaurant-linen-and-light": {
    menuTitle: "A concise current menu",
    galleryTitle: "Food and space, quietly framed",
    storyLabel: "The restaurant point of view",
    detailsTitle: "Essential information, lightly set",
    conversionLabel: "Take the next step",
  },
  "restaurant-restaurant-brass-and-spice": {
    menuTitle: "Current menu, richly presented",
    galleryTitle: "Food and place in colour",
    storyLabel: "The story behind the setting",
    detailsTitle: "Visit facts, clearly set",
    conversionLabel: "Plan the visit from here",
  },
  "restaurant-restaurant-menu-poster": {
    menuTitle: "The menu, front and centre",
    galleryTitle: "Food and place in poster frames",
    storyLabel: "Behind the menu",
    detailsTitle: "Visit information block",
    conversionLabel: "Choose menu or visit",
  },
  "restaurant-restaurant-reservation-concierge": {
    menuTitle: "Menu before you request",
    galleryTitle: "Food and place preview",
    storyLabel: "The restaurant in brief",
    detailsTitle: "Request and visit essentials",
    conversionLabel: "Plan before sending a request",
  },
  "restaurant-restaurant-terrace-air": {
    menuTitle: "An open look at the menu",
    galleryTitle: "Food and place, wide frame",
    storyLabel: "About the restaurant, simply",
    detailsTitle: "Arrival and hours",
    conversionLabel: "Open the visit guide",
  },
  "restaurant-restaurant-banquet-plan": {
    menuTitle: "Menu planning view",
    galleryTitle: "Table and place imagery",
    storyLabel: "The dining plan, explained",
    detailsTitle: "Practical planning details",
    conversionLabel: "Plan before you request",
  },
  "restaurant-restaurant-kitchen-pass": {
    menuTitle: "Current menu docket",
    galleryTitle: "Food and place, documentary view",
    storyLabel: "How the restaurant tells its story",
    detailsTitle: "Visit and service notes",
    conversionLabel: "Move from menu to visit",
  },
  "restaurant-restaurant-dual-script": {
    menuTitle: "The menu, line by line",
    galleryTitle: "Food and place in one view",
    storyLabel: "Restaurant notes",
    detailsTitle: "Visit details in one place",
    conversionLabel: "Continue to menu or visit",
  },
  "restaurant-restaurant-quiet-room": {
    menuTitle: "A calm look at the menu",
    galleryTitle: "Food and place, with room to breathe",
    storyLabel: "The restaurant story, simply",
    detailsTitle: "Quietly practical details",
    conversionLabel: "Plan the visit at your pace",
  },
} as const satisfies Record<string, RestaurantCandidateHomeFrame>;

export function restaurantCandidateHomeFrame(
  candidateId: string,
): RestaurantCandidateHomeFrame {
  const frame = (
    RESTAURANT_CANDIDATE_HOME_FRAMES as Record<
      string,
      RestaurantCandidateHomeFrame | undefined
    >
  )[candidateId];
  if (!frame) {
    throw new Error(`Missing Restaurant Home frame for ${candidateId}.`);
  }
  return { ...frame };
}

export function applyRestaurantCandidateHomePresentation(
  site: Site,
  candidateId: string,
): Site {
  const frame = restaurantCandidateHomeFrame(candidateId);
  const next = structuredClone(site);
  const home = next.pages.find((page) => page.path === "/");
  if (!home) throw new Error("Restaurant candidate requires a Home page.");

  for (const section of home.sections) {
    const family = sectionFamily(section.component.componentId);
    if (family === "services") section.props.title = frame.menuTitle;
    if (family === "gallery") section.props.title = frame.galleryTitle;
    if (family === "about") section.props.eyebrow = frame.storyLabel;
    if (family === "features") section.props.title = frame.detailsTitle;
    if (family === "cta") section.props.eyebrow = frame.conversionLabel;
  }

  return next;
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
