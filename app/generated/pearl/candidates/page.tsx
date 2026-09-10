import type { CSSProperties } from "react";
import { generatePearlDentalCandidates } from "../../../../src/core/generation/pearl";

export default function PearlCandidatesPage() {
  const candidates = generatePearlDentalCandidates(8);

  return (
    <main style={{ minHeight: "100vh", background: "#f3eee6", color: "#1c2422", padding: "48px 24px 80px", fontFamily: "Arial, Helvetica, sans-serif" }}>
      <div style={{ width: "min(1180px, 100%)", margin: "0 auto" }}>
        <p style={{ margin: 0, textTransform: "uppercase", letterSpacing: ".18em", fontSize: 11, fontWeight: 700, color: "#4b7770" }}>Phase 10 candidate planning</p>
        <h1 style={{ margin: "14px 0 12px", maxWidth: 900, fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 400, fontSize: "clamp(42px, 7vw, 76px)", lineHeight: .96, letterSpacing: "-.045em" }}>Eight distinct directions from one tiny brief.</h1>
        <p style={{ maxWidth: 760, color: "#59645f", fontSize: 17, lineHeight: 1.7, marginBottom: 42 }}>Input: “Pearl Dental, Hyderabad”. Each candidate uses a different art direction and deterministically selects compatible complete sections. This page inspects composition diversity before the full candidate renderer is scaled to 20 sites.</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
          {candidates.map((candidate) => {
            const style = candidate.cssVariables as CSSProperties;
            return (
              <article key={candidate.id} style={{ ...style, background: "var(--theme-bg)", color: "var(--theme-text)", border: "1px solid var(--theme-border)", borderRadius: 24, padding: 24, minHeight: 420, display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "baseline" }}>
                  <span style={{ color: "var(--theme-accent)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".15em" }}>{candidate.id}</span>
                  <span style={{ color: "var(--theme-text-muted)", fontSize: 12 }}>{candidate.direction.layout.density} density</span>
                </div>
                <h2 style={{ fontFamily: "var(--theme-display-font)", fontWeight: candidate.theme.typography.displayWeight, letterSpacing: candidate.theme.typography.headingTracking, fontSize: 34, lineHeight: 1, margin: "22px 0 10px" }}>{candidate.direction.label}</h2>
                <p style={{ margin: 0, color: "var(--theme-text-muted)", lineHeight: 1.55, minHeight: 72 }}>{candidate.direction.rationale}</p>
                <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--theme-border)" }}>
                  {Object.entries(candidate.selectedSections).map(([type, sectionId]) => (
                    <div key={type} style={{ display: "grid", gridTemplateColumns: "72px 1fr", gap: 10, padding: "7px 0", fontSize: 12 }}>
                      <span style={{ color: "var(--theme-text-muted)", textTransform: "uppercase", letterSpacing: ".08em" }}>{type}</span>
                      <strong style={{ fontWeight: 600 }}>{sectionId}</strong>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: "auto", paddingTop: 24, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {candidate.direction.mood.slice(0, 3).map((mood) => <span key={mood} style={{ border: "1px solid var(--theme-border)", borderRadius: 999, padding: "7px 10px", fontSize: 11 }}>{mood}</span>)}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}
