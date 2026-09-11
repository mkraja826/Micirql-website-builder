import type { CSSProperties } from "react";
import { createPearlDentalBrief, generatePearlDentalCandidates, PEARL_DENTAL_KNOWLEDGE } from "../../../../src/benchmarks/pearl";
import { rankCandidates } from "../../../../src/core/ranking/candidates";

const MAJOR_VISUAL_TYPES = ["hero", "services", "about", "cta"] as const;

function signature(sections: Record<string, string>) {
  return Object.entries(sections).sort(([a], [b]) => a.localeCompare(b)).map(([type, id]) => `${type}:${id}`).join("|");
}

function majorVisualDistance(a: Record<string, string>, b: Record<string, string>) {
  return MAJOR_VISUAL_TYPES.reduce((distance, type) => distance + (a[type] === b[type] ? 0 : 1), 0);
}

function assertCandidateDiversity(candidates: ReturnType<typeof generatePearlDentalCandidates>) {
  const signatures = candidates.map((candidate) => signature(candidate.selectedSections));
  if (new Set(signatures).size !== candidates.length) throw new Error("Pearl candidate composition collision detected");
  for (let left = 0; left < candidates.length; left += 1) {
    for (let right = left + 1; right < candidates.length; right += 1) {
      const distance = majorVisualDistance(candidates[left].selectedSections, candidates[right].selectedSections);
      if (distance < 2) throw new Error(`Pearl candidate visual-distance gate failed: ${candidates[left].id} and ${candidates[right].id} differ in only ${distance} major section(s)`);
    }
  }
}

export default function PearlCandidatesPage() {
  const candidates = generatePearlDentalCandidates(20);
  assertCandidateDiversity(candidates);
  const ranked = rankCandidates(candidates, createPearlDentalBrief(), PEARL_DENTAL_KNOWLEDGE);

  return (
    <main style={{ minHeight: "100vh", background: "#f3eee6", color: "#1c2422", padding: "48px 24px 80px", fontFamily: "Arial, Helvetica, sans-serif" }}>
      <div style={{ width: "min(1180px, 100%)", margin: "0 auto" }}>
        <p style={{ margin: 0, textTransform: "uppercase", letterSpacing: ".18em", fontSize: 11, fontWeight: 700, color: "#4b7770" }}>Phase 11 candidate ranking</p>
        <h1 style={{ margin: "14px 0 12px", maxWidth: 900, fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 400, fontSize: "clamp(42px, 7vw, 76px)", lineHeight: .96, letterSpacing: "-.045em" }}>Twenty viable directions, ranked with explainable criteria.</h1>
        <p style={{ maxWidth: 800, color: "#59645f", fontSize: 17, lineHeight: 1.7, marginBottom: 42 }}>Input: “Pearl Dental, Hyderabad”. The hard diversity gate still runs first. Ranking then scores business fit, art-direction coherence, conversion readiness, information architecture and theme coherence. Rendered visual scoring will be added separately rather than hidden inside this deterministic foundation.</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
          {ranked.map(({ candidate, rank, score, strengths, cautions }) => {
            const style = candidate.cssVariables as CSSProperties;
            return (
              <article
                key={candidate.id}
                data-candidate-id={candidate.id}
                data-selected-sections={JSON.stringify(candidate.selectedSections)}
                data-section-order={candidate.sectionOrder.join(",")}
                style={{ ...style, background: "var(--theme-bg)", color: "var(--theme-text)", border: rank <= 3 ? "2px solid var(--theme-accent)" : "1px solid var(--theme-border)", borderRadius: 24, padding: 24, minHeight: 540, display: "flex", flexDirection: "column" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "baseline" }}>
                  <span style={{ color: "var(--theme-accent)", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".15em" }}>#{rank} · {candidate.id}</span>
                  <strong style={{ fontSize: 24 }}>{score.total.toFixed(1)}</strong>
                </div>
                <h2 style={{ fontFamily: "var(--theme-display-font)", fontWeight: candidate.theme.typography.displayWeight, letterSpacing: candidate.theme.typography.headingTracking, fontSize: 34, lineHeight: 1, margin: "22px 0 10px" }}>{candidate.direction.label}</h2>
                <p style={{ margin: 0, color: "var(--theme-text-muted)", lineHeight: 1.55 }}>{candidate.direction.rationale}</p>

                <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid var(--theme-border)", display: "grid", gap: 8 }}>
                  {[
                    ["Business fit", score.businessFit, 25],
                    ["Art coherence", score.artDirectionCoherence, 25],
                    ["Conversion", score.conversionReadiness, 20],
                    ["Architecture", score.informationArchitecture, 15],
                    ["Theme", score.themeCoherence, 15],
                  ].map(([label, value, max]) => <div key={String(label)} style={{ display: "flex", justifyContent: "space-between", gap: 18, fontSize: 12 }}><span style={{ color: "var(--theme-text-muted)" }}>{label}</span><strong>{Number(value).toFixed(1)} / {max}</strong></div>)}
                </div>

                <div style={{ marginTop: 20 }}>
                  {strengths.slice(0, 3).map((item) => <p key={item} style={{ margin: "7px 0", fontSize: 12 }}>✓ {item}</p>)}
                  {cautions.slice(0, 2).map((item) => <p key={item} style={{ margin: "7px 0", color: "var(--theme-text-muted)", fontSize: 12 }}>△ {item}</p>)}
                </div>

                <div style={{ marginTop: "auto", paddingTop: 24, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ color: "var(--theme-text-muted)", fontSize: 11 }}>{candidate.direction.layout.density} density · {candidate.sectionOrder.join(" → ")}</span>
                  <a href={`/generated/pearl/candidates/${candidate.id}`} style={{ color: "var(--theme-accent)", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>Open full site ↗</a>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}
