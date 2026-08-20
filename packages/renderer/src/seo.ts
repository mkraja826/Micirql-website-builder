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
  if (type === "BreadcrumbList") {
    return undefined;
  }
  return undefined;
}

function visibleFaqStructuredData(page: SitePage): Record<string, unknown> | undefined {
  const mainEntity: Record<string, unknown>[] = [];
  const seenQuestions = new Set<string>();

  for (const section of page.sections) {
    if (section.hidden || !isFaqComponent(section.component.componentId)) continue;
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

function isFaqComponent(componentId: string): boolean {
  const value = componentId.toLowerCase();
  return value === "faq.placeholder" || value.startsWith("faq.") || value.includes("-faq-");
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
