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
  applyPhysiotherapyCandidateMedia,
  applyPhysiotherapyDraftCandidate,
  applyPhysiotherapyDraftContentHygiene,
  createPhysiotherapyDraftScaffold,
  physiotherapyDraftContentIssues,
  physiotherapyDraftMediaIssues,
  rankPhysiotherapyDraftCandidates,
} from "../drafts";
import {
  PHYSIOTHERAPY_CATALOG_VERSION,
  listPhysiotherapyCandidates,
  physiotherapyIndustryPack,
  type PhysiotherapyCandidate,
} from "../physiotherapy";
import { defineCertifiedIndustryPackRuntime } from "./types";

const CONTENT_LIMITS = {
  heading: 72,
  description: 320,
  actionLabel: 48,
  seoTitle: 70,
  seoDescription: 180,
} as const;

function applyCertifiedPhysiotherapyCandidate(
  site: Site,
  candidate: PhysiotherapyCandidate,
  applyCertifiedMedia = true,
): Site {
  const canonicalCandidateIds = listPhysiotherapyCandidates().map(
    (item) => item.id,
  );
  const suppliedCandidateIds = site.generation?.candidateIds ?? [];
  const candidateIds =
    suppliedCandidateIds.length === canonicalCandidateIds.length &&
    new Set(suppliedCandidateIds).size === canonicalCandidateIds.length &&
    suppliedCandidateIds.every((id) => canonicalCandidateIds.includes(id))
      ? [...suppliedCandidateIds]
      : canonicalCandidateIds;
  const staged = applyPhysiotherapyDraftCandidate(site, candidate.id, {
    applyCandidateMedia: false,
  });
  const brandInput = staged.generation?.brandInput;
  const brandProvenance = staged.generation?.brandProvenance;
  staged.generation = {
    catalogVersion: PHYSIOTHERAPY_CATALOG_VERSION,
    packStatus: "certified",
    candidateIds,
    selectedCandidateId: candidate.id,
    ...(brandInput ? { brandInput } : {}),
    ...(brandProvenance ? { brandProvenance } : {}),
  };
  const parsed = siteSchema.parse(staged);
  return applyCertifiedMedia
    ? applyPhysiotherapyCandidateMedia(parsed, candidate)
    : parsed;
}

function applySelectedPhysiotherapyCandidate(
  site: Site,
  candidate: PhysiotherapyCandidate,
): Site {
  const factsBefore = factualSnapshot(site);
  const next = applyCertifiedPhysiotherapyCandidate(site, candidate, false);
  if (factualSnapshot(next) !== factsBefore) {
    throw new Error(
      "PHYSIOTHERAPY_SELECTION_CHANGED_BUSINESS_FACTS: The selected direction changed supplied facts, navigation, bindings, or page content.",
    );
  }
  assertSuppliedBrandPreserved(site, next);
  return next;
}

function physiotherapyCandidateStructureIssues(
  site: Site,
  candidate: PhysiotherapyCandidate,
): CompositionGateIssue[] {
  const issues: CompositionGateIssue[] = [];
  if (!candidate.gate.passed) {
    issues.push(
      issue(
        "CANDIDATE_PROTOCOL_GATE_FAILED",
        "The selected Physiotherapy direction has not passed its registry protocol gate.",
      ),
    );
  }
  if (site.theme.family !== candidate.theme.family) {
    issues.push(
      issue(
        "DESIGN_SYSTEM_MISMATCH",
        "The selected Physiotherapy design system was not applied.",
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
        "The selected Physiotherapy typography system was not applied.",
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
        "The selected Physiotherapy density, shape, motion, or modifiers were not applied.",
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
        "The selected Physiotherapy palette and supplied colors were not applied exactly.",
      ),
    );
  }

  const blueprints = new Map(
    physiotherapyIndustryPack
      .listPageBlueprints()
      .map((blueprint) => [blueprint.path, blueprint]),
  );
  for (const page of site.pages) {
    const blueprint = blueprints.get(page.path);
    if (!blueprint) {
      issues.push(
        issue(
          "PHYSIOTHERAPY_PAGE_ANATOMY_UNKNOWN",
          `${page.path} is not part of the certified Physiotherapy page anatomy.`,
        ),
      );
      continue;
    }
    const expectedOrder =
      page.path === "/"
        ? candidate.sectionOrder
        : blueprint.sectionFamilies;
    const orderIndex = new Map(
      expectedOrder.map((family, index) => [family, index]),
    );
    let previousIndex = -1;
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
      const currentIndex = orderIndex.get(family);
      if (currentIndex === undefined || currentIndex < previousIndex) {
        issues.push(
          issue(
            "CANDIDATE_SECTION_ORDER_MISMATCH",
            `${page.path} does not preserve the certified Physiotherapy section sequence.`,
          ),
        );
      } else {
        previousIndex = currentIndex;
      }
    }
  }
  return deduplicate(issues);
}

function validatePhysiotherapyDraft(
  site: Site,
  additionalIssues: CompositionGateIssue[] = [],
): CompositionGateReport {
  const issues: CompositionGateIssue[] = [...additionalIssues];
  if (!siteSchema.safeParse(site).success) {
    issues.push(
      issue(
        "SITE_SCHEMA_INVALID",
        "The selected Physiotherapy draft does not satisfy the portable Site Schema.",
      ),
    );
  }
  if (
    !physiotherapyIndustryPack.matchesSite({
      domain: site.domain,
      subtype: site.subtype ?? null,
    })
  ) {
    issues.push(
      issue(
        "INDUSTRY_DOMAIN_MISMATCH",
        "The selected draft must remain in the certified clinic/physiotherapy pack.",
      ),
    );
  }
  if (
    site.generation?.packStatus !== "certified" ||
    site.generation.catalogVersion !== PHYSIOTHERAPY_CATALOG_VERSION
  ) {
    issues.push(
      issue(
        "INDUSTRY_PACK_NOT_CERTIFIED",
        "The draft is not attached to the certified Physiotherapy catalog.",
      ),
    );
  }
  const selectedCandidateId = site.generation?.selectedCandidateId;
  if (
    !selectedCandidateId ||
    !physiotherapyIndustryPack
      .listCandidates()
      .some((candidate) => candidate.id === selectedCandidateId)
  ) {
    issues.push(
      issue(
        "DESIGN_SELECTION_MISSING",
        "Select one certified Physiotherapy direction before entering the editor.",
      ),
    );
  }

  const paths = new Set(site.pages.map((page) => page.path));
  for (const path of physiotherapyIndustryPack.requiredPagePaths) {
    if (!paths.has(path)) {
      issues.push(
        issue(
          "REQUIRED_PAGE_MISSING",
          `The certified Physiotherapy pack requires ${path}.`,
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
  for (const action of physiotherapyIndustryPack.requiredActions) {
    if (!actions.has(action)) {
      issues.push(
        issue(
          "REQUIRED_ACTION_MISSING",
          `The certified Physiotherapy pack requires a registered ${action} action binding.`,
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

  issues.push(...contentFitIssues(site));
  issues.push(...duplicateHeadingIssues(site));
  issues.push(...brandPreservationIssues(site));
  issues.push(...physiotherapyDraftContentIssues(site));
  issues.push(...physiotherapyDraftMediaIssues(site));

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

export const physiotherapyIndustryPackRuntime =
  defineCertifiedIndustryPackRuntime<PhysiotherapyCandidate>({
    pack: physiotherapyIndustryPack,
    functionPolicy: Object.freeze({
      contentEnrichment: Object.freeze({
        functionName: "enrich-site-content",
        certifiedModes: Object.freeze(["model", "partial", "curated"]),
        fallbackIsCertifiable: false,
      }),
      certifiedMedia: Object.freeze({
        mode: "licensed-selection",
        provider: "pexels",
        remoteFunctionRequired: false,
      }),
    }),
    rankCandidates: (profile) => {
      const certifiedById = new Map(
        listPhysiotherapyCandidates().map((candidate) => [
          candidate.id,
          candidate,
        ]),
      );
      return rankPhysiotherapyDraftCandidates(profile).map((item) => ({
        ...item,
        candidate: certifiedById.get(item.candidate.id)!,
      }));
    },
    createStructuralScaffold: (
      source,
      brief,
      brandInput,
      brandProvenance,
    ) =>
      createPhysiotherapyDraftScaffold(
        source,
        brief,
        brandInput,
        brandProvenance,
      ),
    applyCandidate: (site, candidate, options) =>
      applyCertifiedPhysiotherapyCandidate(
        site,
        candidate,
        options.applyCertifiedMedia !== false,
      ),
    applySelectedCandidate: applySelectedPhysiotherapyCandidate,
    candidateStructureIssues: physiotherapyCandidateStructureIssues,
    validateDraft: validatePhysiotherapyDraft,
    applyContentHygiene: applyPhysiotherapyDraftContentHygiene,
    contentIssues: physiotherapyDraftContentIssues,
    repairContentFit: repairSelectedDraftContentFit,
    protectedStructureChanged,
    restoreProtectedStructure,
    isCertifiedComponent: isCertifiedSectionComponent,
    applyCertifiedMedia: (site, candidate) =>
      applyPhysiotherapyCandidateMedia(site, candidate),
    certifiedMediaIssues: physiotherapyDraftMediaIssues,
  });

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
      pushLengthIssue(
        issues,
        section.props.body,
        CONTENT_LIMITS.description,
        "CONTENT_BODY_TOO_LONG",
        `${page.path} section ${section.id} body`,
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

function duplicateHeadingIssues(site: Site): CompositionGateIssue[] {
  const issues: CompositionGateIssue[] = [];
  for (const page of site.pages) {
    const seen = new Map<string, string>();
    for (const section of page.sections) {
      const family = sectionFamily(section.component.componentId);
      if (family === "navbar" || family === "footer" || section.hidden) {
        continue;
      }
      const heading =
        stringValue(section.props.heading) ?? stringValue(section.props.title);
      if (!heading) continue;
      const key = heading.toLocaleLowerCase("en-US");
      const first = seen.get(key);
      if (first) {
        issues.push(
          issue(
            "DUPLICATE_SECTION_HEADING",
            `“${heading}” is repeated in ${first} and ${page.path} section ${section.id}.`,
          ),
        );
      } else {
        seen.set(key, `${page.path} section ${section.id}`);
      }
    }
  }
  return issues;
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
          props: section.props,
          bindings: section.bindings,
          hidden: section.hidden,
        })),
    })),
  });
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

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
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
