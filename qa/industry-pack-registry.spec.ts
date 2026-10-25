import { expect, test } from "@playwright/test";
import {
  DENTAL_CATALOG_VERSION,
  listIndustryDesignPresets,
} from "../apps/builder/app/industry-design-preset-data";
import {
  PHYSIOTHERAPY_CATALOG_VERSION,
  dentalIndustryPack,
  listCertifiedIndustryPacks,
  physiotherapyIndustryPack,
  resolveCertifiedIndustryPack,
  resolveCertifiedIndustryPackById,
  resolveCertifiedIndustryPackByCandidateId,
  resolveCertifiedIndustryPackByCatalogVersion,
  resolveCertifiedIndustryPackForSite,
  resolveProfileDomain,
} from "../apps/builder/app/industry-packs";
import { rankPresets } from "../apps/builder/app/preset-ranking";

const DENTAL_CANDIDATE_IDS = [
  "clinic-dental-precision",
  "clinic-dental-calm-clarity",
  "clinic-dental-editorial-authority",
  "clinic-dental-quiet-luxury",
  "clinic-dental-modern-assurance",
  "clinic-dental-human-connection",
  "clinic-dental-future-ready",
  "clinic-dental-story-led",
  "clinic-dental-bold-momentum",
  "clinic-dental-local-character",
  "clinic-dental-structured-confidence",
  "clinic-dental-clear-path",
  "clinic-dental-field-journal",
  "clinic-dental-premium-welcome",
  "clinic-dental-contemporary-grid",
  "clinic-dental-warm-authority",
  "clinic-dental-evidence-first",
  "clinic-dental-immersive-narrative",
  "clinic-dental-vibrant-practice",
  "clinic-dental-gentle-confidence",
] as const;

test.describe("certified industry-pack registry", () => {
  test("preserves Dental and registers the independently certified Physiotherapy catalog", () => {
    const registered = listCertifiedIndustryPacks();
    const legacyCandidates = listIndustryDesignPresets("clinic", "dental");
    const registryCandidates = dentalIndustryPack.listCandidates();

    expect(registered).toEqual([
      dentalIndustryPack,
      physiotherapyIndustryPack,
    ]);
    expect(dentalIndustryPack.id).toBe("clinic-dental");
    expect(dentalIndustryPack.catalogVersion).toBe(
      "dental-flagship-2026.10.14",
    );
    expect(dentalIndustryPack.catalogVersion).toBe(DENTAL_CATALOG_VERSION);
    expect(dentalIndustryPack.reviewCount).toBe(20);
    expect(registryCandidates.map((candidate) => candidate.id)).toEqual(
      DENTAL_CANDIDATE_IDS,
    );
    expect(registryCandidates).toEqual(legacyCandidates);
    expect(
      registryCandidates.every(
        (candidate) =>
          candidate.catalogVersion === DENTAL_CATALOG_VERSION &&
          candidate.domain === "clinic" &&
          candidate.subtype === "dental",
      ),
    ).toBe(true);

    const physiotherapyCandidates =
      physiotherapyIndustryPack.listCandidates();
    expect(physiotherapyIndustryPack.catalogVersion).toBe(
      PHYSIOTHERAPY_CATALOG_VERSION,
    );
    expect(physiotherapyIndustryPack.reviewCount).toBe(20);
    expect(physiotherapyCandidates).toHaveLength(20);
    expect(
      physiotherapyCandidates.every(
        (candidate) =>
          candidate.catalogVersion === PHYSIOTHERAPY_CATALOG_VERSION &&
          candidate.domain === "clinic" &&
          candidate.subtype === "physiotherapy" &&
          candidate.gate.passed &&
          candidate.candidateStatus === "certified",
      ),
    ).toBe(true);
    expect(
      physiotherapyIndustryPack
        .listPageBlueprints()
        .map((page) => page.path),
    ).toEqual([
      "/",
      "/therapies",
      "/conditions",
      "/therapists",
      "/about",
      "/contact",
    ]);
  });

  test("resolves only briefs inside the certified dental boundary", () => {
    expect(
      resolveCertifiedIndustryPack({
        industry: "Dental clinic",
        subindustry: "General dentistry",
      }),
    ).toBe(dentalIndustryPack);
    expect(
      resolveCertifiedIndustryPack({
        domain: "clinic",
        industry: "Healthcare",
        services: ["Dental implants", "Root canal"],
      }),
    ).toBe(dentalIndustryPack);
    expect(
      resolveCertifiedIndustryPack({
        domain: "corporate",
        industry: "Dental consulting",
        subindustry: "dentist",
      }),
    ).toBeUndefined();
    expect(
      resolveCertifiedIndustryPack({
        domain: "clinic",
        industry: "Physiotherapy clinic",
        subindustry: "Physiotherapy",
        services: ["Sports rehabilitation"],
      }),
    ).toBe(physiotherapyIndustryPack);
    expect(
      resolveCertifiedIndustryPack({
        domain: "clinic",
        industry: "Dental clinic",
        subindustry: "Dermatology",
      }),
    ).toBeUndefined();
    expect(
      resolveCertifiedIndustryPack({
        industry: "Restaurant",
        subindustry: "Cafe",
      }),
    ).toBeUndefined();
  });

  test("keeps site, catalog and candidate lookups isolated", () => {
    expect(
      resolveCertifiedIndustryPackForSite({
        domain: "clinic",
        subtype: "orthodontics",
      }),
    ).toBe(dentalIndustryPack);
    expect(
      resolveCertifiedIndustryPackForSite({
        domain: "clinic",
        subtype: "physiotherapy",
      }),
    ).toBe(physiotherapyIndustryPack);
    expect(
      resolveCertifiedIndustryPackForSite({
        domain: "restaurant",
        subtype: "dental",
      }),
    ).toBeUndefined();
    expect(
      resolveCertifiedIndustryPackByCatalogVersion(DENTAL_CATALOG_VERSION),
    ).toBe(dentalIndustryPack);
    expect(resolveCertifiedIndustryPackById("clinic-dental")).toBe(
      dentalIndustryPack,
    );
    expect(resolveCertifiedIndustryPackById("clinic-physiotherapy")).toBe(
      physiotherapyIndustryPack,
    );
    expect(
      resolveCertifiedIndustryPackByCatalogVersion(
        PHYSIOTHERAPY_CATALOG_VERSION,
      ),
    ).toBe(physiotherapyIndustryPack);
    expect(
      resolveCertifiedIndustryPackByCandidateId(
        "clinic-physiotherapy-movement-pathway",
      ),
    ).toBe(physiotherapyIndustryPack);
    expect(
      resolveCertifiedIndustryPackByCatalogVersion("restaurant-draft-v1"),
    ).toBeUndefined();
    expect(
      resolveCertifiedIndustryPackByCandidateId("clinic-dental-precision"),
    ).toBe(dentalIndustryPack);
    expect(
      resolveCertifiedIndustryPackByCandidateId("restaurant-cafe-precision"),
    ).toBeUndefined();
  });

  test("returns fresh candidates so one request cannot mutate the catalog", () => {
    const first = dentalIndustryPack.listCandidates();
    const expectedPrimary = first[0]!.theme.brand.colors.primary;
    first[0]!.theme.brand.colors.primary = "#000000";
    first[0]!.sectionOrder.reverse();
    first.pop();

    const second = dentalIndustryPack.listCandidates();
    expect(second).toHaveLength(20);
    expect(second[0]!.theme.brand.colors.primary).toBe(expectedPrimary);
    expect(second[0]!.sectionOrder[0]).toBe("navbar");
    expect(second.map((candidate) => candidate.id)).toEqual(
      DENTAL_CANDIDATE_IDS,
    );
  });

  test("routes ranking through the registry while preserving domain inference", () => {
    const profile = {
      industry: "Dental clinic",
      subindustry: "Dental implants and family dentistry",
      services: ["Implants", "General dentistry"],
      goals: ["Appointment requests"],
      styleTags: ["professional"],
    };
    const ranked = rankPresets(profile);

    expect(ranked).toHaveLength(dentalIndustryPack.reviewCount);
    expect(new Set(ranked.map((item) => item.preset.id))).toEqual(
      new Set(DENTAL_CANDIDATE_IDS),
    );
    expect(resolveProfileDomain(profile)).toBe("clinic");
    expect(
      resolveProfileDomain({
        industry: "Dental clinic",
        subindustry: "Dermatology",
      }),
    ).toBe("clinic");
    expect(resolveProfileDomain({ industry: "Restaurant and cafe" })).toBe(
      "restaurant",
    );
    expect(
      rankPresets({ industry: "Restaurant", subindustry: "Cafe" }),
    ).toEqual([]);

    const physiotherapyRanked = rankPresets({
      domain: "clinic",
      industry: "Physiotherapy clinic",
      subindustry: "Physiotherapy",
      location: "Hyderabad, Telangana",
      services: ["Physiotherapy assessment", "Sports rehabilitation"],
      goals: ["Request an appointment"],
    });
    expect(physiotherapyRanked).toHaveLength(20);
    expect(
      physiotherapyRanked.every(
        (item) => item.preset.subtype === "physiotherapy",
      ),
    ).toBe(true);
  });
});
