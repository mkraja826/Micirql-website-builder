import { notFound } from "next/navigation";
import { generateMultiIndustryBenchmarkFixture } from "../../../../../../src/benchmarks/multi-industry";
import { planCapabilitiesFromBrief } from "../../../../../../src/core/capabilities/planner";
import { directContent } from "../../../../../../src/core/content/director";
import { composePublishableDraft } from "../../../../../../src/core/publish/planner";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PublishableDraftProbe({
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
  const draft = composePublishableDraft({ candidate, content, capabilityPlan });

  return (
    <main
      data-benchmark-fixture={fixtureId}
      data-candidate-id={candidate.id}
      data-draft-readiness={draft.readiness}
      data-draft-page-count={draft.pages.length}
      data-draft-blocker-count={draft.blockers.length}
      data-draft-warning-count={draft.warnings.length}
      data-draft-capability-count={draft.capabilities.length}
      data-draft-active-capability-count={draft.capabilities.filter((item) => item.state === "active").length}
      data-draft-disabled-capability-count={draft.capabilities.filter((item) => item.state !== "active").length}
    >
      <h1>{entry.fixture.label} publishable draft</h1>
      {draft.pages.map((page) => (
        <section
          key={page.slug}
          data-draft-page={page.slug}
          data-draft-section-count={page.sectionOrder.length}
        >
          <h2>{page.title}</h2>
          <p>{page.sectionOrder.join(" → ")}</p>
        </section>
      ))}
      <section data-draft-capabilities>
        {draft.capabilities.map((item) => (
          <p key={item.id} data-draft-capability={item.id} data-draft-capability-state={item.state}>
            {item.label}: {item.state}
          </p>
        ))}
      </section>
      <aside data-draft-blockers>{draft.blockers.join(" | ")}</aside>
      <aside data-draft-warnings>{draft.warnings.join(" | ")}</aside>
    </main>
  );
}
