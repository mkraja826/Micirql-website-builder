import { notFound } from "next/navigation";
import { generateMultiIndustryBenchmarkFixture } from "../../../../../../src/benchmarks/multi-industry";
import { directContent } from "../../../../../../src/core/content/director";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MultiIndustryContentProbe({
  params,
}: {
  params: Promise<{ fixture: string; id: string }>;
}) {
  const { fixture: fixtureId, id } = await params;
  const entry = generateMultiIndustryBenchmarkFixture(fixtureId, 4);
  if (!entry) notFound();

  const candidate = entry.candidates.find((item) => item.id === id);
  if (!candidate) notFound();

  const content = await directContent({
    brief: entry.brief,
    knowledge: entry.knowledge,
    artDirection: candidate.direction,
  });
  const home = content.pages.find((page) => page.slug === "home") ?? content.pages[0];
  if (!home) notFound();

  const primaryAction = entry.knowledge.conversionActions.find(Boolean) ?? "contact";

  return (
    <main
      data-benchmark-fixture={fixtureId}
      data-candidate-id={candidate.id}
      data-content-page-count={content.pages.length}
      data-content-section-count={home.sections.length}
      data-content-warning-count={content.warnings.length}
      data-content-primary-action={primaryAction}
      data-content-industry={entry.knowledge.industry.slug}
      data-content-sub-industry={entry.knowledge.subIndustry?.slug ?? ""}
    >
      <h1>{content.seo.title}</h1>
      <p data-content-seo-description>{content.seo.description}</p>
      {home.sections.map((section, index) => (
        <section
          key={`${section.sectionType}-${index}`}
          data-content-section={section.sectionType}
          data-content-claim-count={section.claims.length}
        >
          {section.eyebrow ? <p>{section.eyebrow}</p> : null}
          <h2>{section.headline}</h2>
          {section.body ? <p>{section.body}</p> : null}
          {section.items?.map((item, itemIndex) => (
            <article key={`${item.title}-${itemIndex}`}>
              <h3>{item.title}</h3>
              {item.body ? <p>{item.body}</p> : null}
            </article>
          ))}
          {section.primaryCta ? (
            <p data-content-primary-cta={section.primaryCta.action}>{section.primaryCta.label}</p>
          ) : null}
        </section>
      ))}
      {content.faq?.map((item, index) => (
        <section key={`faq-${index}`} data-content-faq data-content-claim-count={item.claims.length}>
          <h2>{item.question}</h2>
          <p>{item.answer}</p>
        </section>
      ))}
      <aside data-content-warnings>{content.warnings.join(" | ")}</aside>
    </main>
  );
}
