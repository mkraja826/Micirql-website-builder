import { siteSchema, type Site } from "@micirql/schema";
import {
  buildContentEnrichmentContract,
  enforceContentEnrichmentIntegrity,
  evaluateWebsiteContent,
  groundSiteContent,
  type GroundingFacts,
} from "@micirql/design-engine";
import { executeRoutedTask, type ModelExecutor, type ModelExecutorRegistry } from "./model-executor";
import type { ModelProfile } from "./model-routing";
import type { PlannerModel } from "./planner-adapter";

const MIN_GENERATED_CONTENT_SCORE = 82;
const MAX_REWRITE_ISSUES = 12;

export type ContentGenerationInput = {
  site: Site;
  facts: GroundingFacts;
  profiles: readonly ModelProfile[];
  executors: ModelExecutorRegistry;
};

export type ContentGenerationModelInput = {
  task: "generate-content";
  site: Site;
  contract: ReturnType<typeof buildContentEnrichmentContract>;
  facts: GroundingFacts;
  rules: string[];
};

export type ContentGenerationResult = {
  site: Site;
  model: ModelProfile;
  appliedFields: number;
  restoredChanges: string[];
  groundingIssues: ReturnType<typeof groundSiteContent>["issues"];
  structureIntact: boolean;
  contentQuality: ReturnType<typeof evaluateWebsiteContent>;
  qualityRewriteApplied: boolean;
};

/** Adapts any JSON-capable MiCirql text provider into the routed content executor interface. */
export function createJsonContentExecutor(model: PlannerModel): ModelExecutor<ContentGenerationModelInput, unknown> {
  return {
    profileId: model.id,
    run(input) {
      return model.generate({
        system: [
          "You are the MiCirql content writer. Return JSON only.",
          "You are editing an existing schema-driven website snapshot, not designing or coding a website.",
          ...input.rules,
          "Follow every page and section content contract exactly, including industry guidance, trust rules, CTA patterns and character limits.",
          "Do not describe a business, team or clinician as expert, experienced, renowned, highly skilled, trusted or best unless that exact authority claim is supported by the supplied facts.",
          "If a requested fact is missing, use neutral factual wording or preserve the existing placeholder instead of inventing it.",
        ].join("\n"),
        input,
        responseFormat: "json",
      });
    },
  };
}

export function createModelExecutorRegistry(executors: readonly ModelExecutor[]): ModelExecutorRegistry {
  const byProfile = new Map(executors.map((executor) => [executor.profileId, executor]));
  return { get(profileId) { return byProfile.get(profileId); } };
}

function baseRules(): string[] {
  return [
    "Return one complete Site object matching the supplied schema shape.",
    "Change only SEO title/description and content fields explicitly listed as editable in the contract.",
    "Do not add, remove or reorder pages, sections, items, links, actions, bindings, media, components or integrations.",
    "Use only supplied business facts. Never invent people, credentials, testimonials, ratings, statistics, prices, guarantees, addresses, hours or awards.",
    "Authority adjectives such as expert, experienced, renowned, highly skilled, trusted, leading or best must not be used unless directly supported by supplied facts.",
    "Write to the existing visual geometry: hero headings <= 12 words, ordinary section headings <= 10 words, eyebrows <= 5 words, CTA labels <= 4 words, item titles <= 6 words, hero supporting copy <= 40 words, ordinary section body copy <= 48 words, and item descriptions <= 24 words.",
    "Prefer one strong sentence over two weak sentences. Avoid filler, repeated claims, stacked adjectives, long comma chains and generic marketing phrases.",
    "Avoid weak CTAs such as Learn more, Explore, Discover, Get started or Click here. Use a concrete next action appropriate to the page.",
    "Do not repeat the same claim across multiple sections. Each visible section must contribute a distinct idea.",
    "Keep copy concise enough for the limits and guidance in each contract entry.",
  ];
}

function qualityPass(site: Site) {
  const contentQuality = evaluateWebsiteContent(site);
  const contentErrors = contentQuality.issues.filter((issue) => issue.severity === "error");
  return {
    contentQuality,
    contentErrors,
    passes: contentErrors.length === 0 && contentQuality.score >= MIN_GENERATED_CONTENT_SCORE,
  };
}

function qualityRepairRules(quality: ReturnType<typeof evaluateWebsiteContent>): string[] {
  const issueLines = quality.issues.slice(0, MAX_REWRITE_ISSUES).map((issue, index) => {
    const location = [issue.pageId, issue.sectionId, issue.path].filter(Boolean).join(" / ");
    return `${index + 1}. ${issue.code}${location ? ` at ${location}` : ""}: ${issue.message}`;
  });

  return [
    ...baseRules(),
    "This is a targeted quality-repair pass. Preserve all content that is already good and rewrite only what is needed to resolve the listed quality issues.",
    "Do not make unrelated stylistic changes. Do not alter structure, layout, media, actions, links, facts or item counts.",
    "Remove generic AI marketing language. Make each section communicate a distinct, concrete idea using the supplied business facts.",
    "Replace vague CTAs with specific visitor actions while preserving their existing href/action targets.",
    "Resolve duplicate or near-duplicate messaging by giving each section a different purpose, not by using superficial synonyms.",
    `The prior draft scored ${quality.score}/100. Resolve these detected issues:\n${issueLines.join("\n")}`,
  ];
}

function materializeCandidate(before: Site, candidate: unknown, facts: GroundingFacts) {
  const parsed = siteSchema.safeParse(candidate);
  if (!parsed.success) {
    throw new Error(`Content model returned an invalid site snapshot: ${parsed.error.issues[0]?.message ?? "schema validation failed"}`);
  }

  const integrity = enforceContentEnrichmentIntegrity(before, parsed.data);
  const grounded = groundSiteContent(integrity.site, facts);
  const site = siteSchema.parse(grounded.site);
  return { site, integrity, grounded };
}

/**
 * Runs content generation through the MiCirql safety boundary.
 * The model receives the full site only so it can return a schema-valid candidate;
 * design/runtime fields remain immutable because the integrity layer copies back
 * only fields explicitly granted by the content contract.
 *
 * If the first copy pass misses the content-quality bar, MiCirql gives the same
 * routed model one targeted repair pass containing the exact QA failures. The
 * repaired candidate crosses the same integrity + grounding boundaries before
 * it can be accepted.
 */
export async function generateGuardedSiteContent(input: ContentGenerationInput): Promise<ContentGenerationResult> {
  const before = siteSchema.parse(input.site);
  const contract = buildContentEnrichmentContract(before);

  const routed = await executeRoutedTask<ContentGenerationModelInput, unknown>({
    task: "generate-content",
    input: {
      task: "generate-content",
      site: before,
      contract,
      facts: input.facts,
      rules: baseRules(),
    },
    profiles: input.profiles,
    executors: input.executors,
  });

  let materialized = materializeCandidate(before, routed.output, input.facts);
  let quality = qualityPass(materialized.site);
  let qualityRewriteApplied = false;

  if (!quality.passes) {
    const executor = input.executors.get(routed.model.id);
    if (!executor) throw new Error(`No executor is registered for model ${routed.model.id}.`);

    const repairedOutput = await executor.run({
      task: "generate-content",
      site: materialized.site,
      contract,
      facts: input.facts,
      rules: qualityRepairRules(quality.contentQuality),
    }) as unknown;

    materialized = materializeCandidate(before, repairedOutput, input.facts);
    quality = qualityPass(materialized.site);
    qualityRewriteApplied = true;
  }

  if (!quality.passes) {
    const summary = quality.contentErrors.length
      ? quality.contentErrors.slice(0, 3).map((issue) => `${issue.code}: ${issue.message}`).join(" | ")
      : quality.contentQuality.issues.slice(0, 3).map((issue) => `${issue.code}: ${issue.message}`).join(" | ") || `score ${quality.contentQuality.score}/${MIN_GENERATED_CONTENT_SCORE}`;
    throw new Error(`CONTENT_QUALITY_REJECTED_AFTER_REWRITE: ${summary}`);
  }

  return {
    site: materialized.site,
    model: routed.model,
    appliedFields: materialized.integrity.appliedFields,
    restoredChanges: materialized.integrity.restoredChanges,
    groundingIssues: materialized.grounded.issues,
    structureIntact: materialized.integrity.structureIntact,
    contentQuality: quality.contentQuality,
    qualityRewriteApplied,
  };
}
