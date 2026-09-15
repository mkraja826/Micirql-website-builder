import { notFound } from "next/navigation";
import { generateMultiIndustryBenchmarkFixture } from "../../../../../../src/benchmarks/multi-industry";
import { resolveMultiIndustryBenchmarkMedia } from "../../../../../../src/benchmarks/multi-industry-media";
import { planCapabilitiesFromBrief } from "../../../../../../src/core/capabilities/planner";
import { directContent } from "../../../../../../src/core/content/director";
import type { MediaRole } from "../../../../../../src/core/media/planner";
import { materializeSiteDraft, serializeMaterializedSite, hydrateMaterializedSite } from "../../../../../../src/core/materialization/materializer";
import { toPublishableMediaAssets } from "../../../../../../src/core/publish/media";
import { composePublishableDraft } from "../../../../../../src/core/publish/planner";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MaterializedSiteProbe({
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
  const capabilityPlan = planCapabilitiesFromBrief(entry.brief, candidate.direction);

  const selectedSections = candidate.selectedSections;
  const requestedMediaRoles = [
    selectedSections.hero === "hero-editorial-split" || selectedSections.hero === "hero-cinematic-fullscreen" ? "hero" : null,
    selectedSections.services === "services-visual-stories" ? "services" : null,
    selectedSections.about === "about-editorial-story" ? "about" : null,
    selectedSections.gallery ? "gallery" : null,
  ].filter((role): role is MediaRole => Boolean(role));

  const resolvedMedia = requestedMediaRoles.length
    ? await resolveMultiIndustryBenchmarkMedia({
        brief: entry.brief,
        knowledge: entry.knowledge,
        direction: candidate.direction,
        roles: requestedMediaRoles,
      })
    : {};
  const media = toPublishableMediaAssets({ pageSlug: content.pages[0]?.slug ?? "home", resolved: resolvedMedia });
  const draft = composePublishableDraft({ candidate, content, capabilityPlan, media });
  const materialized = materializeSiteDraft({ sourceKey: fixtureId, draft });
  const serialized = serializeMaterializedSite(materialized);
  const hydrated = hydrateMaterializedSite(serialized);
  const contentSectionCount = hydrated.snapshot.content.pages.reduce((total, page) => total + page.sections.length, 0);

  return (
    <main
      data-benchmark-fixture={fixtureId}
      data-candidate-id={candidate.id}
      data-site-id={hydrated.siteId}
      data-site-revision={hydrated.revision}
      data-site-status={hydrated.status}
      data-site-fingerprint={hydrated.fingerprint}
      data-site-source-key={hydrated.source.sourceKey}
      data-site-source-candidate={hydrated.source.candidateId}
      data-site-page-count={hydrated.snapshot.pages.length}
      data-site-content-page-count={hydrated.snapshot.content.pages.length}
      data-site-content-section-count={contentSectionCount}
      data-site-seo-title={hydrated.snapshot.content.seo.title}
      data-site-capability-count={hydrated.snapshot.capabilities.length}
      data-site-media-count={hydrated.snapshot.media.length}
    >
      <h1>{entry.fixture.label} materialized site draft</h1>
      {hydrated.snapshot.pages.map((page) => {
        const contentPage = hydrated.snapshot.content.pages.find((item) => item.slug === page.slug);
        return (
          <section
            key={page.slug}
            data-site-page={page.slug}
            data-site-section-count={page.sectionOrder.length}
            data-site-content-section-count={contentPage?.sections.length ?? 0}
          >
            <h2>{page.title}</h2>
            <p>{page.sectionOrder.join(" → ")}</p>
          </section>
        );
      })}
    </main>
  );
}
