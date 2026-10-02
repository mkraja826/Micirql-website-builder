"use client";

import { getDomainPack } from "@micirql/domains";
import type { Site, SitePage } from "@micirql/schema";
import { duplicatePage, missingPageSuggestions, requiredPageIssues } from "@micirql/workspace";
import type { ThemeFamily } from "@micirql/schema";
import type { SectionFamily } from "@micirql/sections";
import { createDefaultSection } from "./section-controls";

export function PagesManager({ site, activePageId, onSelect, onAdd, onPopulate, onRemove, onDuplicate, onPathChange, onReorder, themeFamily }: {
  site: Site;
  themeFamily: ThemeFamily;
  activePageId: string;
  onSelect(pageId: string): void;
  onAdd(page: SitePage): void;
  onPopulate(pageId: string, sections: SitePage["sections"]): void;
  onRemove(pageId: string): void;
  onDuplicate(page: SitePage): void;
  onPathChange(pageId: string, path: string): void;
  onReorder(pageId: string, toIndex: number): void;
}) {
  const pack = getDomainPack(site.domain);
  const suggestions = missingPageSuggestions(site, pack.defaultPages);
  const blockers = requiredPageIssues(site, pack.defaultPages);

  return <div className="pages-manager">
    {blockers.length ? <div className="page-required-warning"><strong>{blockers.length} required page{blockers.length === 1 ? "" : "s"} missing</strong><span>These must be added before publishing.</span></div> : null}

    <div className="page-list">
      {site.pages.map((page, index) => <div key={page.id} className={`page-row ${page.id === activePageId ? "is-active" : ""}`}>
        <button className="page-main" onClick={() => onSelect(page.id)}><strong>{page.name}</strong><span>{page.path}</span></button>
        <input aria-label={`${page.name} URL`} value={page.path} onChange={(event) => onPathChange(page.id, normalizePath(event.target.value))} />
        {!page.sections.length ? <button type="button" onClick={() => onPopulate(page.id, starterSections(blueprintForPage(page, pack.defaultPages), themeFamily, site))}>Add starter layout</button> : null}
        <div className="page-row-actions"><button disabled={index === 0} onClick={() => onReorder(page.id, index - 1)}>↑</button><button disabled={index === site.pages.length - 1} onClick={() => onReorder(page.id, index + 1)}>↓</button><button onClick={() => onDuplicate(duplicatePage(page, site.pages))}>Duplicate</button><button disabled={site.pages.length <= 1 || page.path === "/"} onClick={() => onRemove(page.id)}>Remove</button></div>
      </div>)}
    </div>

    {suggestions.length ? <section className="page-suggestions"><div><strong>Suggested pages</strong><span>Based on the website type and SEO structure.</span></div>{suggestions.map(({ blueprint, required, reason }) => <button key={blueprint.slug} onClick={() => onAdd(pageFromBlueprint(blueprint, themeFamily, site))}><span><strong>{blueprint.label}{required ? " · Required" : ""}</strong><small>{reason}</small></span><b>Add</b></button>)}</section> : <p className="pages-complete">Your domain page blueprint is covered.</p>}
  </div>;
}

function pageFromBlueprint(blueprint: ReturnType<typeof getDomainPack>["defaultPages"][number], theme: ThemeFamily, site: Site): SitePage {
  const id = `${slugPart(blueprint.slug || blueprint.label)}-${crypto.randomUUID().slice(0, 8)}`;
  return {
    id,
    path: blueprint.slug,
    name: blueprint.label,
    sections: starterSections(blueprint, theme, site),
    seo: {
      title: blueprint.label,
      description: blueprint.purpose.slice(0, 160),
      canonicalPath: blueprint.slug,
      indexable: true,
      structuredDataTypes: [],
    },
  };
}

function starterSections(blueprint: ReturnType<typeof getDomainPack>["defaultPages"][number], theme: ThemeFamily, site: Site): SitePage["sections"] {
  const sourceFamilies = blueprint.sectionFamilies.filter((family): family is SectionFamily => ["hero", "about", "services", "features", "process", "testimonials", "gallery", "team", "cta", "contact"].includes(family));
  const families: SectionFamily[] = ["navbar", ...new Set(sourceFamilies), "footer"];
  return families.map((family) => {
    const section = createDefaultSection(family, theme, []);
    if (family === "navbar") {
      section.props.title = site.name;
      section.props.items = site.navigation.map((item) => ({ title: item.label, href: item.href }));
    }
    if (family === "footer") {
      section.props.title = site.name;
      const footerLinks = [...site.navigation, { label: blueprint.label, href: blueprint.slug }]
        .filter((item, index, items) => items.findIndex((candidate) => candidate.href === item.href) === index)
        .map((item) => ({ label: item.label, href: item.href }));
      section.props.footerLinks = footerLinks;
      section.props.copyright = `© ${new Date().getFullYear()} ${site.name}. All rights reserved.`;
    }
    return section;
  });
}

function blueprintForPage(page: SitePage, blueprints: ReturnType<typeof getDomainPack>["defaultPages"][number][]): ReturnType<typeof getDomainPack>["defaultPages"][number] {
  return blueprints.find((blueprint) => blueprint.slug === page.path || blueprint.label === page.name) ?? {
    slug: page.path,
    label: page.name,
    required: false,
    purpose: `${page.name} information`,
    sectionFamilies: ["hero", "about"],
    seoIntent: "informational",
  };
}

function normalizePath(value: string) {
  const trimmed = value.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9/_-]/g, "");
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function slugPart(value: string) {
  return value.replace(/^\/+/, "").replace(/[^a-zA-Z0-9_-]/g, "-") || "page";
}