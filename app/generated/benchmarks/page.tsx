import { generateMultiIndustryBenchmarkMatrix } from "../../../src/benchmarks/multi-industry";

function signature(order: string[]) {
  return order.join(" → ");
}

export default function MultiIndustryBenchmarksPage() {
  const matrix = generateMultiIndustryBenchmarkMatrix(4);

  return (
    <main style={{ minHeight: "100vh", padding: "48px 24px 80px", background: "#f4f1eb", color: "#17201d", fontFamily: "Arial, Helvetica, sans-serif" }}>
      <div style={{ width: "min(1200px, 100%)", margin: "0 auto" }}>
        <p style={{ margin: 0, textTransform: "uppercase", letterSpacing: ".18em", fontSize: 11, fontWeight: 800 }}>Multi-industry grammar benchmark</p>
        <h1 style={{ margin: "14px 0 12px", maxWidth: 900, fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 400, fontSize: "clamp(42px, 7vw, 76px)", lineHeight: .96, letterSpacing: "-.045em" }}>One core engine. Different business narratives.</h1>
        <p style={{ maxWidth: 820, lineHeight: 1.7, color: "#56615d", marginBottom: 40 }}>These fixtures deliberately span hospitality, food and beverage, technology, construction and professional services. Pearl Dental remains the flagship visual benchmark, but this matrix checks that composition planning is not dental-specific.</p>

        <div style={{ display: "grid", gap: 24 }}>
          {matrix.map(({ fixture, brief, candidates }) => (
            <section key={fixture.id} style={{ background: "#fff", border: "1px solid #d8ddd9", borderRadius: 24, padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 20, flexWrap: "wrap", alignItems: "baseline" }}>
                <div>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase", color: "#64736d" }}>{fixture.label}</p>
                  <h2 style={{ margin: "8px 0 6px", fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 32, fontWeight: 400 }}>{fixture.brief}</h2>
                </div>
                <strong style={{ fontSize: 13 }}>{brief.business.industry.value}{brief.business.subIndustry?.value ? ` / ${brief.business.subIndustry.value}` : ""}</strong>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 12, marginTop: 22 }}>
                {candidates.map((candidate) => (
                  <article key={candidate.id} style={{ border: "1px solid #e1e4e2", borderRadius: 16, padding: 16, background: "#faf9f6" }}>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".12em", color: "#68756f" }}>{candidate.id}</p>
                    <h3 style={{ margin: "10px 0", fontSize: 20 }}>{candidate.direction.label}</h3>
                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "#56615d" }}>{signature(candidate.sectionOrder)}</p>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
