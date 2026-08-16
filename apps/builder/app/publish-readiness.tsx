"use client";

import { analyzeMissingInformation } from "@micirql/design-engine";
import { getDomainPack } from "@micirql/domains";
import type { Site } from "@micirql/schema";

export type ReadinessCheck = { id: string; label: string; ok: boolean; detail: string; blocking: boolean };

export function publishReadiness(site: Site): { ready: boolean; checks: ReadinessCheck[] } {
  const pack = getDomainPack(site.domain);
  const paths = new Set(site.pages.map((page) => page.path));
  const actions = new Set(site.pages.flatMap((page) => page.sections.flatMap((section) => Object.values(section.bindings).map((binding) => binding.actionId))));
  const requiredPages = pack.defaultPages.filter((page) => page.required);
  const missingPages = requiredPages.filter((page) => !paths.has(page.slug));
  const missingActions = pack.requiredActions.filter((action) => !actions.has(action));
  const seoProblems = site.pages.filter((page) => !page.seo.title.trim() || !page.seo.description.trim() || page.seo.title.length > 70 || page.seo.description.length > 180);
  const unresolvedAssets = site.pages.flatMap((page) => page.sections).filter((section) => containsUnresolvedAsset(section.props));
  const unapprovedComponents = site.pages.flatMap((page) => page.sections).filter((section) => section.component.componentId.includes("placeholder"));
  const primaryDomain = site.domains.find((domain) => domain.primary) ?? site.domains[0];
  const domainOk = !primaryDomain || (primaryDomain.status === "active" && primaryDomain.sslStatus === "active");

  const checks: ReadinessCheck[] = [
    { id: "pages", label: "Required pages", ok: missingPages.length === 0, detail: missingPages.length ? `Missing: ${missingPages.map((p) => p.label).join(", ")}` : "All required pages are present.", blocking: true },
    { id: "functions", label: "Required functionality", ok: missingActions.length === 0, detail: missingActions.length ? `Missing: ${missingActions.join(", ")}` : "Required actions are bound.", blocking: true },
    { id: "seo", label: "SEO completeness", ok: seoProblems.length === 0, detail: seoProblems.length ? `${seoProblems.length} page${seoProblems.length === 1 ? "" : "s"} need SEO fixes.` : "Page titles and descriptions are complete.", blocking: true },
    { id: "assets", label: "Resolved images", ok: unresolvedAssets.length === 0, detail: unresolvedAssets.length ? `${unresolvedAssets.length} section${unresolvedAssets.length === 1 ? "" : "s"} still contain unresolved asset slots.` : "All visual slots are resolved.", blocking: true },
    { id: "registry", label: "Registry approval", ok: unapprovedComponents.length === 0, detail: unapprovedComponents.length ? `${unapprovedComponents.length} preview/draft component${unapprovedComponents.length === 1 ? "" : "s"} still need promotion.` : "No preview placeholder components remain.", blocking: true },
    { id: "domain", label: "Domain & SSL", ok: domainOk, detail: !primaryDomain ? "MiCirql subdomain will be used until a custom domain is connected." : domainOk ? `${primaryDomain.hostname} is active with SSL.` : `${primaryDomain.hostname} is not fully active yet.`, blocking: Boolean(primaryDomain) },
    { id: "mobile", label: "Mobile-first structure", ok: true, detail: "Renderer uses the same responsive section system as production.", blocking: false },
    { id: "performance", label: "Performance protocol", ok: unapprovedComponents.length === 0, detail: unapprovedComponents.length ? "Final protocol/performance checks run after Registry promotion." : "Only publishable Registry components remain.", blocking: true },
  ];
  return { ready: checks.every((check) => !check.blocking || check.ok), checks };
}

export function PublishReadinessManager({ site }: { site: Site }) {
  const report = publishReadiness(site);
  const completion = analyzeMissingInformation(site);
  return <div className="publish-readiness">
    <div className={`readiness-summary ${report.ready ? "is-ready" : "is-blocked"}`}><strong>{report.ready ? "Ready to publish" : "Not ready to publish"}</strong><span>{report.ready ? "All blocking checks passed." : "Fix the blocking items below first."}</span></div>
    <div className="readiness-list">{report.checks.map((check) => <div key={check.id} className={`readiness-row ${check.ok ? "is-ok" : "is-fail"}`}><span className="readiness-dot" aria-hidden="true"/><div><strong>{check.label}</strong><small>{check.detail}</small></div>{check.blocking ? <b>{check.ok ? "Pass" : "Block"}</b> : <b>Info</b>}</div>)}</div>
    <section className="content-completion" aria-label="Website completion checklist">
      <div className="content-completion-heading"><div><span>Business details</span><strong>{completion.completion}% complete</strong></div><small>{completion.highPriority ? `${completion.highPriority} important item${completion.highPriority === 1 ? "" : "s"} still need attention.` : "No critical business details are missing."}</small></div>
      {completion.items.length ? <div className="content-completion-list">{completion.items.map((item) => <div key={item.id} className={`content-completion-row priority-${item.priority}`}><span aria-hidden="true">{item.priority === "high" ? "!" : item.priority === "recommended" ? "•" : "○"}</span><div><strong>{item.title}</strong><small>{item.detail}</small></div><b>{item.priority === "high" ? "Important" : item.priority === "recommended" ? "Recommended" : "Optional"}</b></div>)}</div> : <div className="content-completion-done"><strong>Business details look complete.</strong><small>You can still refine copy, media and proof later.</small></div>}
      <p className="content-completion-note">These items improve credibility and conversion but do not replace structural publish checks above.</p>
    </section>
  </div>;
}

function containsUnresolvedAsset(value: unknown): boolean {
  if (!value) return false;
  if (Array.isArray(value)) return value.some(containsUnresolvedAsset);
  if (typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  if ("assetId" in record && (!record.assetId || String(record.assetId).startsWith("pending-"))) return true;
  return Object.values(record).some(containsUnresolvedAsset);
}
