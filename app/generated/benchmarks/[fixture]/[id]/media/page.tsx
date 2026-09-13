import { notFound } from "next/navigation";
import { generateMultiIndustryBenchmarkFixture } from "../../../../../../src/benchmarks/multi-industry";
import { planMedia } from "../../../../../../src/core/media/planner";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MultiIndustryMediaPlanPage({ params }: { params: Promise<{ fixture: string; id: string }> }) {
  const { fixture: fixtureId, id } = await params;
  const entry = generateMultiIndustryBenchmarkFixture(fixtureId, 4);
  if (!entry) notFound();

  const candidate = entry.candidates.find((item) => item.id === id);
  if (!candidate) notFound();

  const plan = planMedia({
    brief: entry.brief,
    knowledge: entry.knowledge,
    direction: candidate.direction,
    roles: ["hero", "services", "about"],
  });

  return (
    <main
      data-benchmark-fixture={fixtureId}
      data-candidate-id={candidate.id}
      data-media-industry={plan.industry}
      data-media-sub-industry={plan.subIndustry ?? ""}
      data-media-business-type={plan.businessType ?? ""}
      data-media-intent-count={plan.intents.length}
    >
      {plan.intents.map((intent) => (
        <section
          key={intent.role}
          data-media-role={intent.role}
          data-media-subject={intent.subject}
          data-media-source-intent={intent.sourceIntent}
          data-media-verification={intent.verification}
          data-media-fallback={intent.fallback}
          data-media-aspect={intent.desiredAspect}
        >
          <h1>{intent.role === "hero" ? `${entry.fixture.label} media plan` : undefined}</h1>
          <p>{intent.subject}</p>
          <p>{intent.visualGoal}</p>
        </section>
      ))}
    </main>
  );
}
