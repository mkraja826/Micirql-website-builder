"use client";

import { getDomainPack } from "@micirql/domains";
import type { Site, SitePage } from "@micirql/schema";
import { duplicatePage, missingPageSuggestions, requiredPageIssues } from "@micirql/workspace";

export function PagesManager({ site, activePageId, onSelect, onAdd, onRemove, onDuplicate, onPathChange }: {
  site: Site;
  activePageId: string;
  onSelect(pageId: string): void;
  onAdd(page: SitePage): void;
  onRemove(pageId: string): void;
  onDuplicate(page: SitePage): void;
  onPathChange(pageId: string, path: string): void;
}) {
  const pack = getDomainPack(site.domain);
  const suggestions = missingPageSuggestions(site, pack.defaultPages);
  const blockers = requiredPageIssues(site, pack.defaultPages);

  return <div className="pages-manager">
    {blockers.length ? <div className="page-required-warning"><strong>{blockers.length} required page{blockers.length === 1 ? "" : "s"} missing</strong><span>These must be added before publishing.</span></div> : null}

    <div className="page-list">
      {site.pages.map((page) => <div key={page.id} className={`page-row ${page.id === activePageId ? "is-active" : ""}`}>
        <button className="page-main" onClick={() => onSelect(page.id)}><strong>{page.name}</strong><span>{page.path}</span></button>
        <input aria-label={`${page.name} URL`} value={page.path} onChange={(event) => onPathChange(page.id, normalizePath(event.target.value))} />
        <div className="page-row-actions"><button onClick={() => onDuplicate(duplicatePage(page, site.pages))}>Duplicate</button><button disabled={site.pages.length <= 1 || page.path === "/"} onClick={() => onRemove(page.id)}>Remove</button></div>
      </div>)}
    </div>

    {suggestions.length ? <section className="page-suggestions"><div><strong>Suggested pages</strong><span>Based on the website type and SEO structure.</span></div>{suggestions.map(({ blueprint, required, reason }) => <button key={blueprint.slug} onClick={() => onAdd(pageFromBlueprint(blueprint))}><span><strong>{blueprint.label}{required ? " · Required" : ""}</strong><small>{reason}</small></span><b>Add</b></button>)}</section> : <p className="pages-complete">Your domain page blueprint is covered.</p>}
  </div>;
}

function pageFromBlueprint(blueprint: ReturnType<typeof getDomainPack>["defaultPages"][number]): SitePage {
  const id = `${slugPart(blueprint.slug || blueprint.label)}-${crypto.randomUUID().slice(0, 8)}`;
  return {
    id,
    path: blueprint.slug,
    name: blueprint.label,
    sections: [],
    seo: {
      title: blueprint.label,
      description: blueprint.purpose.slice(0, 160),
      canonicalPath: blueprint.slug,
      indexable: true,
      structuredDataTypes: [],
    },
  };
}

function normalizePath(value: string) {
  const trimmed = value.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9/_-]/g, "");
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function slugPart(value: string) {
  return value.replace(/^\/+/, "").replace(/[^a-zA-Z0-9_-]/g, "-") || "page";
}
