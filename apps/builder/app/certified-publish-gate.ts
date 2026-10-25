import type { Site } from "@micirql/schema";
import {
  resolveCertifiedIndustryPackRuntimeByCandidateId,
  resolveCertifiedIndustryPackRuntimeByCatalogVersion,
  resolveCertifiedIndustryPackRuntimeForSite,
} from "./industry-packs";
import { isRequiredPagePathForSite } from "./dental-content-hygiene";

export type CertifiedPublishGateFailureCode =
  | "PREMIUM_REPORT_REQUIRED"
  | "PREMIUM_GATE_FAILED"
  | "PREMIUM_GATE_STALE_OR_TAMPERED";

export type CertifiedPublishGateAssessment =
  | {
      ok: true;
      packId: string;
      packLabel: string;
      candidateId: string;
      candidateName: string;
      score: number;
    }
  | {
      ok: false;
      code: CertifiedPublishGateFailureCode;
      message: string;
    };

/**
 * Pure, shared half of the server publish policy. The editor uses this exact
 * assessment for draft readiness and the API turns a failure into its existing
 * 422 response. Infrastructure-only checks still run on the server at publish
 * time; passing this gate never means that anything has been published.
 */
export function assessCertifiedPublishGate(
  site: Site,
): CertifiedPublishGateAssessment {
  const report = site.generation?.premiumGate;
  if (!report) {
    return failure(
      "PREMIUM_REPORT_REQUIRED",
      "The exact saved revision does not contain a premium validation report.",
    );
  }
  if (!report.passed) {
    const diagnostics = report.issues
      .filter((issue) => issue.severity === "error")
      .map((issue) => issue.message)
      .slice(0, 3)
      .join(" ");
    return failure(
      "PREMIUM_GATE_FAILED",
      diagnostics ||
        "The exact saved revision has not passed the premium validation gate.",
    );
  }

  const generation = site.generation;
  const candidateIds = generation?.candidateIds ?? [];
  const selectedCandidateId = generation?.selectedCandidateId;
  const siteRuntime = resolveCertifiedIndustryPackRuntimeForSite({
    domain: site.domain,
    subtype: site.subtype ?? null,
  });
  const catalogRuntime = resolveCertifiedIndustryPackRuntimeByCatalogVersion(
    generation?.catalogVersion,
  );
  const candidateRuntime =
    resolveCertifiedIndustryPackRuntimeByCandidateId(selectedCandidateId);
  if (
    !siteRuntime ||
    catalogRuntime !== siteRuntime ||
    candidateRuntime !== siteRuntime ||
    !siteRuntime.resolveCandidate(selectedCandidateId)
  ) {
    return failure(
      "PREMIUM_GATE_STALE_OR_TAMPERED",
      "The saved site, catalog, and selected candidate do not resolve to one certified industry runtime.",
    );
  }

  const runtime = siteRuntime;
  const selectedCandidate = runtime.resolveCandidate(selectedCandidateId)!;
  const approvedCandidateIds = runtime
    .listCandidates()
    .map((candidate) => candidate.id);
  const approvedCandidateIdSet = new Set(approvedCandidateIds);
  const currentReport = runtime.validateDraft(
    site,
    runtime.candidateStructureIssues(site, selectedCandidateId),
  );
  const pagePaths = new Set(site.pages.map((page) => page.path));
  const actionIds = new Set(
    site.pages.flatMap((page) =>
      page.sections.flatMap((section) =>
        Object.values(section.bindings).map((binding) => binding.actionId),
      ),
    ),
  );
  const componentIssues = site.pages.flatMap((page) =>
    page.sections
      .filter(
        (section) =>
          !section.hidden &&
          !runtime.isCertifiedComponent(
            section.component.componentId,
            section.component.version,
          ),
      )
      .map(
        (section) =>
          `${page.path}:${section.component.componentId}@${section.component.version}`,
      ),
  );
  const candidateSetMatches =
    candidateIds.length === approvedCandidateIds.length &&
    new Set(candidateIds).size === approvedCandidateIds.length &&
    candidateIds.every((candidateId) =>
      approvedCandidateIdSet.has(candidateId),
    );
  const invariantIssues = [
    ...(site.domain === runtime.pack.domain
      ? []
      : [`domain must be ${runtime.pack.domain}`]),
    ...(runtime.pack.matchesSite({
      domain: site.domain,
      subtype: site.subtype ?? null,
    })
      ? []
      : [`subtype must match certified pack ${runtime.pack.id}`]),
    ...(generation?.packStatus === "certified"
      ? []
      : ["generation pack must be certified"]),
    ...(generation?.catalogVersion === runtime.pack.catalogVersion
      ? []
      : ["industry catalog version is stale or missing"]),
    ...(candidateSetMatches
      ? []
      : [
          `ranked candidate set must contain exactly the ${runtime.pack.reviewCount} unique candidates from the certified catalog`,
        ]),
    ...(selectedCandidateId &&
    candidateIds.includes(selectedCandidateId) &&
    runtime.resolveCandidate(selectedCandidateId)
      ? []
      : ["selected candidate is missing or unapproved"]),
    ...(currentReport.score >= 85 &&
    !currentReport.issues.some((issue) => issue.severity === "error")
      ? []
      : ["premium score or diagnostics do not satisfy the release threshold"]),
    ...(currentReport.passed && currentReport.score >= 85
      ? []
      : [
          `the exact saved snapshot no longer passes premium validation: ${
            currentReport.issues
              .filter((issue) => issue.severity === "error")
              .slice(0, 2)
              .map((issue) => issue.message)
              .join(" ") || "score is below 85"
          }`,
        ]),
    ...runtime.pack.requiredPagePaths
      .filter(
        (path) => !pagePaths.has(path) && isRequiredPagePathForSite(site, path),
      )
      .map((path) => `required page ${path} is missing`),
    ...runtime.pack.requiredActions
      .filter((actionId) => !actionIds.has(actionId))
      .map((actionId) => `required action ${actionId} is missing`),
    ...(componentIssues.length
      ? [`non-certified components: ${componentIssues.slice(0, 3).join(", ")}`]
      : []),
  ];
  if (invariantIssues.length) {
    return failure(
      "PREMIUM_GATE_STALE_OR_TAMPERED",
      invariantIssues.slice(0, 4).join(". "),
    );
  }

  return {
    ok: true,
    packId: runtime.pack.id,
    packLabel: runtime.pack.label,
    candidateId: selectedCandidate.id,
    candidateName: selectedCandidate.name,
    score: currentReport.score,
  };
}

function failure(
  code: CertifiedPublishGateFailureCode,
  message: string,
): CertifiedPublishGateAssessment {
  return { ok: false, code, message };
}
