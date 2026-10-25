import { expect, test } from "@playwright/test";
import { SCHEMA_VERSION, siteSchema, type Site } from "@micirql/schema";
import { SECTION_FAMILIES } from "@micirql/sections";
import {
  PHYSIOTHERAPY_CANDIDATE_BLUEPRINTS,
  PHYSIOTHERAPY_CANDIDATE_BLUEPRINT_VERSION,
  PHYSIOTHERAPY_CANDIDATE_MEDIA_ASSETS,
  PHYSIOTHERAPY_CANDIDATE_MEDIA_ENTRIES,
  PHYSIOTHERAPY_DRAFT_CANDIDATES,
  PHYSIOTHERAPY_DRAFT_PAGE_PATHS,
  PHYSIOTHERAPY_DRAFT_REQUIRED_ACTIONS,
  PHYSIOTHERAPY_DRAFT_MEDIA_ASSETS,
  PHYSIOTHERAPY_DRAFT_MEDIA_ENTRIES,
  applyPhysiotherapyDraftCandidate,
  applyPhysiotherapyDraftContentHygiene,
  createPhysiotherapyDraftScaffold,
  physiotherapyCandidateBlueprintIssues,
  physiotherapyDraftContentIssues,
  listPhysiotherapyDraftCandidates,
  physiotherapyCandidateMediaSelection,
  physiotherapyDraftMediaIssues,
  physiotherapyDraftPack,
  rankPhysiotherapyDraftCandidates,
} from "../apps/builder/app/industry-packs/drafts";
import {
  PHYSIOTHERAPY_CATALOG_VERSION,
  listCertifiedIndustryPacks,
  physiotherapyIndustryPack,
  resolveCertifiedIndustryPack,
  resolveCertifiedIndustryPackByCatalogVersion,
  resolveCertifiedIndustryPackForSite,
} from "../apps/builder/app/industry-packs";

test.describe("Clinic / Physiotherapy staging contract", () => {
  test("retains the audited draft identity alongside the promoted certified catalog", () => {
    expect(physiotherapyDraftPack.identity).toMatchObject({
      id: "clinic-physiotherapy",
      domain: "clinic",
      subtype: "physiotherapy",
      certification: "draft-unregistered",
    });
    expect(physiotherapyDraftPack.certificationPlan).toEqual({
      requiredCandidateCount: 20,
      stagedCandidateCount: 20,
      certifiedCandidateCount: 0,
      currentCandidateCount: 0,
      registrationAllowed: false,
      visualReviewRequired: true,
    });
    expect(physiotherapyDraftPack.designGrammar).toMatchObject({
      id: "clinic-physiotherapy-movement-pathway-v1",
      sharedLayer: "primitives-only",
      maximumCrossIndustrySimilarity: 0.64,
    });
    expect(physiotherapyDraftPack.designGrammar.motifs).toEqual(
      expect.arrayContaining([
        "movement-arc",
        "staggered-exercise-cadence",
        "connected-assessment-path",
      ]),
    );
    expect(physiotherapyDraftPack.designGrammar.disallowedReuse).toEqual(
      expect.arrayContaining([
        "candidate-signature",
        "hero-composition",
        "palette-only-variation",
      ]),
    );

    const registered = listCertifiedIndustryPacks();
    expect(registered.map((pack) => pack.id)).toContain(
      physiotherapyDraftPack.identity.id,
    );
    expect(
      resolveCertifiedIndustryPackByCatalogVersion(
        physiotherapyDraftPack.identity.catalogVersion,
      ),
    ).toBeUndefined();
    expect(
      resolveCertifiedIndustryPackForSite({
        domain: "clinic",
        subtype: "physiotherapy",
      }),
    ).toBe(physiotherapyIndustryPack);
    expect(
      resolveCertifiedIndustryPack({
        domain: "clinic",
        industry: "Physiotherapy clinic",
        subindustry: "Physiotherapy",
        services: ["Sports rehabilitation"],
      }),
    ).toBe(physiotherapyIndustryPack);
    expect(physiotherapyIndustryPack.catalogVersion).toBe(
      PHYSIOTHERAPY_CATALOG_VERSION,
    );
    expect(physiotherapyIndustryPack.catalogVersion).not.toBe(
      physiotherapyDraftPack.identity.catalogVersion,
    );
  });

  test("locks 20 non-clone candidate blueprints without certifying them", () => {
    expect(PHYSIOTHERAPY_CANDIDATE_BLUEPRINT_VERSION).toBe(
      "physiotherapy-blueprints-2026.10.18",
    );
    expect(PHYSIOTHERAPY_CANDIDATE_BLUEPRINTS).toHaveLength(20);
    expect(physiotherapyCandidateBlueprintIssues()).toEqual([]);
    expect(
      new Set(PHYSIOTHERAPY_CANDIDATE_BLUEPRINTS.map((value) => value.id)).size,
    ).toBe(20);
    expect(
      new Set(
        PHYSIOTHERAPY_CANDIDATE_BLUEPRINTS.map((value) =>
          value.homeFlow.join(">"),
        ),
      ).size,
    ).toBe(20);
    expect(
      PHYSIOTHERAPY_CANDIDATE_BLUEPRINTS.every(
        (value) =>
          value.mobileReflow.includes("single column") ||
          value.mobileReflow.includes("one clean"),
      ),
    ).toBe(true);
    expect(physiotherapyDraftPack.certificationPlan.currentCandidateCount).toBe(
      0,
    );
  });

  test("materializes all 20 blueprints as isolated, complete draft candidates", () => {
    const candidates = listPhysiotherapyDraftCandidates();
    const homeFamilies = new Set([
      "services",
      "features",
      "process",
      "contact",
      "cta",
    ]);

    expect(PHYSIOTHERAPY_DRAFT_CANDIDATES).toHaveLength(20);
    expect(candidates).toHaveLength(20);
    expect(new Set(candidates.map((candidate) => candidate.id)).size).toBe(20);
    expect(
      new Set(candidates.map((candidate) => candidate.visualIdentity.id)).size,
    ).toBe(20);
    expect(
      new Set(
        candidates.map((candidate) =>
          SECTION_FAMILIES.map((family) => candidate.variants[family]).join(""),
        ),
      ).size,
    ).toBe(20);

    for (const candidate of candidates) {
      const blueprint = PHYSIOTHERAPY_CANDIDATE_BLUEPRINTS.find(
        (value) => value.id === candidate.id,
      )!;
      expect(candidate.candidateStatus).toBe("draft-unregistered");
      expect(candidate.gate.passed).toBe(false);
      expect(candidate.requiredPagePaths).toEqual(
        PHYSIOTHERAPY_DRAFT_PAGE_PATHS,
      );
      expect(candidate.requiredActions).toEqual(
        PHYSIOTHERAPY_DRAFT_REQUIRED_ACTIONS,
      );
      expect(candidate.sectionOrder).toHaveLength(SECTION_FAMILIES.length);
      expect(new Set(candidate.sectionOrder)).toEqual(
        new Set(SECTION_FAMILIES),
      );
      expect(candidate.sectionOrder[0]).toBe("navbar");
      expect(candidate.sectionOrder[1]).toBe("hero");
      expect(candidate.sectionOrder.at(-1)).toBe("footer");
      expect(
        candidate.sectionOrder.filter((family) => homeFamilies.has(family)),
      ).toEqual(blueprint.homeFlow);
      expect(candidate.visualIdentity.heroComposition).toBe(
        blueprint.heroComposition,
      );
      expect(candidate.mobileReflow).toBe(blueprint.mobileReflow);
      expect(candidate.theme.brand.typography.display).not.toContain("Impact");
    }

    candidates[0]!.sectionOrder.reverse();
    expect(PHYSIOTHERAPY_DRAFT_CANDIDATES[0]!.sectionOrder[0]).toBe("navbar");
  });

  test("ranks every staged candidate once with a deterministic draft-only scorer", () => {
    const profile = {
      domain: "clinic" as const,
      industry: "Physiotherapy clinic",
      subindustry: "Physiotherapy",
      goals: ["Explain the first assessment", "Request an appointment"],
      styleTags: ["calm", "documentary", "comfortable"],
      requiredCapabilities: ["appointment request"],
      location: "Hyderabad, Telangana",
    };
    const first = rankPhysiotherapyDraftCandidates(profile);
    const second = rankPhysiotherapyDraftCandidates(profile);

    expect(first).toHaveLength(20);
    expect(new Set(first.map((entry) => entry.candidate.id)).size).toBe(20);
    expect(first.map((entry) => entry.candidate.id)).toEqual(
      second.map((entry) => entry.candidate.id),
    );
    expect(first.map((entry) => entry.score)).toEqual(
      second.map((entry) => entry.score),
    );
    for (const entry of first) {
      expect(entry.candidate.candidateStatus).toBe("draft-unregistered");
      expect(entry.candidate.gate.passed).toBe(false);
      expect(entry.score).toBeGreaterThanOrEqual(0);
      expect(entry.score).toBeLessThanOrEqual(100);
      expect(entry.breakdown).toEqual({
        physiotherapyFit: expect.any(Number),
        patientJourneyFit: expect.any(Number),
        visualDirection: expect.any(Number),
        imageryFit: expect.any(Number),
        densityFit: expect.any(Number),
        evidenceReadiness: expect.any(Number),
      });
      expect(entry.reasons.join(" ")).not.toMatch(/dental|dentist|tooth/i);
    }
  });

  test("selects sensible calm, local-access and process-led directions", () => {
    const calm = rankPhysiotherapyDraftCandidates({
      domain: "clinic",
      industry: "Physiotherapy",
      goals: ["Reduce uncertainty before the first visit"],
      styleTags: ["calm", "minimalist", "spacious", "restrained"],
      notes: "A quiet, low-pressure arrival experience.",
    });
    const local = rankPhysiotherapyDraftCandidates({
      domain: "clinic",
      industry: "Physiotherapy",
      goals: ["Put location, arrival and accessibility before services"],
      styleTags: ["local", "friendly", "documentary", "practical"],
      location: "Hyderabad, Telangana",
    });
    const processLed = rankPhysiotherapyDraftCandidates({
      domain: "clinic",
      industry: "Physiotherapy",
      goals: [
        "Explain the first assessment process before requesting an appointment",
      ],
      styleTags: ["guided", "people-led", "milestone", "clear"],
      requiredCapabilities: ["appointment request"],
    });

    expect(calm).toHaveLength(20);
    expect(local).toHaveLength(20);
    expect(processLed).toHaveLength(20);
    expect(calm[0]?.candidate.recipeId).toBe("calm-arrival");
    expect(local[0]?.candidate.recipeId).toBe("local-access");
    expect(processLed[0]?.candidate.recipeId).toBe("guided-milestones");
    expect(local[0]?.breakdown.evidenceReadiness).toBe(20);
    expect(processLed[0]!.breakdown.patientJourneyFit).toBeGreaterThanOrEqual(
      16,
    );
  });

  test("applies every staged candidate as an unavailable renderable site with deterministic media", () => {
    const scaffold = createPhysiotherapyDraftScaffold(sourceSite(), {
      businessName: "Radhika Physiotherapy",
      location: "Hyderabad, Telangana",
      services: [
        "Physiotherapy assessment",
        "Sports rehabilitation",
        "Mobility and movement support",
      ],
      conditions: ["Sports injuries", "Mobility concerns"],
      goals: ["Request an appointment"],
      languages: ["en"],
      openingHours: ["Monday–Saturday"],
    });
    const renderedSignatures = new Set<string>();
    const mediaSelections = new Set<string>();
    const mediaUnion = new Set<string>();
    const preferredHeroByRecipe: Readonly<Record<string, string>> = {
      "calm-arrival": "mi-physio-modern-clinic-room",
      "local-access": "mi-physio-access-ramp",
      "clinical-notebook": "mi-physio-planning-clipboard",
      "recovery-journal": "mi-physio-intake-notes",
      "step-by-step": "mi-physio-guided-leg-movement",
      "human-pace": "mi-physio-active-aging-stretch",
      "assessment-rings": "mi-physio-shoulder-range-check",
    };

    for (const candidate of PHYSIOTHERAPY_DRAFT_CANDIDATES) {
      const applied = applyPhysiotherapyDraftCandidate(scaffold, candidate.id);
      expect(applied.generation).toMatchObject({
        catalogVersion: candidate.catalogVersion,
        packStatus: "unavailable",
        selectedCandidateId: candidate.id,
        premiumGate: { passed: false },
      });
      expect(applied.generation?.candidateIds).toHaveLength(20);
      expect(applied.theme.family).toBe(candidate.theme.family);
      expect(applied.theme.brand.colors.primary).toBe(
        candidate.theme.brand.colors.primary,
      );
      expect(
        applied.pages
          .flatMap((page) => page.sections)
          .every(
            (section) => !section.component.componentId.includes("placeholder"),
          ),
      ).toBe(true);
      expect(physiotherapyDraftMediaIssues(applied)).toEqual([]);

      const home = applied.pages.find((page) => page.path === "/")!;
      const homeJourney = home.sections
        .map((section) => sectionFamilyFromId(section.component.componentId))
        .filter((family) =>
          ["services", "features", "process", "contact", "cta"].includes(
            family,
          ),
        );
      expect(homeJourney).toEqual(candidate.homeFlow);
      for (const page of applied.pages.filter((entry) => entry.path !== "/")) {
        const scaffoldPage = scaffold.pages.find(
          (entry) => entry.path === page.path,
        );
        expect(
          scaffoldPage,
          `${page.path} must exist in the scaffold`,
        ).toBeDefined();
        expect(
          page.sections.map((section) =>
            sectionFamilyFromId(section.component.componentId),
          ),
          `${candidate.id} must retain the researched ${page.path} anatomy`,
        ).toEqual(
          scaffoldPage!.sections.map((section) =>
            sectionFamilyFromId(section.component.componentId),
          ),
        );
      }
      renderedSignatures.add(
        home.sections.map((section) => section.component.componentId).join(">"),
      );

      const selection = physiotherapyCandidateMediaSelection(candidate);
      const selectionIds = selection.map((asset) => asset.id);
      expect(selectionIds).toHaveLength(12);
      expect(new Set(selectionIds).size).toBe(12);
      expect(selectionIds).not.toContain("mi-physio-quiet-waiting-area");
      if (preferredHeroByRecipe[candidate.recipeId]) {
        expect(selectionIds[0]).toBe(preferredHeroByRecipe[candidate.recipeId]);
      }
      if (candidate.rankSeed > 1) {
        const relevantServiceTags = [
          ["assessment", "mobility-check", "range-of-motion", "posture"],
          [
            "adaptive-sport",
            "return-to-activity",
            "strength",
            "stationary-bike",
            "balance",
            "standing-stretch",
            "form-guidance",
            "resistance-band",
            "cardio",
            "guided-movement",
          ],
          [
            "treatment-table",
            "shoulder",
            "forearm",
            "mobility-check",
            "leg-mobility",
            "clinical-setting",
            "clinic",
          ],
          [
            "mobility",
            "movement",
            "balance",
            "stretch",
            "flexibility",
            "coordination",
            "guided-exercise",
          ],
          [
            "guided-movement",
            "guided-exercise",
            "form-guidance",
            "movement-cue",
            "planning",
            "consultation",
          ],
        ] as const;
        relevantServiceTags.forEach((tags, index) => {
          expect(
            selection[6 + index]!.tags.some((tag) =>
              (tags as readonly string[]).includes(tag),
            ),
            `${candidate.id} service media slot ${index + 1} must match its treatment intent`,
          ).toBe(true);
        });
      }
      mediaSelections.add(selectionIds.join(">"));
      selectionIds.forEach((assetId) => mediaUnion.add(assetId));
    }

    expect(renderedSignatures.size).toBe(20);
    expect(mediaSelections.size).toBe(20);
    expect(mediaUnion.size).toBe(29);
    expect(() =>
      applyPhysiotherapyDraftCandidate(
        sourceSite(),
        PHYSIOTHERAPY_DRAFT_CANDIDATES[0]!.id,
      ),
    ).toThrow(/clinic\/physiotherapy scaffold/);
  });

  test("preserves one exact supplied logo identity through every staged candidate", () => {
    const logoAssetId = "qa-only/physiotherapy-supplied-logo-contract";
    const brandInput = { logoAssetId, colors: {} };
    const brandProvenance = {
      logo: "user-upload" as const,
      colors: {},
    };
    const scaffold = createPhysiotherapyDraftScaffold(
      sourceSite(),
      {
        businessName: "Radhika Physiotherapy",
        services: ["Physiotherapy assessment"],
        goals: ["Request an appointment"],
        languages: ["en"],
      },
      brandInput,
      brandProvenance,
    );

    expect(scaffold.theme.brand.logoAssetId).toBe(logoAssetId);
    for (const candidate of PHYSIOTHERAPY_DRAFT_CANDIDATES) {
      const applied = applyPhysiotherapyDraftCandidate(scaffold, candidate, {
        brandInput,
        brandProvenance,
      });
      expect(applied.theme.brand.logoAssetId, candidate.id).toBe(logoAssetId);
      expect(applied.generation?.brandInput?.logoAssetId, candidate.id).toBe(
        logoAssetId,
      );
      expect(applied.generation?.brandProvenance?.logo, candidate.id).toBe(
        "user-upload",
      );
      expect(
        applied.pages
          .flatMap((page) => page.sections)
          .filter((section) =>
            ["navbar", "footer"].includes(
              sectionFamilyFromId(section.component.componentId),
            ),
          ),
        `${candidate.id} must retain header and footer placements`,
      ).toHaveLength(applied.pages.length * 2);
      expect(
        applied.pages
          .flatMap((page) => page.sections)
          .some((section) => "brandMark" in section.props),
        `${candidate.id} must leave resolved logo injection to the renderer`,
      ).toBe(false);
    }
  });

  test("locks the six-page anatomy and appointment-request journey", () => {
    expect(physiotherapyDraftPack.pages.map((page) => page.path)).toEqual(
      PHYSIOTHERAPY_DRAFT_PAGE_PATHS,
    );
    expect(new Set(PHYSIOTHERAPY_DRAFT_PAGE_PATHS).size).toBe(
      PHYSIOTHERAPY_DRAFT_PAGE_PATHS.length,
    );
    expect(PHYSIOTHERAPY_DRAFT_REQUIRED_ACTIONS).toEqual([
      "appointment.request",
    ]);
    expect(physiotherapyDraftPack.actions.primary).toMatchObject({
      id: "appointment.request",
      label: "Request appointment",
      completionState: "request-received-not-confirmed",
    });
    expect(physiotherapyDraftPack.actions.secondary).toEqual([
      expect.objectContaining({
        id: "tel:",
        requiresSuppliedFact: "phone-number",
      }),
    ]);
    expect(
      physiotherapyDraftPack.pages.every(
        (page) =>
          page.sections.length > 0 &&
          page.sections.every(
            (section) =>
              SECTION_FAMILIES.includes(section.family) &&
              section.role.length > 0,
          ) &&
          page.evidencePolicy === "hide-unsupported-evidence",
      ),
    ).toBe(true);

    const conditionsPage = physiotherapyDraftPack.pages.find(
      (page) => page.path === "/conditions",
    );
    expect(conditionsPage?.sections).toContainEqual({
      family: "features",
      role: "frequently-asked-questions",
    });
    expect(conditionsPage?.futureComponentDecision).toMatchObject({
      plannedFamily: "faq",
      temporaryFamily: "features",
    });
    expect(conditionsPage?.futureComponentDecision?.note).toContain(
      "do not emit an unsupported FAQ family",
    );
  });

  test("locks accessible typography, responsive, imagery and logo rules", () => {
    expect(physiotherapyDraftPack.palette.colors).toEqual({
      ink: "#12324A",
      background: "#F7FAFC",
      surface: "#FFFFFF",
      primary: "#176B87",
      accent: "#C96A35",
      border: "#CBD8E1",
      textMuted: "#526474",
      error: "#B42318",
    });
    for (const pair of physiotherapyDraftPack.palette.contrastPairs) {
      expect(
        contrastRatio(pair.foreground, pair.background),
      ).toBeGreaterThanOrEqual(pair.minimumRatio);
    }

    expect(physiotherapyDraftPack.typography.mobileH1).toEqual({
      size: "clamp(2rem, 9cqi, 2.75rem)",
      lineHeightRange: [1.08, 1.14],
      wordBreak: "normal",
    });
    expect(
      physiotherapyDraftPack.typography.display.prohibitedTreatments,
    ).toContain("condensed-all-caps");
    expect(
      physiotherapyDraftPack.responsive.map((rule) => rule.viewport),
    ).toEqual([320, 390, 768, 1024, 1440]);
    expect(physiotherapyDraftPack.responsive[0]?.rules).toContain(
      "minimum-control-size-44px",
    );

    expect(physiotherapyDraftPack.imagery.distinctSiteImages).toEqual([10, 14]);
    expect(physiotherapyDraftPack.imagery.meaningfulHomeImages).toEqual([5, 8]);
    expect(physiotherapyDraftPack.imagery.maximumUsesPerPage).toBe(1);
    expect(physiotherapyDraftPack.imagery.heroMayRepeat).toBe(false);

    expect(physiotherapyDraftPack.logo).toMatchObject({
      canonicalPlacements: ["header", "footer"],
      requiredSurfaces: ["preview", "editor", "live", "export"],
      objectFit: "contain",
      textFallback: "only-when-no-logo-supplied",
      unresolvedLogo: "blocking-error",
    });
    expect(
      physiotherapyDraftPack.logo.testRatios.map(
        (ratio) => ratio.widthToHeight,
      ),
    ).toEqual([1, 3, 6, 0.5]);
  });

  test("defines a licensed 12-image pool without staff impersonation roles", () => {
    expect(PHYSIOTHERAPY_DRAFT_MEDIA_ASSETS).toHaveLength(12);
    expect(
      new Set(PHYSIOTHERAPY_DRAFT_MEDIA_ASSETS.map((asset) => asset.id)).size,
    ).toBe(12);
    for (const entry of PHYSIOTHERAPY_DRAFT_MEDIA_ENTRIES) {
      expect(entry.asset.license).toBe("licensed");
      expect(entry.asset.sourceReference).toMatch(
        /^https:\/\/www\.pexels\.com\/photo\/\d+\/$/,
      );
      expect(entry.asset.originalUrl).toMatch(
        /^https:\/\/images\.pexels\.com\/photos\/\d+\//,
      );
      expect(entry.asset.subtypes).toContain("physiotherapy");
      expect(entry.asset.alt.trim().length).toBeGreaterThan(20);
      expect(entry.prohibitedFamilies).toEqual(["team", "testimonials"]);
      expect(entry.asset.sectionFamilies).not.toContain("team");
      expect(entry.asset.sectionFamilies).not.toContain("testimonials");
      expect(entry.asset.tags).toContain("illustrative-not-clinic-staff");
      expect(entry.asset.tags).toContain("no-outcome-claim");
    }
  });

  test("stages a role-tagged 30-image pool for the Top-20 candidates", () => {
    expect(PHYSIOTHERAPY_CANDIDATE_MEDIA_ASSETS).toHaveLength(30);
    expect(PHYSIOTHERAPY_CANDIDATE_MEDIA_ENTRIES).toHaveLength(30);
    expect(
      new Set(PHYSIOTHERAPY_CANDIDATE_MEDIA_ASSETS.map((asset) => asset.id))
        .size,
    ).toBe(30);
    expect(
      PHYSIOTHERAPY_CANDIDATE_MEDIA_ENTRIES.map((entry) => entry.role),
    ).toEqual(
      expect.arrayContaining([
        "clinic-environment",
        "arrival-access",
        "equipment-detail",
        "assessment",
        "neutral-consultation",
        "guided-movement",
        "independent-movement",
        "inclusive-movement",
      ]),
    );
    expect(
      PHYSIOTHERAPY_CANDIDATE_MEDIA_ASSETS.some(
        (asset) => asset.id === "mi-physio-therapy-ball-hand",
      ),
    ).toBe(false);
    for (const asset of PHYSIOTHERAPY_CANDIDATE_MEDIA_ASSETS) {
      expect(asset.license).toBe("licensed");
      expect(asset.sourceReference).toMatch(
        /^https:\/\/www\.pexels\.com\/photo\/\d+\/$/,
      );
      expect(asset.originalUrl).toMatch(
        /^https:\/\/images\.pexels\.com\/photos\/\d+\//,
      );
      expect(asset.alt.trim().length).toBeGreaterThan(15);
    }
  });

  test("forbids invented clinical proof and confirmed-slot language", () => {
    expect(physiotherapyDraftPack.contentSafety.prohibitedInventions).toEqual(
      expect.arrayContaining([
        "clinicians",
        "credentials-or-registration",
        "patient-outcomes-or-testimonials",
        "live-availability",
      ]),
    );
    expect(physiotherapyDraftPack.contentSafety.claimRules).toEqual(
      expect.arrayContaining([
        "do-not-diagnose-visitors",
        "do-not-promise-recovery-or-guaranteed-pain-relief",
        "label-submission-as-request-or-enquiry-not-confirmation",
      ]),
    );
  });

  test("builds the six-page draft scaffold without registering or borrowing dental content", () => {
    const source = sourceSite();
    const scaffold = createPhysiotherapyDraftScaffold(
      source,
      {
        businessName: "Radhika Physiotherapy",
        location: "Hyderabad, Telangana",
        services: ["Sports rehabilitation", "Mobility assessment"],
        conditions: ["Sports injuries", "Post-operative rehabilitation"],
        goals: ["Request an appointment"],
        languages: ["en"],
      },
      {
        logoAssetId: "asset-radhika-logo",
        colors: {
          primary: "#215D72",
          accent: "#B85C2D",
        },
      },
      {
        logo: "user-upload",
        colors: {
          primary: "user-supplied",
          secondary: "recommended",
          accent: "user-supplied",
        },
      },
    );

    expect(scaffold.domain).toBe("clinic");
    expect(scaffold.subtype).toBe("physiotherapy");
    expect(scaffold.pages.map((page) => page.path)).toEqual(
      PHYSIOTHERAPY_DRAFT_PAGE_PATHS,
    );
    expect(scaffold.navigation).toEqual(
      physiotherapyDraftPack.pages.map((page) => ({
        label: page.label,
        href: page.path,
      })),
    );
    expect(scaffold.theme.brand.logoAssetId).toBe("asset-radhika-logo");
    expect(scaffold.theme.brand.colors.primary).toBe("#215D72");
    expect(scaffold.theme.brand.colors.accent).toBe("#B85C2D");
    expect(scaffold.theme.brand.typography.display).toContain("Manrope");

    for (const page of scaffold.pages) {
      expect(page.sections[0]?.component.componentId).toBe(
        "navbar.placeholder",
      );
      expect(page.sections.at(-1)?.component.componentId).toBe(
        "footer.placeholder",
      );
    }

    const visibleText = JSON.stringify(scaffold);
    expect(visibleText).not.toMatch(
      /dental|dentist|root canal|tooth|teeth|guaranteed recovery|cure/i,
    );
    expect(visibleText).not.toMatch(
      /appointment (?:is|has been) confirmed|confirmed appointment slot/i,
    );
    expect(visibleText).toContain("Request appointment");
    expect(visibleText).toContain("does not confirm a slot");

    const actions = new Set(
      scaffold.pages.flatMap((page) =>
        page.sections.flatMap((section) =>
          Object.values(section.bindings).map((binding) => binding.actionId),
        ),
      ),
    );
    expect(actions).toContain("appointment.request");
    const formSections = scaffold.pages.flatMap((page) =>
      page.sections.flatMap((section) =>
        section.props.formBindingKey ? [{ page: page.path, section }] : [],
      ),
    );
    expect(formSections).toHaveLength(1);
    expect(formSections[0]?.page).toBe("/contact");
    expect(formSections[0]?.section.props.formBindingKey).toBe("appointment");
    for (const path of ["/", "/about"]) {
      const prompt = scaffold.pages
        .find((page) => page.path === path)
        ?.sections.find(
          (section) => section.component.componentId === "contact.placeholder",
        );
      expect(prompt?.bindings).toEqual({});
      expect(prompt?.props.primaryAction).toEqual(requestActionReference());
    }
    expect(physiotherapyDraftMediaIssues(scaffold)).toEqual([]);
    const siteMedia = scaffold.pages.flatMap(pageImageReferences);
    expect(new Set(siteMedia.map((image) => image.assetId)).size).toBe(12);
    const homeMedia = pageImageReferences(scaffold.pages[0]!);
    expect(homeMedia).toHaveLength(7);
    const heroMedia = scaffold.pages.map(
      (page) =>
        pageImageReferences({
          ...page,
          sections: page.sections.filter(
            (section) => section.component.componentId === "hero.placeholder",
          ),
        })[0]?.assetId,
    );
    expect(heroMedia).toHaveLength(6);
    expect(new Set(heroMedia).size).toBe(6);
    const heroAssetIds = new Set(heroMedia);
    const nonHeroMedia = scaffold.pages.flatMap((page) =>
      page.sections
        .filter(
          (section) => section.component.componentId !== "hero.placeholder",
        )
        .flatMap((section) =>
          section.hidden ? [] : imageReferences(section.props),
        ),
    );
    expect(
      nonHeroMedia.every((image) => !heroAssetIds.has(image.assetId)),
    ).toBe(true);
    for (const page of scaffold.pages) {
      const ids = pageImageReferences(page).map((image) => image.assetId);
      expect(new Set(ids).size).toBe(ids.length);
    }
    const therapistSections = scaffold.pages.flatMap((page) =>
      page.sections.filter(
        (section) => section.component.componentId === "team.placeholder",
      ),
    );
    expect(therapistSections.length).toBeGreaterThan(0);
    expect(therapistSections.every((section) => section.hidden)).toBe(true);
    const therapistsHero = scaffold.pages
      .find((page) => page.path === "/therapists")
      ?.sections.find(
        (section) => section.component.componentId === "hero.placeholder",
      );
    expect(therapistsHero?.props.title).toBe("Choosing a physiotherapist");
    const patientFacingText = scaffold.pages
      .flatMap((page) => page.sections)
      .filter((section) => !section.hidden)
      .map((section) => JSON.stringify(section.props))
      .join(" ");
    expect(patientFacingText).not.toMatch(
      /clinic brief|supplied services|verified information|invented proof/i,
    );
    for (const path of ["/therapists", "/contact"]) {
      const page = scaffold.pages.find((entry) => entry.path === path)!;
      expect(pageImageReferences(page)).toHaveLength(1);
    }
    expect(
      scaffold.pages
        .flatMap((page) => page.sections)
        .filter(
          (section) => section.component.componentId === "gallery.placeholder",
        )
        .every((section) => section.hidden),
    ).toBe(true);
  });

  test("shows only explicitly verified therapist profiles", () => {
    const scaffold = createPhysiotherapyDraftScaffold(sourceSite(), {
      businessName: "Radhika Physiotherapy",
      services: ["Physiotherapy assessment"],
      goals: ["Request an appointment"],
      languages: ["en"],
      therapists: [
        {
          name: "Dr Radhika Rao",
          role: "Physiotherapist",
          credentials: ["Credential supplied by clinic"],
          verified: true,
        },
      ],
    });
    const team = scaffold.pages
      .flatMap((page) => page.sections)
      .find((section) => section.component.componentId === "team.placeholder");
    expect(team?.hidden).toBe(false);
    expect(team?.props.items).toEqual([
      {
        title: "Dr Radhika Rao",
        description: "Physiotherapist · Credential supplied by clinic",
        verified: true,
      },
    ]);
  });

  test("quarantines cross-industry copy, outcome promises, instant booking, and unverified evidence", () => {
    const scaffold = createPhysiotherapyDraftScaffold(sourceSite(), {
      businessName: "Radhika Physiotherapy",
      services: ["Mobility assessment"],
      goals: ["Request an appointment"],
      languages: ["en"],
    });
    const unsafe = structuredClone(scaffold);
    const hero = unsafe.pages[0]!.sections.find(
      (section) => section.component.componentId === "hero.placeholder",
    )!;
    hero.props.title = "Guaranteed pain-free dental recovery";
    hero.props.primaryAction = {
      label: "Book now",
      href: "/contact",
    };
    const team = unsafe.pages
      .flatMap((page) => page.sections)
      .find((section) => section.component.componentId === "team.placeholder")!;
    team.hidden = false;
    team.props.items = [
      { title: "Invented therapist", description: "Award-winning expert" },
    ];

    expect(physiotherapyDraftContentIssues(unsafe)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "PHYSIOTHERAPY_DENTAL_LANGUAGE" }),
        expect.objectContaining({ code: "PHYSIOTHERAPY_UNSUPPORTED_CLAIM" }),
        expect.objectContaining({
          code: "PHYSIOTHERAPY_CONFIRMED_SLOT_CLAIM",
        }),
        expect.objectContaining({ code: "PHYSIOTHERAPY_UNVERIFIED_EVIDENCE" }),
      ]),
    );

    const hygienic = applyPhysiotherapyDraftContentHygiene(unsafe);
    expect(hygienic.changed).toBe(true);
    expect(physiotherapyDraftContentIssues(hygienic.site)).toEqual([]);
    expect(team.hidden).toBe(false);
    const cleanedTeam = hygienic.site.pages
      .flatMap((page) => page.sections)
      .find((section) => section.component.componentId === "team.placeholder")!;
    expect(cleanedTeam.hidden).toBe(true);
    expect(cleanedTeam.props.items).toEqual([]);
    expect(JSON.stringify(hygienic.site)).not.toMatch(
      /dental|guaranteed pain|book now|Invented therapist/i,
    );
  });
});

function sourceSite(): Site {
  return siteSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    siteId: "physio-draft-site",
    workspaceId: "physio-draft-workspace",
    name: "Draft site",
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
          title: "Draft site",
          description: "Draft website.",
          canonicalPath: "/",
          indexable: true,
          structuredDataTypes: [],
        },
      },
    ],
    navigation: [{ label: "Home", href: "/" }],
    integrations: [],
    domains: [],
  });
}

function pageImageReferences(page: Site["pages"][number]) {
  return page.sections.flatMap((section) =>
    section.hidden ? [] : imageReferences(section.props),
  );
}

function requestActionReference() {
  return { label: "Request appointment", href: "/contact" };
}

function imageReferences(
  value: unknown,
): Array<{ assetId: string; alt: string }> {
  if (Array.isArray(value)) return value.flatMap(imageReferences);
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  const assetId = typeof record.assetId === "string" ? record.assetId : "";
  const source = typeof record.src === "string" ? record.src : "";
  if (assetId && source)
    return [
      {
        assetId,
        alt: typeof record.alt === "string" ? record.alt : "",
      },
    ];
  return Object.values(record).flatMap(imageReferences);
}

function sectionFamilyFromId(componentId: string): string {
  const legacyFamily = componentId.toLowerCase().match(/^([a-z]+)\./)?.[1];
  if (legacyFamily) return legacyFamily;
  const code = componentId
    .toUpperCase()
    .match(
      /-(NAV|HERO|ABOUT|SERV|FEAT|PROC|TEST|GALL|TEAM|CTA|CONT|FOOT)-/,
    )?.[1];
  return (
    {
      NAV: "navbar",
      HERO: "hero",
      ABOUT: "about",
      SERV: "services",
      FEAT: "features",
      PROC: "process",
      TEST: "testimonials",
      GALL: "gallery",
      TEAM: "team",
      CTA: "cta",
      CONT: "contact",
      FOOT: "footer",
    }[code ?? ""] ?? ""
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
