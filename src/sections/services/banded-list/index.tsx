type Item = { title: string; body: string };

export function BandedServiceList({ eyebrow, headline, items }: { eyebrow?: string; headline: string; items: Item[] }) {
  return (
    <section style={{ background: "var(--theme-surface)", color: "var(--theme-text)", padding: "88px 24px" }}>
      <div style={{ width: "min(1180px, 100%)", margin: "0 auto" }}>
        {eyebrow ? <p style={{ margin: 0, color: "var(--theme-accent)", textTransform: "uppercase", letterSpacing: ".16em", fontSize: 11 }}>{eyebrow}</p> : null}
        <h2 style={{ margin: "14px 0 42px", maxWidth: 760, fontFamily: "var(--theme-display-font)", fontSize: "clamp(38px, 6vw, 72px)", lineHeight: .98, fontWeight: 400 }}>{headline}</h2>
        <div>{items.map((item, index) => <article key={item.title} style={{ display: "grid", gridTemplateColumns: "72px minmax(0, .8fr) minmax(0, 1fr)", gap: 24, padding: "26px 0", borderTop: "1px solid var(--theme-border)" }}><span style={{ color: "var(--theme-text-muted)", fontSize: 12 }}>{String(index + 1).padStart(2, "0")}</span><h3 style={{ margin: 0, fontFamily: "var(--theme-display-font)", fontSize: 28, fontWeight: 400 }}>{item.title}</h3><p style={{ margin: 0, color: "var(--theme-text-muted)", lineHeight: 1.65 }}>{item.body}</p></article>)}</div>
      </div>
    </section>
  );
}
