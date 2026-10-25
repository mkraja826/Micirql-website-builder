import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { getDomainPack } from "@micirql/domains";
import { SCHEMA_VERSION, siteSchema, type Site } from "@micirql/schema";
import type { SectionFamily } from "@micirql/sections";
import {
  createEditorHistory,
  createEditorState,
  executeEditorCommand,
  redoEditor,
  undoEditor,
} from "@micirql/workspace";
import {
  applyCertifiedDentalMedia,
  applyIndustryPreset,
  certifiedDentalMediaIssues,
} from "../apps/builder/app/apply-industry-preset";
import { demoAssetById } from "../apps/builder/app/demo-assets";
import {
  DENTAL_HERO_COPY_LIMITS,
  createDentalStructuralScaffold,
} from "../apps/builder/app/dental-scaffold";
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
  compareCompositionIdentities,
  compositionAboveFoldSignature,
  compositionIdentityForPreset,
  compositionSignature,
  compositionStructuralSignature,
  dentalStructuralDepth,
  listIndustryDesignPresets,
  validateCompositionCandidates,
  type IndustryDesignPreset,
} from "../apps/builder/app/industry-design-preset-data";
import { resolveOnboardingStatus } from "../apps/builder/app/onboarding-status";
import { rankPresets } from "../apps/builder/app/preset-ranking";
import { normalizeServiceInput } from "../apps/builder/app/service-normalization";
import {
  applyDentalVisitorContentHygiene,
  containsAuthoringInstruction,
  dentalVisitorContentIssues,
} from "../apps/builder/app/dental-content-hygiene";
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
    expect(source).toMatch(/task:\s*["']content["']/);
    expect(source).toContain(
      "services: normalizeServiceInput(value.services, { industry, subindustry })",
    );
    expect(source).not.toContain("MICIRQL_TEXT_API_KEY");
    expect(source).not.toContain("MICIRQL_TEXT_BASE_URL");
    const mergeContentSource = source.slice(
      source.indexOf("function mergeContent"),
      source.indexOf("function ensureUniqueHeadings"),
    );
    expect(mergeContentSource).not.toMatch(/\bnext\.name\s*=/);
    expect(mergeContentSource).not.toMatch(/\bnext\.seoBlueprint\b/);
    expect(mergeContentSource).toContain("page.seo.title =");
    expect(mergeContentSource).toContain("section.props =");
    expect(gateway).toMatch(/type Provider = ["']nvidia["']/);
    expect(gateway).toContain("enable_thinking: false");
    expect(gateway).not.toContain("GEMINI_API_KEY");
    expect(gateway).not.toContain("callGemini");
  });

  test("normalizes NVIDIA structured responses without accepting truncated JSON", () => {
    expect(parseProviderJson('{"id":"home"}')).toEqual({ id: "home" });
    expect(parseProviderJson('```json\n{"id":"services"}\n```')).toEqual({
      id: "services",
    });
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
    expect(new Set(identities.map(compositionStructuralSignature)).size).toBe(
      20,
    );
    expect(new Set(identities.map(compositionAboveFoldSignature)).size).toBe(
      20,
    );
    expect(dentalStructuralDepth(presets)).toEqual(
      Object.fromEntries(requiredDentalFamilies.map((family) => [family, 5])),
    );

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
      expect(
        new Set(preset?.variants ? Object.values(preset.variants) : []).size,
        `${preset?.id} must choose layouts per section instead of globally`,
      ).toBeGreaterThan(1);
    }
  });

  test("keeps factual review hero copy within the certified content-fit limits", () => {
    const service = "Crowns Root Canal Teeth Alignment Teeth Whitening";
    const scaffold = createDentalStructuralScaffold(pearlDentalFixture(), {
      businessName: "Anil dental care",
      location: "Hyderabad Telangana",
      services: [service],
      goals: ["Request appointments"],
      languages: ["en"],
    });
    const home = scaffold.pages.find((page) => page.path === "/");
    const hero = home?.sections.find((section) =>
      section.component.componentId.startsWith("hero."),
    );
    const title = String(hero?.props.title ?? "");
    const description = String(hero?.props.description ?? "");

    expect(title).toBe("Anil dental care");
    expect(title.length).toBeLessThanOrEqual(DENTAL_HERO_COPY_LIMITS.title);
    expect(description).toContain("Crowns, Root Canal, and Teeth Alignment");
    expect(description.length).toBeLessThanOrEqual(
      DENTAL_HERO_COPY_LIMITS.description,
    );

    for (const preset of dentalPresets()) {
      const candidate = applyIndustryPreset(scaffold, preset);
      const candidateHome = candidate.pages.find((page) => page.path === "/");
      const candidateHero = candidateHome?.sections.find(
        (section) => section.id === hero?.id,
      );
      expect(candidateHero?.props.title, preset.id).toBe(title);
      expect(candidateHero?.props.description, preset.id).toBe(description);
    }

    const serviceSections = scaffold.pages.flatMap((page) =>
      page.sections.filter((section) =>
        section.component.componentId.startsWith("services."),
      ),
    );
    for (const section of serviceSections) {
      expect(
        (section.props.items as Array<{ title: string }>).map(
          (item) => item.title,
        ),
      ).toEqual(["Crowns", "Root Canal", "Teeth Alignment", "Teeth Whitening"]);
    }
  });

  test("generates useful dental depth and licensed supporting media on every page", () => {
    const scaffold = createDentalStructuralScaffold(pearlDentalFixture(), {
      businessName: "Mamatha Dental Care",
      location: "Haliya, Telangana",
      services: ["Dental implants", "Crowns", "Dentures", "Root canal"],
      goals: ["Request appointments"],
      languages: ["en"],
      notes: "Best dental care within budget.",
    });
    const generated = applyIndustryPreset(
      scaffold,
      dentalPresets().find(
        (preset) => preset.recipeId === "contemporary-grid",
      )!,
    );

    for (const page of generated.pages) {
      const visible = page.sections.filter((section) => !section.hidden);
      const images = visible.flatMap((section) => {
        const topLevel =
          section.props.image && typeof section.props.image === "object"
            ? [section.props.image]
            : [];
        const itemImages = Array.isArray(section.props.items)
          ? section.props.items.flatMap((item) =>
              item &&
              typeof item === "object" &&
              !Array.isArray(item) &&
              "image" in item
                ? [(item as Record<string, unknown>).image]
                : [],
            )
          : [];
        return [...topLevel, ...itemImages];
      });
      expect(
        images.length,
        `${page.path} needs more than a lone hero image`,
      ).toBeGreaterThanOrEqual(4);
      expect(
        new Set(
          images.map((image) =>
            String((image as { assetId?: string } | undefined)?.assetId),
          ),
        ).size,
        `${page.path} should not repeat its supporting media`,
      ).toBe(images.length);
    }

    const serviceItems = generated.pages
      .flatMap((page) => page.sections)
      .filter((section) => section.component.componentId.includes("-SERV-"))
      .flatMap(
        (section) => section.props.items as Array<Record<string, unknown>>,
      );
    expect(serviceItems).not.toHaveLength(0);
    expect(
      new Set(serviceItems.map((item) => String(item.description))).size,
    ).toBeGreaterThanOrEqual(4);
    expect(
      serviceItems.every(
        (item) =>
          String(item.description).length >= 120 &&
          typeof (item.image as { assetId?: unknown } | undefined)?.assetId ===
            "string",
      ),
    ).toBeTruthy();
    const heroAssetIds = new Set(
      generated.pages.flatMap((page) =>
        page.sections
          .filter((section) => section.component.componentId.includes("-HERO-"))
          .flatMap((section) => {
            const assetId = (section.props.image as { assetId?: unknown })
              ?.assetId;
            return typeof assetId === "string" ? [assetId] : [];
          }),
      ),
    );
    const supportingAssetIds = generated.pages.flatMap((page) =>
      page.sections
        .filter(
          (section) =>
            !section.hidden &&
            /-(?:ABOUT|FEAT|SERV)-/.test(section.component.componentId),
        )
        .flatMap((section) =>
          Array.isArray(section.props.items)
            ? section.props.items.flatMap((item) => {
                if (!item || typeof item !== "object" || Array.isArray(item)) {
                  return [];
                }
                const assetId = (
                  (item as Record<string, unknown>).image as
                    { assetId?: unknown } | undefined
                )?.assetId;
                return typeof assetId === "string" ? [assetId] : [];
              })
            : [],
        ),
    );
    expect(
      supportingAssetIds.filter((assetId) => heroAssetIds.has(assetId)),
      "site heroes must not be recycled as supporting cards",
    ).toEqual([]);
    const supportingUseCounts = supportingAssetIds.reduce(
      (counts, assetId) => counts.set(assetId, (counts.get(assetId) ?? 0) + 1),
      new Map<string, number>(),
    );
    expect(Math.max(...supportingUseCounts.values())).toBeLessThanOrEqual(2);
    expect(
      supportingAssetIds.some((assetId) =>
        demoAssetById(assetId)?.tags.includes("people"),
      ),
      "the generated story needs licensed human consultation imagery",
    ).toBeTruthy();
    expect(certifiedDentalMediaIssues(generated)).toEqual([]);
  });

  test("only exposes a Doctors page when verified clinician data exists", () => {
    const brief = {
      businessName: "Radhika Dental",
      location: "Hyderabad, Telangana",
      services: ["Dental implants", "Root canal treatment"],
      goals: ["Request appointments"],
      languages: ["en"],
    };
    const withoutClinicians = createDentalStructuralScaffold(
      pearlDentalFixture(),
      brief,
    );
    expect(
      withoutClinicians.pages.some((page) => page.path === "/doctors"),
    ).toBeFalsy();
    expect(
      withoutClinicians.navigation.some((item) => item.href === "/doctors"),
    ).toBeFalsy();

    const withClinicians = createDentalStructuralScaffold(
      pearlDentalFixture(),
      {
        ...brief,
        clinicians: [
          {
            name: "Dr. Radhika Rao",
            role: "Dentist",
            credentials: "BDS",
            biography: "Provides general dental consultations.",
          },
        ],
      },
    );
    const doctorsPage = withClinicians.pages.find(
      (page) => page.path === "/doctors",
    );
    const team = doctorsPage?.sections.find((section) =>
      /(?:-TEAM-|^team\.)/i.test(section.component.componentId),
    );
    expect(doctorsPage).toBeDefined();
    expect(
      withClinicians.navigation.some((item) => item.href === "/doctors"),
    ).toBeTruthy();
    expect(team?.hidden).toBeFalsy();
    expect(team?.props.items).toEqual([
      expect.objectContaining({
        name: "Dr. Radhika Rao",
        eyebrow: "Dentist",
        description: "Dentist · BDS · Provides general dental consultations.",
      }),
    ]);
  });

  test("hides unsupported evidence sections and removes authoring instructions", () => {
    const scaffold = createDentalStructuralScaffold(pearlDentalFixture(), {
      businessName: "Anil Dental Care",
      location: "Hyderabad, Telangana",
      services: ["Crowns Root Canal Teeth Whitening"],
      goals: ["Request appointments"],
      languages: ["en"],
    });
    const optional = scaffold.pages.flatMap((page) =>
      page.sections.filter((section) =>
        /(?:-TEST-|-GALL-|-TEAM-|^(?:testimonials|gallery|team)\.)/i.test(
          section.component.componentId,
        ),
      ),
    );

    expect(optional.length).toBeGreaterThan(0);
    expect(optional.every((section) => section.hidden)).toBeTruthy();
    expect(
      optional.every(
        (section) =>
          Array.isArray(section.props.items) && !section.props.items.length,
      ),
    ).toBeTruthy();
    expect(containsAuthoringInstruction(scaffold)).toBeFalsy();
    expect(dentalVisitorContentIssues(scaffold)).toEqual([]);
  });

  test("replaces repeated visible dental headings while preserving the page hero", () => {
    const source = createDentalStructuralScaffold(pearlDentalFixture(), {
      businessName: "Radhika Dental",
      location: "Hyderabad, Telangana",
      services: ["Dental Implants", "Root Canal"],
      goals: ["Request appointments"],
      languages: ["en"],
    });
    const servicesPage = source.pages.find((page) => page.path === "/services");
    const hero = servicesPage?.sections.find((section) =>
      /(?:-HERO-|^hero\.)/i.test(section.component.componentId),
    );
    const services = servicesPage?.sections.find((section) =>
      /(?:-SERV-|^services\.)/i.test(section.component.componentId),
    );
    expect(hero).toBeDefined();
    expect(services).toBeDefined();
    hero!.props.title = "Explore dental services";
    hero!.props.description =
      "Explore Dental Implants and Root Canal from Radhika Dental, then request an appointment to discuss suitable care pathways, alternatives, timing and follow-up before making a decision…";
    services!.props.title = "  Explore Dental services  ";

    const result = applyDentalVisitorContentHygiene(source);
    const cleanedPage = result.site.pages.find(
      (page) => page.path === "/services",
    )!;
    const cleanedHero = cleanedPage.sections.find(
      (section) => section.id === hero!.id,
    )!;
    const cleanedServices = cleanedPage.sections.find(
      (section) => section.id === services!.id,
    )!;
    const visibleHeadings = cleanedPage.sections
      .filter(
        (section) =>
          !section.hidden &&
          !/(?:-NAV-|-FOOT-|^(?:navbar|footer)\.)/i.test(
            section.component.componentId,
          ),
      )
      .flatMap((section) => {
        const heading = section.props.title ?? section.props.heading;
        return typeof heading === "string" && heading.trim()
          ? [heading.trim().toLocaleLowerCase("en-US").replace(/\s+/g, " ")]
          : [];
      });

    expect(cleanedHero.props.title).toBe("Explore dental services");
    expect(cleanedHero.props.description).toBe(
      "Review Dental Implants and Root Canal and request an appointment with Radhika Dental.",
    );
    expect(String(cleanedHero.props.description)).not.toMatch(/…$/);
    expect(String(cleanedHero.props.description).length).toBeLessThanOrEqual(
      150,
    );
    expect(cleanedServices.props.title).toBe("Dental care options");
    expect(new Set(visibleHeadings).size).toBe(visibleHeadings.length);
    expect(
      validateSelectedDraft(result.site).issues.filter(
        (issue) => issue.code === "DUPLICATE_SECTION_HEADING",
      ),
    ).toEqual([]);
  });

  test("keeps supplied evidence available but suppresses empty evidence", () => {
    const source = createDentalStructuralScaffold(pearlDentalFixture(), {
      businessName: "Pearl Dental Studio",
      location: "Hyderabad, Telangana",
      services: ["Dental Implants", "Root Canal"],
      goals: ["Request appointments"],
      languages: ["en"],
    });
    const team = source.pages
      .flatMap((page) => page.sections)
      .find((section) =>
        /(?:-TEAM-|^team\.)/i.test(section.component.componentId),
      );
    expect(team).toBeDefined();
    team!.hidden = false;
    team!.props = {
      title: "Dental team",
      items: [{ title: "Dr. Mira Rao", description: "BDS" }],
    };

    const result = applyDentalVisitorContentHygiene(source);
    const preserved = result.site.pages
      .flatMap((page) => page.sections)
      .find((section) => section.id === team!.id);
    expect(preserved?.hidden).toBeFalsy();
    expect(preserved?.props.items).toEqual([
      { title: "Dr. Mira Rao", description: "BDS" },
    ]);
    expect(dentalVisitorContentIssues(result.site)).toEqual([]);
  });

  test("normalizes delimiter-free dental services without inventing facts", () => {
    expect(
      normalizeServiceInput(
        "Crowns Root Canal Teeth Alignment Teeth Whitening",
        { industry: "Dental Clinic", subindustry: "dental" },
      ),
    ).toEqual(["Crowns", "Root Canal", "Teeth Alignment", "Teeth Whitening"]);
    expect(
      normalizeServiceInput("Crowns; Root Canal\nTeeth Whitening", {
        industry: "Dental Clinic",
      }),
    ).toEqual(["Crowns", "Root Canal", "Teeth Whitening"]);
    expect(
      normalizeServiceInput(["Crowns and bridges"], {
        industry: "Dental Clinic",
        subindustry: "dental",
      }),
    ).toEqual(["Crowns and bridges"]);
    expect(
      normalizeServiceInput("Tooth Extractions Crowns", {
        subindustry: "dental",
      }),
    ).toEqual(["Tooth Extractions", "Crowns"]);
    expect(
      normalizeServiceInput("Crowns Bespoke Smile Programme", {
        industry: "Dental Clinic",
      }),
    ).toEqual(["Crowns Bespoke Smile Programme"]);
    expect(
      normalizeServiceInput("Strategy Consulting Operations", {
        industry: "Professional Services",
      }),
    ).toEqual(["Strategy Consulting Operations"]);
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
          difference.differingDimensions,
          `${pair} must differ across at least four composition-identity dimensions`,
        ).toBeGreaterThanOrEqual(4);
        expect(
          difference.structuralDifference,
          `${pair} must change section sequence or at least two major components`,
        ).toBeTruthy();
        expect(
          difference.visualDifference,
          `${pair} must change at least one visual-system dimension`,
        ).toBeTruthy();
        expect(
          difference.aboveFoldDifference,
          `${pair} must not rely on palette or typography alone above the fold`,
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
    expect(listIndustryDesignPresets("clinic")).toEqual([]);
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
      {
        domain: "clinic" as const,
        industry: "Healthcare clinic",
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
    const selected = applyDentalVisitorContentHygiene(
      applySelectedDentalCandidate(source, preset),
    ).site;
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
    const initialImage = {
      assetId: "mi-dental-calm-clinic",
      alt: "Bright empty dental office",
      focalPoint: { x: 0.5, y: 0.5 },
    };
    for (const page of source.pages) {
      const hero = page.sections.find(
        (section) => section.component.componentId === "hero.placeholder",
      );
      if (hero) hero.props.image = initialImage;
    }

    const selected = applySelectedDentalCandidate(source, preset);
    const selectedHero = selected.pages[0]!.sections.find((section) =>
      section.component.componentId.includes("-HERO-"),
    )!;
    expect(selectedHero.props.image).toEqual(initialImage);

    const withMedia = applyCertifiedDentalMedia(selected, preset);
    const mediaHero = withMedia.pages[0]!.sections.find((section) =>
      section.component.componentId.includes("-HERO-"),
    )!;
    const mediaAssetId = (mediaHero.props.image as { assetId?: string })
      .assetId;
    const mediaAsset = demoAssetById(mediaAssetId);
    expect(mediaAssetId).toMatch(/^mi-dental-/);
    expect(mediaAsset?.license).toBe("licensed");
    expect(mediaAsset?.sourceReference).toMatch(
      /^https:\/\/www\.pexels\.com\/photo\//,
    );
    expect({ ...mediaHero.props, image: initialImage }).toEqual(
      selectedHero.props,
    );

    const deterministicMedia = applyCertifiedDentalMedia(selected, preset);
    const deterministicHero = deterministicMedia.pages[0]!.sections.find(
      (section) => section.component.componentId.includes("-HERO-"),
    )!;
    expect(deterministicHero.props.image).toEqual(mediaHero.props.image);

    const requiredHeroAssets = withMedia.pages
      .filter((page) =>
        ["/", "/services", "/doctors", "/about", "/contact"].includes(
          page.path,
        ),
      )
      .map((page) =>
        page.sections.find((section) =>
          section.component.componentId.includes("-HERO-"),
        ),
      )
      .map((hero) =>
        String(
          (hero?.props.image as { assetId?: string } | undefined)?.assetId,
        ),
      );
    expect(requiredHeroAssets).toHaveLength(5);
    expect(new Set(requiredHeroAssets).size).toBe(5);
    expect(certifiedDentalMediaIssues(withMedia)).toEqual([]);

    const repeatedMedia = structuredClone(withMedia);
    const repeatedAsset = repeatedMedia.pages[0]!.sections.find((section) =>
      section.component.componentId.includes("-HERO-"),
    )!.props.image;
    for (const page of repeatedMedia.pages.filter((page) =>
      ["/", "/services", "/doctors", "/about", "/contact"].includes(page.path),
    )) {
      page.sections.find((section) =>
        section.component.componentId.includes("-HERO-"),
      )!.props.image = repeatedAsset;
    }
    expect(certifiedDentalMediaIssues(repeatedMedia)).toContainEqual(
      expect.objectContaining({ code: "DENTAL_HERO_MEDIA_REPEATED" }),
    );
  });
});

function dentalPresets(): IndustryDesignPreset[] {
  return listIndustryDesignPresets("clinic", "dental");
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
              appointment: { actionId: "appointment.request", inputMap: {} },
              submit: { actionId: "lead.create", inputMap: {} },
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
