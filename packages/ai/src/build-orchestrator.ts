import { SCHEMA_VERSION, siteSchema, type BrandTokens, type Site, type SitePlan } from "@micirql/schema";
import { transformDiscoveryToPlanning, type DiscoveryAnswer } from "@micirql/domains";
import type { DesignRegistryEntry } from "@micirql/registry";
import { decideSiteComponents } from "./decision";
import { runPlannerAdapter, type PlannerModel } from "./planner-adapter";
import { evaluateCodeGeneration } from "./codegen-policy";

export type BuildContext = {
  workspaceId: string;
  siteId: string;
  buildId: string;
  domain: SitePlan["business"]["domain"];
  subtype?: string;
  discoveryAnswers: DiscoveryAnswer[];
};

export type BrandTokenResolver = {
  resolve(args: { plan: SitePlan; context: BuildContext }): Promise<BrandTokens>;
};

export type SectionMaterializer = {
  materialize(args: {
    plan: SitePlan;
    page: SitePlan["pages"][number];
    family: string;
    componentId: string;
    version: string;
    context: BuildContext;
  }): Promise<{
    props: Record<string, unknown>;
    bindings?: Record<string, { actionId: string; inputMap?: Record<string, string> }>;
  }>;
};

export type PageSeoResolver = {
  resolve(args: {
    plan: SitePlan;
    page: SitePlan["pages"][number];
    context: BuildContext;
  }): Promise<{
    title: string;
    description: string;
    primaryKeyword?: string;
    structuredDataTypes?: string[];
    indexable?: boolean;
  }>;
};

export type ImageRequirement = {
  pagePath: string;
  family: string;
  purpose: string;
};

export type ImagePlanner = {
  requirements(args: { plan: SitePlan; site: Site; context: BuildContext }): Promise<ImageRequirement[]>;
};

export type AiBuildOrchestratorInput = {
  context: BuildContext;
  plannerModel: PlannerModel;
  registryEntries: readonly DesignRegistryEntry[];
  brandTokens: BrandTokenResolver;
  sections: SectionMaterializer;
  pageSeo: PageSeoResolver;
  imagePlanner?: ImagePlanner;
  minimumSelectionScore?: number;
};

export type AiBuildResult =
  | {
      ok: true;
      site: Site;
      plan: SitePlan;
      images: ImageRequirement[];
      warnings: string[];
      selectionSummary: ReturnType<typeof decideSiteComponents>;
    }
  | {
      ok: false;
      stage: "discovery" | "planning" | "selection" | "materialization";
      code: string;
      issues: string[];
      plan?: SitePlan;
    };

export async function orchestrateAiBuild(input: AiBuildOrchestratorInput): Promise<AiBuildResult> {
  const transformed = transformDiscoveryToPlanning({
    domain: input.context.domain,
    ...(input.context.subtype ? { subtype: input.context.subtype } : {}),
    answers: input.context.discoveryAnswers,
  });

  if (!transformed.complete || !transformed.businessProfile || !transformed.seoBlueprint) {
    return {
      ok: false,
      stage: "discovery",
      code: "DISCOVERY_INCOMPLETE",
      issues: transformed.missingQuestionIds,
    };
  }

  const planning = await runPlannerAdapter({
    model: input.plannerModel,
    domain: input.context.domain,
    ...(input.context.subtype ? { subtype: input.context.subtype } : {}),
    discoveryAnswers: input.context.discoveryAnswers,
    plannerInput: {
      business: transformed.businessProfile,
      seo: transformed.seoBlueprint,
      requiredPages: transformed.requiredPages,
      requiredActions: transformed.requiredActions,
      optionalActions: transformed.optionalActions,
      trustSignals: transformed.trustSignals,
      avoid: transformed.avoid,
    },
  });

  if (!planning.ok) {
    return {
      ok: false,
      stage: "planning",
      code: planning.code,
      issues: planning.issues,
    };
  }

  const selection = decideSiteComponents({
    sitePlan: planning.plan,
    registryEntries: input.registryEntries,
    ...(input.minimumSelectionScore === undefined ? {} : { minimumSelectionScore: input.minimumSelectionScore }),
    mode: "library-preferred",
  });

  if (selection.gaps.length > 0) {
    const generation = evaluateCodeGeneration(selection);
    const hardGapKeys = new Set(generation.gaps.map((gap) => `${gap.pagePath}|${gap.family}`));
    const issues = selection.gaps.map((gap) => {
      const key = `${gap.pagePath}|${gap.family}`;
      return hardGapKeys.has(key)
        ? `${gap.pagePath} / ${gap.family}: verified library gap requires a new Registry draft before this build can complete`
        : `${gap.pagePath} / ${gap.family}: ${gap.reason}; review or re-rank before generation`;
    });
    return {
      ok: false,
      stage: "selection",
      code: generation.allowed ? "LIBRARY_GAP_REQUIRES_COMPONENT" : "NO_ACCEPTABLE_LIBRARY_MATCH",
      issues,
      plan: planning.plan,
    };
  }

  try {
    const brand = await input.brandTokens.resolve({ plan: planning.plan, context: input.context });
    const pages = [];

    for (const page of planning.plan.pages) {
      const pageSelections = selection.selections.filter((item) => item.pagePath === page.path);
      const sections = [];
      for (let index = 0; index < pageSelections.length; index += 1) {
        const selected = pageSelections[index]!;
        const materialized = await input.sections.materialize({
          plan: planning.plan,
          page,
          family: selected.family,
          componentId: selected.componentId,
          version: selected.version,
          context: input.context,
        });
        sections.push({
          id: `${slug(page.path)}-${slug(selected.family)}-${index + 1}`,
          component: { componentId: selected.componentId, version: selected.version },
          props: materialized.props,
          bindings: normalizeBindings(materialized.bindings),
          hidden: false,
        });
      }

      const seo = await input.pageSeo.resolve({ plan: planning.plan, page, context: input.context });
      pages.push({
        id: slug(page.path) || "home",
        path: page.path,
        name: page.name,
        sections,
        seo: {
          title: seo.title,
          description: seo.description,
          canonicalPath: page.path,
          indexable: seo.indexable ?? true,
          ...(seo.primaryKeyword ? { primaryKeyword: seo.primaryKeyword } : {}),
          structuredDataTypes: seo.structuredDataTypes ?? [],
        },
      });
    }

    const candidate = siteSchema.parse({
      schemaVersion: SCHEMA_VERSION,
      siteId: input.context.siteId,
      workspaceId: input.context.workspaceId,
      name: planning.plan.business.businessName,
      domain: planning.plan.business.domain,
      ...(planning.plan.business.subtype ? { subtype: planning.plan.business.subtype } : {}),
      theme: {
        family: planning.plan.design.theme,
        modifiers: planning.plan.design.modifiers,
        brand,
      },
      seoBlueprint: transformed.seoBlueprint,
      pages,
      navigation: planning.plan.pages.map((page) => ({ label: page.name, href: page.path })),
      integrations: [],
      domains: [],
    });

    const images = input.imagePlanner
      ? await input.imagePlanner.requirements({ plan: planning.plan, site: candidate, context: input.context })
      : [];

    const warnings = selection.selections
      .filter((item) => item.confidence !== "high")
      .map((item) => `${item.pagePath} / ${item.family} selected with ${item.confidence} confidence (${item.score}).`);

    return { ok: true, site: candidate, plan: planning.plan, images, warnings, selectionSummary: selection };
  } catch (error) {
    return {
      ok: false,
      stage: "materialization",
      code: "SITE_SCHEMA_MATERIALIZATION_FAILED",
      issues: [error instanceof Error ? error.message : "Unknown materialization error."],
      plan: planning.plan,
    };
  }
}

function normalizeBindings(
  bindings: Record<string, { actionId: string; inputMap?: Record<string, string> }> | undefined,
): Record<string, { actionId: string; inputMap: Record<string, string> }> {
  if (!bindings) return {};
  return Object.fromEntries(Object.entries(bindings).map(([key, value]) => [
    key,
    { actionId: value.actionId, inputMap: value.inputMap ?? {} },
  ]));
}

function slug(value: string): string {
  return value
    .replace(/^\/+|\/+$/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}
