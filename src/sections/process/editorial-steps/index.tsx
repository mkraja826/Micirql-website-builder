type Step = { title: string; body: string };

export function EditorialProcessSteps({ eyebrow, headline, intro, steps }: { eyebrow?: string; headline: string; intro?: string; steps: Step[] }) {
  return (
    <section style={{ background: "var(--theme-bg)", color: "var(--theme-text)", padding: "96px 24px" }}>
      <div style={{ width: "min(1180px, 100%)", margin: "0 auto" }}>
        {eyebrow ? <p style={{ margin: 0, color: "var(--theme-accent)", textTransform: "uppercase", letterSpacing: ".16em", fontSize: 11 }}>{eyebrow}</p> : null}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(280px, .7fr)", gap: 36, alignItems: "end", marginTop: 14 }}>
          <h2 style={{ margin: 0, fontFamily: "var(--theme-display-font)", fontSize: "clamp(40px, 6vw, 72px)", lineHeight: .98, fontWeight: 400 }}>{headline}</h2>
          {intro ? <p style={{ margin: 0, color: "var(--theme-text-muted)", lineHeight: 1.7 }}>{intro}</p> : null}
        </div>
        <div style={{ marginTop: 56 }}>{steps.map((step, index) => <article key={step.title} style={{ display: "grid", gridTemplateColumns: "64px minmax(0, .9fr) minmax(0, 1.1fr)", gap: 24, padding: "28px 0", borderTop: "1px solid var(--theme-border)" }}><span style={{ color: "var(--theme-accent)", fontSize: 12 }}>{String(index + 1).padStart(2, "0")}</span><h3 style={{ margin: 0, fontFamily: "var(--theme-display-font)", fontSize: 28, fontWeight: 400 }}>{step.title}</h3><p style={{ margin: 0, color: "var(--theme-text-muted)", lineHeight: 1.65 }}>{step.body}</p></article>)}</div>
      </div>
    </section>
  );
}
