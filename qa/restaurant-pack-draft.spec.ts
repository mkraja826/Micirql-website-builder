import { expect, test } from "@playwright/test";
import {
  INDUSTRY_AVAILABILITY,
  certifiedOnboardingIndustry,
} from "../apps/builder/app/industry-availability";
import {
  RESTAURANT_DRAFT_DESIGN_SIGNATURE,
  RESTAURANT_DRAFT_PAGE_PATHS,
  RESTAURANT_DRAFT_RESEARCH_BASIS,
  restaurantDraftPack,
} from "../apps/builder/app/industry-packs/drafts";
import {
  assessCrossIndustryDesignDistinctness,
  candidateDesignSignature,
  listCertifiedIndustryPacks,
  resolveCertifiedIndustryPack,
  resolveCertifiedIndustryPackByCandidateId,
  resolveCertifiedIndustryPackByCatalogVersion,
  resolveCertifiedIndustryPackById,
  restaurantIndustryPack,
} from "../apps/builder/app/industry-packs";

test.describe("Restaurant draft planning contract", () => {
  test("defines an independent six-page menu, visit and reservation journey", () => {
    expect(restaurantDraftPack.identity).toMatchObject({
      id: "restaurant-restaurant",
      domain: "restaurant",
      subtype: "restaurant",
      certification: "draft-unregistered",
    });
    expect(restaurantDraftPack.pages.map((page) => page.path)).toEqual(
      RESTAURANT_DRAFT_PAGE_PATHS,
    );
    expect(new Set(RESTAURANT_DRAFT_PAGE_PATHS).size).toBe(6);

    const menu = restaurantDraftPack.pages.find(
      (page) => page.path === "/menu",
    )!;
    expect(menu.futureComponentDecision).toMatchObject({
      plannedFamily: "menu",
      temporaryFamily: "services",
    });
    expect(menu.futureComponentDecision?.note).toMatch(/semantic HTML/i);
    expect(menu.futureComponentDecision?.note).toMatch(
      /PDF or image must never be the only menu surface/i,
    );

    const reservations = restaurantDraftPack.pages.find(
      (page) => page.path === "/reservations",
    )!;
    expect(
      reservations.sections.map((section) => [section.family, section.role]),
    ).toEqual(
      expect.arrayContaining([
        ["contact", "reservation-request-form"],
        ["process", "request-review-and-confirmation-steps"],
      ]),
    );
    expect(
      restaurantDraftPack.pages.every(
        (page) => page.evidencePolicy === "hide-unsupported-evidence",
      ),
    ).toBe(true);
  });

  test("keeps reservation receipt truthful and every merchant fact evidence-bound", () => {
    expect(restaurantDraftPack.actions.primary).toEqual({
      id: "reservation.request",
      role: "primary",
      label: "Request a table",
      completionState: "reservation-request-received-not-confirmed",
    });
    expect(restaurantDraftPack.actions.consistencyRule).toMatch(
      /confirms availability separately/i,
    );
    expect(restaurantDraftPack.contentSafety.prohibitedInventions).toEqual(
      expect.arrayContaining([
        "dishes-ingredients-portions-or-prices",
        "allergen-dietary-vegetarian-or-non-vegetarian-claims",
        "live-table-availability-or-confirmed-reservations",
        "delivery-ordering-or-reservation-partners",
        "fssai-licence-status-or-regulatory-compliance",
      ]),
    );
    expect(restaurantDraftPack.contentSafety.claimRules).toEqual(
      expect.arrayContaining([
        "never-infer-allergens-dietary-status-or-ingredients-from-a-name-photo-or-cuisine",
        "block-publication-when-applicable-menu-disclosure-data-is-missing",
        "label-submission-as-a-reservation-request-not-a-confirmed-table",
        "structured-data-must-match-visible-supplied-content",
      ]),
    );
    expect(restaurantDraftPack.contentSafety.requiredFacts.join(" ")).toMatch(
      /menu-items-descriptions-prices-and-currency/,
    );
  });

  test("records official food, discovery and accessibility research without claiming certification", () => {
    expect(RESTAURANT_DRAFT_RESEARCH_BASIS).toHaveLength(5);
    expect(
      RESTAURANT_DRAFT_RESEARCH_BASIS.map((item) => item.authority),
    ).toEqual([
      "FSSAI",
      "FSSAI",
      "Google Business Profile",
      "Google Search Central",
      "W3C WAI",
    ]);
    expect(
      RESTAURANT_DRAFT_RESEARCH_BASIS.every((item) =>
        /^https:\/\/(www\.)?(fssai\.gov\.in|support\.google\.com|developers\.google\.com|w3\.org)\//.test(
          item.source,
        ),
      ),
    ).toBe(true);
    expect(
      RESTAURANT_DRAFT_RESEARCH_BASIS.map((item) => item.appliedRule).join(" "),
    ).toMatch(/never present.*compliance statements as generated facts/i);
  });

  test("locks moderate typography, menu-safe reflow, image density and exact-logo behavior", () => {
    expect(
      restaurantDraftPack.typography.display.weightRange[1],
    ).toBeLessThanOrEqual(650);
    expect(restaurantDraftPack.typography.headingCase).toBe("sentence-case");
    expect(restaurantDraftPack.typography.display.prohibitedTreatments).toEqual(
      expect.arrayContaining([
        "condensed-all-caps",
        "ultra-black-display",
        "forced-word-fragmentation",
      ]),
    );
    expect(restaurantDraftPack.responsive.map((rule) => rule.viewport)).toEqual(
      [320, 390, 768, 1024, 1440],
    );
    expect(
      restaurantDraftPack.responsive
        .filter((rule) => rule.viewport <= 390)
        .flatMap((rule) => rule.rules),
    ).toEqual(
      expect.arrayContaining([
        "minimum-control-size-44px",
        "menu-item-name-description-and-price-wrap-without-collision",
        "no-horizontal-overflow",
      ]),
    );
    expect(restaurantDraftPack.imagery.distinctSiteImages).toEqual([12, 18]);
    expect(restaurantDraftPack.imagery.meaningfulHomeImages).toEqual([6, 9]);
    expect(restaurantDraftPack.imagery.heroMayRepeat).toBe(false);
    expect(restaurantDraftPack.logo).toMatchObject({
      canonicalPlacements: ["header", "footer"],
      requiredSurfaces: ["preview", "editor", "live", "export"],
      objectFit: "contain",
      preserve: ["asset-id", "pixels", "intrinsic-ratio", "colors"],
      unresolvedLogo: "blocking-error",
    });
    expect(restaurantDraftPack.logo.testRatios).toEqual([
      { label: "square", widthToHeight: 1 },
      { label: "wide", widthToHeight: 3 },
      { label: "extra-wide", widthToHeight: 6 },
      { label: "tall", widthToHeight: 0.5 },
    ]);

    for (const pair of restaurantDraftPack.palette.contrastPairs) {
      expect(
        contrastRatio(pair.foreground, pair.background),
      ).toBeGreaterThanOrEqual(pair.minimumRatio);
    }
  });

  test("is materially distinct from every certified Dental and Physiotherapy candidate", () => {
    const certifiedPacks = listCertifiedIndustryPacks().filter(
      (pack) => pack.id !== restaurantDraftPack.identity.id,
    );
    const assessments = certifiedPacks.flatMap((pack) =>
      pack
        .listCandidates()
        .map((candidate) =>
          assessCrossIndustryDesignDistinctness(
            RESTAURANT_DRAFT_DESIGN_SIGNATURE,
            candidateDesignSignature(pack, candidate),
            restaurantDraftPack.designGrammar,
            pack.designGrammar,
          ),
        ),
    );

    expect(certifiedPacks.map((pack) => pack.id)).toEqual([
      "clinic-dental",
      "clinic-physiotherapy",
    ]);
    expect(assessments).toHaveLength(40);
    expect(assessments.every((assessment) => assessment.pass)).toBe(true);
    expect(
      Math.max(...assessments.map((assessment) => assessment.similarity)),
    ).toBeLessThanOrEqual(
      restaurantDraftPack.designGrammar.maximumCrossIndustrySimilarity,
    );
    expect(restaurantDraftPack.designGrammar.motifs.join(" ")).not.toMatch(
      /dental|treatment|care-path|appointment|movement|exercise/i,
    );
  });

  test("keeps the archived draft unregistered while production resolves the certified pack", () => {
    const availability = INDUSTRY_AVAILABILITY.find(
      (item) => item.id === restaurantDraftPack.identity.id,
    );

    expect(availability).toMatchObject({ status: "certified" });
    expect(
      certifiedOnboardingIndustry(restaurantDraftPack.identity.id),
    ).toEqual(availability);
    expect(
      resolveCertifiedIndustryPackById(restaurantDraftPack.identity.id),
    ).toBe(restaurantIndustryPack);
    expect(
      resolveCertifiedIndustryPackByCatalogVersion(
        restaurantDraftPack.identity.catalogVersion,
      ),
    ).toBeUndefined();
    expect(
      resolveCertifiedIndustryPackByCandidateId(
        RESTAURANT_DRAFT_DESIGN_SIGNATURE.candidateId,
      ),
    ).toBe(restaurantIndustryPack);
    expect(
      resolveCertifiedIndustryPack({
        domain: "restaurant",
        industry: "Restaurant",
        subindustry: "Restaurant",
        services: ["Dining", "Reservations"],
      }),
    ).toBe(restaurantIndustryPack);
    expect(restaurantDraftPack.identity.certification).toBe(
      "draft-unregistered",
    );
    expect(restaurantDraftPack.certificationPlan).toMatchObject({
      requiredCandidateCount: 20,
      stagedCandidateCount: 20,
      certifiedCandidateCount: 0,
      currentCandidateCount: 0,
      registrationAllowed: false,
      visualReviewRequired: true,
    });
  });
});

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
