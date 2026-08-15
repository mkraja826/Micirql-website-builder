import type { Domain } from "@micirql/schema";
import type { AssetRecord } from "./types";
import { placeholderCatalogForDomain, type PlaceholderPurpose } from "./catalog";

export type CoverageItem = {
  domain: Domain;
  purpose: PlaceholderPurpose;
  orientation: AssetRecord["orientation"];
  aspectRatio: number;
  required: number;
  available: number;
  missing: number;
  coveragePercent: number;
  assetIds: string[];
};

export type AssetMetadataIssue = {
  assetId: string;
  code:
    | "NOT_PLACEHOLDER"
    | "MISSING_DOMAIN_TAG"
    | "MISSING_SECTION_FAMILY"
    | "INVALID_DIMENSIONS"
    | "ASPECT_RATIO_MISMATCH"
    | "MISSING_ALT"
    | "MISSING_OPTIMIZED_VARIANT"
    | "INVALID_LICENSE";
  message: string;
};

export type CoverageAuditReport = {
  domain: Domain;
  requiredTotal: number;
  availableTotal: number;
  missingTotal: number;
  coveragePercent: number;
  items: CoverageItem[];
  fillPriority: CoverageItem[];
  metadataIssues: AssetMetadataIssue[];
};

export function auditPlaceholderCoverage(domain: Domain, assets: readonly AssetRecord[]): CoverageAuditReport {
  const catalog = placeholderCatalogForDomain(domain);
  const activePlaceholders = assets.filter(
    (asset) => asset.active && asset.source === "micirql-placeholder" && asset.kind === "image" && asset.domains.includes(domain),
  );

  const items: CoverageItem[] = [];
  for (const requirement of catalog.requirements) {
    for (const variant of requirement.variants) {
      const matched = activePlaceholders.filter((asset) => {
        if (asset.orientation !== variant.orientation) return false;
        if (!requirement.sectionFamilies.some((family) => asset.sectionFamilies.includes(family))) return false;
        if (asset.width < variant.minWidth || asset.height < variant.minHeight) return false;
        return aspectRatioMatches(asset.aspectRatio, variant.aspectRatio);
      });

      const available = matched.length;
      const missing = Math.max(0, variant.minimumCount - available);
      items.push({
        domain,
        purpose: requirement.purpose,
        orientation: variant.orientation,
        aspectRatio: variant.aspectRatio,
        required: variant.minimumCount,
        available,
        missing,
        coveragePercent: percent(Math.min(available, variant.minimumCount), variant.minimumCount),
        assetIds: matched.map((asset) => asset.id),
      });
    }
  }

  const requiredTotal = items.reduce((sum, item) => sum + item.required, 0);
  const availableTotal = items.reduce((sum, item) => sum + Math.min(item.available, item.required), 0);
  const missingTotal = items.reduce((sum, item) => sum + item.missing, 0);

  return {
    domain,
    requiredTotal,
    availableTotal,
    missingTotal,
    coveragePercent: percent(availableTotal, requiredTotal),
    items,
    fillPriority: [...items]
      .filter((item) => item.missing > 0)
      .sort((a, b) => b.missing - a.missing || a.coveragePercent - b.coveragePercent),
    metadataIssues: auditPlaceholderMetadata(assets, domain),
  };
}

export function auditAllPlaceholderCoverage(assets: readonly AssetRecord[], domains: readonly Domain[]): CoverageAuditReport[] {
  return domains.map((domain) => auditPlaceholderCoverage(domain, assets));
}

export function auditPlaceholderMetadata(assets: readonly AssetRecord[], domain?: Domain): AssetMetadataIssue[] {
  const issues: AssetMetadataIssue[] = [];
  const candidates = assets.filter((asset) => asset.source === "micirql-placeholder" && (!domain || asset.domains.includes(domain)));

  for (const asset of candidates) {
    if (asset.source !== "micirql-placeholder") {
      issues.push({ assetId: asset.id, code: "NOT_PLACEHOLDER", message: "Catalog coverage only accepts MiCirql placeholder assets." });
    }
    if (asset.domains.length === 0) {
      issues.push({ assetId: asset.id, code: "MISSING_DOMAIN_TAG", message: "Placeholder must declare at least one compatible domain." });
    }
    if (asset.sectionFamilies.length === 0) {
      issues.push({ assetId: asset.id, code: "MISSING_SECTION_FAMILY", message: "Placeholder must declare at least one compatible section family." });
    }
    if (asset.width <= 0 || asset.height <= 0) {
      issues.push({ assetId: asset.id, code: "INVALID_DIMENSIONS", message: "Placeholder dimensions must be positive." });
    }
    const actualRatio = asset.width / asset.height;
    if (!aspectRatioMatches(actualRatio, asset.aspectRatio, 0.03)) {
      issues.push({ assetId: asset.id, code: "ASPECT_RATIO_MISMATCH", message: "Stored aspect ratio does not match image dimensions." });
    }
    if (!asset.alt.trim()) {
      issues.push({ assetId: asset.id, code: "MISSING_ALT", message: "Placeholder needs reusable descriptive alt text." });
    }
    if (!asset.variants.some((variant) => variant.format === "avif" || variant.format === "webp")) {
      issues.push({ assetId: asset.id, code: "MISSING_OPTIMIZED_VARIANT", message: "Placeholder needs at least one AVIF or WebP optimized variant." });
    }
    if (asset.license !== "micirql-owned" && asset.license !== "licensed") {
      issues.push({ assetId: asset.id, code: "INVALID_LICENSE", message: "Placeholder must be MiCirql-owned or explicitly licensed." });
    }
  }

  return issues;
}

function aspectRatioMatches(actual: number, expected: number, tolerance = 0.08): boolean {
  return Math.abs(actual - expected) <= tolerance;
}

function percent(value: number, total: number): number {
  if (total <= 0) return 100;
  return Math.round((value / total) * 10000) / 100;
}
