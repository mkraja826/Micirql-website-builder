"use client";

import { getDomainPack } from "@micirql/domains";
import type { Site } from "@micirql/schema";
import { assessCertifiedPublishGate } from "./certified-publish-gate";
import { isRequiredPagePathForSite } from "./dental-content-hygiene";
import { resolveCertifiedIndustryPackRuntimeForSite } from "./industry-packs";

export type ReadinessStatus = "pass" | "block" | "review";

export type ReadinessCheck = {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
  blocking: boolean;
  status: ReadinessStatus;
};

export type PublishReadinessReport = {
  ready: boolean;
  checks: ReadinessCheck[];
  blockingCount: number;
  passedBlockingCount: number;
  blockerCount: number;
};

export function publishReadiness(site: Site): PublishReadinessReport {
  const pack = getDomainPack(site.domain);
  const industryRuntime = resolveCertifiedIndustryPackRuntimeForSite({
    domain: site.domain,
    subtype: site.subtype ?? null,
  });
  const paths = new Set(site.pages.map((page) => page.path));
  const actions = new Set(
    site.pages.flatMap((page) =>
      page.sections.flatMap((section) =>
        Object.values(section.bindings).map((binding) => binding.actionId),
      ),
    ),
  );
  const requiredPages = industryRuntime
    ? industryRuntime.pack
        .listPageBlueprints()
        .filter(
          (page) =>
            page.required && isRequiredPagePathForSite(site, page.path),
        )
        .map((page) => ({ slug: page.path, label: page.label }))
    : pack.defaultPages.filter(
        (page) =>
          page.required && isRequiredPagePathForSite(site, page.slug),
      );
  const missingPages = requiredPages.filter((page) => !paths.has(page.slug));
  const requiredActions =
    industryRuntime?.pack.requiredActions ?? pack.requiredActions;
  const missingActions = requiredActions.filter(
    (action) => !actions.has(action),
  );
  const seoProblems = site.pages.filter(
    (page) =>
      !page.seo.title.trim() ||
      !page.seo.description.trim() ||
      page.seo.title.length > 70 ||
      page.seo.description.length > 180,
  );
  const unresolvedAssets = site.pages
    .flatMap((page) => page.sections)
    .filter((section) => containsUnresolvedAsset(section.props));
  const primaryDomain =
    site.domains.find((domain) => domain.primary) ?? site.domains[0];
  const domainOk =
    !primaryDomain ||
    (primaryDomain.status === "active" && primaryDomain.sslStatus === "active");
  const visual = visualQualityScore(site);
  const consistency = contentConsistency(site);
  const certifiedGate = assessCertifiedPublishGate(site);

  const checks: ReadinessCheck[] = [
    blockingCheck(
      "certification",
      "Certified release gate",
      certifiedGate.ok,
      certifiedGate.ok
        ? `${certifiedGate.packLabel} · ${certifiedGate.candidateName} · ${certifiedGate.score}/100 quality gate.`
        : certifiedGate.message,
    ),
    blockingCheck(
      "pages",
      "Required pages",
      missingPages.length === 0,
      missingPages.length
        ? `Missing: ${missingPages.map((page) => page.label).join(", ")}`
        : "All required pages are present.",
    ),
    blockingCheck(
      "functions",
      "Required functionality",
      missingActions.length === 0,
      missingActions.length
        ? `Missing: ${missingActions.join(", ")}`
        : "Required conversion actions are bound.",
    ),
    blockingCheck(
      "seo",
      "SEO essentials",
      seoProblems.length === 0,
      seoProblems.length
        ? `${seoProblems.length} page${seoProblems.length === 1 ? "" : "s"} need a complete title and description within the supported length.`
        : "Every page has a complete title and description.",
    ),
    blockingCheck(
      "assets",
      "Draft asset references",
      unresolvedAssets.length === 0,
      unresolvedAssets.length
        ? `${unresolvedAssets.length} section${unresolvedAssets.length === 1 ? "" : "s"} still contain pending asset slots.`
        : "No pending asset slots remain. Production availability is checked again by the publish service.",
    ),
    {
      id: "domain",
      label: "Domain & SSL",
      ok: domainOk,
      detail: !primaryDomain
        ? "A generated MiCirql address will be used unless a custom domain is connected."
        : domainOk
          ? `${primaryDomain.hostname} is marked active with SSL.`
          : `${primaryDomain.hostname} is not fully active with SSL yet.`,
      blocking: Boolean(primaryDomain),
      status: domainOk ? "pass" : "block",
    },
    advisoryCheck(
      "visual",
      "Visual quality review",
      visual.score >= 85,
      `${visual.score}/100 · ${visual.detail}`,
    ),
    advisoryCheck(
      "consistency",
      "Content consistency review",
      consistency.ok,
      consistency.detail,
    ),
    {
      id: "production",
      label: "Final production validation",
      ok: false,
      detail:
        "Runs after Publish is requested: exact saved revision, asset availability, production rendering, domain activation and atomic version creation.",
      blocking: false,
      status: "review",
    },
  ];
  const blockingChecks = checks.filter((check) => check.blocking);
  const passedBlockingCount = blockingChecks.filter((check) => check.ok).length;
  const blockerCount = blockingChecks.length - passedBlockingCount;

  return {
    ready: blockerCount === 0,
    checks,
    blockingCount: blockingChecks.length,
    passedBlockingCount,
    blockerCount,
  };
}

export function PublishReadinessManager({ site }: { site: Site }) {
  const report = publishReadiness(site);
  return (
    <section
      className="publish-readiness"
      aria-labelledby="publish-readiness-title"
      data-publish-readiness={report.ready ? "draft-passed" : "blocked"}
    >
      <header className="readiness-heading">
        <span>Release check</span>
        <h3 id="publish-readiness-title">Publication readiness</h3>
        <p>
          Review what MiCirql can verify in this draft before requesting the
          final production checks.
        </p>
      </header>
      <div
        className={`readiness-summary ${report.ready ? "is-ready" : "is-blocked"}`}
        role="status"
        aria-live="polite"
      >
        <strong>
          {report.ready ? "Draft checks passed" : "Draft is not publishable"}
        </strong>
        <span>
          {report.ready
            ? `${report.passedBlockingCount} of ${report.blockingCount} required checks passed. Publishing has not started.`
            : `${report.blockerCount} blocking ${report.blockerCount === 1 ? "item" : "items"} must be fixed first.`}
        </span>
      </div>
      <ul className="readiness-list" aria-label="Publish readiness checklist">
        {report.checks.map((check) => (
          <li
            key={check.id}
            className={`readiness-row is-${check.status}`}
            data-readiness-check={check.id}
            data-readiness-status={check.status}
          >
            <span className="readiness-dot" aria-hidden="true" />
            <div>
              <strong>{check.label}</strong>
              <small>{check.detail}</small>
            </div>
            <b>{statusLabel(check.status)}</b>
          </li>
        ))}
      </ul>
      <p className="readiness-note">
        Passing this screen never publishes the website. The server must still
        validate the saved revision and create a live version successfully.
      </p>
    </section>
  );
}

export function visualQualityScore(site: Site): {
  score: number;
  detail: string;
} {
  const home = site.pages.find((page) => page.path === "/") ?? site.pages[0];
  if (!home) return { score: 0, detail: "No homepage is available." };

  const sections = home.sections.filter(
    (section) =>
      !section.hidden && !isSharedChrome(section.component.componentId),
  );
  let score = 100;
  const issues: string[] = [];
  const text = sections
    .map((section) =>
      Object.values(section.props)
        .filter((value) => typeof value === "string")
        .join(" "),
    )
    .join(" ")
    .toLowerCase();
  const headings = sections
    .map(
      (section) =>
        stringValue(section.props.heading) ?? stringValue(section.props.title),
    )
    .filter(Boolean) as string[];
  const ctaSections = sections.filter((section) => {
    const props = section.props;
    return Boolean(
      stringValue(props.ctaLabel) ||
      stringValue(props.primaryAction) ||
      Object.keys(section.bindings).length,
    );
  });

  if (sections.length < 4) {
    score -= 15;
    issues.push("add more content sections");
  }
  if (headings.length < Math.max(1, Math.ceil(sections.length * 0.7))) {
    score -= 10;
    issues.push("strengthen section headings");
  }
  if (!ctaSections.length) {
    score -= 15;
    issues.push("add a clear conversion action");
  }
  if (site.pages.length < 3) {
    score -= 8;
    issues.push("add supporting pages");
  }
  if (
    /generate leads|your business|a clear headline for your visitors|tell visitors what makes your business/.test(
      text,
    )
  ) {
    score -= 12;
    issues.push("replace generic starter copy");
  }
  if (
    new Set(headings.map((heading) => heading.toLowerCase())).size <
    headings.length
  ) {
    score -= 5;
    issues.push("remove repeated headings");
  }

  const finalScore = Math.max(0, Math.min(100, score));
  return {
    score: finalScore,
    detail: issues.length
      ? issues.slice(0, 2).join(" · ")
      : "Strong hierarchy, content density and conversion structure.",
  };
}

export function contentConsistency(site: Site): {
  ok: boolean;
  detail: string;
} {
  const headings = site.pages.flatMap(
    (page) =>
      page.sections
        .filter((section) => !isSharedChrome(section.component.componentId))
        .map(
          (section) =>
            stringValue(section.props.heading) ??
            stringValue(section.props.title),
        )
        .filter(Boolean) as string[],
  );
  const counts = new Map<string, number>();
  for (const heading of headings) {
    const key = heading.toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const duplicates = [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([heading]) => heading);
  return duplicates.length
    ? {
        ok: false,
        detail: `Repeated heading${duplicates.length === 1 ? "" : "s"}: ${duplicates.slice(0, 2).join(", ")}. Rename or remove duplicates.`,
      }
    : { ok: true, detail: "Section headings are distinct across the site." };
}

function blockingCheck(
  id: string,
  label: string,
  ok: boolean,
  detail: string,
): ReadinessCheck {
  return {
    id,
    label,
    ok,
    detail,
    blocking: true,
    status: ok ? "pass" : "block",
  };
}

function advisoryCheck(
  id: string,
  label: string,
  ok: boolean,
  detail: string,
): ReadinessCheck {
  return {
    id,
    label,
    ok,
    detail,
    blocking: false,
    status: ok ? "pass" : "review",
  };
}

function statusLabel(status: ReadinessStatus): string {
  if (status === "pass") return "Passed";
  if (status === "block") return "Blocked";
  return "Review";
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function isSharedChrome(componentId: string): boolean {
  const id = componentId.toLowerCase();
  return (
    id === "navbar.placeholder" ||
    id.startsWith("navbar.") ||
    id.includes("-nav-") ||
    id === "footer.placeholder" ||
    id.startsWith("footer.") ||
    id.includes("-ftr-")
  );
}

function containsUnresolvedAsset(value: unknown): boolean {
  if (!value) return false;
  if (Array.isArray(value)) return value.some(containsUnresolvedAsset);
  if (typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  if (
    "assetId" in record &&
    (!record.assetId || String(record.assetId).startsWith("pending-"))
  )
    return true;
  return Object.values(record).some(containsUnresolvedAsset);
}
