import { expect, test } from "@playwright/test";
import { SCHEMA_VERSION, siteSchema, type Site } from "@micirql/schema";
import {
  FAMILY_CODES,
  SECTION_FAMILIES,
  type SectionFamily,
} from "@micirql/sections";
import { assessCertifiedPublishGate } from "../apps/builder/app/certified-publish-gate";
import {
  RESTAURANT_CANDIDATE_BLUEPRINTS,
  restaurantCandidateBlueprintIssues,
} from "../apps/builder/app/industry-packs/drafts/restaurant-candidate-blueprints";
import {
  RESTAURANT_DRAFT_CANDIDATES,
  listRestaurantDraftCandidates,
  restaurantDraftCandidateCatalog,
} from "../apps/builder/app/industry-packs/drafts/restaurant-candidate-data";
import {
  RESTAURANT_CANDIDATE_HOME_FRAMES,
  restaurantCandidateHomeFrame,
} from "../apps/builder/app/industry-packs/drafts/restaurant-candidate-home-presentation";
import { rankRestaurantDraftCandidates } from "../apps/builder/app/industry-packs/drafts/restaurant-candidate-ranking";
import { applyRestaurantDraftCandidate } from "../apps/builder/app/industry-packs/drafts/apply-restaurant-candidate";
import {
  applyRestaurantCandidateMedia,
  RESTAURANT_CANDIDATE_HOME_HERO_IDS,
  RESTAURANT_CANDIDATE_MEDIA_EXCLUSIONS,
  restaurantCandidateMediaSelection,
} from "../apps/builder/app/industry-packs/drafts/restaurant-candidate-media";
import {
  RESTAURANT_DRAFT_PAGE_PATHS,
  RESTAURANT_DRAFT_REQUIRED_ACTIONS,
  restaurantDraftPack,
} from "../apps/builder/app/industry-packs/drafts/restaurant";
import {
  createRestaurantDraftScaffold,
  type RestaurantDraftBrief,
  type SuppliedCurrentRestaurantMenu,
} from "../apps/builder/app/industry-packs/drafts/restaurant-scaffold";
import { restaurantDraftContentIssues } from "../apps/builder/app/industry-packs/drafts/restaurant-content-hygiene";
import { restaurantDraftMediaIssues } from "../apps/builder/app/industry-packs/drafts/restaurant-media";
import {
  assessCrossIndustryDesignDistinctness,
  candidateDesignSignature,
  listCertifiedIndustryPacks,
  resolveCertifiedIndustryPackByCandidateId,
  validateWithinIndustryDesignCatalog,
} from "../apps/builder/app/industry-packs";

const LOGO_ASSET_ID = "qa-only/restaurant-top20-logo-exact";
const BRAND_INPUT = { logoAssetId: LOGO_ASSET_ID, colors: {} };
const BRAND_PROVENANCE = {
  logo: "user-upload" as const,
  colors: {},
};

test.describe("Restaurant Top-20 staging catalog", () => {
  test("owns 20 complete blueprints without clinic metaphors or high-impact typography", () => {
    expect(restaurantCandidateBlueprintIssues()).toEqual([]);
    expect(RESTAURANT_CANDIDATE_BLUEPRINTS).toHaveLength(20);
    expect(
      RESTAURANT_CANDIDATE_BLUEPRINTS.map((candidate) => candidate.variantSeed),
    ).toEqual(Array.from({ length: 20 }, (_, index) => index + 1));
    expect(
      new Set(RESTAURANT_CANDIDATE_BLUEPRINTS.map(({ id }) => id)).size,
    ).toBe(20);
    expect(
      new Set(
        RESTAURANT_CANDIDATE_BLUEPRINTS.map(({ homeFlow }) =>
          homeFlow.join(">"),
        ),
      ).size,
    ).toBe(20);
    expect(
      new Set(
        RESTAURANT_CANDIDATE_BLUEPRINTS.map((candidate) =>
          [
            candidate.heroComposition,
            candidate.menuComposition,
            candidate.venueProofModel,
            candidate.reservationPresentation,
            candidate.imageTreatment,
          ].join("::"),
        ),
      ).size,
    ).toBe(20);

    for (const blueprint of RESTAURANT_CANDIDATE_BLUEPRINTS) {
      expect(blueprint.typographyStrategy).not.toBe("high-impact-display");
      expect(blueprint.motifs.length).toBeGreaterThanOrEqual(3);
      expect(new Set(blueprint.homeFlow)).toEqual(
        new Set(["gallery", "services", "about", "features", "contact", "cta"]),
      );
      expect(
        [
          blueprint.name,
          blueprint.thesis,
          blueprint.navigationComposition,
          blueprint.heroComposition,
          blueprint.openingComposition,
          blueprint.menuComposition,
          blueprint.venueProofModel,
          blueprint.reservationPresentation,
          blueprint.surfaceRhythm,
          blueprint.imageTreatment,
          blueprint.mobileReflow,
          ...blueprint.motifs,
        ].join(" "),
      ).not.toMatch(
        /dental|dentist|physio|patient|treatment|appointment|concentric|progress tracker/i,
      );
    }
  });

  test("gives all 20 candidates unique Home labels without changing supplied facts or actions", () => {
    const candidates = listRestaurantDraftCandidates();
    const candidateIds = candidates.map(({ id }) => id).sort();
    expect(Object.keys(RESTAURANT_CANDIDATE_HOME_FRAMES).sort()).toEqual(
      candidateIds,
    );

    const labelKeys = [
      "menuTitle",
      "galleryTitle",
      "storyLabel",
      "detailsTitle",
      "conversionLabel",
    ] as const;
    for (const key of labelKeys) {
      expect(
        new Set(
          candidateIds.map(
            (candidateId) => restaurantCandidateHomeFrame(candidateId)[key],
          ),
        ).size,
      ).toBe(20);
    }

    const scaffold = factualScaffold();
    const baselineHome = homeSectionsByFamily(scaffold);
    const baselineActions = requiredActionContract(scaffold);
    const baselineImages = imageAssetIds(scaffold);
    const merchantFacts = referenceMerchantFactValues();
    const baselineFactCounts = new Map(
      merchantFacts.map((fact) => [fact, exactStringLeafCount(scaffold, fact)]),
    );

    for (const candidate of candidates) {
      const frame = restaurantCandidateHomeFrame(candidate.id);
      const generated = applyRestaurantDraftCandidate(scaffold, candidate.id, {
        applyCandidateMedia: false,
      });
      const home = homeSectionsByFamily(generated);

      expect(home.services?.props.title).toBe(frame.menuTitle);
      expect(home.gallery?.props.title).toBe(frame.galleryTitle);
      expect(home.about?.props.eyebrow).toBe(frame.storyLabel);
      expect(home.features?.props.title).toBe(frame.detailsTitle);
      expect(home.cta?.props.eyebrow).toBe(frame.conversionLabel);

      // The two fact-bearing headings stay exact; candidate identity is added
      // above them rather than replacing supplied story or business copy.
      expect(home.about?.props.title).toBe(baselineHome.about?.props.title);
      expect(home.cta?.props.title).toBe(baselineHome.cta?.props.title);
      expect(generated.theme.brand.logoAssetId).toBe(LOGO_ASSET_ID);
      expect(imageAssetIds(generated)).toEqual(baselineImages);
      expect(requiredActionContract(generated)).toEqual(baselineActions);
      for (const fact of merchantFacts) {
        expect(exactStringLeafCount(generated, fact)).toBe(
          baselineFactCounts.get(fact),
        );
      }
    }
  });

  test("materializes 20 immutable, unavailable Restaurant candidates", () => {
    const candidates = listRestaurantDraftCandidates();

    expect(candidates).toHaveLength(20);
    expect(RESTAURANT_DRAFT_CANDIDATES).toHaveLength(20);
    expect(
      new Set(candidates.map(({ visualIdentity }) => visualIdentity.id)).size,
    ).toBe(20);
    expect(
      new Set(candidates.map(({ variants }) => JSON.stringify(variants))).size,
    ).toBe(20);

    for (const candidate of candidates) {
      expect(candidate).toMatchObject({
        domain: "restaurant",
        subtype: "restaurant",
        archetype: "restaurant-hospitality",
        candidateStatus: "draft-unregistered",
        requiredPagePaths: RESTAURANT_DRAFT_PAGE_PATHS,
        requiredActions: RESTAURANT_DRAFT_REQUIRED_ACTIONS,
        gate: {
          passed: false,
          score: 0,
          issues: [
            expect.objectContaining({
              code: "RESTAURANT_DRAFT_CANDIDATE_UNCERTIFIED",
              severity: "error",
            }),
          ],
        },
      });
      expect(new Set(candidate.sectionOrder)).toEqual(
        new Set(SECTION_FAMILIES),
      );
      expect(
        contrastRatio(
          candidate.theme.brand.colors.textPrimary,
          candidate.theme.brand.colors.background,
        ),
        `${candidate.id} body contrast`,
      ).toBeGreaterThanOrEqual(4.5);
    }

    candidates[0]!.theme.brand.colors.primary = "#FF00FF";
    (candidates[0]!.visualIdentity.signatureMotifs as string[]).push(
      "caller-mutation",
    );
    const fresh = listRestaurantDraftCandidates()[0]!;
    expect(fresh.theme.brand.colors.primary).not.toBe("#FF00FF");
    expect(fresh.visualIdentity.signatureMotifs).not.toContain(
      "caller-mutation",
    );
  });

  test("clears all 190 within-pack and 800 cross-industry anti-cloning comparisons", () => {
    const within = validateWithinIndustryDesignCatalog(
      restaurantDraftCandidateCatalog,
    );
    expect(within.pass).toBe(true);
    expect(within.issues).toEqual([]);
    expect(within.assessments).toHaveLength(190);
    expect(
      Math.max(...within.assessments.map(({ similarity }) => similarity)),
    ).toBeLessThanOrEqual(
      restaurantDraftPack.designGrammar.maximumWithinIndustrySimilarity,
    );

    const certifiedPacks = listCertifiedIndustryPacks();
    expect(certifiedPacks.map(({ id }) => id)).toEqual([
      "clinic-dental",
      "clinic-physiotherapy",
    ]);
    const cross = listRestaurantDraftCandidates().flatMap(
      (restaurantCandidate) =>
        certifiedPacks.flatMap((pack) =>
          pack
            .listCandidates()
            .map((candidate) =>
              assessCrossIndustryDesignDistinctness(
                candidateDesignSignature(
                  restaurantDraftCandidateCatalog,
                  restaurantCandidate,
                ),
                candidateDesignSignature(pack, candidate),
                restaurantDraftCandidateCatalog.designGrammar,
                pack.designGrammar,
              ),
            ),
        ),
    );
    expect(cross).toHaveLength(800);
    expect(
      cross
        .filter(({ pass }) => !pass)
        .map(({ similarity, breakdown, issues }) => ({
          similarity,
          breakdown,
          issues,
        })),
    ).toEqual([]);
    expect(
      Math.max(...cross.map(({ similarity }) => similarity)),
    ).toBeLessThanOrEqual(
      restaurantDraftPack.designGrammar.maximumCrossIndustrySimilarity,
    );
  });

  test("ranks menu-first, arrival-first, and hosted journeys deterministically", () => {
    const menuFirstProfile = {
      domain: "restaurant" as const,
      industry: "Restaurant",
      subindustry: "Restaurant",
      goals: [
        "Make the current menu and prices easy to compare before guests request a table",
      ],
      styleTags: ["compact", "product-detail", "menu-led"],
      services: ["Dine-in"],
      serviceModes: ["Dine-in"],
      menu: REFERENCE_BRIEF.menu!,
      openingHours: REFERENCE_BRIEF.openingHours!,
    };
    const menuFirst = rankRestaurantDraftCandidates(menuFirstProfile);

    expect(menuFirst).toEqual(
      rankRestaurantDraftCandidates(structuredClone(menuFirstProfile)),
    );
    expect(menuFirst).toHaveLength(20);
    expect(new Set(menuFirst.map(({ candidate }) => candidate.id)).size).toBe(
      20,
    );
    expect(menuFirst.every(({ score }) => score >= 0 && score <= 100)).toBe(
      true,
    );
    expect(menuFirst[0]).toMatchObject({
      candidate: { id: "restaurant-restaurant-market-ledger" },
      score: 91,
      breakdown: {
        restaurantFit: 15,
        guestJourneyFit: 20,
        serviceOfferFit: 6,
        visualDirection: 15,
        imageryFit: 10,
        densityFit: 5,
        evidenceReadiness: 20,
      },
    });

    const arrivalFirstProfile = {
      domain: "restaurant" as const,
      industry: "Restaurant",
      subindustry: "Restaurant",
      goals: [
        "Help guests understand arrival, address, opening hours, parking and directions before reading the menu",
      ],
      styleTags: ["documentary", "natural", "airy", "place-led"],
      services: ["Dine-in"],
      serviceModes: ["Dine-in"],
      address: REFERENCE_BRIEF.address!,
      openingHours: REFERENCE_BRIEF.openingHours!,
    };
    const arrivalFirst = rankRestaurantDraftCandidates(arrivalFirstProfile);

    expect(arrivalFirst).toEqual(
      rankRestaurantDraftCandidates(structuredClone(arrivalFirstProfile)),
    );
    expect(
      arrivalFirst.slice(0, 2).map(({ candidate, score, breakdown }) => ({
        id: candidate.id,
        score,
        breakdown,
      })),
    ).toEqual([
      {
        id: "restaurant-restaurant-courtyard-threshold",
        score: 87.3,
        breakdown: {
          restaurantFit: 15,
          guestJourneyFit: 20.3,
          serviceOfferFit: 6,
          visualDirection: 13,
          imageryFit: 10,
          densityFit: 3,
          evidenceReadiness: 20,
        },
      },
      {
        id: "restaurant-restaurant-terrace-air",
        score: 87.3,
        breakdown: {
          restaurantFit: 15,
          guestJourneyFit: 20.3,
          serviceOfferFit: 6,
          visualDirection: 13,
          imageryFit: 10,
          densityFit: 3,
          evidenceReadiness: 20,
        },
      },
    ]);

    const hostedGroupProfile = {
      domain: "restaurant" as const,
      industry: "Restaurant",
      subindustry: "Restaurant",
      goals: [
        "Plan a group occasion, compare menu options and submit a private dining table request",
      ],
      styleTags: ["structured", "corporate", "planning", "product-detail"],
      services: ["Private dining", "Group dining"],
      serviceModes: ["Private dining"],
      partyDetails: ["Groups may request a table for a supplied party size"],
      menu: REFERENCE_BRIEF.menu!,
      address: REFERENCE_BRIEF.address!,
      reservationPolicy: REFERENCE_BRIEF.reservationPolicy!,
    };
    const hostedGroup = rankRestaurantDraftCandidates(hostedGroupProfile);

    expect(hostedGroup).toEqual(
      rankRestaurantDraftCandidates(structuredClone(hostedGroupProfile)),
    );
    expect(hostedGroup[0]).toMatchObject({
      candidate: { id: "restaurant-restaurant-banquet-plan" },
      score: 93,
      breakdown: {
        restaurantFit: 15,
        guestJourneyFit: 20,
        serviceOfferFit: 10,
        visualDirection: 15,
        imageryFit: 10,
        densityFit: 3,
        evidenceReadiness: 20,
      },
    });
  });

  test("keeps evidence typed even when notes claim facts", () => {
    const notesOnly = rankRestaurantDraftCandidates({
      domain: "restaurant",
      industry: "Restaurant",
      notes:
        "Menu: complete. Opening hours: complete. Reservation policy: complete. Story: complete.",
    });

    expect(
      notesOnly.every(({ breakdown }) => breakdown.evidenceReadiness === 0),
    ).toBe(true);
    expect(
      notesOnly.every(({ reasons }) =>
        reasons.some((reason) => /needs supplied facts/i.test(reason)),
      ),
    ).toBe(true);

    const incompleteMenu: SuppliedCurrentRestaurantMenu = {
      suppliedAsCurrent: true,
      categories: [
        {
          name: "Mains",
          items: [{ name: "Pepper mushroom", price: "320" }],
        },
      ],
    };
    const incompleteMarket = rankRestaurantDraftCandidates({
      domain: "restaurant",
      industry: "Restaurant",
      menu: incompleteMenu,
      openingHours: REFERENCE_BRIEF.openingHours!,
    }).find(
      ({ candidate }) => candidate.id === "restaurant-restaurant-market-ledger",
    )!;
    const completeMarket = rankRestaurantDraftCandidates({
      domain: "restaurant",
      industry: "Restaurant",
      menu: REFERENCE_BRIEF.menu!,
      openingHours: REFERENCE_BRIEF.openingHours!,
    }).find(
      ({ candidate }) => candidate.id === "restaurant-restaurant-market-ledger",
    )!;

    expect(incompleteMarket.breakdown.evidenceReadiness).toBe(8);
    expect(incompleteMarket.reasons.join(" ")).toMatch(
      /needs supplied facts.*menu/i,
    );
    expect(completeMarket.breakdown.evidenceReadiness).toBe(20);
    expect(completeMarket.reasons.join(" ")).toMatch(
      /uses supplied factual inputs: menu, opening-hours/i,
    );

    const wrongDomain = rankRestaurantDraftCandidates({
      domain: "clinic",
      industry: "Dental",
      goals: ["Book an appointment"],
    });
    expect(
      wrongDomain.every(({ breakdown }) => breakdown.restaurantFit === 0),
    ).toBe(true);
  });

  test("merges aliases, dedupes tags, and ranks multilingual structure", () => {
    const canonical = rankRestaurantDraftCandidates({
      domain: "restaurant",
      industry: "Restaurant",
      styleTags: ["compact", "product-detail", "menu-led"],
      requiredCapabilities: ["contact form", "multilingual"],
    });
    const mergedAliases = rankRestaurantDraftCandidates({
      domain: "restaurant",
      industry: "Restaurant",
      style_tags: ["compact"],
      styleTags: ["product-detail", "menu-led", "COMPACT", " product-detail "],
      required_capabilities: ["contact form"],
      requiredCapabilities: ["multilingual", "CONTACT FORM"],
    });
    const emptyAliases = rankRestaurantDraftCandidates({
      domain: "restaurant",
      industry: "Restaurant",
      style_tags: [],
      styleTags: ["compact", "product-detail", "menu-led"],
      required_capabilities: [],
      requiredCapabilities: ["contact form", "multilingual"],
    });

    expect(mergedAliases).toEqual(canonical);
    expect(emptyAliases).toEqual(canonical);

    const singleEditorial = rankRestaurantDraftCandidates({
      domain: "restaurant",
      industry: "Restaurant",
      styleTags: ["editorial"],
    }).find(
      ({ candidate }) =>
        candidate.id === "restaurant-restaurant-table-story-editorial",
    )!;
    const duplicateEditorial = rankRestaurantDraftCandidates({
      domain: "restaurant",
      industry: "Restaurant",
      style_tags: ["editorial", " EDITORIAL "],
      styleTags: ["editorial"],
    }).find(
      ({ candidate }) =>
        candidate.id === "restaurant-restaurant-table-story-editorial",
    )!;

    expect(duplicateEditorial.breakdown.visualDirection).toBe(
      singleEditorial.breakdown.visualDirection,
    );
    expect(duplicateEditorial.score).toBe(singleEditorial.score);

    const capabilityRank = rankRestaurantDraftCandidates({
      domain: "restaurant",
      industry: "Restaurant",
      required_capabilities: [],
      requiredCapabilities: ["multilingual"],
    });
    const languageRank = rankRestaurantDraftCandidates({
      domain: "restaurant",
      industry: "Restaurant",
      languages: ["en", "te", "EN"],
    });

    expect(capabilityRank).toEqual(
      rankRestaurantDraftCandidates({
        domain: "restaurant",
        industry: "Restaurant",
        required_capabilities: [],
        requiredCapabilities: ["multilingual"],
      }),
    );
    expect(capabilityRank[0]).toMatchObject({
      candidate: { id: "restaurant-restaurant-dual-script" },
      score: 58,
      breakdown: { serviceOfferFit: 10 },
      reasons: expect.arrayContaining([
        "Matches the requested multilingual structure",
      ]),
    });
    expect(languageRank[0]).toMatchObject({
      candidate: { id: "restaurant-restaurant-dual-script" },
      score: 58,
      breakdown: { serviceOfferFit: 10 },
      reasons: expect.arrayContaining([
        "Matches the requested multilingual structure",
      ]),
    });
  });

  test("applies every candidate without changing facts, logo, forms, or inner-route anatomy", () => {
    const scaffold = factualScaffold();
    const scaffoldSnapshot = structuredClone(scaffold);
    const innerAnatomy = routeAnatomy(scaffold).filter(
      ({ path }) => path !== "/",
    );

    for (const candidate of listRestaurantDraftCandidates()) {
      const generated = applyRestaurantDraftCandidate(scaffold, candidate.id, {
        brandInput: BRAND_INPUT,
        brandProvenance: BRAND_PROVENANCE,
      });

      expect(generated.generation).toMatchObject({
        catalogVersion: candidate.catalogVersion,
        packStatus: "unavailable",
        selectedCandidateId: candidate.id,
        candidateIds: expect.arrayContaining(
          RESTAURANT_DRAFT_CANDIDATES.map(({ id }) => id),
        ),
        premiumGate: { passed: false },
      });
      expect(generated.generation?.candidateIds).toHaveLength(20);
      expect(generated.theme.brand.logoAssetId).toBe(LOGO_ASSET_ID);
      expect(generated.pages.map(({ path }) => path)).toEqual(
        RESTAURANT_DRAFT_PAGE_PATHS,
      );
      expect(
        routeAnatomy(generated).filter(({ path }) => path !== "/"),
      ).toEqual(innerAnatomy);
      expect(routeAnatomy(generated)[0]!.families).toEqual([
        "navbar",
        "hero",
        ...candidate.homeFlow,
        "footer",
      ]);
      expect(JSON.stringify(generated)).toContain("INR 320");
      expect(JSON.stringify(generated)).toContain("INR 520");
      expect(formOwnership(generated)).toEqual([
        ["/reservations", "reservation", "reservation.request"],
        ["/contact", "enquiry", "lead.create"],
      ]);
      expect(
        restaurantDraftContentIssues(generated),
        `${candidate.recipeId} content issues`,
      ).toEqual([]);
      expect(
        restaurantDraftMediaIssues(generated),
        `${candidate.recipeId} media issues`,
      ).toEqual([]);
      expect(assessCertifiedPublishGate(generated)).toMatchObject({
        ok: false,
        code: "PREMIUM_GATE_FAILED",
      });
    }

    expect(scaffold).toEqual(scaffoldSnapshot);
  });

  test("canonicalizes caller objects, rejects other industries, and remains unregistered", () => {
    const scaffold = factualScaffold();
    const canonical = listRestaurantDraftCandidates()[2]!;
    const altered = structuredClone(canonical);
    altered.theme.brand.colors.primary = "#FF00FF";
    altered.variants.hero = altered.variants.hero === 5 ? 1 : 5;
    const generated = applyRestaurantDraftCandidate(scaffold, altered, {
      applyCandidateMedia: false,
    });

    expect(generated.theme.brand.colors.primary).toBe(
      canonical.theme.brand.colors.primary,
    );
    expect(generated.theme.brand.colors.primary).not.toBe("#FF00FF");
    expect(() =>
      applyRestaurantDraftCandidate(scaffold, "restaurant-restaurant-unknown"),
    ).toThrow(/Unknown Restaurant draft candidate/);
    expect(() =>
      applyRestaurantDraftCandidate(baseSite(), canonical.id),
    ).toThrow(/restaurant\/restaurant scaffold/);
    expect(
      resolveCertifiedIndustryPackByCandidateId(canonical.id),
    ).toBeUndefined();

    const tampered = structuredClone(generated);
    tampered.generation!.premiumGate = {
      passed: true,
      score: 100,
      issues: [],
    };
    expect(assessCertifiedPublishGate(tampered)).toMatchObject({
      ok: false,
      code: "PREMIUM_GATE_STALE_OR_TAMPERED",
    });
  });

  test("owns deterministic candidate media slots and never replaces merchant media", () => {
    const [candidateA, candidateB] = listRestaurantDraftCandidates();
    const scaffold = factualScaffold();
    const homeHeroIds: string[] = [];

    for (const candidate of listRestaurantDraftCandidates()) {
      const selection = restaurantCandidateMediaSelection(candidate);
      expect(selection).toHaveLength(16);
      expect(new Set(selection.map(({ id }) => id)).size).toBe(16);
      expect(selection[0]!.id).toBe(
        (RESTAURANT_CANDIDATE_HOME_HERO_IDS as Record<string, string>)[
          candidate.recipeId
        ],
      );
      const selectedIds = selection.map(({ id }) => id);
      for (const excludedId of RESTAURANT_CANDIDATE_MEDIA_EXCLUSIONS[
        candidate.recipeId as keyof typeof RESTAURANT_CANDIDATE_MEDIA_EXCLUSIONS
      ] ?? []) {
        expect(selectedIds, candidate.recipeId).not.toContain(excludedId);
      }
      homeHeroIds.push(selection[0]!.id);
    }
    expect(Object.keys(RESTAURANT_CANDIDATE_HOME_HERO_IDS)).toHaveLength(20);
    expect(new Set(homeHeroIds).size).toBe(20);

    const directB = applyRestaurantCandidateMedia(scaffold, candidateB!);
    const switchedToB = applyRestaurantCandidateMedia(
      applyRestaurantCandidateMedia(scaffold, candidateA!),
      candidateB!,
    );
    expect(imageAssetIds(switchedToB)).toEqual(imageAssetIds(directB));
    expect(applyRestaurantCandidateMedia(directB, candidateB!)).toEqual(
      directB,
    );

    const withMerchantHero = structuredClone(scaffold);
    const homeHero = withMerchantHero.pages[0]!.sections.find(
      (section) => sectionFamily(section.component.componentId) === "hero",
    )!;
    homeHero.props.image = {
      assetId: "merchant/verified-home",
      src: "https://merchant.example.test/home.jpg",
      alt: "Verified view supplied by the restaurant",
    };
    const merchantResult = applyRestaurantCandidateMedia(
      withMerchantHero,
      candidateA!,
    );
    const preservedHero = merchantResult.pages[0]!.sections.find(
      (section) => sectionFamily(section.component.componentId) === "hero",
    )!;
    expect(preservedHero.props.image).toEqual(homeHero.props.image);
  });
});

const REFERENCE_BRIEF: RestaurantDraftBrief = {
  businessName: "Tamarind Test Table",
  cuisines: ["Regional Indian"],
  serviceModes: ["Dine-in"],
  menu: {
    suppliedAsCurrent: true,
    categories: [
      {
        name: "Small plates",
        items: [
          {
            name: "Pepper mushroom",
            description: "Mushroom, pepper and curry leaf.",
            price: "320",
            currency: "INR",
          },
        ],
      },
      {
        name: "Mains",
        items: [
          {
            name: "Tomato rice",
            description: "Rice, tomato and roasted spice.",
            price: "520",
            currency: "INR",
          },
        ],
      },
    ],
    notes: ["Representative current menu supplied for QA."],
  },
  address: "Banjara Hills, Hyderabad, Telangana",
  mapUrl: "https://maps.example.test/tamarind",
  directions: ["Use the supplied map link for directions."],
  openingHours: ["Monday–Sunday, 12:00 PM–10:00 PM"],
  phone: "+91 40 5555 0101",
  email: "hello@tamarind.example",
  reservationPolicy: ["A submitted request is not a confirmed reservation."],
  story: {
    heading: "A supplied neighbourhood story",
    paragraphs: ["This factual story paragraph was supplied for the QA brief."],
    principles: ["Keep the current menu readable"],
    people: [],
  },
  goals: ["Read the menu and request a table"],
  languages: ["en"],
};

function factualScaffold(): Site {
  return createRestaurantDraftScaffold(
    baseSite(),
    REFERENCE_BRIEF,
    BRAND_INPUT,
    BRAND_PROVENANCE,
  );
}

function baseSite(): Site {
  return siteSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    siteId: "restaurant-top20-staging",
    workspaceId: "restaurant-top20-workspace",
    name: "Restaurant draft",
    domain: "landing-page",
    theme: {
      family: "minimalist",
      modifiers: ["light"],
      brand: {
        colors: {
          primary: "#6D5DFC",
          secondary: "#171717",
          accent: "#8B7FFF",
          background: "#FFFFFF",
          surface: "#F5F5F7",
          textPrimary: "#111111",
          textSecondary: "#65656B",
          border: "#DDDDE3",
          success: "#168A4A",
          warning: "#AD6A00",
          error: "#C93636",
        },
        typography: {
          display: "Arial, sans-serif",
          body: "Arial, sans-serif",
          ui: "Arial, sans-serif",
        },
        density: "comfortable",
        shape: "balanced",
        motion: "subtle",
      },
    },
    seoBlueprint: {
      primaryGoal: "Present the business clearly",
      targetLocations: [],
      priorityTopics: [],
      audiences: [],
      languages: ["en"],
      localSeo: false,
      servicePages: true,
      locationPages: false,
      blog: false,
    },
    pages: [
      {
        id: "home",
        path: "/",
        name: "Home",
        sections: [],
        seo: {
          title: "Restaurant draft",
          description: "Internal Restaurant draft.",
          canonicalPath: "/",
          indexable: false,
          structuredDataTypes: [],
        },
      },
    ],
    navigation: [{ label: "Home", href: "/" }],
    integrations: [],
    domains: [],
  });
}

function routeAnatomy(site: Site) {
  return site.pages.map((page) => ({
    path: page.path,
    families: page.sections.map((section) =>
      sectionFamily(section.component.componentId),
    ),
  }));
}

function formOwnership(site: Site): string[][] {
  return site.pages.flatMap((page) =>
    page.sections.flatMap((section) => {
      const key = section.props.formBindingKey;
      if (typeof key !== "string") return [];
      const actionId = Object.values(section.bindings)[0]?.actionId;
      return [[page.path, key, actionId ?? ""]];
    }),
  );
}

function imageAssetIds(site: Site): string[] {
  return site.pages.flatMap((page) =>
    page.sections.flatMap((section) => imageIds(section.props)),
  );
}

function imageIds(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(imageIds);
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  const assetId = typeof record.assetId === "string" ? record.assetId : "";
  const src = typeof record.src === "string" ? record.src : "";
  if (assetId && src) return [assetId];
  return Object.values(record).flatMap(imageIds);
}

function homeSectionsByFamily(site: Site) {
  const home = site.pages.find(({ path }) => path === "/");
  if (!home) throw new Error("Expected Restaurant Home page.");
  return Object.fromEntries(
    home.sections.map((section) => [
      sectionFamily(section.component.componentId),
      section,
    ]),
  ) as Partial<
    Record<SectionFamily, Site["pages"][number]["sections"][number]>
  >;
}

function requiredActionContract(site: Site): string[] {
  const navigation = site.navigation.map(
    ({ label, href }) => `navigation:${label}:${href}`,
  );
  const sectionActions = site.pages.flatMap((page) =>
    page.sections.flatMap((section) => {
      const props = section.props;
      const values: string[] = [];
      for (const key of ["primaryAction", "secondaryAction"] as const) {
        const action = props[key];
        if (action && typeof action === "object") {
          const record = action as Record<string, unknown>;
          values.push(
            `action:${page.path}:${section.id}:${key}:${String(record.label ?? "")}:${String(record.href ?? "")}`,
          );
        }
      }
      if (typeof props.formSubmitLabel === "string") {
        values.push(
          `submit:${page.path}:${section.id}:${props.formSubmitLabel}`,
        );
      }
      for (const [bindingKey, binding] of Object.entries(section.bindings)) {
        values.push(
          `binding:${page.path}:${section.id}:${bindingKey}:${binding.actionId}`,
        );
      }
      return values;
    }),
  );
  return [...navigation, ...sectionActions].sort();
}

function referenceMerchantFactValues(): string[] {
  const menu = REFERENCE_BRIEF.menu;
  const story = REFERENCE_BRIEF.story;
  const values = [
    REFERENCE_BRIEF.businessName,
    ...(REFERENCE_BRIEF.cuisines ?? []),
    ...(REFERENCE_BRIEF.serviceModes ?? []),
    REFERENCE_BRIEF.address,
    REFERENCE_BRIEF.mapUrl,
    ...(REFERENCE_BRIEF.directions ?? []),
    ...(REFERENCE_BRIEF.openingHours ?? []),
    REFERENCE_BRIEF.phone,
    REFERENCE_BRIEF.email,
    ...(REFERENCE_BRIEF.reservationPolicy ?? []),
    ...(REFERENCE_BRIEF.goals ?? []),
    ...(REFERENCE_BRIEF.languages ?? []),
    story?.heading,
    ...(story?.paragraphs ?? []),
    ...(story?.principles ?? []),
    ...(menu?.notes ?? []),
    ...(menu?.disclosureNotes ?? []),
    ...(menu?.categories.flatMap((category) => [
      category.name,
      category.description,
      ...category.items.flatMap((item) => [
        item.name,
        item.description,
        item.price,
        item.currency,
        ...(item.disclosures ?? []),
      ]),
    ]) ?? []),
  ];
  return [
    ...new Set(
      values.filter(
        (value): value is string =>
          typeof value === "string" && value.length > 0,
      ),
    ),
  ];
}

function exactStringLeafCount(value: unknown, expected: string): number {
  if (typeof value === "string") return value === expected ? 1 : 0;
  if (Array.isArray(value)) {
    return value.reduce(
      (count, item) => count + exactStringLeafCount(item, expected),
      0,
    );
  }
  if (!value || typeof value !== "object") return 0;
  return Object.values(value).reduce(
    (count, item) => count + exactStringLeafCount(item, expected),
    0,
  );
}

function sectionFamily(componentId: string): SectionFamily | undefined {
  const legacy = componentId.toLowerCase().match(/^([a-z]+)\./)?.[1];
  if (legacy && SECTION_FAMILIES.includes(legacy as SectionFamily)) {
    return legacy as SectionFamily;
  }
  const upper = componentId.toUpperCase();
  return SECTION_FAMILIES.find((family) =>
    upper.includes(`-${FAMILY_CODES[family]}-`),
  );
}

function contrastRatio(foreground: string, background: string): number {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

function relativeLuminance(hex: string): number {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)!
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) =>
      channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
    );
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
}
