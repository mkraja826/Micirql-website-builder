type Item = { title: string; body: string };

export function FeaturedPathServices({ eyebrow, headline, intro, items }: { eyebrow?: string; headline: string; intro?: string; items: Item[] }) {
  const [featured, ...rest] = items;
  return (
    <section style={{ padding: "var(--theme-section-y) 24px", background: "var(--theme-bg)", color: "var(--theme-text)" }}>
      <div style={{ width: "min(var(--theme-max-width), 100%)", margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.1fr) minmax(280px, .9fr)", gap: "clamp(34px, 7vw, 96px)", alignItems: "end", marginBottom: 54 }}>
          <div>{eyebrow ? <p style={{ margin: "0 0 16px", textTransform: "uppercase", letterSpacing: ".2em", fontSize: 11, color: "var(--theme-accent)" }}>{eyebrow}</p> : null}<h2 style={{ margin: 0, fontFamily: "var(--theme-display-font)", fontSize: "clamp(46px, 7vw, 92px)", lineHeight: .9, letterSpacing: "-.055em" }}>{headline}</h2></div>
          {intro ? <p style={{ margin: 0, color: "var(--theme-text-muted)", lineHeight: 1.75, maxWidth: 520 }}>{intro}</p> : null}
        </div>
        <div className="featuredPathsGrid" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.18fr) minmax(0, .82fr)", gap: 18 }}>
          {featured ? <article style={{ minHeight: 360, padding: "clamp(28px, 5vw, 56px)", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "var(--theme-text)", color: "var(--theme-bg)" }}><span style={{ fontSize: 11, letterSpacing: ".18em", opacity: .66 }}>01 · FEATURED CARE</span><div><h3 style={{ margin: "0 0 18px", maxWidth: 640, fontFamily: "var(--theme-display-font)", fontSize: "clamp(36px, 5vw, 66px)", lineHeight: .94, letterSpacing: "-.04em" }}>{featured.title}</h3><p style={{ margin: 0, maxWidth: 560, lineHeight: 1.7, opacity: .75 }}>{featured.body}</p></div></article> : null}
          <div style={{ display: "grid", gap: 18 }}>{rest.map((item, index) => <article key={item.title} style={{ padding: "clamp(24px, 4vw, 38px)", background: "var(--theme-surface)", border: "1px solid var(--theme-border)" }}><span style={{ fontSize: 11, letterSpacing: ".18em", color: "var(--theme-accent)" }}>0{index + 2}</span><h3 style={{ margin: "34px 0 12px", fontFamily: "var(--theme-display-font)", fontSize: "clamp(26px, 3vw, 38px)", lineHeight: 1 }}>{item.title}</h3><p style={{ margin: 0, color: "var(--theme-text-muted)", lineHeight: 1.65 }}>{item.body}</p></article>)}</div>
        </div>
      </div>
      <style>{`@media(max-width:760px){.featuredPathsGrid{grid-template-columns:1fr!important}}`}</style>
    </section>
  );
}
