"use client";

import { analyzeMissingInformation, type MissingInformationItem } from "@micirql/design-engine";
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
    { id: "functions", label: "Required functionality", ok: missingActions.length === 0, detail: missingActions.length ? `Missing: ${missingActions.join(", ")}` : "Required actions are connected.", blocking: true },
    { id: "seo", label: "SEO", ok: seoProblems.length === 0, detail: seoProblems.length ? `${seoProblems.length} page${seoProblems.length === 1 ? "" : "s"} need title or description fixes.` : "Titles and descriptions are ready.", blocking: true },
    { id: "assets", label: "Images", ok: unresolvedAssets.length === 0, detail: unresolvedAssets.length ? `${unresolvedAssets.length} section${unresolvedAssets.length === 1 ? "" : "s"} still need final images.` : "All visual slots are resolved.", blocking: true },
    { id: "registry", label: "Approved sections", ok: unapprovedComponents.length === 0, detail: unapprovedComponents.length ? `${unapprovedComponents.length} draft section${unapprovedComponents.length === 1 ? "" : "s"} still need final promotion.` : "All sections are publishable.", blocking: true },
    { id: "domain", label: "Domain & SSL", ok: domainOk, detail: !primaryDomain ? "A MiCirql subdomain will be used until you connect a custom domain." : domainOk ? `${primaryDomain.hostname} is active and secured with SSL.` : `${primaryDomain.hostname} is still being connected or secured.`, blocking: Boolean(primaryDomain) },
    { id: "mobile", label: "Mobile layout", ok: true, detail: "Responsive rendering uses the same production section system.", blocking: false },
    { id: "performance", label: "Performance", ok: unapprovedComponents.length === 0, detail: unapprovedComponents.length ? "Final performance checks complete after draft sections are promoted." : "Only publishable Registry components remain.", blocking: true },
  ];
  return { ready: checks.every((check) => !check.blocking || check.ok), checks };
}

export function PublishReadinessManager({ site }: { site: Site }) {
  const report = publishReadiness(site);
  const completion = analyzeMissingInformation(site);
  const blockers = report.checks.filter((check) => check.blocking && !check.ok);
  const passed = report.checks.filter((check) => check.ok);
  const info = report.checks.filter((check) => !check.blocking && !check.ok);
  const primaryDomain = site.domains.find((domain) => domain.primary) ?? site.domains[0];

  return <div className="publish-readiness launch-readiness">
    <section className={`launch-summary ${report.ready ? "is-ready" : "is-blocked"}`}>
      <div className="launch-summary-copy"><span>{report.ready ? "Launch ready" : `${blockers.length} launch blocker${blockers.length === 1 ? "" : "s"}`}</span><strong>{report.ready ? "Your website is ready to go live." : "Finish these items before publishing."}</strong><small>{report.ready ? "Your required pages, actions, SEO, media and publishing checks have passed." : "MiCirql will keep Publish disabled until every blocking item is resolved."}</small></div>
      <div className="launch-score"><strong>{passed.length}/{report.checks.length}</strong><span>checks passed</span></div>
    </section>

    <section className="launch-domain-card">
      <div><span>Where your site will go live</span><strong>{primaryDomain?.hostname ?? `${site.domain}.micirql.site`}</strong><small>{primaryDomain ? (primaryDomain.status === "active" && primaryDomain.sslStatus === "active" ? "Custom domain connected · SSL active" : "Custom domain setup still in progress") : "MiCirql subdomain ready · connect a custom domain anytime"}</small></div>
      <b className={primaryDomain && (primaryDomain.status !== "active" || primaryDomain.sslStatus !== "active") ? "is-waiting" : "is-live"}>{primaryDomain && (primaryDomain.status !== "active" || primaryDomain.sslStatus !== "active") ? "Pending" : "Ready"}</b>
    </section>

    {blockers.length ? <section className="launch-blockers"><div className="launch-section-heading"><span>Fix before launch</span><strong>{blockers.length} item{blockers.length === 1 ? "" : "s"}</strong></div><div className="readiness-list">{blockers.map((check) => <div key={check.id} className="readiness-row is-fail"><span className="readiness-dot" aria-hidden="true"/><div><strong>{check.label}</strong><small>{check.detail}</small></div><b>Required</b></div>)}</div></section> : null}

    <section className="launch-passed"><div className="launch-section-heading"><span>Launch checks</span><strong>{passed.length} passed</strong></div><div className="readiness-list">{passed.map((check) => <div key={check.id} className="readiness-row is-ok"><span className="readiness-dot" aria-hidden="true"/><div><strong>{check.label}</strong><small>{check.detail}</small></div><b>{check.blocking ? "Ready" : "Checked"}</b></div>)}{info.map((check) => <div key={check.id} className="readiness-row"><span className="readiness-dot" aria-hidden="true"/><div><strong>{check.label}</strong><small>{check.detail}</small></div><b>Info</b></div>)}</div></section>

    <section className="content-completion" aria-label="Website completion checklist">
      <div className="content-completion-heading"><div><span>Recommended improvements</span><strong>{completion.completion}% business details complete</strong></div><small>{completion.highPriority ? `${completion.highPriority} important item${completion.highPriority === 1 ? "" : "s"} still need attention.` : "No critical business details are missing."}</small></div>
      {completion.items.length ? <div className="content-completion-list">{completion.items.map((item) => <button type="button" key={item.id} className={`content-completion-row priority-${item.priority}`} onClick={() => openCompletionItem(site, item)}><span aria-hidden="true">{item.priority === "high" ? "!" : item.priority === "recommended" ? "•" : "○"}</span><div><strong>{item.title}</strong><small>{item.detail}</small></div><span className="content-completion-action"><b>{item.priority === "high" ? "Important" : item.priority === "recommended" ? "Recommended" : "Optional"}</b><em>{actionLabel(item.action)} →</em></span></button>)}</div> : <div className="content-completion-done"><strong>Business details look complete.</strong><small>You can still refine copy, media and proof later.</small></div>}
      <p className="content-completion-note">Recommendations improve the website but do not block publishing unless they also appear above under “Fix before launch”.</p>
    </section>
  </div>;
}

function openCompletionItem(site: Site, item: MissingInformationItem) {
  const page = item.pageId ? site.pages.find((candidate) => candidate.id === item.pageId) : undefined;
  if (page) {
    const pageButton = [...document.querySelectorAll<HTMLButtonElement>(".page-switcher button")].find((button) => button.textContent?.trim() === page.name);
    pageButton?.click();
  }

  const openPanel = () => {
    const label = item.action === "images" ? "Media" : item.action === "functions" ? "Functions" : item.action === "pages" ? "Pages" : "Content";
    const buttons = [...document.querySelectorAll<HTMLButtonElement>(".workspace-rail button, .mobile-editor-bar button")];
    const button = buttons.find((candidate) => candidate.textContent?.toLowerCase().includes(label.toLowerCase()));
    button?.click();
  };

  if (!item.sectionId) { window.setTimeout(openPanel, 0); return; }
  const selector = `[data-mi-section-id="${CSS.escape(item.sectionId)}"]`;
  const selectTarget = () => {
    const target = document.querySelector<HTMLElement>(selector);
    if (!target) return false;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.click();
    window.setTimeout(openPanel, 0);
    return true;
  };
  if (selectTarget()) return;

  const canvas = document.querySelector(".canvas-stage") ?? document.body;
  const observer = new MutationObserver(() => { if (selectTarget()) observer.disconnect(); });
  observer.observe(canvas, { childList: true, subtree: true });
  window.setTimeout(() => { observer.disconnect(); if (!selectTarget()) openPanel(); }, 1800);
}

function actionLabel(action: MissingInformationItem["action"]) {
  return action === "images" ? "Add media" : action === "functions" ? "Connect action" : action === "pages" ? "Manage pages" : "Edit details";
}

function containsUnresolvedAsset(value: unknown): boolean {
  if (!value) return false;
  if (Array.isArray(value)) return value.some(containsUnresolvedAsset);
  if (typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  if ("assetId" in record && (!record.assetId || String(record.assetId).startsWith("pending-"))) return true;
  return Object.values(record).some(containsUnresolvedAsset);
}
