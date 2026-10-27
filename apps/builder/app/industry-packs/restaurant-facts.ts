import type { CompositionGateIssue } from "@micirql/schema";
import type {
  RestaurantDraftBrief,
  SuppliedCurrentRestaurantMenu,
} from "./drafts";
import type {
  IndustryPackRankingProfile,
  IndustryPackScaffoldBrief,
} from "./runtime/types";

export const RESTAURANT_FACTS_KIND = "restaurant-facts-v1" as const;

/**
 * Production Restaurant intake. These fields are deliberately separate from
 * generic services/notes so a menu, opening time, location or reservation
 * policy can never be inferred from free-form marketing copy.
 */
export type RestaurantIndustryFactsV1 = {
  kind: typeof RESTAURANT_FACTS_KIND;
  businessName: string;
  cuisines: readonly string[];
  serviceModes: readonly string[];
  menu: SuppliedCurrentRestaurantMenu;
  address: string;
  mapUrl?: string | null;
  openingHours: readonly string[];
  accessibility?: readonly string[] | null;
  parking?: readonly string[] | null;
  transit?: readonly string[] | null;
  visitDetails?: readonly string[] | null;
  phone?: string | null;
  email?: string | null;
  reservationPolicy: readonly string[];
  partyDetails?: readonly string[] | null;
  specialRequestNotes?: readonly string[] | null;
  story: Exclude<RestaurantDraftBrief["story"], null | undefined>;
};

export function restaurantIndustryFactsIssues(
  value: unknown,
): CompositionGateIssue[] {
  const facts = record(value);
  if (!facts) {
    return [
      issue(
        "RESTAURANT_FACTS_REQUIRED",
        "Restaurant generation requires structured menu, visit and reservation facts.",
      ),
    ];
  }

  const issues: CompositionGateIssue[] = [];
  if (text(facts.kind) !== RESTAURANT_FACTS_KIND) {
    issues.push(
      issue(
        "RESTAURANT_FACTS_VERSION_UNSUPPORTED",
        `Restaurant facts must use ${RESTAURANT_FACTS_KIND}.`,
      ),
    );
  }
  if (!text(facts.businessName)) {
    issues.push(
      issue(
        "RESTAURANT_BUSINESS_NAME_REQUIRED",
        "Supply the restaurant's approved public business name.",
      ),
    );
  }
  if (!strings(facts.cuisines).length) {
    issues.push(
      issue(
        "RESTAURANT_CUISINE_REQUIRED",
        "Supply at least one cuisine or menu focus.",
      ),
    );
  }
  if (!strings(facts.serviceModes).length) {
    issues.push(
      issue(
        "RESTAURANT_SERVICE_MODE_REQUIRED",
        "Supply at least one service mode such as dine-in or takeaway.",
      ),
    );
  }
  if (!text(facts.address)) {
    issues.push(
      issue(
        "RESTAURANT_ADDRESS_REQUIRED",
        "Supply the restaurant's approved public address.",
      ),
    );
  }
  if (!strings(facts.openingHours).length) {
    issues.push(
      issue(
        "RESTAURANT_OPENING_HOURS_REQUIRED",
        "Supply approved public opening hours.",
      ),
    );
  }
  if (!strings(facts.reservationPolicy).length) {
    issues.push(
      issue(
        "RESTAURANT_RESERVATION_POLICY_REQUIRED",
        "Supply a table-request policy that explains how confirmation works.",
      ),
    );
  }
  if (!strings(record(facts.story)?.paragraphs).length) {
    issues.push(
      issue(
        "RESTAURANT_STORY_REQUIRED",
        "Supply at least one approved paragraph about the restaurant.",
      ),
    );
  }

  const menu = record(facts.menu);
  const categories = records(menu?.categories);
  const suppliedItems = categories.flatMap((category) =>
    records(category.items),
  );
  const validCategories = categories.filter(
    (category) =>
      text(category.name) &&
      records(category.items).some((item) => text(item.name)),
  );
  const hasIncompleteMenuStructure = categories.some((category) => {
    const items = records(category.items);
    return (
      !text(category.name) ||
      !items.length ||
      items.some((item) => !text(item.name))
    );
  });
  const itemCount = validCategories.reduce(
    (total, category) =>
      total + records(category.items).filter((item) => text(item.name)).length,
    0,
  );
  if (
    menu?.suppliedAsCurrent !== true ||
    !validCategories.length ||
    itemCount === 0 ||
    hasIncompleteMenuStructure
  ) {
    issues.push(
      issue(
        "RESTAURANT_CURRENT_MENU_REQUIRED",
        "Supply at least one current menu category and item; an image or PDF alone is not enough.",
      ),
    );
  }

  const namedItems = suppliedItems.filter((item) => text(item.name));
  if (namedItems.some((item) => !text(item.description))) {
    issues.push(
      issue(
        "RESTAURANT_MENU_DESCRIPTION_REQUIRED",
        "Every supplied current menu item needs its approved public description.",
      ),
    );
  }
  if (namedItems.some((item) => !text(item.price))) {
    issues.push(
      issue(
        "RESTAURANT_MENU_PRICE_REQUIRED",
        "Every supplied current menu item needs its approved public price.",
      ),
    );
  }
  if (
    namedItems.some(
      (item) =>
        !text(item.currency) && !containsCurrencyEvidence(text(item.price)),
    )
  ) {
    issues.push(
      issue(
        "RESTAURANT_MENU_CURRENCY_REQUIRED",
        "Every supplied current menu item needs an explicit currency code or symbol.",
      ),
    );
  }

  const mapUrl = text(facts.mapUrl);
  if (!mapUrl) {
    issues.push(
      issue(
        "RESTAURANT_MAP_URL_REQUIRED",
        "Supply the restaurant's approved public HTTPS directions link.",
      ),
    );
  } else if (!isUsableHttpsUrl(mapUrl)) {
    issues.push(
      issue(
        "RESTAURANT_MAP_URL_INVALID",
        "The directions URL must be a usable HTTPS URL.",
      ),
    );
  }
  const phone = text(facts.phone);
  const email = text(facts.email);
  if (!phone && !email) {
    issues.push(
      issue(
        "RESTAURANT_CONTACT_REQUIRED",
        "Supply at least one approved public restaurant phone number or email address.",
      ),
    );
  }
  if (phone && phone.replace(/\D/g, "").length < 7) {
    issues.push(
      issue(
        "RESTAURANT_PHONE_INVALID",
        "The supplied restaurant phone number is invalid.",
      ),
    );
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    issues.push(
      issue(
        "RESTAURANT_EMAIL_INVALID",
        "The supplied restaurant email address is invalid.",
      ),
    );
  }
  return issues;
}

export function parseRestaurantIndustryFacts(
  value: unknown,
): RestaurantIndustryFactsV1 {
  const issues = restaurantIndustryFactsIssues(value);
  if (issues.length) {
    const error = new Error(
      issues.map((item) => item.message).join(" "),
    ) as Error & {
      status?: number;
      code?: string;
    };
    error.status = 422;
    error.code = issues[0]!.code;
    throw error;
  }
  const facts = record(value)!;
  return {
    kind: RESTAURANT_FACTS_KIND,
    businessName: text(facts.businessName),
    cuisines: strings(facts.cuisines),
    serviceModes: strings(facts.serviceModes),
    menu: parseMenu(facts.menu),
    address: text(facts.address),
    ...(text(facts.mapUrl) ? { mapUrl: text(facts.mapUrl) } : {}),
    openingHours: strings(facts.openingHours),
    accessibility: strings(facts.accessibility),
    parking: strings(facts.parking),
    transit: strings(facts.transit),
    visitDetails: strings(facts.visitDetails),
    ...(text(facts.phone) ? { phone: text(facts.phone) } : {}),
    ...(text(facts.email) ? { email: text(facts.email) } : {}),
    reservationPolicy: strings(facts.reservationPolicy),
    partyDetails: strings(facts.partyDetails),
    specialRequestNotes: strings(facts.specialRequestNotes),
    story: parseStory(facts.story)!,
  };
}

export function restaurantBriefFromScaffold(
  brief: IndustryPackScaffoldBrief,
): RestaurantDraftBrief {
  const facts = parseRestaurantIndustryFacts(brief.industryFacts);
  return {
    businessName: facts.businessName,
    cuisines: facts.cuisines,
    serviceModes: facts.serviceModes,
    menu: facts.menu,
    address: facts.address,
    ...(facts.mapUrl ? { mapUrl: facts.mapUrl } : {}),
    openingHours: facts.openingHours,
    accessibility: facts.accessibility ?? [],
    parking: facts.parking ?? [],
    transit: facts.transit ?? [],
    visitDetails: facts.visitDetails ?? [],
    ...(facts.phone ? { phone: facts.phone } : {}),
    ...(facts.email ? { email: facts.email } : {}),
    reservationPolicy: facts.reservationPolicy,
    partyDetails: facts.partyDetails ?? [],
    specialRequestNotes: facts.specialRequestNotes ?? [],
    story: facts.story,
    goals: brief.goals,
    languages: brief.languages,
  };
}

export function restaurantRankingFacts(
  profile: IndustryPackRankingProfile,
): Partial<RestaurantIndustryFactsV1> {
  if (restaurantIndustryFactsIssues(profile.industryFacts).length) return {};
  return parseRestaurantIndustryFacts(profile.industryFacts);
}

function parseMenu(value: unknown): SuppliedCurrentRestaurantMenu {
  const menu = record(value)!;
  return {
    suppliedAsCurrent: true,
    categories: records(menu.categories).map((category) => ({
      name: text(category.name),
      ...(text(category.description)
        ? { description: text(category.description) }
        : {}),
      items: records(category.items).map((item) => ({
        name: text(item.name),
        ...(text(item.description)
          ? { description: text(item.description) }
          : {}),
        ...(text(item.price) ? { price: text(item.price) } : {}),
        ...(text(item.currency) ? { currency: text(item.currency) } : {}),
        disclosures: strings(item.disclosures),
      })),
    })),
    notes: strings(menu.notes),
    disclosureNotes: strings(menu.disclosureNotes),
  };
}

function parseStory(value: unknown): RestaurantDraftBrief["story"] {
  const story = record(value);
  if (!story) return undefined;
  const paragraphs = strings(story.paragraphs);
  const principles = strings(story.principles);
  const people = records(story.people).flatMap((profile) => {
    const name = text(profile.name);
    if (!name || profile.verified !== true) return [];
    return [
      {
        name,
        ...(text(profile.role) ? { role: text(profile.role) } : {}),
        ...(text(profile.biography)
          ? { biography: text(profile.biography) }
          : {}),
        verified: true as const,
      },
    ];
  });
  if (!paragraphs.length && !principles.length && !people.length)
    return undefined;
  return {
    ...(text(story.heading) ? { heading: text(story.heading) } : {}),
    paragraphs,
    principles,
    people,
  };
}

function issue(code: string, message: string): CompositionGateIssue {
  return { code, message, severity: "error" };
}

function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function records(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.flatMap((item) => (record(item) ? [record(item)!] : []))
    : [];
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function strings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.flatMap((item) => {
    const valueText = text(item);
    const key = valueText.toLocaleLowerCase("en-US");
    if (!valueText || seen.has(key)) return [];
    seen.add(key);
    return [valueText];
  });
}

function containsCurrencyEvidence(value: string): boolean {
  return (
    /[$€£¥₹₩₽₺₫₪₴₦₱฿₡₲₵₸₼₾]/u.test(value) ||
    /(?:^|\s)(?:AED|AUD|BDT|BRL|CAD|CHF|CNY|EUR|GBP|HKD|IDR|INR|JPY|KRW|LKR|MXN|MYR|NGN|NPR|NZD|PHP|PKR|QAR|RUB|SAR|SGD|THB|TRY|USD|VND|ZAR)(?:\s|$)/i.test(
      value,
    ) ||
    /(?:^|\s)Rs\.?\s*\d/i.test(value)
  );
}

function isUsableHttpsUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && Boolean(parsed.hostname);
  } catch {
    return false;
  }
}
