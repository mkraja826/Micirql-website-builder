type Principle = { title: string; body: string };

export function ManifestoColumnsAbout({ eyebrow, headline, body, principles }: { eyebrow?: string; headline: string; body: string; principles: Principle[] }) {
  return (
    <section style={{ background: "var(--theme-surface)", color: "var(--theme-text)", padding: "96px 24px" }}>
      <div style={{ width: "min(1180px, 100%)", margin: "0 auto" }}>
        {eyebrow ? <p style={{ margin: 0, color: "var(--theme-accent)", textTransform: "uppercase", letterSpacing: ".16em", fontSize: 11 }}>{eyebrow}</p> : null}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.1fr) minmax(280px, .9fr)", gap: 48, marginTop: 14 }}>
          <h2 style={{ margin: 0, fontFamily: "var(--theme-display-font)", fontSize: "clamp(42px, 6vw, 78px)", lineHeight: .96, fontWeight: 400 }}>{headline}</h2>
          <p style={{ margin: 0, color: "var(--theme-text-muted)", fontSize: 18, lineHeight: 1.75 }}>{body}</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 24, marginTop: 64 }}>{principles.map((item, index) => <article key={item.title} style={{ paddingTop: 20, borderTop: "1px solid var(--theme-border)" }}><span style={{ color: "var(--theme-accent)", fontSize: 11 }}>{String(index + 1).padStart(2, "0")}</span><h3 style={{ margin: "12px 0 8px", fontFamily: "var(--theme-display-font)", fontSize: 26, fontWeight: 400 }}>{item.title}</h3><p style={{ margin: 0, color: "var(--theme-text-muted)", lineHeight: 1.65 }}>{item.body}</p></article>)}</div>
      </div>
    </section>
  );
}
