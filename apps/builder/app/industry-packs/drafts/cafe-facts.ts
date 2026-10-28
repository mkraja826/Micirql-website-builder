import type { CompositionGateIssue } from "@micirql/schema";

export const CAFE_FACTS_KIND = "cafe-facts-v1" as const;

export type CafeMenuItem = {
  name: string;
  description: string;
  price: string;
  currency?: string;
  disclosures: readonly string[];
};

export type CafeMenuCategory = {
  name: string;
  dayparts?: readonly string[];
  items: readonly CafeMenuItem[];
};

export type SuppliedCurrentCafeMenu = {
  suppliedAsCurrent: true;
  reviewedByBusiness: true;
  categories: readonly CafeMenuCategory[];
  disclosureScopeNotes: readonly string[];
  availabilityNotes?: readonly string[];
};

export type CafeOrderJourney =
  | {
      mode: "external-order";
      url: string;
      providerName?: string;
      fulfillmentModes: readonly string[];
      policyNotes: readonly string[];
    }
  | {
      mode: "order-enquiry";
      policyNotes: readonly string[];
      fulfillmentModes: readonly string[];
    }
  | {
      mode: "in-person-only";
      policyNotes: readonly string[];
      fulfillmentModes: readonly string[];
    };

/**
 * Staging-only Cafe intake. It stays separate from Restaurant facts so a Cafe
 * cannot accidentally inherit table reservations, dining-room promises or a
 * restaurant's editorial story model.
 */
export type CafeIndustryFactsV1 = {
  kind: typeof CAFE_FACTS_KIND;
  businessName: string;
  approvedDescription: readonly string[];
  cafeFocus: readonly string[];
  serviceModes: readonly string[];
  menu: SuppliedCurrentCafeMenu;
  address: string;
  mapUrl: string;
  openingHours: readonly string[];
  phone?: string;
  email?: string;
  orderJourney: CafeOrderJourney;
  accessibility?: readonly string[];
  seating?: readonly string[];
  amenities?: readonly string[];
  parking?: readonly string[];
  transit?: readonly string[];
  story?: readonly string[];
  people?: readonly {
    name: string;
    role?: string;
    biography?: string;
    verified: true;
  }[];
};

export function cafeIndustryFactsIssues(
  value: unknown,
): CompositionGateIssue[] {
  const facts = record(value);
  if (!facts) {
    return [
      issue(
        "CAFE_FACTS_REQUIRED",
        "Cafe generation requires structured menu, visit and order facts.",
      ),
    ];
  }

  const issues: CompositionGateIssue[] = [];
  if (text(facts.kind) !== CAFE_FACTS_KIND) {
    issues.push(
      issue(
        "CAFE_FACTS_VERSION_UNSUPPORTED",
        `Cafe facts must use ${CAFE_FACTS_KIND}.`,
      ),
    );
  }
  if (!text(facts.businessName)) {
    issues.push(
      issue(
        "CAFE_BUSINESS_NAME_REQUIRED",
        "Supply the cafe's approved public business name.",
      ),
    );
  }
  if (!validStringArray(facts.approvedDescription, false)) {
    issues.push(
      issue(
        "CAFE_DESCRIPTION_REQUIRED",
        "Supply at least one approved public description of the cafe.",
      ),
    );
  }
  if (!validStringArray(facts.cafeFocus, false)) {
    issues.push(
      issue(
        "CAFE_FOCUS_REQUIRED",
        "Supply at least one current cafe, beverage or food focus.",
      ),
    );
  }
  if (!validStringArray(facts.serviceModes, false)) {
    issues.push(
      issue(
        "CAFE_SERVICE_MODE_REQUIRED",
        "Supply at least one service mode such as dine-in or takeaway.",
      ),
    );
  }
  if (!text(facts.address)) {
    issues.push(
      issue(
        "CAFE_ADDRESS_REQUIRED",
        "Supply the cafe's approved public address.",
      ),
    );
  }
  const mapUrl = text(facts.mapUrl);
  if (!mapUrl) {
    issues.push(
      issue(
        "CAFE_MAP_URL_REQUIRED",
        "Supply the cafe's approved public HTTPS directions link.",
      ),
    );
  } else if (!isUsableHttpsUrl(mapUrl)) {
    issues.push(
      issue(
        "CAFE_MAP_URL_INVALID",
        "The cafe directions URL must be a usable HTTPS URL.",
      ),
    );
  }
  if (!validStringArray(facts.openingHours, false)) {
    issues.push(
      issue(
        "CAFE_OPENING_HOURS_REQUIRED",
        "Supply approved public opening hours and known exceptions.",
      ),
    );
  }

  const phone = text(facts.phone);
  const email = text(facts.email);
  if (!phone && !email) {
    issues.push(
      issue(
        "CAFE_CONTACT_REQUIRED",
        "Supply at least one approved public cafe phone number or email address.",
      ),
    );
  }
  if (phone && phone.replace(/\D/g, "").length < 7) {
    issues.push(
      issue("CAFE_PHONE_INVALID", "The supplied cafe phone number is invalid."),
    );
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    issues.push(
      issue(
        "CAFE_EMAIL_INVALID",
        "The supplied cafe email address is invalid.",
      ),
    );
  }

  for (const [field, label] of [
    ["accessibility", "accessibility facts"],
    ["seating", "seating facts"],
    ["amenities", "amenity facts"],
    ["parking", "parking facts"],
    ["transit", "transit facts"],
    ["story", "story facts"],
  ] as const) {
    if (facts[field] !== undefined && !validStringArray(facts[field], true)) {
      issues.push(
        issue(
          "CAFE_OPTIONAL_FACTS_INVALID",
          `Cafe ${label} must be supplied as an array of non-empty approved strings.`,
        ),
      );
    }
  }

  validateMenu(facts.menu, issues);
  validateOrderJourney(facts.orderJourney, issues);

  if (
    Object.prototype.hasOwnProperty.call(facts, "reservationPolicy") ||
    Object.prototype.hasOwnProperty.call(facts, "acceptsReservations")
  ) {
    issues.push(
      issue(
        "CAFE_RESTAURANT_RESERVATION_FLOW_NOT_ALLOWED",
        "Cafe staging must not inherit Restaurant reservation fields; a future Cafe reservation path requires its own supplied-fact contract and release review.",
      ),
    );
  }

  const peopleInvalid =
    facts.people !== undefined &&
    (!Array.isArray(facts.people) ||
      facts.people.some((value) => {
        const person = record(value);
        return (
          !person ||
          !text(person.name) ||
          person.verified !== true ||
          (person.role !== undefined && !text(person.role)) ||
          (person.biography !== undefined && !text(person.biography))
        );
      }));
  if (peopleInvalid) {
    issues.push(
      issue(
        "CAFE_PEOPLE_MUST_BE_VERIFIED",
        "Every named cafe owner, barista, baker or team member must be supplied and explicitly verified.",
      ),
    );
  }
  return issues;
}

export function parseCafeIndustryFacts(value: unknown): CafeIndustryFactsV1 {
  const issues = cafeIndustryFactsIssues(value);
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
    kind: CAFE_FACTS_KIND,
    businessName: text(facts.businessName),
    approvedDescription: strings(facts.approvedDescription),
    cafeFocus: strings(facts.cafeFocus),
    serviceModes: strings(facts.serviceModes),
    menu: parseMenu(facts.menu),
    address: text(facts.address),
    mapUrl: text(facts.mapUrl),
    openingHours: strings(facts.openingHours),
    ...(text(facts.phone) ? { phone: text(facts.phone) } : {}),
    ...(text(facts.email) ? { email: text(facts.email) } : {}),
    orderJourney: parseOrderJourney(facts.orderJourney),
    accessibility: strings(facts.accessibility),
    seating: strings(facts.seating),
    amenities: strings(facts.amenities),
    parking: strings(facts.parking),
    transit: strings(facts.transit),
    story: strings(facts.story),
    people: records(facts.people).map((person) => ({
      name: text(person.name),
      ...(text(person.role) ? { role: text(person.role) } : {}),
      ...(text(person.biography) ? { biography: text(person.biography) } : {}),
      verified: true,
    })),
  };
}

function validateMenu(value: unknown, issues: CompositionGateIssue[]): void {
  const menu = record(value);
  const rawCategories = Array.isArray(menu?.categories) ? menu.categories : [];
  const categories = rawCategories.flatMap((value) => {
    const category = record(value);
    return category ? [category] : [];
  });
  const items = categories.flatMap((category) => {
    if (!Array.isArray(category.items)) return [];
    return category.items.flatMap((value) => {
      const item = record(value);
      return item ? [item] : [];
    });
  });
  const structureInvalid =
    menu?.suppliedAsCurrent !== true ||
    menu?.reviewedByBusiness !== true ||
    !Array.isArray(menu?.categories) ||
    !rawCategories.length ||
    rawCategories.some((value) => {
      const category = record(value);
      if (!category || !text(category.name) || !Array.isArray(category.items)) {
        return true;
      }
      return (
        !category.items.length ||
        category.items.some((itemValue) => {
          const item = record(itemValue);
          return !item || !text(item.name);
        })
      );
    });
  if (structureInvalid) {
    issues.push(
      issue(
        "CAFE_CURRENT_MENU_REQUIRED",
        "Supply a business-reviewed current HTML menu with at least one named category and item; an image or PDF alone is not enough.",
      ),
    );
  }
  if (items.some((item) => !text(item.description))) {
    issues.push(
      issue(
        "CAFE_MENU_DESCRIPTION_REQUIRED",
        "Every current cafe menu item needs its approved public description.",
      ),
    );
  }
  if (items.some((item) => !text(item.price))) {
    issues.push(
      issue(
        "CAFE_MENU_PRICE_REQUIRED",
        "Every current cafe menu item needs its approved public price.",
      ),
    );
  }
  if (
    categories.some(
      (category) =>
        category.dayparts !== undefined &&
        !validStringArray(category.dayparts, true),
    )
  ) {
    issues.push(
      issue(
        "CAFE_MENU_DAYPARTS_INVALID",
        "Cafe menu dayparts must be supplied as an array of non-empty approved strings.",
      ),
    );
  }
  if (
    menu?.availabilityNotes !== undefined &&
    !validStringArray(menu.availabilityNotes, true)
  ) {
    issues.push(
      issue(
        "CAFE_MENU_AVAILABILITY_NOTES_INVALID",
        "Cafe menu availability notes must be supplied as an array of non-empty approved strings.",
      ),
    );
  }
  if (
    items.some(
      (item) =>
        !text(item.currency) && !containsCurrencyEvidence(text(item.price)),
    )
  ) {
    issues.push(
      issue(
        "CAFE_MENU_CURRENCY_REQUIRED",
        "Every current cafe menu item needs an explicit currency code or symbol.",
      ),
    );
  }
  if (
    !validStringArray(menu?.disclosureScopeNotes, false) ||
    items.some((item) => !validStringArray(item.disclosures, true))
  ) {
    issues.push(
      issue(
        "CAFE_MENU_DISCLOSURE_REVIEW_REQUIRED",
        "Record the business-reviewed disclosure scope and keep each supplied item's disclosures attached to that item, even when its reviewed list is empty.",
      ),
    );
  }
}

function validateOrderJourney(
  value: unknown,
  issues: CompositionGateIssue[],
): void {
  const journey = record(value);
  const mode = text(journey?.mode);
  if (
    mode !== "external-order" &&
    mode !== "order-enquiry" &&
    mode !== "in-person-only"
  ) {
    issues.push(
      issue(
        "CAFE_ORDER_JOURNEY_REQUIRED",
        "Choose one explicit Cafe order journey: approved external ordering, order enquiry, or in-person only.",
      ),
    );
    return;
  }
  if (!validStringArray(journey?.fulfillmentModes, false)) {
    issues.push(
      issue(
        "CAFE_FULFILLMENT_MODE_REQUIRED",
        "Supply the currently supported fulfilment modes for the Cafe order journey.",
      ),
    );
  }
  if (!validStringArray(journey?.policyNotes, false)) {
    issues.push(
      issue(
        "CAFE_ORDER_POLICY_REQUIRED",
        "Supply approved policy notes that explain the Cafe order journey without promising availability or confirmation.",
      ),
    );
  }
  if (mode === "external-order") {
    const url = text(journey?.url);
    if (!url) {
      issues.push(
        issue(
          "CAFE_EXTERNAL_ORDER_URL_REQUIRED",
          "External ordering requires the merchant-approved destination URL.",
        ),
      );
    } else if (!isUsableHttpsUrl(url)) {
      issues.push(
        issue(
          "CAFE_EXTERNAL_ORDER_URL_INVALID",
          "The external Cafe ordering destination must be a usable HTTPS URL.",
        ),
      );
    }
  } else if (text(journey?.url)) {
    issues.push(
      issue(
        "CAFE_ORDER_URL_MODE_MISMATCH",
        "Only the external-order journey may expose an ordering URL.",
      ),
    );
  }
}

function parseMenu(value: unknown): SuppliedCurrentCafeMenu {
  const menu = record(value)!;
  return {
    suppliedAsCurrent: true,
    reviewedByBusiness: true,
    categories: records(menu.categories).map((category) => ({
      name: text(category.name),
      dayparts: strings(category.dayparts),
      items: records(category.items).map((item) => ({
        name: text(item.name),
        description: text(item.description),
        price: text(item.price),
        ...(text(item.currency) ? { currency: text(item.currency) } : {}),
        disclosures: strings(item.disclosures),
      })),
    })),
    disclosureScopeNotes: strings(menu.disclosureScopeNotes),
    availabilityNotes: strings(menu.availabilityNotes),
  };
}

function parseOrderJourney(value: unknown): CafeOrderJourney {
  const journey = record(value)!;
  const mode = text(journey.mode) as CafeOrderJourney["mode"];
  if (mode === "external-order") {
    return {
      mode,
      url: text(journey.url),
      ...(text(journey.providerName)
        ? { providerName: text(journey.providerName) }
        : {}),
      fulfillmentModes: strings(journey.fulfillmentModes),
      policyNotes: strings(journey.policyNotes),
    };
  }
  return {
    mode,
    fulfillmentModes: strings(journey.fulfillmentModes),
    policyNotes: strings(journey.policyNotes),
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

function validStringArray(value: unknown, allowEmpty: boolean): boolean {
  return (
    Array.isArray(value) &&
    (allowEmpty || value.length > 0) &&
    value.every((item) => typeof item === "string" && Boolean(item.trim()))
  );
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
