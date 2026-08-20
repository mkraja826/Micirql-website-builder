import type { Site, SitePage } from "@micirql/schema";
import type { RenderedSeo } from "./types";

export function buildRenderedSeo(site: Site, page: SitePage, origin: string): RenderedSeo {
  const canonicalOrigin = normalizeOrigin(origin);
  const canonical = new URL(page.seo.canonicalPath, `${canonicalOrigin}/`).toString();
  const structuredData: Record<string, unknown>[] = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: site.name,
      url: canonicalOrigin,
    },
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: page.seo.title,
      description: page.seo.description,
      url: canonical,
      isPartOf: { "@type": "WebSite", name: site.name, url: canonicalOrigin },
    },
  ];

  for (const requestedType of page.seo.structuredDataTypes) {
    const safe = safeStructuredData(requestedType, site, canonicalOrigin);
    if (safe) structuredData.push(safe);
  }

  const breadcrumbs = visibleBreadcrumbStructuredData(page, canonicalOrigin);
  if (breadcrumbs) structuredData.push(breadcrumbs);

  const faqPage = visibleFaqStructuredData(page);
  if (faqPage) structuredData.push(faqPage);

  return {
    title: page.seo.title,
    description: page.seo.description,
    canonical,
    robots: page.seo.indexable ? "index,follow" : "noindex,nofollow",
    structuredData: dedupeStructuredData(structuredData),
  };
}

function safeStructuredData(type: string, site: Site, origin: string): Record<string, unknown> | undefined {
  if (type === "Organization") {
    return { "@context": "https://schema.org", "@type": "Organization", name: site.name, url: origin };
  }
  // BreadcrumbList is derived only from the same visible hero breadcrumbs that
  // users see. Never emit a requested breadcrumb schema with invented items.
  if (type === "BreadcrumbList") return undefined;
  return undefined;
}

function visibleBreadcrumbStructuredData(page: SitePage, origin: string): Record<string, unknown> | undefined {
  const hero = page.sections.find((section) => !section.hidden && isHeroComponent(section.component.componentId));
  const raw = Array.isArray(hero?.props.breadcrumbs) ? hero?.props.breadcrumbs : [];
  const visible = raw
    .map((item) => item && typeof item === "object" && !Array.isArray(item) ? item as Record<string, unknown> : undefined)
    .map((item) => ({ label: text(item?.label), href: text(item?.href) }))
    .filter((item) => item.label);
  if (visible.length < 2) return undefined;

  const itemListElement = visible.map((item, index) => {
    const href = item.href || (index === visible.length - 1 ? page.path : "");
    return {
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      ...(safeUrl(href, origin) ? { item: safeUrl(href, origin) } : {}),
    };
  });
  if (itemListElement.some((item) => !item.item)) return undefined;
  return { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement };
}

function visibleFaqStructuredData(page: SitePage): Record<string, unknown> | undefined {
  const mainEntity: Record<string, unknown>[] = [];

  for (const section of page.sections) {
    if (section.hidden || !isFaqComponent(section.component.componentId)) continue;
    // StructuralFaq collapses repeated questions within one accordion, but two
    // separate visible FAQ sections remain separate visible content. Mirror that
    // exact boundary here instead of deduplicating across the whole page.
    const seenQuestions = new Set<string>();
    const items = Array.isArray(section.props.items) ? section.props.items : [];
    for (const item of items) {
      if (!item || typeof item !== "object" || Array.isArray(item)) continue;
      const record = item as Record<string, unknown>;
      const question = text(record.title);
      const answer = text(record.description);
      if (!question || !answer || seenQuestions.has(question)) continue;
      seenQuestions.add(question);
      mainEntity.push({
        "@type": "Question",
        name: question,
        acceptedAnswer: { "@type": "Answer", text: answer },
      });
    }
  }

  if (!mainEntity.length) return undefined;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity,
  };
}

function isHeroComponent(componentId: string): boolean {
  const value = componentId.toLowerCase();
  return value === "hero.placeholder" || value.startsWith("hero.") || value.includes("-hero-");
}

function isFaqComponent(componentId: string): boolean {
  const value = componentId.toLowerCase();
  return value === "faq.placeholder" || value.startsWith("faq.") || value.includes("-faq-");
}

function safeUrl(value: string, origin: string): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value, `${origin}/`);
    if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function dedupeStructuredData(items: Record<string, unknown>[]): Record<string, unknown>[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = JSON.stringify([item["@type"], item.url ?? ""]);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeOrigin(origin: string): string {
  const url = new URL(origin);
  return `${url.protocol}//${url.host}`;
}
