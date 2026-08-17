import { siteSchema, type Site } from "@micirql/schema";
import {
  buildContentEnrichmentContract,
  enforceContentEnrichmentIntegrity,
  groundSiteContent,
  type GroundingFacts,
} from "@micirql/design-engine";
import { executeRoutedTask, type ModelExecutorRegistry } from "./model-executor";
import type { ModelProfile } from "./model-routing";

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
};

/**
 * Runs content generation through the MiCirql safety boundary.
 * The model receives the full site only so it can return a schema-valid candidate;
 * design/runtime fields remain immutable because the integrity layer copies back
 * only fields explicitly granted by the content contract.
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
      rules: [
        "Return one complete Site object matching the supplied schema shape.",
        "Change only SEO title/description and content fields explicitly listed as editable in the contract.",
        "Do not add, remove or reorder pages, sections, items, links, actions, bindings, media, components or integrations.",
        "Use only supplied business facts. Never invent people, credentials, testimonials, ratings, statistics, prices, guarantees, addresses, hours or awards.",
        "Keep copy concise enough for the limits and guidance in each contract entry.",
      ],
    },
    profiles: input.profiles,
    executors: input.executors,
  });

  const candidate = siteSchema.safeParse(routed.output);
  if (!candidate.success) {
    throw new Error(`Content model returned an invalid site snapshot: ${candidate.error.issues[0]?.message ?? "schema validation failed"}`);
  }

  const integrity = enforceContentEnrichmentIntegrity(before, candidate.data);
  const grounded = groundSiteContent(integrity.site, input.facts);
  const finalSite = siteSchema.parse(grounded.site);

  return {
    site: finalSite,
    model: routed.model,
    appliedFields: integrity.appliedFields,
    restoredChanges: integrity.restoredChanges,
    groundingIssues: grounded.issues,
    structureIntact: integrity.structureIntact,
  };
}
