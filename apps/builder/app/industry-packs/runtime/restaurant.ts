import {
  siteSchema,
  type CompositionGateIssue,
  type CompositionGateReport,
  type Site,
} from "@micirql/schema";
import {
  CERTIFIED_SECTION_COMPONENT_VERSION,
  FAMILY_CODES,
  SECTION_FAMILIES,
  isCertifiedSectionComponent,
  sectionDesignId,
  type SectionFamily,
} from "@micirql/sections";
import { applyBrandInput } from "../../brand-provenance";
import {
  protectedStructureChanged,
  repairSelectedDraftContentFit,
  restoreProtectedStructure,
} from "../../api/design-review/select/selection-pipeline";
import {
  RESTAURANT_DRAFT_CANDIDATES,
  applyRestaurantCandidateMedia,
  applyRestaurantDraftCandidate,
  applyRestaurantDraftContentHygiene,
  createRestaurantDraftScaffold,
  rankRestaurantDraftCandidates,
  restaurantDraftContentIssues,
  restaurantDraftMediaIssues,
} from "../drafts";
import {
  parseRestaurantIndustryFacts,
  restaurantBriefFromScaffold,
  restaurantIndustryFactsIssues,
  restaurantRankingFacts,
} from "../restaurant-facts";
import {
  RESTAURANT_CATALOG_VERSION,
  listRestaurantCandidates,
  restaurantIndustryPack,
  type RestaurantCandidate,
} from "../restaurant";
import { defineCertifiedIndustryPackRuntime } from "./types";

const CONTENT_LIMITS = {
  heading: 84,
  eyebrow: 180,
  description: 360,
  actionLabel: 48,
  itemTitle: 120,
  itemDescription: 360,
  itemMeta: 80,
  disclosure: 220,
  seoTitle: 70,
  seoDescription: 180,
} as const;

function applyCertifiedRestaurantCandidate(
  site: Site,
  candidate: RestaurantCandidate,
  applyCertifiedMedia = true,
): Site {
  const canonicalCandidateIds = listRestaurantCandidates().map(
    (item) => item.id,
  );
  const suppliedCandidateIds = site.generation?.candidateIds ?? [];
  const candidateIds =
    suppliedCandidateIds.length === canonicalCandidateIds.length &&
    new Set(suppliedCandidateIds).size === canonicalCandidateIds.length &&
    suppliedCandidateIds.every((id) => canonicalCandidateIds.includes(id))
      ? [...suppliedCandidateIds]
      : canonicalCandidateIds;
  const industryFacts = site.generation?.industryFacts;
  const staged = applyRestaurantDraftCandidate(site, candidate.id, {
    applyCandidateMedia: false,
  });
  const brandInput = staged.generation?.brandInput;
  const brandProvenance = staged.generation?.brandProvenance;
  staged.generation = {
    catalogVersion: RESTAURANT_CATALOG_VERSION,
    packStatus: "certified",
    candidateIds,
    selectedCandidateId: candidate.id,
    ...(brandInput ? { brandInput } : {}),
    ...(brandProvenance ? { brandProvenance } : {}),
    ...(industryFacts ? { industryFacts: structuredClone(industryFacts) } : {}),
  };
  const parsed = siteSchema.parse(staged);
  return applyCertifiedMedia
    ? applyCertifiedRestaurantMedia(parsed, candidate)
    : parsed;
}

function applyCertifiedRestaurantMedia(
  site: Site,
  candidate: RestaurantCandidate,
): Site {
  const draftCandidate = RESTAURANT_DRAFT_CANDIDATES.find(
    (item) => item.id === candidate.id,
  );
  if (!draftCandidate) {
    throw new Error(
      `Certified Restaurant candidate ${candidate.id} has no archived media contract.`,
    );
  }
  return applyRestaurantCandidateMedia(site, draftCandidate);
}

function applySelectedRestaurantCandidate(
  site: Site,
  candidate: RestaurantCandidate,
): Site {
  const factsBefore = factualSnapshot(site);
  const next = applyCertifiedRestaurantCandidate(site, candidate, false);
  if (factualSnapshot(next) !== factsBefore) {
    throw new Error(
      "RESTAURANT_SELECTION_CHANGED_BUSINESS_FACTS: The selected direction changed menu, visit, reservation, navigation, binding, or page facts.",
    );
  }
  assertSuppliedBrandPreserved(site, next);
  return next;
}

function restaurantCandidateStructureIssues(
  site: Site,
  candidate: RestaurantCandidate,
): CompositionGateIssue[] {
  const issues: CompositionGateIssue[] = [];
  issues.push(...restaurantCandidateRequiredFactIssues(site, candidate));
  if (!candidate.gate.passed) {
    issues.push(
      issue(
        "CANDIDATE_PROTOCOL_GATE_FAILED",
        "The selected Restaurant direction has not passed its catalog protocol gate.",
      ),
    );
  }
  if (site.theme.family !== candidate.theme.family) {
    issues.push(
      issue(
        "DESIGN_SYSTEM_MISMATCH",
        "The selected Restaurant design system was not applied.",
      ),
    );
  }
  if (
    JSON.stringify(site.theme.brand.typography) !==
    JSON.stringify(candidate.theme.brand.typography)
  ) {
    issues.push(
      issue(
        "TYPOGRAPHY_MISMATCH",
        "The selected Restaurant typography system was not applied.",
      ),
    );
  }
  if (
    JSON.stringify(site.theme.modifiers) !==
      JSON.stringify(candidate.theme.modifiers) ||
    site.theme.brand.density !== candidate.theme.brand.density ||
    site.theme.brand.shape !== candidate.theme.brand.shape ||
    site.theme.brand.motion !== candidate.theme.brand.motion
  ) {
    issues.push(
      issue(
        "DESIGN_TOKEN_MISMATCH",
        "The selected Restaurant density, shape, motion, or modifiers were not applied.",
      ),
    );
  }
  const expectedColors = applyBrandInput(
    candidate.theme,
    site.generation?.brandInput,
    site.generation?.brandProvenance,
  ).brand.colors;
  if (
    JSON.stringify(site.theme.brand.colors) !== JSON.stringify(expectedColors)
  ) {
    issues.push(
      issue(
        "PALETTE_MISMATCH",
        "The selected Restaurant palette and supplied colors were not applied exactly.",
      ),
    );
  }

  const blueprints = new Map(
    restaurantIndustryPack
      .listPageBlueprints()
      .map((blueprint) => [blueprint.path, blueprint]),
  );
  if (
    JSON.stringify(site.pages.map((page) => page.path)) !==
    JSON.stringify(restaurantIndustryPack.requiredPagePaths)
  ) {
    issues.push(
      issue(
        "RESTAURANT_PAGE_SET_MISMATCH",
        "The certified Restaurant site must contain exactly the six pack-owned routes in their approved order.",
      ),
    );
  }
  for (const page of site.pages) {
    const blueprint = blueprints.get(page.path);
    if (!blueprint) {
      issues.push(
        issue(
          "RESTAURANT_PAGE_ANATOMY_UNKNOWN",
          `${page.path} is not part of the certified Restaurant page anatomy.`,
        ),
      );
      continue;
    }
    const expectedOrder =
      page.path === "/"
        ? candidate.sectionOrder.filter((family) =>
            blueprint.sectionFamilies.includes(family),
          )
        : [...blueprint.sectionFamilies];
    const actualOrder = page.sections.map((section) =>
      sectionFamily(section.component.componentId),
    );
    if (JSON.stringify(actualOrder) !== JSON.stringify(expectedOrder)) {
      issues.push(
        issue(
          "RESTAURANT_PAGE_ANATOMY_MISMATCH",
          `${page.path} must contain each certified Restaurant section family exactly once and in the selected order.`,
        ),
      );
    }
    for (const section of page.sections) {
      const family = sectionFamily(section.component.componentId);
      if (!family) {
        issues.push(
          issue(
            "COMPONENT_FAMILY_UNKNOWN",
            `${page.path} section ${section.id} is outside the approved section registry.`,
          ),
        );
        continue;
      }
      const expectedComponent = sectionDesignId(
        candidate.theme.family,
        family,
        candidate.variants[family],
      );
      if (
        section.component.componentId !== expectedComponent ||
        section.component.version !== CERTIFIED_SECTION_COMPONENT_VERSION
      ) {
        issues.push(
          issue(
            "CANDIDATE_COMPONENT_MISMATCH",
            `${page.path} section ${section.id} does not use the selected certified ${family} component.`,
          ),
        );
      }
    }
  }
  return deduplicate(issues);
}

function validateRestaurantDraft(
  site: Site,
  additionalIssues: CompositionGateIssue[] = [],
): CompositionGateReport {
  const issues: CompositionGateIssue[] = [...additionalIssues];
  if (!siteSchema.safeParse(site).success) {
    issues.push(
      issue(
        "SITE_SCHEMA_INVALID",
        "The selected Restaurant draft does not satisfy the portable Site Schema.",
      ),
    );
  }
  if (
    !restaurantIndustryPack.matchesSite({
      domain: site.domain,
      subtype: site.subtype ?? null,
    })
  ) {
    issues.push(
      issue(
        "INDUSTRY_DOMAIN_MISMATCH",
        "The selected draft must remain in the certified restaurant/restaurant pack.",
      ),
    );
  }
  issues.push(...restaurantIndustryFactsIssues(site.generation?.industryFacts));
  if (
    site.generation?.packStatus !== "certified" ||
    site.generation.catalogVersion !== RESTAURANT_CATALOG_VERSION
  ) {
    issues.push(
      issue(
        "INDUSTRY_PACK_NOT_CERTIFIED",
        "The draft is not attached to the certified Restaurant catalog.",
      ),
    );
  }
  const selectedCandidateId = site.generation?.selectedCandidateId;
  if (
    !selectedCandidateId ||
    !restaurantIndustryPack
      .listCandidates()
      .some((candidate) => candidate.id === selectedCandidateId)
  ) {
    issues.push(
      issue(
        "DESIGN_SELECTION_MISSING",
        "Select one certified Restaurant direction before entering the editor.",
      ),
    );
  }

  const paths = new Set(site.pages.map((page) => page.path));
  for (const path of restaurantIndustryPack.requiredPagePaths) {
    if (!paths.has(path)) {
      issues.push(
        issue(
          "REQUIRED_PAGE_MISSING",
          `The certified Restaurant pack requires ${path}.`,
        ),
      );
    }
  }
  const actions = new Set(
    site.pages.flatMap((page) =>
      page.sections.flatMap((section) =>
        Object.values(section.bindings).map((binding) => binding.actionId),
      ),
    ),
  );
  for (const action of restaurantIndustryPack.requiredActions) {
    if (!actions.has(action)) {
      issues.push(
        issue(
          "REQUIRED_ACTION_MISSING",
          `The certified Restaurant pack requires a registered ${action} action binding.`,
        ),
      );
    }
  }
  for (const section of site.pages.flatMap((page) => page.sections)) {
    if (section.component.componentId.toLowerCase().includes("placeholder")) {
      issues.push(
        issue(
          "UNAPPROVED_COMPONENT",
          `Section ${section.id} still uses a preview placeholder.`,
        ),
      );
    }
  }

  issues.push(...restaurantIdentityIssues(site));
  issues.push(...restaurantProductionFactIssues(site));
  issues.push(...restaurantSuppliedFactManifestIssues(site));
  issues.push(...contentFitIssues(site));
  issues.push(...brandPreservationIssues(site));
  issues.push(...restaurantDraftContentIssues(site));
  issues.push(...restaurantDraftMediaIssues(site));
  const uniqueIssues = deduplicate(issues);
  const errorCount = uniqueIssues.filter(
    (item) => item.severity === "error",
  ).length;
  const warningCount = uniqueIssues.length - errorCount;
  return {
    passed: errorCount === 0,
    score: Math.max(0, 100 - errorCount * 12 - warningCount * 3),
    issues: uniqueIssues,
  };
}

export const restaurantIndustryPackRuntime =
  defineCertifiedIndustryPackRuntime<RestaurantCandidate>({
    pack: restaurantIndustryPack,
    functionPolicy: Object.freeze({
      contentEnrichment: Object.freeze({
        functionName: "enrich-site-content",
        certifiedModes: Object.freeze(["model", "partial", "curated"]),
        fallbackIsCertifiable: false,
      }),
      certifiedMedia: Object.freeze({
        mode: "audited-licensed-illustrative",
        provider: "pexels",
        remoteFunctionRequired: false,
      }),
    }),
    industryFactsIssues: restaurantIndustryFactsIssues,
    normalizeIndustryFacts: (value) => parseRestaurantIndustryFacts(value),
    rankCandidates: (profile) => {
      const facts = restaurantRankingFacts(profile);
      const certifiedById = new Map(
        listRestaurantCandidates().map((candidate) => [
          candidate.id,
          candidate,
        ]),
      );
      return rankRestaurantDraftCandidates({
        ...profile,
        ...facts,
      }).map((item) => ({
        ...item,
        candidate: certifiedById.get(item.candidate.id)!,
      }));
    },
    createStructuralScaffold: (source, brief, brandInput, brandProvenance) => {
      const facts = parseRestaurantIndustryFacts(brief.industryFacts);
      const scaffold = createRestaurantDraftScaffold(
        source,
        restaurantBriefFromScaffold({ ...brief, industryFacts: facts }),
        brandInput,
        brandProvenance,
      );
      scaffold.generation = {
        catalogVersion: RESTAURANT_CATALOG_VERSION,
        packStatus: "certified",
        candidateIds: listRestaurantCandidates().map(
          (candidate) => candidate.id,
        ),
        industryFacts: facts,
        ...(brandInput ? { brandInput } : {}),
        ...(brandProvenance ? { brandProvenance } : {}),
      };
      return siteSchema.parse(scaffold);
    },
    applyCandidate: (site, candidate, options) =>
      applyCertifiedRestaurantCandidate(
        site,
        candidate,
        options.applyCertifiedMedia !== false,
      ),
    applySelectedCandidate: applySelectedRestaurantCandidate,
    candidateStructureIssues: restaurantCandidateStructureIssues,
    validateDraft: validateRestaurantDraft,
    applyContentHygiene: applyRestaurantDraftContentHygiene,
    contentIssues: restaurantDraftContentIssues,
    repairContentFit: repairSelectedDraftContentFit,
    protectedStructureChanged,
    restoreProtectedStructure,
    isCertifiedComponent: isCertifiedSectionComponent,
    applyCertifiedMedia: applyCertifiedRestaurantMedia,
    certifiedMediaIssues: restaurantDraftMediaIssues,
  });

function restaurantCandidateRequiredFactIssues(
  site: Site,
  candidate: RestaurantCandidate,
): CompositionGateIssue[] {
  if (restaurantIndustryFactsIssues(site.generation?.industryFacts).length) {
    return [];
  }
  const facts = parseRestaurantIndustryFacts(site.generation?.industryFacts);
  const available = new Set<string>([
    ...(facts.address ? ["location"] : []),
    ...(facts.openingHours.length ? ["opening-hours"] : []),
    ...(facts.menu.categories.some((category) => category.items.length)
      ? ["menu"]
      : []),
    ...(facts.reservationPolicy.length ? ["reservation-policy"] : []),
    ...(facts.story.paragraphs.length ? ["story"] : []),
  ]);
  return candidate.requiredFacts.flatMap((fact) =>
    available.has(fact)
      ? []
      : [
          issue(
            "RESTAURANT_CANDIDATE_REQUIRED_FACT_MISSING",
            `${candidate.name} requires supplied ${fact.replace(/-/g, " ")} evidence before it can be selected.`,
          ),
        ],
  );
}

function restaurantSuppliedFactManifestIssues(
  site: Site,
): CompositionGateIssue[] {
  if (restaurantIndustryFactsIssues(site.generation?.industryFacts).length) {
    return [];
  }
  const facts = parseRestaurantIndustryFacts(site.generation?.industryFacts);
  if (site.name !== facts.businessName) {
    return [
      issue(
        "RESTAURANT_SUPPLIED_FACTS_CHANGED",
        "The rendered restaurant name no longer matches the normalized Restaurant brief.",
      ),
    ];
  }
  const expected = createRestaurantDraftScaffold(
    site,
    restaurantBriefFromScaffold({
      businessName: facts.businessName,
      industry: "Restaurant",
      subindustry: "Restaurant",
      location: facts.address,
      services: [...facts.serviceModes],
      goals: [],
      languages: site.seoBlueprint.languages,
      industryFacts: facts,
    }),
    site.generation?.brandInput,
    site.generation?.brandProvenance,
  );
  const actualFacts = restaurantMerchantFactSnapshot(site);
  const expectedFacts = restaurantMerchantFactSnapshot(expected);
  if (JSON.stringify(actualFacts) === JSON.stringify(expectedFacts)) return [];
  return [
    issue(
      "RESTAURANT_SUPPLIED_FACTS_CHANGED",
      `The rendered ${firstMerchantFactDifference(expectedFacts, actualFacts)} no longer matches the normalized Restaurant brief.`,
    ),
  ];
}

type RestaurantMerchantFactSnapshot = Array<{
  path: string;
  sections: Array<{
    id: string;
    family: SectionFamily;
    hidden: boolean;
    props: Record<string, unknown>;
  }>;
}>;

function restaurantMerchantFactSnapshot(
  site: Site,
): RestaurantMerchantFactSnapshot {
  const factFamilies = new Set<SectionFamily>([
    "navbar",
    "hero",
    "services",
    "features",
    "about",
    "team",
    "contact",
    "footer",
  ]);
  return site.pages.map((page) => ({
    path: page.path,
    sections: [...page.sections]
      .sort((left, right) => left.id.localeCompare(right.id))
      .flatMap((section) => {
        const family = sectionFamily(section.component.componentId);
        if (!family || !factFamilies.has(family)) return [];
        const props = restaurantFactProps(page.path, section);
        delete props.image;
        if (family === "hero" && typeof props.description === "string") {
          const description = props.description
            .replace(
              /\s*Preview imagery is illustrative and may not show this restaurant or its menu\.\s*$/,
              "",
            )
            .trim();
          if (description) props.description = description;
          else delete props.description;
        }
        return [
          {
            id: section.id,
            family,
            hidden: section.hidden,
            props,
          },
        ];
      }),
  }));
}

function firstMerchantFactDifference(
  expected: RestaurantMerchantFactSnapshot,
  actual: RestaurantMerchantFactSnapshot,
): string {
  for (const expectedPage of expected) {
    const actualPage = actual.find((page) => page.path === expectedPage.path);
    if (!actualPage) return `${expectedPage.path} page`;
    for (const expectedSection of expectedPage.sections) {
      const actualSection = actualPage.sections.find(
        (section) => section.id === expectedSection.id,
      );
      if (!actualSection)
        return `${expectedPage.path} ${expectedSection.family} section`;
      if (JSON.stringify(actualSection) !== JSON.stringify(expectedSection)) {
        return `${expectedPage.path} ${expectedSection.family} facts`;
      }
    }
    if (actualPage.sections.length !== expectedPage.sections.length) {
      return `${expectedPage.path} factual section set`;
    }
  }
  return "menu, visit, contact, story, or reservation facts";
}

function restaurantProductionFactIssues(site: Site): CompositionGateIssue[] {
  const issues: CompositionGateIssue[] = [];
  const menuPage = site.pages.find((page) => page.path === "/menu");
  const menuSection = menuPage?.sections.find(
    (section) =>
      !section.hidden &&
      sectionFamily(section.component.componentId) === "services",
  );
  const menuItems = Array.isArray(menuSection?.props.items)
    ? menuSection.props.items
    : [];
  if (!menuItems.length) {
    issues.push(
      issue(
        "RESTAURANT_CURRENT_MENU_MISSING",
        "The certified Restaurant site must render at least one supplied current menu item as HTML.",
      ),
    );
  }

  const home = site.pages.find((page) => page.path === "/");
  const homeFacts = home?.sections.find(
    (section) =>
      !section.hidden &&
      sectionFamily(section.component.componentId) === "features",
  );
  const homeFactItems = Array.isArray(homeFacts?.props.items)
    ? homeFacts.props.items
    : [];
  const labels = homeFactItems
    .flatMap((item) =>
      item && typeof item === "object" && !Array.isArray(item)
        ? [String((item as Record<string, unknown>).title ?? "")]
        : [],
    )
    .join(" ");
  if (!/location/i.test(labels) || !/opening hours/i.test(labels)) {
    issues.push(
      issue(
        "RESTAURANT_VISIT_FACTS_MISSING",
        "The certified Restaurant site must expose the supplied location and opening hours.",
      ),
    );
  }

  const reservation = site.pages.find((page) => page.path === "/reservations");
  const reservationForm = reservation?.sections.find((section) =>
    Object.values(section.bindings).some(
      (binding) => binding.actionId === "reservation.request",
    ),
  );
  const reservationText = JSON.stringify(reservationForm?.props ?? {});
  if (!reservationForm || !/not confirmed/i.test(reservationText)) {
    issues.push(
      issue(
        "RESTAURANT_REQUEST_BOUNDARY_MISSING",
        "The reservation form must state that a request is not a confirmed table.",
      ),
    );
  }
  return issues;
}

function restaurantIdentityIssues(site: Site): CompositionGateIssue[] {
  const issues: CompositionGateIssue[] = [];
  const pageIds = new Set<string>();
  const sectionIds = new Set<string>();
  for (const page of site.pages) {
    if (pageIds.has(page.id)) {
      issues.push(
        issue(
          "RESTAURANT_PAGE_ID_DUPLICATE",
          `Restaurant page ID ${page.id} is repeated; every page needs one stable unique ID.`,
        ),
      );
    }
    pageIds.add(page.id);
    for (const section of page.sections) {
      if (sectionIds.has(section.id)) {
        issues.push(
          issue(
            "RESTAURANT_SECTION_ID_DUPLICATE",
            `Restaurant section ID ${section.id} is repeated; editor and renderer selectors require site-wide unique section IDs.`,
          ),
        );
      }
      sectionIds.add(section.id);
    }
  }
  return issues;
}

function contentFitIssues(site: Site): CompositionGateIssue[] {
  const issues: CompositionGateIssue[] = [];
  for (const page of site.pages) {
    pushLengthIssue(
      issues,
      page.seo.title,
      CONTENT_LIMITS.seoTitle,
      "SEO_TITLE_TOO_LONG",
      `${page.path} SEO title`,
    );
    pushLengthIssue(
      issues,
      page.seo.description,
      CONTENT_LIMITS.seoDescription,
      "SEO_DESCRIPTION_TOO_LONG",
      `${page.path} SEO description`,
    );
    for (const section of page.sections) {
      pushLengthIssue(
        issues,
        section.props.title,
        CONTENT_LIMITS.heading,
        "CONTENT_HEADING_TOO_LONG",
        `${page.path} section ${section.id} title`,
      );
      pushLengthIssue(
        issues,
        section.props.heading,
        CONTENT_LIMITS.heading,
        "CONTENT_HEADING_TOO_LONG",
        `${page.path} section ${section.id} heading`,
      );
      pushLengthIssue(
        issues,
        section.props.description,
        CONTENT_LIMITS.description,
        "CONTENT_BODY_TOO_LONG",
        `${page.path} section ${section.id} description`,
      );
      for (const key of ["eyebrow", "kicker", "subtitle", "subheading"]) {
        pushLengthIssue(
          issues,
          section.props[key],
          CONTENT_LIMITS.eyebrow,
          "CONTENT_EYEBROW_TOO_LONG",
          `${page.path} section ${section.id} ${key}`,
        );
      }
      pushNestedContentIssues(
        issues,
        section.props.items,
        `${page.path} section ${section.id} items`,
      );
      pushNestedContentIssues(
        issues,
        section.props.menuCategories,
        `${page.path} section ${section.id} menu categories`,
      );
      pushActionLengthIssue(
        issues,
        section.props.primaryAction,
        `${page.path} section ${section.id} primary action`,
      );
      pushActionLengthIssue(
        issues,
        section.props.secondaryAction,
        `${page.path} section ${section.id} secondary action`,
      );
    }
  }
  return issues;
}

function pushNestedContentIssues(
  issues: CompositionGateIssue[],
  value: unknown,
  label: string,
  key = "item",
  depth = 0,
) {
  if (depth > 6 || value == null) return;
  if (typeof value === "string") {
    const limit = /^(?:title|name|label|group)$/i.test(key)
      ? CONTENT_LIMITS.itemTitle
      : /^(?:description|body|caption|groupDescription)$/i.test(key)
        ? CONTENT_LIMITS.itemDescription
        : /^(?:meta|price|currency)$/i.test(key)
          ? CONTENT_LIMITS.itemMeta
          : /disclosure/i.test(key)
            ? CONTENT_LIMITS.disclosure
            : undefined;
    if (limit) {
      pushLengthIssue(
        issues,
        value,
        limit,
        "CONTENT_NESTED_VALUE_TOO_LONG",
        `${label} ${key}`,
      );
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      pushNestedContentIssues(
        issues,
        item,
        `${label}[${index}]`,
        key,
        depth + 1,
      ),
    );
    return;
  }
  if (typeof value !== "object") return;
  for (const [childKey, childValue] of Object.entries(value)) {
    pushNestedContentIssues(issues, childValue, label, childKey, depth + 1);
  }
}

function brandPreservationIssues(site: Site): CompositionGateIssue[] {
  const input = site.generation?.brandInput;
  if (!input) return [];
  const issues: CompositionGateIssue[] = [];
  if (input.logoAssetId && site.theme.brand.logoAssetId !== input.logoAssetId) {
    issues.push(
      issue(
        "SUPPLIED_LOGO_CHANGED",
        "The user-supplied logo was not preserved exactly.",
      ),
    );
  }
  for (const role of ["primary", "secondary", "accent"] as const) {
    const supplied = input.colors[role];
    if (supplied && site.theme.brand.colors[role] !== supplied) {
      issues.push(
        issue(
          "SUPPLIED_COLOR_CHANGED",
          `The user-supplied ${role} color was not preserved exactly.`,
        ),
      );
    }
  }
  return issues;
}

function assertSuppliedBrandPreserved(before: Site, after: Site) {
  const issues = brandPreservationIssues(after);
  if (
    JSON.stringify(before.generation?.brandProvenance ?? null) !==
    JSON.stringify(after.generation?.brandProvenance ?? null)
  ) {
    issues.push(
      issue(
        "BRAND_PROVENANCE_CHANGED",
        "Brand provenance changed while applying the selected direction.",
      ),
    );
  }
  if (issues.length) {
    throw new Error(`${issues[0]!.code}: ${issues[0]!.message}`);
  }
}

function factualSnapshot(site: Site): string {
  return JSON.stringify({
    schemaVersion: site.schemaVersion,
    siteId: site.siteId,
    workspaceId: site.workspaceId,
    name: site.name,
    domain: site.domain,
    subtype: site.subtype ?? null,
    seoBlueprint: site.seoBlueprint,
    navigation: site.navigation,
    integrations: site.integrations,
    domains: site.domains,
    pages: site.pages.map((page) => ({
      id: page.id,
      path: page.path,
      name: page.name,
      seo: page.seo,
      sections: [...page.sections]
        .sort((left, right) => left.id.localeCompare(right.id))
        .map((section) => ({
          id: section.id,
          props: restaurantFactProps(page.path, section),
          bindings: section.bindings,
          hidden: section.hidden,
        })),
    })),
  });
}

/**
 * Restaurant candidates may restyle five Home labels that describe the visual
 * composition. They are deliberately excluded from the factual invariant;
 * every merchant-supplied menu, visit, contact and reservation value remains
 * part of the snapshot and therefore cannot change during design selection.
 */
function restaurantFactProps(
  pagePath: string,
  section: Site["pages"][number]["sections"][number],
): Record<string, unknown> {
  const props = structuredClone(section.props);
  if (pagePath !== "/") return props;
  const family = sectionFamily(section.component.componentId);
  if (family === "services" || family === "gallery" || family === "features") {
    delete props.title;
  }
  if (family === "about" || family === "cta") {
    delete props.eyebrow;
  }
  return props;
}

function pushLengthIssue(
  issues: CompositionGateIssue[],
  value: unknown,
  limit: number,
  code: string,
  label: string,
) {
  if (typeof value !== "string" || value.length <= limit) return;
  issues.push(issue(code, `${label} exceeds the ${limit}-character limit.`));
}

function pushActionLengthIssue(
  issues: CompositionGateIssue[],
  value: unknown,
  label: string,
) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  pushLengthIssue(
    issues,
    (value as Record<string, unknown>).label,
    CONTENT_LIMITS.actionLabel,
    "CONTENT_ACTION_LABEL_TOO_LONG",
    label,
  );
}

function sectionFamily(componentId: string): SectionFamily | undefined {
  const normalized = componentId.toLowerCase();
  const legacy = SECTION_FAMILIES.find(
    (family) =>
      normalized === `${family}.placeholder` ||
      normalized.startsWith(`${family}.`),
  );
  if (legacy) return legacy;
  const upper = componentId.toUpperCase();
  return SECTION_FAMILIES.find((family) =>
    upper.includes(`-${FAMILY_CODES[family]}-`),
  );
}

function issue(code: string, message: string): CompositionGateIssue {
  return { code, message, severity: "error" };
}

function deduplicate(issues: CompositionGateIssue[]) {
  const seen = new Set<string>();
  return issues.filter((item) => {
    const key = `${item.code}:${item.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
