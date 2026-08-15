import { siteSchema, type Site } from "@micirql/schema";
import { preparePage } from "@micirql/renderer";
import type {
  PublishDraft,
  PublishIssue,
  PublishResult,
  PublishingDependencies,
} from "./types";

export async function publishSite(
  dependencies: PublishingDependencies,
  draft: PublishDraft,
): Promise<PublishResult> {
  const parsed = siteSchema.safeParse(draft.site);
  if (!parsed.success) {
    return failure({ code: "INVALID_DRAFT", message: "The draft site failed schema validation." });
  }

  const site = parsed.data;
  if (site.pages.length === 0) {
    return failure({ code: "NO_PAGES", message: "A site must contain at least one page before publishing." });
  }

  const primaryOrigin = originForSite(site);
  const validationIssues: PublishIssue[] = [];

  for (const page of site.pages) {
    const prepared = await preparePage({
      site,
      path: page.path,
      origin: primaryOrigin,
      registry: dependencies.registry,
      functions: dependencies.functions,
      mode: "production",
    });

    if (!prepared.ok) {
      validationIssues.push({
        code: "PAGE_VALIDATION_FAILED",
        message: prepared.issues.map((issue) => issue.message).join(" "),
        pagePath: page.path,
      });
    }
  }

  if (validationIssues.length > 0) return { ok: false, issues: validationIssues };

  if (dependencies.domains) {
    const activation = await dependencies.domains.activate(site);
    if (!activation.ok) {
      return failure({
        code: "DOMAIN_ACTIVATION_FAILED",
        message: activation.reason,
      });
    }
  }

  const frozenSnapshot = immutableSnapshot(site);
  const snapshotHash = await dependencies.hasher.hash(frozenSnapshot);
  const version = await dependencies.store.publishAtomically({
    versionId: dependencies.versionIds.create(site.siteId),
    siteId: site.siteId,
    snapshot: frozenSnapshot,
    snapshotHash,
    createdBy: draft.createdBy,
  });

  await dependencies.cache?.invalidateSite(site.siteId);
  return { ok: true, version };
}

export async function rollbackSite(
  dependencies: PublishingDependencies,
  args: { siteId: string; targetVersionId: string },
): Promise<PublishResult> {
  const target = await dependencies.store.getVersion(args.siteId, args.targetVersionId);
  if (!target) {
    return failure({ code: "VERSION_NOT_FOUND", message: "The requested rollback version does not exist." });
  }

  if (target.status !== "archived" && target.status !== "published") {
    return failure({
      code: "VERSION_NOT_ROLLBACK_ELIGIBLE",
      message: "Only archived or currently published versions can be activated by rollback.",
    });
  }

  const primaryOrigin = originForSite(target.snapshot);
  const issues: PublishIssue[] = [];
  for (const page of target.snapshot.pages) {
    const prepared = await preparePage({
      site: target.snapshot,
      path: page.path,
      origin: primaryOrigin,
      registry: dependencies.registry,
      functions: dependencies.functions,
      mode: "production",
    });
    if (!prepared.ok) {
      issues.push({
        code: "PAGE_VALIDATION_FAILED",
        message: prepared.issues.map((issue) => issue.message).join(" "),
        pagePath: page.path,
      });
    }
  }
  if (issues.length > 0) return { ok: false, issues };

  if (dependencies.domains) {
    const activation = await dependencies.domains.activate(target.snapshot);
    if (!activation.ok) {
      return failure({ code: "DOMAIN_ACTIVATION_FAILED", message: activation.reason });
    }
  }

  const version = await dependencies.store.rollbackAtomically({
    siteId: args.siteId,
    targetVersionId: target.versionId,
  });

  await dependencies.cache?.invalidateSite(args.siteId);
  return { ok: true, version };
}

function immutableSnapshot(site: Site): Site {
  return structuredClone(site);
}

function originForSite(site: Site): string {
  const primary = site.domains.find((domain) => domain.primary && domain.status === "active" && domain.sslStatus === "active")
    ?? site.domains.find((domain) => domain.status === "active" && domain.sslStatus === "active");
  return primary ? `https://${primary.hostname}` : `https://${site.siteId}.micirql.com`;
}

function failure(issue: PublishIssue): PublishResult {
  return { ok: false, issues: [issue] };
}
