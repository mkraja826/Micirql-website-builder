import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { getDomainPack } from "@micirql/domains";
import {
  SCHEMA_VERSION,
  siteSchema,
  type CompositionIdentity,
  type Site,
} from "@micirql/schema";
import type { SectionFamily } from "@micirql/sections";
import {
  createEditorHistory,
  createEditorState,
  executeEditorCommand,
  redoEditor,
  undoEditor,
} from "@micirql/workspace";
import {
  DENTAL_HERO_ASSET_BY_IMAGE_STRATEGY,
  applyCertifiedDentalMedia,
  applyIndustryPreset,
} from "../apps/builder/app/apply-industry-preset";
import {
  applySelectedDentalCandidate,
  protectedStructureChanged,
  restoreProtectedStructure,
  selectedCandidateStructureIssues,
  validateSelectedDraft,
} from "../apps/builder/app/api/design-review/select/selection-pipeline";
import {
  DENTAL_CATALOG_VERSION,
  DESIGN_REVIEW_COUNT,
  compositionIdentityForPreset,
  compositionSignature,
  listIndustryDesignPresets,
  validateCompositionCandidates,
  type IndustryDesignPreset,
} from "../apps/builder/app/industry-design-preset-data";
import { resolveOnboardingStatus } from "../apps/builder/app/onboarding-status";
import { rankPresets } from "../apps/builder/app/preset-ranking";
import { parseProviderJson } from "../supabase/functions/ai-gateway/json";

const requiredDentalFamilies = [
  "navbar",
  "hero",
  "about",
  "services",
  "features",
  "process",
  "testimonials",
  "gallery",
  "team",
  "cta",
  "contact",
  "footer",
] as const satisfies readonly SectionFamily[];

const suppliedBrand = {
  logoAssetId: "asset-pearl-dental-logo",
  primary: "#123A63",
  secondary: "#0D6E75",
  accent: "#70D7D2",
} as const;

test.describe("flagship dental Top-20 contracts", () => {
  test("content enrichment uses the authenticated provider gateway", () => {
    const source = readFileSync(
      "supabase/functions/enrich-site-content/index.ts",
      "utf8",
    );
    const gateway = readFileSync(
      "supabase/functions/ai-gateway/index.ts",
      "utf8",
    );

    expect(source).toContain("/functions/v1/ai-gateway");
    expect(source).toContain("task: 'content'");
    expect(source).not.toContain("MICIRQL_TEXT_API_KEY");
    expect(source).not.toContain("MICIRQL_TEXT_BASE_URL");
    expect(gateway).toContain("type Provider = 'nvidia'");
    expect(gateway).toContain("enable_thinking: false");
    expect(gateway).not.toContain("GEMINI_API_KEY");
    expect(gateway).not.toContain("callGemini");
  });

  test("normalizes NVIDIA structured responses without accepting truncated JSON", () => {
    expect(parseProviderJson('{"id":"home"}')).toEqual({ id: "home" });
    expect(
      parseProviderJson('```json\n{"id":"services"}\n```'),
    ).toEqual({ id: "services" });
    expect(
      parseProviderJson(
        '<think>Internal reasoning that must be ignored.</think>\n```json\n{"id":"contact"}\n```',
      ),
    ).toEqual({ id: "contact" });
    expect(
      parseProviderJson(
        'Here is the requested result: {"id":"about","copy":"Keep {this} literal"}',
      ),
    ).toEqual({ id: "about", copy: "Keep {this} literal" });
    expect(() => parseProviderJson('{"id":"truncated"')).toThrow(
      "provider_returned_invalid_json",
    );
  });

  test("returns exactly 20 certified clinic/dental compositions with unique identities", () => {
    const presets = dentalPresets();
    const identities = presets.map(compositionIdentityForPreset);

    expect(DESIGN_REVIEW_COUNT).toBe(20);
    expect(DENTAL_CATALOG_VERSION).toMatch(/^dental-/);
    expect(presets).toHaveLength(DESIGN_REVIEW_COUNT);
    expect(validateCompositionCandidates(presets)).toEqual([]);
    expect(new Set(presets.map((preset) => preset.id)).size).toBe(20);
    expect(new Set(identities.map((identity) => identity.id)).size).toBe(20);
    expect(new Set(identities.map((identity) => identity.recipeId)).size).toBe(
      20,
    );
    expect(new Set(identities.map(compositionSignature)).size).toBe(20);

    for (const [index, identity] of identities.entries()) {
      const preset = presets[index];
      expect(preset).toBeDefined();
      expect(preset?.domain).toBe("clinic");
      expect(preset?.subtype).toBe("dental");
      expect(preset?.catalogVersion).toBe(DENTAL_CATALOG_VERSION);
      expect(identity.domain).toBe("clinic");
      expect(identity.subtype).toBe("dental");
      expect(identity.catalogVersion).toBe(DENTAL_CATALOG_VERSION);
      expect(identity.archetype).toBe("healthcare-clinic");
    }
  });

  test("every pair is materially different in structure and visual direction", () => {
    const identities = dentalPresets().map(compositionIdentityForPreset);

    for (let leftIndex = 0; leftIndex < identities.length; leftIndex += 1) {
      for (
        let rightIndex = leftIndex + 1;
        rightIndex < identities.length;
        rightIndex += 1
      ) {
        const left = identities[leftIndex];
        const right = identities[rightIndex];
        if (!left || !right) continue;

        const difference = compareCompositionIdentities(left, right);
        const pair = `${left.id} versus ${right.id}`;

        expect(
          difference.dimensions,
          `${pair} must differ across at least four composition-identity dimensions`,
        ).toBeGreaterThanOrEqual(4);
        expect(
          difference.structural,
          `${pair} must change section sequence or at least two major components`,
        ).toBeTruthy();
        expect(
          difference.visual,
          `${pair} must change at least one visual-system dimension`,
        ).toBeTruthy();
      }
    }
  });

  test("each composition preserves the certified dental anatomy, pages and actions", () => {
    const clinicPack = getDomainPack("clinic");
    const requiredPagePaths = clinicPack.defaultPages
      .filter((page) => page.required)
      .map((page) => page.slug);
    const requiredActions = clinicPack.requiredActions;
    const source = pearlDentalFixture();

    for (const preset of dentalPresets()) {
      const identity = compositionIdentityForPreset(preset);
      expect(
        identity.sectionOrder[0],
        `${preset.id} starts with navigation`,
      ).toBe("navbar");
      expect(
        identity.sectionOrder.at(-1),
        `${preset.id} ends with the footer`,
      ).toBe("footer");
      expect(new Set(identity.sectionOrder)).toEqual(
        new Set(requiredDentalFamilies),
      );
      expect(
        new Set(identity.components.map((component) => component.family)),
      ).toEqual(new Set(requiredDentalFamilies));

      const result = siteSchema.parse(applyIndustryPreset(source, preset));
      const resultPaths = new Set(result.pages.map((page) => page.path));
      const resultActions = collectActionIds(result);
      for (const path of [...requiredPagePaths, "/treatments"]) {
        expect(
          resultPaths,
          `${preset.id} preserves required page ${path}`,
        ).toContain(path);
      }
      for (const action of requiredActions) {
        expect(
          resultActions,
          `${preset.id} preserves required action ${action}`,
        ).toContain(action);
      }
      expect(result.navigation).toEqual(source.navigation);
    }
  });

  test("ranking is deterministic and cannot admit an unknown candidate", () => {
    const profile = {
      domain: "clinic" as const,
      industry: "Dental clinic",
      subindustry: "Dental implants and family dentistry",
      goals: ["book appointments", "build trust"],
      style_tags: ["premium", "professional", "calm"],
      required_capabilities: ["booking", "gallery", "contact form"],
      services: ["dental implants", "crowns", "root canal", "cleaning"],
      notes: "Pearl Dental in Hyderabad with a calm navy and teal direction.",
    };

    const first = rankPresets(profile);
    const second = rankPresets(profile);
    const approvedIds = new Set(dentalPresets().map((preset) => preset.id));

    expect(first).toHaveLength(20);
    expect(second).toEqual(first);
    expect(first.map(({ preset }) => preset.id)).toEqual(
      second.map(({ preset }) => preset.id),
    );
    for (const [index, { preset, score, reasons }] of first.entries()) {
      expect(approvedIds).toContain(preset.id);
      expect(preset.domain).toBe("clinic");
      expect(preset.subtype).toBe("dental");
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
      expect(reasons.length).toBeGreaterThan(0);
      if (index > 0) {
        expect(first[index - 1]?.score).toBeGreaterThanOrEqual(score);
      }
    }
  });

  test("applying any composition preserves supplied facts, logo and colors exactly", () => {
    const source = pearlDentalFixture();
    const sourceSections = sectionsById(source);
    const sourceActions = collectActionIds(source);

    for (const preset of dentalPresets()) {
      const result = siteSchema.parse(applyIndustryPreset(source, preset));
      const resultSections = sectionsById(result);

      expect(result.name).toBe(source.name);
      expect(result.domain).toBe("clinic");
      expect(result.subtype).toBe("dental");
      expect(
        result.pages.map(({ id, path, name }) => ({ id, path, name })),
      ).toEqual(source.pages.map(({ id, path, name }) => ({ id, path, name })));
      expect([...resultSections.keys()].sort()).toEqual(
        [...sourceSections.keys()].sort(),
      );
      for (const [sectionId, before] of sourceSections) {
        const after = resultSections.get(sectionId);
        expect(
          after,
          `${preset.id} retains section ${sectionId}`,
        ).toBeDefined();
        expect(after?.props).toEqual(before.props);
        expect(after?.bindings).toEqual(before.bindings);
        expect(after?.hidden).toBe(before.hidden);
      }

      expect(result.theme.brand.logoAssetId).toBe(suppliedBrand.logoAssetId);
      expect(result.theme.brand.colors.primary).toBe(suppliedBrand.primary);
      expect(result.theme.brand.colors.secondary).toBe(suppliedBrand.secondary);
      expect(result.theme.brand.colors.accent).toBe(suppliedBrand.accent);
      expect(result.generation?.brandInput).toEqual(
        source.generation?.brandInput,
      );
      expect(result.generation?.brandProvenance).toEqual(
        source.generation?.brandProvenance,
      );
      expect(collectActionIds(result)).toEqual(sourceActions);
    }
  });

  test("the editor applies a complete composition atomically with undo and redo", () => {
    const source = pearlDentalFixture();
    const preset = dentalPresets()[3]!;
    const replacement = applyIndustryPreset(source, preset);
    replacement.generation!.selectedCandidateId = preset.id;
    const initial = createEditorHistory(createEditorState(source));

    const applied = executeEditorCommand(initial, {
      type: "design.preset.apply",
      site: replacement,
    });
    expect(applied.present.site.theme.family).toBe(preset.theme.family);
    expect(applied.present.site.generation?.selectedCandidateId).toBe(
      preset.id,
    );
    expect(
      applied.present.site.pages[0]?.sections[0]?.component.componentId,
    ).toContain("-NAV-");
    expect(
      applied.present.site.pages[0]?.sections.at(-1)?.component.componentId,
    ).toContain("-FOOT-");

    const undone = undoEditor(applied);
    expect(undone.present.site).toEqual(source);
    const redone = redoEditor(undone);
    expect(redone.present.site).toEqual(replacement);
  });

  test("unsupported non-dental briefs never receive a dental candidate", () => {
    expect(listIndustryDesignPresets("corporate")).toEqual([]);
    expect(listIndustryDesignPresets("clinic", "dermatology")).toEqual([]);
    expect(listIndustryDesignPresets("clinic", "restaurant")).toEqual([]);
    expect(listIndustryDesignPresets("clinic", "aesthetic clinic")).toEqual([]);
    expect(listIndustryDesignPresets("clinic", "orthodontics")).toHaveLength(
      DESIGN_REVIEW_COUNT,
    );

    const unsupportedProfiles = [
      {
        domain: "real-estate" as const,
        industry: "Residential real estate",
        subindustry: "Property brokerage",
        goals: ["property enquiries"],
        style_tags: ["premium", "calm"],
        notes: "Use a reassuring teal direction similar to a dental brand.",
      },
      {
        domain: "clinic" as const,
        industry: "Healthcare clinic",
        subindustry: "Dermatology",
        goals: ["book appointments"],
        style_tags: ["professional"],
      },
      {
        domain: "clinic" as const,
        industry: "Dental clinic",
        subindustry: "Restaurant hospitality",
        goals: ["book appointments"],
        style_tags: ["professional"],
      },
    ];

    for (const profile of unsupportedProfiles) {
      const ranked = rankPresets(profile);
      expect(ranked).toEqual([]);
      expect(
        ranked.some(({ preset }) => preset.domain === "clinic"),
      ).toBeFalsy();
    }
  });

  test("a certified review stays blocked until its saved premium gate passes", () => {
    const generation = pearlDentalFixture().generation!;
    const candidateId = generation.candidateIds[0]!;

    expect(resolveOnboardingStatus(true)).toEqual({
      reviewPending: false,
      completed: true,
    });
    expect(resolveOnboardingStatus(true, generation)).toEqual({
      reviewPending: true,
      completed: false,
    });
    expect(
      resolveOnboardingStatus(true, {
        ...generation,
        selectedCandidateId: candidateId,
      }),
    ).toEqual({ reviewPending: true, completed: false });
    expect(
      resolveOnboardingStatus(true, {
        ...generation,
        selectedCandidateId: candidateId,
        premiumGate: {
          passed: false,
          score: 88,
          issues: [
            {
              code: "IMAGE_GENERATION_AUTHORIZATION_REQUIRED",
              message: "Image provider authorization is required.",
              severity: "error",
            },
          ],
        },
      }),
    ).toEqual({ reviewPending: true, completed: false });
    expect(
      resolveOnboardingStatus(true, {
        ...generation,
        selectedCandidateId: candidateId,
        premiumGate: { passed: true, score: 100, issues: [] },
      }),
    ).toEqual({ reviewPending: false, completed: true });
  });

  test("selection preserves facts and protects the factual SEO blueprint", () => {
    const source = pearlDentalFixture();
    const preset = dentalPresets()[0]!;
    const selected = applySelectedDentalCandidate(source, preset);
    const gate = validateSelectedDraft(
      selected,
      selectedCandidateStructureIssues(selected, preset),
    );

    expect(gate.passed, JSON.stringify(gate.issues, null, 2)).toBeTruthy();
    expect(selected.name).toBe(source.name);
    expect(selected.navigation).toEqual(source.navigation);
    expect(selected.seoBlueprint).toEqual(source.seoBlueprint);
    expect(selected.generation?.brandInput).toEqual(
      source.generation?.brandInput,
    );

    const generated = structuredClone(selected);
    generated.seoBlueprint.targetLocations = ["Unverified location"];
    generated.pages[0]!.sections[1]!.props.description =
      "Generated, schema-constrained copy.";
    expect(protectedStructureChanged(selected, generated)).toBeTruthy();

    const restored = restoreProtectedStructure(selected, generated);
    expect(restored.seoBlueprint).toEqual(selected.seoBlueprint);
    expect(restored.pages[0]!.sections[1]!.props.description).toBe(
      "Generated, schema-constrained copy.",
    );
  });

  test("selection applies licensed dental media only after structure and content", () => {
    const source = pearlDentalFixture();
    const preset = dentalPresets()[0]!;
    const hero = source.pages[0]!.sections.find(
      (section) => section.component.componentId === "hero.placeholder",
    )!;
    const initialImage = {
      assetId: "mi-dental-calm-clinic",
      alt: "Bright empty dental office",
      focalPoint: { x: 0.5, y: 0.5 },
    };
    hero.props.image = initialImage;

    const selected = applySelectedDentalCandidate(source, preset);
    const selectedHero = selected.pages[0]!.sections.find(
      (section) => section.id === hero.id,
    )!;
    expect(selectedHero.props.image).toEqual(initialImage);

    const withMedia = applyCertifiedDentalMedia(selected, preset);
    const mediaHero = withMedia.pages[0]!.sections.find(
      (section) => section.id === hero.id,
    )!;
    expect((mediaHero.props.image as { assetId?: string }).assetId).toBe(
      DENTAL_HERO_ASSET_BY_IMAGE_STRATEGY[preset.imageStrategy],
    );
    expect({ ...mediaHero.props, image: initialImage }).toEqual(
      selectedHero.props,
    );
  });
});

function dentalPresets(): IndustryDesignPreset[] {
  return listIndustryDesignPresets("clinic", "dental");
}

function compareCompositionIdentities(
  left: CompositionIdentity,
  right: CompositionIdentity,
): { dimensions: number; structural: boolean; visual: boolean } {
  const leftComponents = new Map(
    left.components.map((component) => [
      component.family,
      `${component.componentId}@${component.version}`,
    ]),
  );
  const rightComponents = new Map(
    right.components.map((component) => [
      component.family,
      `${component.componentId}@${component.version}`,
    ]),
  );
  const componentFamilies = new Set([
    ...leftComponents.keys(),
    ...rightComponents.keys(),
  ]);
  const changedComponentCount = [...componentFamilies].filter(
    (family) => leftComponents.get(family) !== rightComponents.get(family),
  ).length;
  const sectionOrderChanged =
    JSON.stringify(left.sectionOrder) !== JSON.stringify(right.sectionOrder);
  const componentsChanged = changedComponentCount > 0;
  const modifiersChanged =
    JSON.stringify(left.modifiers) !== JSON.stringify(right.modifiers);
  const visualChanges = [
    left.designSystem !== right.designSystem,
    modifiersChanged,
    left.paletteStrategy !== right.paletteStrategy,
    left.typographyStrategy !== right.typographyStrategy,
    left.density !== right.density,
    left.imageStrategy !== right.imageStrategy,
    left.motionStrategy !== right.motionStrategy,
  ];
  const identityChanges = [
    left.archetype !== right.archetype,
    left.domain !== right.domain,
    left.subtype !== right.subtype,
    left.recipeId !== right.recipeId,
    sectionOrderChanged,
    componentsChanged,
    ...visualChanges,
  ];

  return {
    dimensions: identityChanges.filter(Boolean).length,
    structural: sectionOrderChanged || changedComponentCount >= 2,
    visual: visualChanges.some(Boolean),
  };
}

function pearlDentalFixture(): Site {
  const pages = [
    page("home", "/", "Home", requiredDentalFamilies),
    page("services", "/services", "Treatments / Services", [
      "hero",
      "services",
      "features",
      "cta",
    ]),
    page("doctors", "/doctors", "Doctors", [
      "hero",
      "team",
      "testimonials",
      "cta",
    ]),
    page("about", "/about", "About", ["hero", "about", "features", "team"]),
    page("contact", "/contact", "Contact / Appointment", [
      "hero",
      "contact",
      "cta",
    ]),
    page("treatments", "/treatments", "Treatments", [
      "hero",
      "services",
      "process",
      "cta",
    ]),
  ];

  return siteSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    siteId: "pearl-dental",
    workspaceId: "workspace-pearl",
    name: "Pearl Dental Studio",
    domain: "clinic",
    subtype: "dental",
    theme: {
      family: "minimalist",
      modifiers: ["light", "rounded"],
      brand: {
        logoAssetId: suppliedBrand.logoAssetId,
        colors: {
          primary: suppliedBrand.primary,
          secondary: suppliedBrand.secondary,
          accent: suppliedBrand.accent,
          background: "#FCFFFF",
          surface: "#EFF7F7",
          textPrimary: "#112A3B",
          textSecondary: "#536A78",
          border: "#CFDEE3",
          success: "#168A4A",
          warning: "#AD6A00",
          error: "#C93636",
        },
        typography: {
          display: "Manrope, sans-serif",
          body: "Inter, sans-serif",
          ui: "Inter, sans-serif",
        },
        density: "comfortable",
        shape: "soft",
        motion: "subtle",
      },
    },
    seoBlueprint: {
      primaryGoal: "Help Hyderabad patients request a dental appointment",
      targetLocations: ["Hyderabad, Telangana"],
      priorityTopics: ["dental implants", "family dentistry", "root canal"],
      audiences: ["families", "implant patients"],
      languages: ["en"],
      localSeo: true,
      servicePages: true,
      locationPages: false,
      blog: false,
    },
    pages,
    navigation: pages.map(({ name, path }) => ({ label: name, href: path })),
    integrations: [],
    domains: [],
    generation: {
      catalogVersion: DENTAL_CATALOG_VERSION,
      packStatus: "certified",
      candidateIds: dentalPresets().map((preset) => preset.id),
      brandInput: {
        logoAssetId: suppliedBrand.logoAssetId,
        colors: {
          primary: suppliedBrand.primary,
          secondary: suppliedBrand.secondary,
          accent: suppliedBrand.accent,
        },
      },
      brandProvenance: {
        logo: "user-upload",
        colors: {
          primary: "user-supplied",
          secondary: "user-supplied",
          accent: "user-supplied",
        },
      },
    },
  });
}

function page(
  id: string,
  path: string,
  name: string,
  families: readonly SectionFamily[],
) {
  return {
    id,
    path,
    name,
    sections: families.map((family, index) => ({
      id: `${id}-${family}-${index + 1}`,
      component: { componentId: `${family}.placeholder`, version: "1.0.0" },
      props: propsFor(family),
      bindings:
        family === "contact"
          ? {
              submit: { actionId: "lead.create", inputMap: {} },
              appointment: { actionId: "appointment.request", inputMap: {} },
            }
          : family === "gallery" && id === "home"
            ? { enquiry: { actionId: "case.enquiry", inputMap: {} } }
            : {},
      hidden: false,
    })),
    seo: {
      title: `${name} | Pearl Dental Studio`,
      description: `${name} information for Pearl Dental Studio in Hyderabad.`,
      canonicalPath: path,
      indexable: true,
      structuredDataTypes: ["Dentist"],
    },
  };
}

function propsFor(family: SectionFamily): Record<string, unknown> {
  const facts: Record<SectionFamily, Record<string, unknown>> = {
    navbar: {
      businessName: "Pearl Dental Studio",
      appointmentLabel: "Request an appointment",
    },
    hero: {
      heading: "Thoughtful dental care in Hyderabad",
      body: "Family dentistry, dental implants, crowns and root canal care.",
      location: "Hyderabad, Telangana",
    },
    about: {
      heading: "About Pearl Dental Studio",
      body: "A patient-focused dental clinic serving Hyderabad.",
    },
    services: {
      heading: "Dental treatments",
      items: ["Dental implants", "Crowns", "Root canal", "Preventive cleaning"],
    },
    features: {
      items: ["Appointment requests", "Clear treatment information"],
    },
    process: { steps: ["Request", "Consultation", "Treatment plan"] },
    testimonials: {
      heading: "Patient information",
      body: "No fabricated reviews.",
    },
    gallery: { heading: "Our clinic", body: "Approved clinic media only." },
    team: { heading: "Your clinician", clinician: "Dr. Mira Rao, BDS" },
    cta: { heading: "Request an appointment", phone: "+91 40 5555 0101" },
    contact: {
      address: "12 Pearl Road, Hyderabad, Telangana",
      phone: "+91 40 5555 0101",
      email: "care@pearldental.example",
      hours: "Monday to Saturday, 9:00–18:00",
    },
    footer: { businessName: "Pearl Dental Studio", location: "Hyderabad" },
  };
  return facts[family];
}

function sectionsById(site: Site) {
  return new Map(
    site.pages.flatMap((page) =>
      page.sections.map((section) => [section.id, section] as const),
    ),
  );
}

function collectActionIds(site: Site): string[] {
  return [
    ...new Set(
      site.pages.flatMap((page) =>
        page.sections.flatMap((section) =>
          Object.values(section.bindings).map((binding) => binding.actionId),
        ),
      ),
    ),
  ].sort();
}
