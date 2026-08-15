import type { AssetGenerationRequest, AssetRecord, AssetIngestionPipeline } from "@micirql/assets";
import type { AiBudget, AiUsageScope, AiUsageStore } from "./usage";
import type { AiCostEstimator } from "./metered-executor";
import { executeMeteredTask } from "./metered-executor";
import type { ModelExecutorRegistry } from "./model-executor";
import type { ModelProfile } from "./model-routing";

export type GeneratedImageBinary = {
  bytes: Uint8Array;
  contentType: string;
  fileName: string;
  alt?: string;
  focalPoint?: { x: number; y: number };
  tags?: string[];
};

export type ImageGenerationInput = {
  prompt: string;
  purpose: string;
  preferredOrientation?: AssetGenerationRequest["slot"]["preferredOrientation"];
  preferredAspectRatio?: number;
  domain: string;
  subtype?: string;
  sectionFamily?: string;
};

export type GeneratedAssetResult = {
  request: AssetGenerationRequest;
  asset: AssetRecord;
  modelId: string;
  budgetWarning: boolean;
};

export async function generateAndIngestAsset(args: {
  request: AssetGenerationRequest;
  workspaceId: string;
  scope: AiUsageScope;
  profiles: readonly ModelProfile[];
  executors: ModelExecutorRegistry;
  usageStore: AiUsageStore;
  estimator: AiCostEstimator;
  ingestion: AssetIngestionPipeline;
  budget?: AiBudget;
  assetId?: () => string;
}): Promise<GeneratedAssetResult> {
  const generationInput: ImageGenerationInput = {
    prompt: buildPrompt(args.request),
    purpose: args.request.purpose,
    ...(args.request.slot.preferredOrientation ? { preferredOrientation: args.request.slot.preferredOrientation } : {}),
    ...(args.request.slot.preferredAspectRatio ? { preferredAspectRatio: args.request.slot.preferredAspectRatio } : {}),
    domain: args.request.domain,
    ...(args.request.subtype ? { subtype: args.request.subtype } : {}),
    ...(args.request.sectionFamily ? { sectionFamily: args.request.sectionFamily } : {}),
  };

  const generated = await executeMeteredTask<ImageGenerationInput, GeneratedImageBinary>({
    task: "generate-image",
    input: generationInput,
    scope: args.scope,
    profiles: args.profiles,
    executors: args.executors,
    usageStore: args.usageStore,
    estimator: args.estimator,
    ...(args.budget ? { budget: args.budget } : {}),
  });

  const id = args.assetId?.() ?? crypto.randomUUID();
  const ingested = await args.ingestion.ingest({
    id,
    source: "ai-generated",
    workspaceId: args.workspaceId,
    name: `${args.request.purpose}-${id}`,
    original: {
      bytes: generated.output.bytes,
      contentType: generated.output.contentType,
      fileName: generated.output.fileName,
    },
    license: "generated",
    sourceReference: `${generated.model.provider}:${generated.model.model}`,
  });

  if (!ingested.ok) throw new Error(`Generated image ingestion failed at ${ingested.stage}: ${ingested.reason}`);

  return {
    request: args.request,
    asset: ingested.asset,
    modelId: generated.model.id,
    budgetWarning: generated.budgetWarning,
  };
}

export async function generateAndIngestAssets(args: {
  requests: readonly AssetGenerationRequest[];
  workspaceId: string;
  scope: AiUsageScope;
  profiles: readonly ModelProfile[];
  executors: ModelExecutorRegistry;
  usageStore: AiUsageStore;
  estimator: AiCostEstimator;
  ingestion: AssetIngestionPipeline;
  budget?: AiBudget;
  assetId?: () => string;
}): Promise<GeneratedAssetResult[]> {
  const results: GeneratedAssetResult[] = [];
  for (const request of args.requests) {
    results.push(await generateAndIngestAsset({
      request,
      workspaceId: args.workspaceId,
      scope: args.scope,
      profiles: args.profiles,
      executors: args.executors,
      usageStore: args.usageStore,
      estimator: args.estimator,
      ingestion: args.ingestion,
      ...(args.budget ? { budget: args.budget } : {}),
      ...(args.assetId ? { assetId: args.assetId } : {}),
    }));
  }
  return results;
}

function buildPrompt(request: AssetGenerationRequest): string {
  return [
    `Create a production-ready website image for ${request.domain}.`,
    `Purpose: ${request.purpose}.`,
    request.sectionFamily ? `Section: ${request.sectionFamily}.` : "",
    request.subtype ? `Subtype: ${request.subtype}.` : "",
    request.slot.preferredOrientation ? `Orientation: ${request.slot.preferredOrientation}.` : "",
    request.slot.preferredAspectRatio ? `Preferred aspect ratio: ${request.slot.preferredAspectRatio}.` : "",
    "No text, logos, watermarks, fake awards, fabricated ratings, prices, credentials, availability, testimonials, medical outcomes, property inventory, or other unsupported business claims.",
    "Keep the subject crop-safe for responsive web use and leave useful negative space when appropriate.",
  ].filter(Boolean).join("\n");
}
