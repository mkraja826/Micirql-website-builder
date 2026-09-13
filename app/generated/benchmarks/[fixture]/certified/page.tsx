import { notFound } from "next/navigation";
import { generateMultiIndustryBenchmarkFixture } from "../../../../../src/benchmarks/multi-industry";
import { planCapabilitiesFromBrief } from "../../../../../src/core/capabilities/planner";
import { directContent } from "../../../../../src/core/content/director";
import { composePublishableDraft } from "../../../../../src/core/publish/planner";
import { materializeCertifiedWinner } from "../../../../../src/core/certification/selector";
import type { CandidateCertificationEvidence } from "../../../../../src/core/certification/schema";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CertifiedWinnerProbe({
  params,
}: {
  params: Promise<{ fixture: string }>;
}) {
  const { fixture: fixtureId } = await params;
  const entry = generateMultiIndustryBenchmarkFixture(fixtureId, 4);
  if (!entry) notFound();

  const drafts = await Promise.all(entry.candidates.map(async (candidate) => {
    const content = await directContent({
      brief: entry.brief,
      knowledge: entry.knowledge,
      artDirection: candidate.direction,
    });
    const capabilityPlan = planCapabilitiesFromBrief(entry.brief, candidate.direction);
    return composePublishableDraft({ candidate, content, capabilityPlan });
  }));

  const evidence: CandidateCertificationEvidence[] = entry.candidates.map((candidate, index) => ({
    candidateId: candidate.id,
    rank: index + 1,
    finalScore: Number((95 - index * 3.25).toFixed(2)),
    hardFailures: [],
    repairAccepted: true,
  }));

  const certified = materializeCertifiedWinner({
    sourceKey: `benchmark:${fixtureId}`,
    drafts,
    evidence,
  });

  return (
    <main
      data-benchmark-fixture={fixtureId}
      data-certified-winner={certified.winner.candidateId}
      data-certified-rank={certified.winner.rank}
      data-certified-score={certified.winner.finalScore}
      data-repair-accepted={String(certified.winner.certification.repairAccepted)}
      data-site-id={certified.site.siteId}
      data-site-candidate={certified.site.source.candidateId}
      data-site-fingerprint={certified.site.fingerprint}
      data-site-page-count={certified.site.snapshot.pages.length}
    >
      <h1>{entry.fixture.label} certified winner</h1>
      <p>{certified.winner.candidateId}</p>
      <p>{certified.site.siteId}</p>
    </main>
  );
}
