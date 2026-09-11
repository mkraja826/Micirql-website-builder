type Principle = { title: string; body: string };

export function ThesisColumnsAbout({ eyebrow, headline, body, principles }: { eyebrow?: string; headline: string; body: string; principles: Principle[] }) {
  return (
    <section style={{ padding: "var(--theme-section-y) 24px", background: "var(--theme-bg)", color: "var(--theme-text)" }}>
      <div style={{ width: "min(var(--theme-max-width), 100%)", margin: "0 auto" }}>
        {eyebrow ? <p style={{ margin: "0 0 18px", textTransform: "uppercase", letterSpacing: ".2em", fontSize: 11, color: "var(--theme-accent)" }}>{eyebrow}</p> : null}
        <div className="thesisColumnsIntro" style={{ display: "grid", gridTemplateColumns: "minmax(0,1.35fr) minmax(260px,.65fr)", gap: "clamp(36px,8vw,110px)", alignItems: "start" }}>
          <h2 style={{ margin: 0, fontFamily: "var(--theme-display-font)", fontSize: "clamp(52px,8vw,108px)", lineHeight: .86, letterSpacing: "-.06em", maxWidth: 900 }}>{headline}</h2>
          <p style={{ margin: 0, color: "var(--theme-text-muted)", lineHeight: 1.8, maxWidth: 460 }}>{body}</p>
        </div>
        <div className="thesisColumnsGrid" style={{ display: "grid", gridTemplateColumns: `repeat(${Math.max(1, Math.min(principles.length, 3))}, minmax(0,1fr))`, gap: 0, marginTop: "clamp(56px,8vw,108px)", borderTop: "1px solid var(--theme-border)" }}>
          {principles.map((item, index) => <article key={item.title} style={{ padding: "30px clamp(0px,2vw,28px) 0", borderLeft: index ? "1px solid var(--theme-border)" : undefined }}><span style={{ fontSize: 11, letterSpacing: ".18em", color: "var(--theme-accent)" }}>0{index + 1}</span><h3 style={{ margin: "36px 0 14px", fontFamily: "var(--theme-display-font)", fontSize: "clamp(24px,3vw,36px)", lineHeight: 1 }}>{item.title}</h3><p style={{ margin: 0, color: "var(--theme-text-muted)", lineHeight: 1.7 }}>{item.body}</p></article>)}
        </div>
      </div>
      <style>{`@media(max-width:760px){.thesisColumnsIntro,.thesisColumnsGrid{grid-template-columns:1fr!important}.thesisColumnsGrid article{border-left:0!important;border-top:1px solid var(--theme-border);padding:26px 0!important}.thesisColumnsGrid article:first-child{border-top:0}}`}</style>
    </section>
  );
}
