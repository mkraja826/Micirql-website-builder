import { getDomainPack } from "@micirql/domains";
import {
  siteSchema,
  type CompositionGateIssue,
  type CompositionGateReport,
  type Site,
} from "@micirql/schema";
import { applyIndustryPreset } from "../../../apply-industry-preset";
import { applyBrandInput } from "../../../brand-provenance";
import type { IndustryDesignPreset } from "../../../industry-design-preset-data";
import {
  DENTAL_COMPONENT_VERSION,
  FAMILY_CODES,
  SECTION_FAMILIES,
  sectionDesignId,
  type SectionFamily,
} from "@micirql/sections";

const CONTENT_LIMITS = {
  heading: 72,
  description: 320,
  actionLabel: 48,
  seoTitle: 70,
  seoDescription: 180,
} as const;

export function applySelectedDentalCandidate(
  site: Site,
  preset: IndustryDesignPreset,
): Site {
  const factsBefore = factualSnapshot(site);
  const generation = site.generation
    ? structuredClone(site.generation)
    : undefined;
  const brandInput = generation?.brandInput;
  const provenance = generation?.brandProvenance;
  const currentLogo = site.theme.brand.logoAssetId;

  const next = applyIndustryPreset(site, preset);
  next.generation = {
    ...(generation ?? {
      catalogVersion:
        candidateCatalogVersion(preset) ?? "dental-catalog-unknown",
      packStatus: "certified" as const,
      candidateIds: [preset.id],
    }),
    selectedCandidateId: preset.id,
  };
  delete next.generation.premiumGate;

  if (currentLogo) next.theme.brand.logoAssetId = currentLogo;
  if (brandInput?.logoAssetId)
    next.theme.brand.logoAssetId = brandInput.logoAssetId;
  if (brandInput?.colors.primary)
    next.theme.brand.colors.primary = brandInput.colors.primary;
  if (brandInput?.colors.secondary)
    next.theme.brand.colors.secondary = brandInput.colors.secondary;
  if (brandInput?.colors.accent)
    next.theme.brand.colors.accent = brandInput.colors.accent;
  if (provenance) next.generation.brandProvenance = structuredClone(provenance);

  const parsed = siteSchema.parse(next);
  if (factualSnapshot(parsed) !== factsBefore) {
    throw selectionInvariantError(
      "SELECTION_CHANGED_BUSINESS_FACTS",
      "The selected design attempted to change business facts, navigation, bindings, or page content.",
    );
  }
  assertSuppliedBrandPreserved(site, parsed);
  return parsed;
}

export function validateSelectedDraft(
  site: Site,
  additionalIssues: CompositionGateIssue[] = [],
): CompositionGateReport {
  const issues: CompositionGateIssue[] = [...additionalIssues];

  const parsed = siteSchema.safeParse(site);
  if (!parsed.success) {
    issues.push({
      code: "SITE_SCHEMA_INVALID",
      message: "The selected draft does not satisfy the portable Site Schema.",
      severity: "error",
    });
  }

  if (site.domain !== "clinic" || !isDentalSubtype(site.subtype)) {
    issues.push({
      code: "DENTAL_DOMAIN_MISMATCH",
      message:
        "The selected draft must remain in the certified clinic/dental pack.",
      severity: "error",
    });
  }
  if (site.generation?.packStatus !== "certified") {
    issues.push({
      code: "DENTAL_PACK_NOT_CERTIFIED",
      message:
        "The draft is not attached to a certified dental composition catalog.",
      severity: "error",
    });
  }
  if (!site.generation?.selectedCandidateId) {
    issues.push({
      code: "DESIGN_SELECTION_MISSING",
      message:
        "Select one certified dental composition before entering the editor.",
      severity: "error",
    });
  }

  const pack = getDomainPack("clinic");
  const paths = new Set(site.pages.map((page) => page.path));
  for (const page of pack.defaultPages.filter(
    (candidate) => candidate.required,
  )) {
    if (!paths.has(page.slug)) {
      issues.push({
        code: "REQUIRED_PAGE_MISSING",
        message: `The certified dental pack requires the ${page.label} page (${page.slug}).`,
        severity: "error",
      });
    }
  }

  const actions = new Set(
    site.pages.flatMap((page) =>
      page.sections.flatMap((section) =>
        Object.values(section.bindings).map((binding) => binding.actionId),
      ),
    ),
  );
  for (const action of pack.requiredActions) {
    if (!actions.has(action)) {
      issues.push({
        code: "REQUIRED_ACTION_MISSING",
        message: `The certified dental pack requires a registered ${action} action binding.`,
        severity: "error",
      });
    }
  }

  const sections = site.pages.flatMap((page) => page.sections);
  for (const section of sections) {
    if (section.component.componentId.toLowerCase().includes("placeholder")) {
      issues.push({
        code: "UNAPPROVED_COMPONENT",
        message: `Section ${section.id} still uses a preview placeholder instead of an approved component.`,
        severity: "error",
      });
    }
  }

  issues.push(...contentFitIssues(site));
  issues.push(...duplicateHeadingIssues(site));
  issues.push(...brandPreservationIssues(site));

  const uniqueIssues = deduplicateIssues(issues);
  const errorCount = uniqueIssues.filter(
    (issue) => issue.severity === "error",
  ).length;
  const warningCount = uniqueIssues.length - errorCount;
  return {
    passed: errorCount === 0,
    score: Math.max(0, 100 - errorCount * 12 - warningCount * 3),
    issues: uniqueIssues,
  };
}

export function selectedCandidateStructureIssues(
  site: Site,
  preset: IndustryDesignPreset,
): CompositionGateIssue[] {
  const issues: CompositionGateIssue[] = [];
  if (!preset.gate.passed) {
    issues.push({
      code: "CANDIDATE_PROTOCOL_GATE_FAILED",
      message:
        "The selected dental composition has not passed its registry protocol gate.",
      severity: "error",
    });
  }
  if (site.theme.family !== preset.theme.family) {
    issues.push({
      code: "DESIGN_SYSTEM_MISMATCH",
      message: "The selected design system was not applied to the draft.",
      severity: "error",
    });
  }
  if (
    JSON.stringify(site.theme.brand.typography) !==
    JSON.stringify(preset.theme.brand.typography)
  ) {
    issues.push({
      code: "TYPOGRAPHY_MISMATCH",
      message: "The selected typography system was not applied to the draft.",
      severity: "error",
    });
  }
  const expectedModifiers = JSON.stringify(preset.theme.modifiers);
  const actualModifiers = JSON.stringify(site.theme.modifiers);
  if (
    expectedModifiers !== actualModifiers ||
    site.theme.brand.density !== preset.theme.brand.density ||
    site.theme.brand.shape !== preset.theme.brand.shape ||
    site.theme.brand.motion !== preset.theme.brand.motion
  ) {
    issues.push({
      code: "DESIGN_TOKEN_MISMATCH",
      message:
        "The selected density, shape, motion, or design modifiers were not applied.",
      severity: "error",
    });
  }
  const expectedColors = applyBrandInput(
    preset.theme,
    site.generation?.brandInput,
    site.generation?.brandProvenance,
  ).brand.colors;
  if (
    JSON.stringify(site.theme.brand.colors) !== JSON.stringify(expectedColors)
  ) {
    issues.push({
      code: "PALETTE_MISMATCH",
      message:
        "The selected palette and derived support colors were not applied exactly.",
      severity: "error",
    });
  }

  const orderIndex = new Map(
    preset.sectionOrder.map((family, index) => [family, index]),
  );
  for (const page of site.pages) {
    let previousIndex = -1;
    for (const section of page.sections) {
      const family = sectionFamilyFromComponentId(
        section.component.componentId,
      );
      if (!family) {
        issues.push({
          code: "COMPONENT_FAMILY_UNKNOWN",
          message: `${page.path} section ${section.id} is not part of the approved dental section registry.`,
          severity: "error",
        });
        continue;
      }
      const expectedComponent = sectionDesignId(
        preset.theme.family,
        family,
        preset.variants[family],
      );
      if (
        section.component.componentId !== expectedComponent ||
        section.component.version !== DENTAL_COMPONENT_VERSION
      ) {
        issues.push({
          code: "CANDIDATE_COMPONENT_MISMATCH",
          message: `${page.path} section ${section.id} does not use the selected certified ${family} component.`,
          severity: "error",
        });
      }
      const currentIndex = orderIndex.get(family);
      if (currentIndex === undefined || currentIndex < previousIndex) {
        issues.push({
          code: "CANDIDATE_SECTION_ORDER_MISMATCH",
          message: `${page.path} does not follow the selected composition’s section sequence.`,
          severity: "error",
        });
      } else {
        previousIndex = currentIndex;
      }
    }
  }
  return deduplicateIssues(issues);
}

export function repairSelectedDraftContentFit(site: Site): {
  site: Site;
  changed: boolean;
} {
  const next = structuredClone(site);
  let changed = false;

  for (const page of next.pages) {
    changed =
      truncateRecordValue(page.seo, "title", CONTENT_LIMITS.seoTitle) ||
      changed;
    changed =
      truncateRecordValue(
        page.seo,
        "description",
        CONTENT_LIMITS.seoDescription,
      ) || changed;
    for (const section of page.sections) {
      changed =
        truncateRecordValue(section.props, "title", CONTENT_LIMITS.heading) ||
        changed;
      changed =
        truncateRecordValue(section.props, "heading", CONTENT_LIMITS.heading) ||
        changed;
      changed =
        truncateRecordValue(
          section.props,
          "description",
          CONTENT_LIMITS.description,
        ) || changed;
      changed =
        truncateRecordValue(
          section.props,
          "body",
          CONTENT_LIMITS.description,
        ) || changed;
      changed = truncateActionLabel(section.props, "primaryAction") || changed;
      changed =
        truncateActionLabel(section.props, "secondaryAction") || changed;
    }
  }

  return { site: siteSchema.parse(next), changed };
}

export function protectedStructureChanged(before: Site, after: Site): boolean {
  return (
    protectedStructureSnapshot(before) !== protectedStructureSnapshot(after)
  );
}

export function restoreProtectedStructure(
  baseline: Site,
  generated: Site,
): Site {
  const next = structuredClone(generated);
  next.schemaVersion = baseline.schemaVersion;
  next.siteId = baseline.siteId;
  next.workspaceId = baseline.workspaceId;
  next.name = baseline.name;
  next.domain = baseline.domain;
  if (baseline.subtype) next.subtype = baseline.subtype;
  else delete next.subtype;
  next.theme = structuredClone(baseline.theme);
  next.seoBlueprint = structuredClone(baseline.seoBlueprint);
  next.navigation = structuredClone(baseline.navigation);
  next.integrations = structuredClone(baseline.integrations);
  next.domains = structuredClone(baseline.domains);
  if (baseline.generation)
    next.generation = structuredClone(baseline.generation);
  else delete next.generation;

  const generatedPages = new Map(
    generated.pages.map((page) => [page.id, page]),
  );
  next.pages = baseline.pages.map((baselinePage) => {
    const generatedPage = generatedPages.get(baselinePage.id);
    const generatedSections = new Map(
      (generatedPage?.sections ?? []).map((section) => [section.id, section]),
    );
    return {
      ...structuredClone(baselinePage),
      seo: structuredClone(generatedPage?.seo ?? baselinePage.seo),
      sections: baselinePage.sections.map((baselineSection) => {
        const generatedSection = generatedSections.get(baselineSection.id);
        return {
          ...structuredClone(baselineSection),
          props: structuredClone(
            generatedSection?.props ?? baselineSection.props,
          ),
        };
      }),
    };
  });
  return siteSchema.parse(next);
}

export function isDentalSubtype(value: unknown): boolean {
  return (
    typeof value === "string" &&
    /(?:^|[^a-z])(dental|dentist(?:ry|s)?|orthodont(?:ic|ics|ist)?|endodont(?:ic|ics|ist)?|periodont(?:ic|ics|ist)?|prosthodont(?:ic|ics|ist)?|implant(?:s|ology)?|oral[ -](?:surgery|care))(?:[^a-z]|$)/i.test(
      value,
    )
  );
}

export function candidateCatalogVersion(
  preset: IndustryDesignPreset,
): string | undefined {
  const value = (preset as IndustryDesignPreset & { catalogVersion?: unknown })
    .catalogVersion;
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
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
      const family = sectionFamilyFromComponentId(section.component.componentId);
      if (family === "navbar" || family === "footer") continue;
      const heading =
        stringValue(section.props.heading) ?? stringValue(section.props.title);
      if (!heading) continue;
      const key = heading.toLocaleLowerCase();
      const first = seen.get(key);
      if (first) {
        issues.push({
          code: "DUPLICATE_SECTION_HEADING",
          message: `“${heading}” is repeated in ${first} and ${page.path} section ${section.id}.`,
          severity: "error",
        });
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
    issues.push({
      code: "SUPPLIED_LOGO_CHANGED",
      message: "The user-supplied logo was not preserved exactly.",
      severity: "error",
    });
  }
  for (const role of ["primary", "secondary", "accent"] as const) {
    const supplied = input.colors[role];
    if (supplied && site.theme.brand.colors[role] !== supplied) {
      issues.push({
        code: "SUPPLIED_COLOR_CHANGED",
        message: `The user-supplied ${role} color was not preserved exactly.`,
        severity: "error",
      });
    }
  }
  return issues;
}

function assertSuppliedBrandPreserved(before: Site, after: Site) {
  const issues = brandPreservationIssues(after);
  const beforeProvenance = JSON.stringify(
    before.generation?.brandProvenance ?? null,
  );
  const afterProvenance = JSON.stringify(
    after.generation?.brandProvenance ?? null,
  );
  if (beforeProvenance !== afterProvenance) {
    issues.push({
      code: "BRAND_PROVENANCE_CHANGED",
      message:
        "Brand provenance changed while applying the selected structure.",
      severity: "error",
    });
  }
  if (issues.length)
    throw selectionInvariantError(issues[0]!.code, issues[0]!.message);
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

function protectedStructureSnapshot(site: Site): string {
  return JSON.stringify({
    schemaVersion: site.schemaVersion,
    siteId: site.siteId,
    workspaceId: site.workspaceId,
    name: site.name,
    domain: site.domain,
    subtype: site.subtype ?? null,
    theme: site.theme,
    seoBlueprint: site.seoBlueprint,
    navigation: site.navigation,
    integrations: site.integrations,
    domains: site.domains,
    generation: site.generation
      ? {
          catalogVersion: site.generation.catalogVersion,
          packStatus: site.generation.packStatus,
          candidateIds: site.generation.candidateIds,
          selectedCandidateId: site.generation.selectedCandidateId ?? null,
          brandInput: site.generation.brandInput ?? null,
          brandProvenance: site.generation.brandProvenance ?? null,
        }
      : null,
    pages: site.pages.map((page) => ({
      id: page.id,
      path: page.path,
      name: page.name,
      sections: page.sections.map((section) => ({
        id: section.id,
        component: section.component,
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
  issues.push({
    code,
    message: `${label} exceeds the ${limit}-character content limit.`,
    severity: "error",
  });
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

function truncateRecordValue(
  record: Record<string, unknown>,
  key: string,
  limit: number,
): boolean {
  const value = record[key];
  if (typeof value !== "string" || value.length <= limit) return false;
  record[key] = truncate(value, limit);
  return true;
}

function truncateActionLabel(
  record: Record<string, unknown>,
  key: string,
): boolean {
  const value = record[key];
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return truncateRecordValue(
    value as Record<string, unknown>,
    "label",
    CONTENT_LIMITS.actionLabel,
  );
}

function truncate(value: string, limit: number): string {
  if (value.length <= limit) return value;
  return `${value.slice(0, Math.max(0, limit - 1)).trimEnd()}…`;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function deduplicateIssues(
  issues: CompositionGateIssue[],
): CompositionGateIssue[] {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = `${issue.code}:${issue.message}:${issue.severity}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function selectionInvariantError(code: string, message: string) {
  const error = new Error(message) as Error & {
    code?: string;
    status?: number;
  };
  error.code = code;
  error.status = 422;
  return error;
}

function sectionFamilyFromComponentId(
  componentId: string,
): SectionFamily | undefined {
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
