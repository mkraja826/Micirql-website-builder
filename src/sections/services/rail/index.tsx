type Item = { title: string; body: string };

export function RailServices({ eyebrow, headline, items }: { eyebrow?: string; headline: string; items: Item[] }) {
  return (
    <section style={{ padding: "var(--theme-section-y) 24px", background: "var(--theme-surface-strong)", color: "var(--theme-text)" }}>
      <div style={{ width: "min(var(--theme-max-width), 100%)", margin: "0 auto" }}>
        {eyebrow ? <p style={{ margin: "0 0 14px", textTransform: "uppercase", letterSpacing: ".2em", fontSize: 11, color: "var(--theme-accent)" }}>{eyebrow}</p> : null}
        <h2 style={{ margin: "0 0 42px", maxWidth: 760, fontFamily: "var(--theme-display-font)", fontSize: "clamp(42px, 6vw, 76px)", lineHeight: .94, letterSpacing: "-.045em" }}>{headline}</h2>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.max(items.length, 1)}, minmax(0, 1fr))`, borderTop: "1px solid var(--theme-border)", borderBottom: "1px solid var(--theme-border)" }}>
          {items.map((item, index) => <article key={item.title} style={{ padding: "30px 24px 34px", borderLeft: index ? "1px solid var(--theme-border)" : undefined }}><span style={{ fontSize: 11, letterSpacing: ".16em", color: "var(--theme-accent)" }}>0{index + 1}</span><h3 style={{ margin: "40px 0 12px", fontFamily: "var(--theme-display-font)", fontSize: 25 }}>{item.title}</h3><p style={{ margin: 0, color: "var(--theme-text-muted)", lineHeight: 1.65 }}>{item.body}</p></article>)}
        </div>
      </div>
    </section>
  );
}
