import { assetRecordSchema, type AssetOrientation, type AssetRecord, type AssetSource } from "./types";
import type { Domain, ThemeFamily } from "@micirql/schema";
import { auditPlaceholderCoverage, type CoverageAuditReport } from "./coverage";

export type AssetBinary = {
  bytes: Uint8Array;
  contentType: string;
  fileName: string;
};

export type ImageMetadata = {
  width: number;
  height: number;
  dominantTone?: string;
};

export type IngestionClassification = {
  domains: Domain[];
  subtypes?: string[];
  sectionFamilies?: string[];
  themes?: ThemeFamily[];
  tags?: string[];
  alt?: string;
  focalPoint?: { x: number; y: number };
};

export type VariantTarget = {
  format: "avif" | "webp" | "jpeg" | "png";
  maxWidth: number;
  quality?: number;
};

export type StoredVariant = {
  format: "avif" | "webp" | "jpeg" | "png";
  width: number;
  height: number;
  url: string;
  bytes?: number;
};

export type IngestionInput = {
  id: string;
  source: AssetSource;
  workspaceId?: string;
  name: string;
  original: AssetBinary;
  license: AssetRecord["license"];
  sourceReference?: string;
};

export type ProvenanceValidator = {
  validate(input: IngestionInput): Promise<{ ok: true } | { ok: false; reason: string }>;
};

export type ImageInspector = {
  inspect(binary: AssetBinary): Promise<ImageMetadata>;
};

export type AssetClassifier = {
  classify(args: { input: IngestionInput; metadata: ImageMetadata }): Promise<IngestionClassification>;
};

export type ImageOptimizer = {
  createVariants(args: {
    binary: AssetBinary;
    metadata: ImageMetadata;
    targets: VariantTarget[];
    focalPoint: { x: number; y: number };
  }): Promise<StoredVariant[]>;
};

export type AssetStorage = {
  putOriginal(args: { id: string; binary: AssetBinary }): Promise<string>;
};

export type AssetWriter = {
  insert(asset: AssetRecord): Promise<void>;
  listPlaceholders(): Promise<AssetRecord[]>;
};

export type IngestionResult =
  | { ok: true; asset: AssetRecord; coverage?: CoverageAuditReport }
  | { ok: false; stage: "provenance" | "inspection" | "classification" | "optimization" | "persistence"; reason: string };

export type AssetIngestionPipeline = {
  ingest(input: IngestionInput): Promise<IngestionResult>;
};

export function createAssetIngestionPipeline(deps: {
  provenance: ProvenanceValidator;
  inspector: ImageInspector;
  classifier: AssetClassifier;
  optimizer: ImageOptimizer;
  storage: AssetStorage;
  writer: AssetWriter;
  now?: () => Date;
  variantTargets?: VariantTarget[];
}): AssetIngestionPipeline {
  const now = deps.now ?? (() => new Date());
  const targets = deps.variantTargets ?? defaultVariantTargets();

  return {
    async ingest(input) {
      const provenance = await deps.provenance.validate(input);
      if (!provenance.ok) return { ok: false, stage: "provenance", reason: provenance.reason };

      let metadata: ImageMetadata;
      try {
        metadata = await deps.inspector.inspect(input.original);
        if (!Number.isFinite(metadata.width) || !Number.isFinite(metadata.height) || metadata.width <= 0 || metadata.height <= 0) {
          throw new Error("Invalid image dimensions.");
        }
      } catch (error) {
        return { ok: false, stage: "inspection", reason: message(error) };
      }

      let classification: IngestionClassification;
      try {
        classification = await deps.classifier.classify({ input, metadata });
      } catch (error) {
        return { ok: false, stage: "classification", reason: message(error) };
      }

      const focalPoint = classification.focalPoint ?? { x: 0.5, y: 0.5 };
      let variants: StoredVariant[];
      try {
        variants = await deps.optimizer.createVariants({ binary: input.original, metadata, targets, focalPoint });
      } catch (error) {
        return { ok: false, stage: "optimization", reason: message(error) };
      }

      try {
        const originalUrl = await deps.storage.putOriginal({ id: input.id, binary: input.original });
        const asset = assetRecordSchema.parse({
          id: input.id,
          ...(input.workspaceId ? { workspaceId: input.workspaceId } : {}),
          source: input.source,
          kind: "image",
          name: input.name,
          alt: classification.alt ?? "",
          width: metadata.width,
          height: metadata.height,
          orientation: orientationFor(metadata.width, metadata.height),
          aspectRatio: metadata.width / metadata.height,
          focalPoint,
          ...(metadata.dominantTone ? { dominantTone: metadata.dominantTone } : {}),
          domains: classification.domains,
          subtypes: classification.subtypes ?? [],
          sectionFamilies: classification.sectionFamilies ?? [],
          themes: classification.themes ?? [],
          tags: classification.tags ?? [],
          license: input.license,
          ...(input.sourceReference ? { sourceReference: input.sourceReference } : {}),
          originalUrl,
          variants,
          active: true,
          createdAt: now().toISOString(),
        });
        await deps.writer.insert(asset);

        if (asset.source === "micirql-placeholder") {
          const placeholders = await deps.writer.listPlaceholders();
          const coverageDomain = asset.domains[0];
          return coverageDomain
            ? { ok: true, asset, coverage: auditPlaceholderCoverage(coverageDomain, placeholders) }
            : { ok: true, asset };
        }
        return { ok: true, asset };
      } catch (error) {
        return { ok: false, stage: "persistence", reason: message(error) };
      }
    },
  };
}

export function defaultVariantTargets(): VariantTarget[] {
  return [
    { format: "avif", maxWidth: 480, quality: 60 },
    { format: "webp", maxWidth: 480, quality: 72 },
    { format: "avif", maxWidth: 960, quality: 62 },
    { format: "webp", maxWidth: 960, quality: 74 },
    { format: "avif", maxWidth: 1440, quality: 64 },
    { format: "webp", maxWidth: 1440, quality: 76 },
    { format: "avif", maxWidth: 1920, quality: 66 },
    { format: "webp", maxWidth: 1920, quality: 78 },
  ];
}

export function orientationFor(width: number, height: number): AssetOrientation {
  const ratio = width / height;
  if (Math.abs(ratio - 1) <= 0.08) return "square";
  if (ratio >= 2) return "panoramic";
  if (ratio > 1) return "landscape";
  return "portrait";
}

export function createStrictProvenanceValidator(): ProvenanceValidator {
  return {
    async validate(input) {
      if (input.source === "user-upload") {
        if (input.license !== "user-owned") return { ok: false, reason: "User uploads must be marked user-owned." };
        if (!input.workspaceId?.trim()) return { ok: false, reason: "User uploads require a workspace ID." };
      }
      if (input.source === "micirql-placeholder") {
        if (!["micirql-owned", "licensed"].includes(input.license)) {
          return { ok: false, reason: "MiCirql placeholders require MiCirql-owned or licensed provenance." };
        }
        if (input.workspaceId) return { ok: false, reason: "Global MiCirql placeholders must not be workspace-scoped." };
      }
      if (input.source === "ai-generated") {
        if (input.license !== "generated") return { ok: false, reason: "AI-generated assets must use the generated license type." };
        if (!input.workspaceId?.trim()) return { ok: false, reason: "AI-generated assets require a workspace ID." };
      }
      if (input.license === "licensed" && !input.sourceReference?.trim()) {
        return { ok: false, reason: "Licensed assets require a source reference." };
      }
      return { ok: true };
    },
  };
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown asset ingestion error.";
}
