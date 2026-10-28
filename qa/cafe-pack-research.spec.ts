import { expect, test } from "@playwright/test";
import {
  certifiedOnboardingIndustry,
  INDUSTRY_AVAILABILITY,
} from "../apps/builder/app/industry-availability";
import {
  CAFE_DRAFT_PAGE_PATHS,
  CAFE_DRAFT_RESEARCH_BASIS,
  CAFE_FACTS_KIND,
  cafeDraftPack,
  cafeIndustryFactsIssues,
  parseCafeIndustryFacts,
  physiotherapyDraftPack,
  restaurantDraftPack,
} from "../apps/builder/app/industry-packs/drafts";
import {
  dentalIndustryPack,
  resolveCertifiedIndustryPackById,
} from "../apps/builder/app/industry-packs";

test.describe("Cafe research and factual-boundary milestone", () => {
  test("defines a lighter five-page Cafe journey that does not clone Restaurant", () => {
    expect(cafeDraftPack.identity).toMatchObject({
      id: "restaurant-cafe",
      domain: "restaurant",
      subtype: "cafe",
      certification: "draft-unregistered",
    });
    expect(cafeDraftPack.pages.map((page) => page.path)).toEqual(
      CAFE_DRAFT_PAGE_PATHS,
    );
    expect(CAFE_DRAFT_PAGE_PATHS).toEqual([
      "/",
      "/menu",
      "/visit",
      "/order",
      "/story",
    ]);
    expect(CAFE_DRAFT_PAGE_PATHS).not.toEqual(
      restaurantDraftPack.pages.map((page) => page.path),
    );
    expect(CAFE_DRAFT_PAGE_PATHS).not.toContain("/reservations");
    expect(cafeDraftPack.actions.primary).toMatchObject({
      id: "maps.navigate",
      label: "Plan your visit",
    });
    expect(cafeDraftPack.actions.consistencyRule).toMatch(
      /never show Request a table by default/i,
    );
    for (const existingGrammar of [
      dentalIndustryPack.designGrammar,
      physiotherapyDraftPack.designGrammar,
      restaurantDraftPack.designGrammar,
    ]) {
      const existingMotifs = new Set<string>(existingGrammar.motifs);
      expect(cafeDraftPack.designGrammar.id).not.toBe(existingGrammar.id);
      expect(
        cafeDraftPack.designGrammar.motifs.filter((motif) =>
          existingMotifs.has(motif),
        ),
      ).toEqual([]);
    }
    expect(cafeDraftPack.designGrammar.visualThesis).toMatch(
      /must not inherit Restaurant's table-led editorial pacing or reservation funnel/i,
    );
    expect(cafeDraftPack.typography.display.prohibitedTreatments).toContain(
      "restaurant-editorial-serif-clone",
    );
    expect(cafeDraftPack.certificationPlan).toMatchObject({
      requiredCandidateCount: 20,
      stagedCandidateCount: 0,
      certifiedCandidateCount: 0,
      registrationAllowed: false,
      visualReviewRequired: true,
    });
  });

  test("records official menu, ordering, disclosure and accessibility sources", () => {
    expect(CAFE_DRAFT_RESEARCH_BASIS).toHaveLength(6);
    expect(CAFE_DRAFT_RESEARCH_BASIS.map((entry) => entry.authority)).toEqual([
      "Schema.org",
      "Schema.org",
      "Google Business Profile",
      "Google Business Profile",
      "FSSAI",
      "W3C WAI",
    ]);
    expect(
      CAFE_DRAFT_RESEARCH_BASIS.every((entry) =>
        /^https:\/\/(schema\.org|support\.google\.com|fssai\.gov\.in|www\.w3\.org)\//.test(
          entry.source,
        ),
      ),
    ).toBe(true);
    expect(
      CAFE_DRAFT_RESEARCH_BASIS.map((entry) => entry.appliedRule).join(" "),
    ).toMatch(/never infer them or claim compliance/i);
    for (const pair of cafeDraftPack.palette.contrastPairs) {
      expect(
        contrastRatio(pair.foreground, pair.background),
      ).toBeGreaterThanOrEqual(pair.minimumRatio);
    }
  });

  test("shows Cafe in the Builder roadmap without making it selectable or certified", () => {
    expect(
      INDUSTRY_AVAILABILITY.find((item) => item.id === "restaurant-cafe"),
    ).toMatchObject({ status: "planned", rolloutOrder: 3 });
    expect(certifiedOnboardingIndustry("restaurant-cafe")).toBeUndefined();
    expect(resolveCertifiedIndustryPackById("restaurant-cafe")).toBeUndefined();
  });

  test("accepts a complete business-reviewed Cafe fact set", () => {
    const facts = completeCafeFacts();
    expect(cafeIndustryFactsIssues(facts)).toEqual([]);
    expect(parseCafeIndustryFacts(facts)).toMatchObject({
      kind: CAFE_FACTS_KIND,
      businessName: "Radhika Cafe",
      cafeFocus: ["Coffee", "Tea", "Fresh bakes"],
      menu: {
        suppliedAsCurrent: true,
        reviewedByBusiness: true,
        categories: [
          {
            name: "Coffee",
            dayparts: ["All day"],
            items: [
              {
                name: "Filter coffee",
                price: "₹120",
                disclosures: ["Contains milk"],
              },
            ],
          },
        ],
      },
      orderJourney: {
        mode: "external-order",
        url: "https://orders.example.com/radhika-cafe",
      },
    });
  });

  test("rejects incomplete menu evidence, unsafe order links and Restaurant reservation inheritance", () => {
    const facts = completeCafeFacts() as Record<string, unknown>;
    const menu = structuredClone(facts.menu) as Record<string, unknown>;
    const categories = menu.categories as Array<Record<string, unknown>>;
    const items = categories[0]!.items as Array<Record<string, unknown>>;
    items[0] = {
      name: "Filter coffee",
      description: "",
      price: "120",
    };
    menu.disclosureScopeNotes = [];
    facts.menu = menu;
    facts.orderJourney = {
      mode: "external-order",
      url: "http://orders.example.com/radhika-cafe",
      fulfillmentModes: [],
      policyNotes: [],
    };
    facts.reservationPolicy = ["Requests are confirmed separately"];

    const codes = cafeIndustryFactsIssues(facts).map((issue) => issue.code);
    expect(codes).toEqual(
      expect.arrayContaining([
        "CAFE_MENU_DESCRIPTION_REQUIRED",
        "CAFE_MENU_CURRENCY_REQUIRED",
        "CAFE_MENU_DISCLOSURE_REVIEW_REQUIRED",
        "CAFE_FULFILLMENT_MODE_REQUIRED",
        "CAFE_ORDER_POLICY_REQUIRED",
        "CAFE_EXTERNAL_ORDER_URL_INVALID",
        "CAFE_RESTAURANT_RESERVATION_FLOW_NOT_ALLOWED",
      ]),
    );
  });

  test("rejects malformed nested facts instead of silently dropping them", () => {
    const facts = completeCafeFacts() as Record<string, unknown>;
    const menu = structuredClone(facts.menu) as Record<string, unknown>;
    const categories = menu.categories as unknown[];
    const firstCategory = categories[0] as Record<string, unknown>;
    const items = firstCategory.items as Array<Record<string, unknown>>;
    items[0]!.disclosures = ["Contains milk", 42];
    categories.push("not-a-category");
    facts.menu = menu;
    facts.people = ["Unverified person"];
    facts.amenities = ["Drinking water", 42];

    const codes = cafeIndustryFactsIssues(facts).map((item) => item.code);
    expect(codes).toEqual(
      expect.arrayContaining([
        "CAFE_CURRENT_MENU_REQUIRED",
        "CAFE_MENU_DISCLOSURE_REVIEW_REQUIRED",
        "CAFE_PEOPLE_MUST_BE_VERIFIED",
        "CAFE_OPTIONAL_FACTS_INVALID",
      ]),
    );
  });
});

function completeCafeFacts() {
  return {
    kind: CAFE_FACTS_KIND,
    businessName: "Radhika Cafe",
    approvedDescription: [
      "A neighbourhood cafe serving coffee, tea and fresh bakes.",
    ],
    cafeFocus: ["Coffee", "Tea", "Fresh bakes"],
    serviceModes: ["Dine-in", "Takeaway"],
    menu: {
      suppliedAsCurrent: true,
      reviewedByBusiness: true,
      disclosureScopeNotes: [
        "Disclosures supplied by the business on 28 October 2026.",
      ],
      availabilityNotes: ["Current menu; availability may change in store."],
      categories: [
        {
          name: "Coffee",
          dayparts: ["All day"],
          items: [
            {
              name: "Filter coffee",
              description: "South Indian filter coffee with hot milk.",
              price: "₹120",
              currency: "INR",
              disclosures: ["Contains milk"],
            },
          ],
        },
      ],
    },
    address: "12 Market Road, Hyderabad, Telangana",
    mapUrl: "https://maps.example.com/radhika-cafe",
    openingHours: ["Monday–Saturday, 8:00–20:00"],
    phone: "+91 90000 00000",
    email: "hello@radhikacafe.example",
    orderJourney: {
      mode: "external-order",
      url: "https://orders.example.com/radhika-cafe",
      providerName: "Radhika Cafe ordering",
      fulfillmentModes: ["Takeaway"],
      policyNotes: [
        "The external ordering service confirms item availability and pickup time.",
      ],
    },
    accessibility: ["Step-free entrance"],
    seating: ["Indoor seating"],
    amenities: ["Drinking water"],
    story: ["The cafe description above is approved for public use."],
    people: [],
  };
}

function contrastRatio(foreground: string, background: string) {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

function relativeLuminance(color: string) {
  const channels = color
    .slice(1)
    .match(/.{2}/g)!
    .map((hex) => Number.parseInt(hex, 16) / 255)
    .map((channel) =>
      channel <= 0.04045
        ? channel / 12.92
        : Math.pow((channel + 0.055) / 1.055, 2.4),
    );
  return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
}
