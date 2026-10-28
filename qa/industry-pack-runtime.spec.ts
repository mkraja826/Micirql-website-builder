import { expect, test } from "@playwright/test";
import { SCHEMA_VERSION, siteSchema, type Site } from "@micirql/schema";
import {
  DENTAL_HERO_ASSETS_BY_IMAGE_STRATEGY,
  DENTAL_HERO_ASSET_BY_IMAGE_STRATEGY,
  applyCertifiedDentalMedia,
  applyIndustryPreset,
  certifiedDentalMediaIssues,
} from "../apps/builder/app/apply-industry-preset";
import { createDentalStructuralScaffold } from "../apps/builder/app/dental-scaffold";
import {
  applyDentalVisitorContentHygiene,
  dentalVisitorContentIssues,
} from "../apps/builder/app/dental-content-hygiene";
import {
  DENTAL_CATALOG_VERSION,
  DENTAL_REQUIRED_ACTIONS,
  DENTAL_REQUIRED_PAGE_PATHS,
  DENTAL_SUBTYPE,
  listIndustryDesignPresets,
} from "../apps/builder/app/industry-design-preset-data";
import {
  PHYSIOTHERAPY_CATALOG_VERSION,
  RESTAURANT_CATALOG_VERSION,
  dentalIndustryPack,
  dentalIndustryPackRuntime,
  listCertifiedIndustryPackRuntimes,
  physiotherapyIndustryPack,
  physiotherapyIndustryPackRuntime,
  restaurantIndustryPack,
  restaurantIndustryPackRuntime,
  resolveCertifiedIndustryPackRuntime,
  resolveCertifiedIndustryPackRuntimeByCandidateId,
  resolveCertifiedIndustryPackRuntimeByCatalogVersion,
  resolveCertifiedIndustryPackRuntimeById,
  resolveCertifiedIndustryPackRuntimeForSite,
} from "../apps/builder/app/industry-packs";
import {
  applySelectedDentalCandidate,
  protectedStructureChanged,
  repairSelectedDraftContentFit,
  restoreProtectedStructure,
  selectedCandidateStructureIssues,
  validateSelectedDraft,
} from "../apps/builder/app/api/design-review/select/selection-pipeline";
import { assertPremiumGate } from "../apps/builder/app/api/publish/authorization";
import { isDentalCertifiedSection } from "@micirql/sections";

test.describe("certified industry-pack runtimes", () => {
  test("adapts the existing dental catalog without changing its identity or output", () => {
    const legacyCandidates = listIndustryDesignPresets("clinic", "dental");
    const runtimeCandidates = dentalIndustryPackRuntime.listCandidates();
    const candidate = runtimeCandidates[0]!;
    const source = dentalSiteFixture();

    expect(listCertifiedIndustryPackRuntimes()).toEqual([
      dentalIndustryPackRuntime,
      physiotherapyIndustryPackRuntime,
      restaurantIndustryPackRuntime,
    ]);
    expect(dentalIndustryPackRuntime.pack).toBe(dentalIndustryPack);
    expect(dentalIndustryPackRuntime.pack.catalogVersion).toBe(
      DENTAL_CATALOG_VERSION,
    );
    expect(dentalIndustryPackRuntime.pack.subtype).toBe(DENTAL_SUBTYPE);
    expect(dentalIndustryPackRuntime.pack.requiredPagePaths).toBe(
      DENTAL_REQUIRED_PAGE_PATHS,
    );
    expect(dentalIndustryPackRuntime.pack.requiredActions).toBe(
      DENTAL_REQUIRED_ACTIONS,
    );
    expect(runtimeCandidates).toEqual(legacyCandidates);
    expect(dentalIndustryPackRuntime.resolveCandidate(candidate.id)).toEqual(
      candidate,
    );
    expect(
      dentalIndustryPackRuntime.applyCandidate(source, candidate.id, {
        applyCertifiedMedia: false,
      }),
    ).toEqual(
      applyIndustryPreset(source, legacyCandidates[0]!, {
        applyCertifiedMedia: false,
      }),
    );

    // Existing public dental media constants remain available at their legacy
    // module path while the runtime presents neutral operation names.
    expect(DENTAL_HERO_ASSET_BY_IMAGE_STRATEGY.restrained).toBe(
      "mi-dental-calm-clinic",
    );
    expect(DENTAL_HERO_ASSETS_BY_IMAGE_STRATEGY.restrained).toContain(
      "mi-dental-calm-clinic",
    );
  });

  test("maps the complete established dental selection and validation policy", () => {
    const source = dentalSiteFixture();
    const candidate = dentalIndustryPackRuntime.listCandidates()[0]!;
    const scaffoldBrief = {
      businessName: "Runtime Dental",
      location: "Hyderabad, Telangana",
      services: ["General dentistry", "Dental implants"],
      goals: ["Request an appointment"],
      languages: ["en"],
    };
    expect(
      dentalIndustryPackRuntime.createStructuralScaffold(source, scaffoldBrief),
    ).toEqual(createDentalStructuralScaffold(source, scaffoldBrief));
    const legacySelected = applySelectedDentalCandidate(source, candidate);
    const runtimeSelected = dentalIndustryPackRuntime.applySelectedCandidate(
      source,
      candidate.id,
    );

    expect(runtimeSelected).toEqual(legacySelected);
    expect(
      dentalIndustryPackRuntime.candidateStructureIssues(
        runtimeSelected,
        candidate.id,
      ),
    ).toEqual(selectedCandidateStructureIssues(legacySelected, candidate));
    expect(dentalIndustryPackRuntime.validateDraft(runtimeSelected)).toEqual(
      validateSelectedDraft(legacySelected),
    );
    expect(
      dentalIndustryPackRuntime.applyContentHygiene(runtimeSelected),
    ).toEqual(applyDentalVisitorContentHygiene(legacySelected));
    expect(dentalIndustryPackRuntime.contentIssues(runtimeSelected)).toEqual(
      dentalVisitorContentIssues(legacySelected),
    );
    expect(dentalIndustryPackRuntime.repairContentFit(runtimeSelected)).toEqual(
      repairSelectedDraftContentFit(legacySelected),
    );
    expect(
      dentalIndustryPackRuntime.protectedStructureChanged(
        source,
        runtimeSelected,
      ),
    ).toBe(protectedStructureChanged(source, legacySelected));
    expect(
      dentalIndustryPackRuntime.restoreProtectedStructure(
        source,
        runtimeSelected,
      ),
    ).toEqual(restoreProtectedStructure(source, legacySelected));

    const component = runtimeSelected.pages[0]!.sections[0]!.component;
    expect(
      dentalIndustryPackRuntime.isCertifiedComponent(
        component.componentId,
        component.version,
      ),
    ).toBe(isDentalCertifiedSection(component.componentId, component.version));

    const runtimeMedia = dentalIndustryPackRuntime.applyCertifiedMedia(
      runtimeSelected,
      candidate.id,
    );
    const legacyMedia = applyCertifiedDentalMedia(legacySelected, candidate);
    expect(runtimeMedia).toEqual(legacyMedia);
    expect(
      dentalIndustryPackRuntime.certifiedMediaIssues(runtimeMedia),
    ).toEqual(certifiedDentalMediaIssues(legacyMedia));
    expect(dentalIndustryPackRuntime.functionPolicy).toEqual({
      contentEnrichment: {
        functionName: "enrich-site-content",
        certifiedModes: ["model", "partial", "curated"],
        fallbackIsCertifiable: false,
      },
      certifiedMedia: {
        mode: "licensed-selection",
        provider: "pexels",
        remoteFunctionRequired: false,
      },
    });
  });

  test("executes the canonical catalog candidate rather than caller mutations", () => {
    const source = dentalSiteFixture();
    const canonical = dentalIndustryPackRuntime.listCandidates()[0]!;
    const altered = structuredClone(canonical);
    altered.theme.brand.colors.primary = "#ff00ff";
    altered.sectionOrder.reverse();

    const result = dentalIndustryPackRuntime.applyCandidate(
      source,
      altered.id,
      {
        applyCertifiedMedia: false,
      },
    );
    const expected = applyIndustryPreset(source, canonical, {
      applyCertifiedMedia: false,
    });

    expect(result).toEqual(expected);
    expect(result.theme.brand.colors.primary).not.toBe("#ff00ff");
    expect(() =>
      dentalIndustryPackRuntime.applyCandidate(
        source,
        "clinic-physiotherapy-calm-movement",
        {
          applyCertifiedMedia: false,
        },
      ),
    ).toThrow(/not owned by certified industry pack clinic-dental/);
  });

  test("runs the certified Physiotherapy catalog through its own scaffold, gate, media, and lookup boundary", () => {
    const source = dentalSiteFixture();
    const ranked = physiotherapyIndustryPackRuntime.rankCandidates({
      domain: "clinic",
      industry: "Physiotherapy clinic",
      subindustry: "Physiotherapy",
      location: "Hyderabad, Telangana",
      services: ["Physiotherapy assessment", "Sports rehabilitation"],
      goals: ["Request an appointment"],
      notes: "Approved opening hours: Monday to Saturday, 9:00–18:00",
    });
    expect(ranked).toHaveLength(20);
    expect(new Set(ranked.map((item) => item.candidate.id)).size).toBe(20);

    const scaffold = physiotherapyIndustryPackRuntime.createStructuralScaffold(
      source,
      {
        businessName: "Runtime Physiotherapy",
        industry: "Physiotherapy clinic",
        subindustry: "Physiotherapy",
        location: "Hyderabad, Telangana",
        services: ["Physiotherapy assessment", "Sports rehabilitation"],
        goals: ["Request an appointment"],
        languages: ["en"],
        notes: "Approved opening hours: Monday to Saturday, 9:00–18:00",
      },
    );
    const candidateId = ranked[0]!.candidate.id;
    const selected = physiotherapyIndustryPackRuntime.applySelectedCandidate(
      scaffold,
      candidateId,
    );
    const withMedia = physiotherapyIndustryPackRuntime.applyCertifiedMedia(
      selected,
      candidateId,
    );
    const gate = physiotherapyIndustryPackRuntime.validateDraft(
      withMedia,
      physiotherapyIndustryPackRuntime.candidateStructureIssues(
        withMedia,
        candidateId,
      ),
    );
    expect(gate.passed, JSON.stringify(gate.issues, null, 2)).toBeTruthy();
    expect(gate.score).toBe(100);
    expect(physiotherapyIndustryPackRuntime.contentIssues(withMedia)).toEqual(
      [],
    );
    expect(
      physiotherapyIndustryPackRuntime.certifiedMediaIssues(withMedia),
    ).toEqual([]);
    expect(withMedia.pages.map((page) => page.path)).toEqual([
      "/",
      "/therapies",
      "/conditions",
      "/therapists",
      "/about",
      "/contact",
    ]);
    expect(withMedia.generation).toMatchObject({
      catalogVersion: PHYSIOTHERAPY_CATALOG_VERSION,
      packStatus: "certified",
      selectedCandidateId: candidateId,
    });
    withMedia.generation!.premiumGate = gate;
    expect(() => assertPremiumGate(withMedia)).not.toThrow();

    expect(
      resolveCertifiedIndustryPackRuntime({
        domain: "clinic",
        industry: "Healthcare",
        subindustry: "Physiotherapy",
        services: ["Sports rehabilitation"],
      }),
    ).toBe(physiotherapyIndustryPackRuntime);
    expect(
      resolveCertifiedIndustryPackRuntimeForSite({
        domain: "clinic",
        subtype: "physiotherapy",
      }),
    ).toBe(physiotherapyIndustryPackRuntime);
    expect(
      resolveCertifiedIndustryPackRuntimeById("clinic-physiotherapy"),
    ).toBe(physiotherapyIndustryPackRuntime);
    expect(
      resolveCertifiedIndustryPackRuntimeByCatalogVersion(
        "physiotherapy-draft-2026.10.18",
      ),
    ).toBeUndefined();
    expect(resolveCertifiedIndustryPackRuntimeByCandidateId(candidateId)).toBe(
      physiotherapyIndustryPackRuntime,
    );

    expect(physiotherapyIndustryPackRuntime.pack).toBe(
      physiotherapyIndustryPack,
    );
    expect(() =>
      physiotherapyIndustryPackRuntime.applyCandidate(
        scaffold,
        "clinic-dental-precision",
      ),
    ).toThrow(/not owned by certified industry pack clinic-physiotherapy/);

    expect(resolveCertifiedIndustryPackRuntimeById("clinic-dental")).toBe(
      dentalIndustryPackRuntime,
    );
    expect(
      resolveCertifiedIndustryPackRuntimeByCatalogVersion(
        DENTAL_CATALOG_VERSION,
      ),
    ).toBe(dentalIndustryPackRuntime);
  });

  test("runs certified Restaurant through structured facts, ranking, media and publish validation", () => {
    const source = dentalSiteFixture();
    const industryFacts = {
      kind: "restaurant-facts-v1",
      businessName: "Runtime Restaurant",
      cuisines: ["South Indian", "Seasonal vegetarian"],
      serviceModes: ["Dine-in", "Private dining"],
      menu: {
        suppliedAsCurrent: true as const,
        categories: [
          {
            name: "Mains",
            items: [
              {
                name: "Vegetable biryani",
                description: "Basmati rice and seasonal vegetables",
                price: "₹420",
                disclosures: [],
              },
            ],
          },
        ],
        disclosureNotes: [
          "Tell the restaurant about allergies before ordering.",
        ],
      },
      address: "Banjara Hills, Hyderabad, Telangana",
      mapUrl: "https://maps.google.com/?q=Banjara+Hills",
      openingHours: ["Monday–Sunday, 12:00–22:30"],
      phone: "+91 90000 00001",
      accessibility: ["Step-free entrance supplied by the restaurant."],
      parking: ["Street parking details supplied by the restaurant."],
      transit: ["Public transport details supplied by the restaurant."],
      reservationPolicy: [
        "Table requests are reviewed by the restaurant and confirmed separately.",
      ],
      story: {
        heading: "About Runtime Restaurant",
        paragraphs: ["Restaurant story supplied by the restaurant."],
        principles: [],
        people: [
          {
            name: "Radhika Rao",
            role: "Host",
            biography: "Profile supplied by the restaurant.",
            verified: true as const,
          },
        ],
      },
    };
    expect(
      restaurantIndustryPackRuntime.industryFactsIssues(industryFacts),
    ).toEqual([]);
    expect(
      restaurantIndustryPackRuntime.industryFactsIssues(undefined)[0]?.code,
    ).toBe("RESTAURANT_FACTS_REQUIRED");
    expect(
      restaurantIndustryPackRuntime.industryFactsIssues({
        ...industryFacts,
        menu: {
          suppliedAsCurrent: true,
          categories: [{ name: "", items: [{ name: "" }] }],
        },
      })[0]?.code,
    ).toBe("RESTAURANT_CURRENT_MENU_REQUIRED");
    expect(
      restaurantIndustryPackRuntime
        .industryFactsIssues({
          ...industryFacts,
          story: undefined,
        })
        .some((issue) => issue.code === "RESTAURANT_STORY_REQUIRED"),
    ).toBeTruthy();
    expect(
      restaurantIndustryPackRuntime
        .industryFactsIssues({
          ...industryFacts,
          mapUrl: undefined,
        })
        .some((issue) => issue.code === "RESTAURANT_MAP_URL_REQUIRED"),
    ).toBeTruthy();
    expect(
      restaurantIndustryPackRuntime
        .industryFactsIssues({
          ...industryFacts,
          phone: undefined,
          email: undefined,
        })
        .some((issue) => issue.code === "RESTAURANT_CONTACT_REQUIRED"),
    ).toBeTruthy();
    expect(
      restaurantIndustryPackRuntime
        .industryFactsIssues({
          ...industryFacts,
          menu: {
            suppliedAsCurrent: true,
            categories: [
              { name: "Mains", items: [{ name: "Vegetable biryani" }] },
            ],
          },
        })
        .some((issue) => issue.code === "RESTAURANT_MENU_PRICE_REQUIRED"),
    ).toBeTruthy();
    expect(
      restaurantIndustryPackRuntime
        .industryFactsIssues({
          ...industryFacts,
          menu: {
            suppliedAsCurrent: true,
            categories: [
              {
                name: "Mains",
                items: [
                  {
                    name: "Vegetable biryani",
                    price: "₹420",
                  },
                ],
              },
            ],
          },
        })
        .some((issue) => issue.code === "RESTAURANT_MENU_DESCRIPTION_REQUIRED"),
    ).toBeTruthy();
    expect(
      restaurantIndustryPackRuntime
        .industryFactsIssues({
          ...industryFacts,
          menu: {
            suppliedAsCurrent: true,
            categories: [
              {
                name: "Mains",
                items: [{ name: "Vegetable biryani", price: "420" }],
              },
            ],
          },
        })
        .some((issue) => issue.code === "RESTAURANT_MENU_CURRENCY_REQUIRED"),
    ).toBeTruthy();

    const ranked = restaurantIndustryPackRuntime.rankCandidates({
      domain: "restaurant",
      industry: "Restaurant",
      subindustry: "Restaurant",
      location: "Hyderabad, Telangana",
      services: ["Dine-in"],
      goals: ["Request reservations"],
      languages: ["en", "te"],
      industryFacts,
    });
    expect(ranked).toHaveLength(20);
    expect(new Set(ranked.map((item) => item.candidate.id)).size).toBe(20);

    const scaffold = restaurantIndustryPackRuntime.createStructuralScaffold(
      source,
      {
        businessName: "Runtime Restaurant",
        industry: "Restaurant",
        subindustry: "Restaurant",
        location: "Hyderabad, Telangana",
        services: ["Dine-in"],
        goals: ["Request reservations"],
        languages: ["en"],
        industryFacts,
      },
    );
    const candidateId = ranked[0]!.candidate.id;
    scaffold.generation!.candidateIds = ranked.map((item) => item.candidate.id);

    // PostgreSQL jsonb preserves values but not object-key insertion order.
    // Every direction must therefore pass the fact-preservation gate after the
    // structural scaffold has been saved and loaded through workspace_drafts.
    const persistedScaffold = reorderJsonObjectKeysForStorage(scaffold);
    for (const { candidate } of ranked) {
      const persistedSelected =
        restaurantIndustryPackRuntime.applySelectedCandidate(
          persistedScaffold,
          candidate.id,
        );
      const persistedWithMedia =
        restaurantIndustryPackRuntime.applyCertifiedMedia(
          persistedSelected,
          candidate.id,
        );
      const persistedGate = restaurantIndustryPackRuntime.validateDraft(
        persistedWithMedia,
        restaurantIndustryPackRuntime.candidateStructureIssues(
          persistedWithMedia,
          candidate.id,
        ),
      );
      expect(
        persistedGate.passed,
        `${candidate.id}\n${JSON.stringify(persistedGate.issues, null, 2)}`,
      ).toBeTruthy();
    }

    const selected = restaurantIndustryPackRuntime.applySelectedCandidate(
      scaffold,
      candidateId,
    );
    const withMedia = restaurantIndustryPackRuntime.applyCertifiedMedia(
      selected,
      candidateId,
    );
    const gate = restaurantIndustryPackRuntime.validateDraft(
      withMedia,
      restaurantIndustryPackRuntime.candidateStructureIssues(
        withMedia,
        candidateId,
      ),
    );
    expect(gate.passed, JSON.stringify(gate.issues, null, 2)).toBeTruthy();
    expect(gate.score).toBe(100);
    expect(restaurantIndustryPackRuntime.contentIssues(withMedia)).toEqual([]);
    expect(
      restaurantIndustryPackRuntime.certifiedMediaIssues(withMedia),
    ).toEqual([]);
    expect(withMedia.pages.map((page) => page.path)).toEqual([
      "/",
      "/menu",
      "/visit",
      "/reservations",
      "/story",
      "/contact",
    ]);
    const storyTeam = withMedia.pages
      .find((page) => page.path === "/story")
      ?.sections.find((section) => section.props.title === "People");
    expect(storyTeam?.hidden).toBe(false);
    expect(storyTeam?.props.items).toEqual([
      {
        title: "Radhika Rao",
        description: "Host · Profile supplied by the restaurant.",
        verified: true,
      },
    ]);
    expect(withMedia.generation).toMatchObject({
      catalogVersion: RESTAURANT_CATALOG_VERSION,
      packStatus: "certified",
      selectedCandidateId: candidateId,
      industryFacts,
    });
    expect(
      restaurantIndustryPackRuntime
        .rankCandidates({
          domain: "restaurant",
          industry: "Restaurant",
          subindustry: "Restaurant",
          location: "Hyderabad, Telangana",
          services: ["Dine-in"],
          goals: ["Request reservations"],
          languages: ["en", "te"],
          industryFacts: withMedia.generation!.industryFacts,
        })
        .map((item) => item.candidate.id),
    ).toEqual(withMedia.generation!.candidateIds);

    const changedManifest = structuredClone(withMedia);
    changedManifest.generation!.industryFacts!.address = "Invented address";
    expect(
      restaurantIndustryPackRuntime.protectedStructureChanged(
        withMedia,
        changedManifest,
      ),
    ).toBeTruthy();

    const changedMenu = structuredClone(withMedia);
    const menuItems = changedMenu.pages
      .find((page) => page.path === "/menu")
      ?.sections.find((section) =>
        section.component.componentId.toUpperCase().includes("-SERV-"),
      )?.props.items as Array<Record<string, unknown>>;
    menuItems[0]!.title = "Dine-in";
    const changedFactIssue = restaurantIndustryPackRuntime
      .validateDraft(changedMenu)
      .issues.find(
        (issue) => issue.code === "RESTAURANT_SUPPLIED_FACTS_CHANGED",
      );
    expect(changedFactIssue).toEqual(
      expect.objectContaining({
        message:
          "The rendered /menu services facts no longer matches the normalized Restaurant brief.",
      }),
    );

    const externalMedia = structuredClone(withMedia);
    const externalHero = externalMedia.pages[0]!.sections.find((section) =>
      section.component.componentId.toUpperCase().includes("-HERO-"),
    )!;
    externalHero.props.image = {
      src: "https://merchant.example.test/unverified.jpg",
      alt: "Unverified external image",
    };
    expect(
      restaurantIndustryPackRuntime
        .certifiedMediaIssues(externalMedia)
        .some(
          (issue) => issue.code === "RESTAURANT_MEDIA_OUTSIDE_CERTIFIED_POOL",
        ),
    ).toBeTruthy();

    const forgedMerchantMedia = structuredClone(withMedia);
    const forgedHero = forgedMerchantMedia.pages[0]!.sections.find((section) =>
      section.component.componentId.toUpperCase().includes("-HERO-"),
    )!;
    forgedHero.props.image = {
      assetId: "merchant/forged-asset",
      src: "https://merchant.example.test/forged.jpg",
      alt: "Claimed merchant image",
    };
    expect(
      restaurantIndustryPackRuntime
        .certifiedMediaIssues(forgedMerchantMedia)
        .some(
          (issue) => issue.code === "RESTAURANT_MEDIA_OUTSIDE_CERTIFIED_POOL",
        ),
    ).toBeTruthy();

    const duplicatePageId = structuredClone(withMedia);
    duplicatePageId.pages[1]!.id = duplicatePageId.pages[0]!.id;
    expect(
      restaurantIndustryPackRuntime
        .validateDraft(duplicatePageId)
        .issues.some((issue) => issue.code === "RESTAURANT_PAGE_ID_DUPLICATE"),
    ).toBeTruthy();

    const duplicateSectionId = structuredClone(withMedia);
    duplicateSectionId.pages[1]!.sections[0]!.id =
      duplicateSectionId.pages[0]!.sections[0]!.id;
    expect(
      restaurantIndustryPackRuntime
        .validateDraft(duplicateSectionId)
        .issues.some(
          (issue) => issue.code === "RESTAURANT_SECTION_ID_DUPLICATE",
        ),
    ).toBeTruthy();

    const sparsePage = structuredClone(withMedia);
    sparsePage.pages
      .find((page) => page.path === "/visit")!
      .sections.splice(2, 1);
    expect(
      restaurantIndustryPackRuntime
        .candidateStructureIssues(sparsePage, candidateId)
        .some((issue) => issue.code === "RESTAURANT_PAGE_ANATOMY_MISMATCH"),
    ).toBeTruthy();

    const overflowingMenu = structuredClone(withMedia);
    const overflowingItems = overflowingMenu.pages
      .find((page) => page.path === "/menu")
      ?.sections.find((section) =>
        section.component.componentId.toUpperCase().includes("-SERV-"),
      )?.props.items as Array<Record<string, unknown>>;
    overflowingItems[0]!.title = "x".repeat(121);
    expect(
      restaurantIndustryPackRuntime
        .validateDraft(overflowingMenu)
        .issues.some((issue) => issue.code === "CONTENT_NESTED_VALUE_TOO_LONG"),
    ).toBeTruthy();
    withMedia.generation!.premiumGate = gate;
    expect(() => assertPremiumGate(withMedia)).not.toThrow();

    expect(restaurantIndustryPackRuntime.pack).toBe(restaurantIndustryPack);
    expect(
      resolveCertifiedIndustryPackRuntimeForSite({
        domain: "restaurant",
        subtype: "restaurant",
      }),
    ).toBe(restaurantIndustryPackRuntime);
    expect(
      resolveCertifiedIndustryPackRuntimeByCatalogVersion(
        RESTAURANT_CATALOG_VERSION,
      ),
    ).toBe(restaurantIndustryPackRuntime);
    expect(resolveCertifiedIndustryPackRuntimeByCandidateId(candidateId)).toBe(
      restaurantIndustryPackRuntime,
    );
  });

  test("publish validation accepts ranked order and rejects incomplete, stale, or unsupported pack identity", () => {
    const publishable = certifiedDentalPublishFixture();
    expect(() => assertPremiumGate(publishable)).not.toThrow();

    const reordered = structuredClone(publishable);
    reordered.generation!.candidateIds = [
      ...reordered.generation!.candidateIds,
    ].reverse();
    expect(() => assertPremiumGate(reordered)).not.toThrow();

    const duplicate = structuredClone(publishable);
    duplicate.generation!.candidateIds[1] =
      duplicate.generation!.candidateIds[0]!;
    expect(() => assertPremiumGate(duplicate)).toThrow(
      /contain exactly the 20 unique candidates/,
    );

    const staleCatalog = structuredClone(publishable);
    staleCatalog.generation!.catalogVersion = "dental-stale-catalog";
    expect(() => assertPremiumGate(staleCatalog)).toThrow(
      /do not resolve to one certified industry runtime/,
    );

    const unsupportedSubtype = structuredClone(publishable);
    unsupportedSubtype.subtype = "physiotherapy";
    expect(() => assertPremiumGate(unsupportedSubtype)).toThrow(
      /do not resolve to one certified industry runtime/,
    );
  });
});

function certifiedDentalPublishFixture(): Site {
  const source = dentalSiteFixture();
  const candidateIds = dentalIndustryPackRuntime
    .listCandidates()
    .map((candidate) => candidate.id);
  source.generation = {
    catalogVersion: DENTAL_CATALOG_VERSION,
    packStatus: "certified",
    candidateIds,
  };
  const scaffold = createDentalStructuralScaffold(source, {
    businessName: "Runtime Dental",
    location: "Hyderabad, Telangana",
    services: ["General dentistry", "Dental implants", "Root canal"],
    goals: ["Request a dental appointment"],
    languages: ["en"],
  });
  const candidateId = candidateIds[0]!;
  const selected = dentalIndustryPackRuntime.applySelectedCandidate(
    scaffold,
    candidateId,
  );
  const hygienic = dentalIndustryPackRuntime.applyContentHygiene(selected).site;
  const withMedia = dentalIndustryPackRuntime.applyCertifiedMedia(
    hygienic,
    candidateId,
  );
  const gate = dentalIndustryPackRuntime.validateDraft(
    withMedia,
    dentalIndustryPackRuntime.candidateStructureIssues(withMedia, candidateId),
  );
  expect(gate.passed, JSON.stringify(gate.issues, null, 2)).toBeTruthy();
  withMedia.generation!.premiumGate = gate;
  return withMedia;
}

function dentalSiteFixture(): Site {
  return siteSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    siteId: "runtime-dental-site",
    workspaceId: "runtime-dental-workspace",
    name: "Runtime Dental",
    domain: "clinic",
    subtype: "dental",
    theme: {
      family: "minimalist",
      modifiers: ["light", "rounded"],
      brand: {
        colors: {
          primary: "#0f766e",
          secondary: "#164e63",
          accent: "#14b8a6",
          background: "#fbfffe",
          surface: "#edf9f7",
          textPrimary: "#102a2a",
          textSecondary: "#476664",
          border: "#c8e0dc",
          success: "#168a4a",
          warning: "#9a5b00",
          error: "#b42318",
        },
        typography: {
          display: "Arial, sans-serif",
          body: "Arial, sans-serif",
          ui: "Arial, sans-serif",
        },
        density: "comfortable",
        shape: "soft",
        motion: "subtle",
      },
    },
    seoBlueprint: {
      primaryGoal: "Request a dental appointment",
      targetLocations: ["Hyderabad"],
      priorityTopics: ["dental care"],
      audiences: ["patients"],
      languages: ["en"],
      localSeo: true,
      servicePages: true,
      locationPages: false,
      blog: false,
    },
    pages: [
      {
        id: "home",
        path: "/",
        name: "Home",
        sections: [
          {
            id: "home-navbar",
            component: {
              componentId: "navbar.placeholder",
              version: "1.0.0",
            },
            props: { businessName: "Runtime Dental" },
            bindings: {},
            hidden: false,
          },
          {
            id: "home-hero",
            component: {
              componentId: "hero.placeholder",
              version: "1.0.0",
            },
            props: {
              heading: "Dental care",
              body: "Request an appointment.",
            },
            bindings: {},
            hidden: false,
          },
          {
            id: "home-footer",
            component: {
              componentId: "footer.placeholder",
              version: "1.0.0",
            },
            props: { businessName: "Runtime Dental" },
            bindings: {},
            hidden: false,
          },
        ],
        seo: {
          title: "Runtime Dental",
          description: "Dental care in Hyderabad.",
          canonicalPath: "/",
          indexable: true,
          structuredDataTypes: ["Dentist"],
        },
      },
    ],
    navigation: [{ label: "Home", href: "/" }],
    integrations: [],
    domains: [],
  });
}

function reorderJsonObjectKeysForStorage<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => reorderJsonObjectKeysForStorage(item)) as T;
  }
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(
        ([left], [right]) =>
          left.length - right.length || left.localeCompare(right),
      )
      .map(([key, item]) => [key, reorderJsonObjectKeysForStorage(item)]),
  ) as T;
}
