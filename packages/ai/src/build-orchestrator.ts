import { SCHEMA_VERSION, siteSchema, type BrandTokens, type Site, type SitePlan } from "@micirql/schema";
import { transformDiscoveryToPlanning, type DiscoveryAnswer } from "@micirql/domains";
import type { DesignRegistryEntry } from "@micirql/registry";
import {
  assetReferenceFor,
  resolveAssetSlots,
  type AssetRegistry,
  type AssetSlot,
  type AssetGenerationRequest,
} from "@micirql/assets";
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
  slotId?: string;
};

export type ImagePlanner = {
  requirements(args: { plan: SitePlan; site: Site; context: BuildContext }): Promise<ImageRequirement[]>;
};

export type AssetSlotPlanner = {
  slots(args: { plan: SitePlan; site: Site; context: BuildContext }): Promise<AssetSlot[]>;
};

export type AiBuildOrchestratorInput = {
  context: BuildContext;
  plannerModel: PlannerModel;
  registryEntries: readonly DesignRegistryEntry[];
  brandTokens: BrandTokenResolver;
  sections: SectionMaterializer;
  pageSeo: PageSeoResolver;
  imagePlanner?: ImagePlanner;
  assetRegistry?: AssetRegistry;
  assetSlots?: AssetSlotPlanner;
  minimumAssetScore?: number;
  minimumSelectionScore?: number;
};

export type AiBuildResult =
  | {
      ok: true;
      site: Site;
      plan: SitePlan;
      images: ImageRequirement[];
      generationRequests: AssetGenerationRequest[];
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
    return { ok: false, stage: "discovery", code: "DISCOVERY_INCOMPLETE", issues: transformed.missingQuestionIds };
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

  if (!planning.ok) return { ok: false, stage: "planning", code: planning.code, issues: planning.issues };

  const selection = decideSiteComponents({
    sitePlan: planning.plan,
    registryEntries: input.registryEntries,
    ...(input.minimumSelectionScore === undefined ? {} : { minimumSelectionScore: input.minimumSelectionScore }),
    mode: "library-preferred",
  });

  if (selection.gaps.length > 0) {
    const generation = evaluateCodeGeneration(selection);
    const hardGapKeys = new Set(generation.gaps.map((gap) => `${gap.pagePath}|${gap.family}`));
    return {
      ok: false,
      stage: "selection",
      code: generation.allowed ? "LIBRARY_GAP_REQUIRES_COMPONENT" : "NO_ACCEPTABLE_LIBRARY_MATCH",
      issues: selection.gaps.map((gap) => hardGapKeys.has(`${gap.pagePath}|${gap.family}`)
        ? `${gap.pagePath} / ${gap.family}: verified library gap requires a new Registry draft before this build can complete`
        : `${gap.pagePath} / ${gap.family}: ${gap.reason}; review or re-rank before generation`),
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

    let candidate = siteSchema.parse({
      schemaVersion: SCHEMA_VERSION,
      siteId: input.context.siteId,
      workspaceId: input.context.workspaceId,
      name: planning.plan.business.businessName,
      domain: planning.plan.business.domain,
      ...(planning.plan.business.subtype ? { subtype: planning.plan.business.subtype } : {}),
      theme: { family: planning.plan.design.theme, modifiers: planning.plan.design.modifiers, brand },
      seoBlueprint: transformed.seoBlueprint,
      pages,
      navigation: planning.plan.pages.map((page) => ({ label: page.name, href: page.path })),
      integrations: [],
      domains: [],
    });

    let generationRequests: AssetGenerationRequest[] = [];
    if (input.assetRegistry && input.assetSlots) {
      const slots = await input.assetSlots.slots({ plan: planning.plan, site: candidate, context: input.context });
      const sectionFamilies = Object.fromEntries(selection.selections.map((item, index) => [
        `${slug(item.pagePath)}-${slug(item.family)}-${indexForFamily(selection.selections, item.pagePath, item.family, index)}`,
        item.family,
      ]));
      const resolution = await resolveAssetSlots({
        registry: input.assetRegistry,
        context: {
          workspaceId: input.context.workspaceId,
          domain: input.context.domain,
          ...(input.context.subtype ? { subtype: input.context.subtype } : {}),
          theme: planning.plan.design.theme,
        },
        slots,
        sectionFamilyBySectionId: sectionFamilies,
        ...(input.minimumAssetScore === undefined ? {} : { minimumScore: input.minimumAssetScore }),
      });
      for (const resolved of resolution.resolved) applyAssetReference(candidate, resolved.slot, assetReferenceFor(resolved));
      generationRequests = resolution.generationRequests;
      candidate = siteSchema.parse(candidate);
    }

    const legacyImages = input.imagePlanner
      ? await input.imagePlanner.requirements({ plan: planning.plan, site: candidate, context: input.context })
      : [];
    const images = [
      ...legacyImages,
      ...generationRequests.map((request) => ({
        pagePath: request.slot.pagePath,
        family: request.sectionFamily ?? "visual",
        purpose: request.purpose,
        slotId: request.slot.slotId,
      })),
    ];

    const warnings = selection.selections
      .filter((item) => item.confidence !== "high")
      .map((item) => `${item.pagePath} / ${item.family} selected with ${item.confidence} confidence (${item.score}).`);

    return { ok: true, site: candidate, plan: planning.plan, images, generationRequests, warnings, selectionSummary: selection };
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

function applyAssetReference(site: Site, slot: AssetSlot, reference: unknown): void {
  const page = site.pages.find((item) => item.path === slot.pagePath);
  const section = page?.sections.find((item) => item.id === slot.sectionId);
  if (!section) throw new Error(`Asset slot ${slot.slotId} points to missing section ${slot.sectionId}.`);
  setPath(section.props, slot.propPath, reference);
}

function setPath(target: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split(".").filter(Boolean);
  if (parts.length === 0) throw new Error("Asset slot propPath cannot be empty.");
  let cursor: Record<string, unknown> = target;
  for (let index = 0; index < parts.length - 1; index += 1) {
    const key = parts[index]!;
    const child = cursor[key];
    if (!child || typeof child !== "object" || Array.isArray(child)) cursor[key] = {};
    cursor = cursor[key] as Record<string, unknown>;
  }
  cursor[parts[parts.length - 1]!] = value;
}

function indexForFamily(
  selections: ReturnType<typeof decideSiteComponents>["selections"],
  pagePath: string,
  family: string,
  currentIndex: number,
): number {
  let count = 0;
  for (let index = 0; index <= currentIndex; index += 1) {
    const item = selections[index];
    if (item?.pagePath === pagePath && item.family === family) count += 1;
  }
  return count;
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
  return value.replace(/^\/+|\/+$/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase();
}
