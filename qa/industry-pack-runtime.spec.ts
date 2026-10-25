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
  dentalIndustryPack,
  dentalIndustryPackRuntime,
  listCertifiedIndustryPackRuntimes,
  physiotherapyIndustryPack,
  physiotherapyIndustryPackRuntime,
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
      dentalIndustryPackRuntime.createStructuralScaffold(
        source,
        scaffoldBrief,
      ),
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
    expect(dentalIndustryPackRuntime.certifiedMediaIssues(runtimeMedia)).toEqual(
      certifiedDentalMediaIssues(legacyMedia),
    );
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

    const result = dentalIndustryPackRuntime.applyCandidate(source, altered.id, {
      applyCertifiedMedia: false,
    });
    const expected = applyIndustryPreset(source, canonical, {
      applyCertifiedMedia: false,
    });

    expect(result).toEqual(expected);
    expect(result.theme.brand.colors.primary).not.toBe("#ff00ff");
    expect(() =>
      dentalIndustryPackRuntime.applyCandidate(source, "clinic-physiotherapy-calm-movement", {
        applyCertifiedMedia: false,
      }),
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

    const scaffold =
      physiotherapyIndustryPackRuntime.createStructuralScaffold(source, {
        businessName: "Runtime Physiotherapy",
        industry: "Physiotherapy clinic",
        subindustry: "Physiotherapy",
        location: "Hyderabad, Telangana",
        services: ["Physiotherapy assessment", "Sports rehabilitation"],
        goals: ["Request an appointment"],
        languages: ["en"],
        notes: "Approved opening hours: Monday to Saturday, 9:00–18:00",
      });
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
    expect(
      resolveCertifiedIndustryPackRuntimeByCandidateId(
        candidateId,
      ),
    ).toBe(physiotherapyIndustryPackRuntime);

    expect(physiotherapyIndustryPackRuntime.pack).toBe(
      physiotherapyIndustryPack,
    );
    expect(() =>
      physiotherapyIndustryPackRuntime.applyCandidate(
        scaffold,
        "clinic-dental-precision",
      ),
    ).toThrow(/not owned by certified industry pack clinic-physiotherapy/);

    expect(
      resolveCertifiedIndustryPackRuntimeById("clinic-dental"),
    ).toBe(dentalIndustryPackRuntime);
    expect(
      resolveCertifiedIndustryPackRuntimeByCatalogVersion(
        DENTAL_CATALOG_VERSION,
      ),
    ).toBe(dentalIndustryPackRuntime);
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
