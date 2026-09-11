type Item = { title: string; body: string };

export function FeaturedOfferServices({ eyebrow, headline, intro, items }: { eyebrow?: string; headline: string; intro?: string; items: Item[] }) {
  const [featured, ...rest] = items;
  return (
    <section style={{ background: "var(--theme-bg)", color: "var(--theme-text)", padding: "96px 24px" }}>
      <div style={{ width: "min(1180px, 100%)", margin: "0 auto" }}>
        {eyebrow ? <p style={{ margin: 0, color: "var(--theme-accent)", textTransform: "uppercase", letterSpacing: ".16em", fontSize: 11 }}>{eyebrow}</p> : null}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.2fr) minmax(280px, .8fr)", gap: 40, alignItems: "end", marginTop: 14 }}>
          <h2 style={{ margin: 0, fontFamily: "var(--theme-display-font)", fontSize: "clamp(40px, 6vw, 76px)", lineHeight: .95, fontWeight: 400 }}>{headline}</h2>
          {intro ? <p style={{ margin: 0, color: "var(--theme-text-muted)", lineHeight: 1.7 }}>{intro}</p> : null}
        </div>
        {featured ? <article style={{ marginTop: 54, padding: "34px", border: "1px solid var(--theme-border)", borderRadius: 28, background: "var(--theme-surface)" }}><p style={{ margin: 0, color: "var(--theme-accent)", fontSize: 12, textTransform: "uppercase", letterSpacing: ".14em" }}>Featured</p><h3 style={{ margin: "12px 0 10px", fontFamily: "var(--theme-display-font)", fontSize: "clamp(30px, 4vw, 50px)", fontWeight: 400 }}>{featured.title}</h3><p style={{ margin: 0, maxWidth: 760, color: "var(--theme-text-muted)", lineHeight: 1.7 }}>{featured.body}</p></article> : null}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 18, marginTop: 18 }}>{rest.map((item, index) => <article key={item.title} style={{ padding: "24px 0", borderTop: "1px solid var(--theme-border)" }}><span style={{ color: "var(--theme-text-muted)", fontSize: 11 }}>{String(index + 2).padStart(2, "0")}</span><h3 style={{ margin: "10px 0 8px", fontFamily: "var(--theme-display-font)", fontSize: 24, fontWeight: 400 }}>{item.title}</h3><p style={{ margin: 0, color: "var(--theme-text-muted)", lineHeight: 1.6 }}>{item.body}</p></article>)}</div>
      </div>
    </section>
  );
}
