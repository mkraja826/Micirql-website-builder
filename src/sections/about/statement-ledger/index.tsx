type Principle = { title: string; body: string };

export function StatementLedgerAbout({ eyebrow, headline, body, principles }: { eyebrow?: string; headline: string; body: string; principles: Principle[] }) {
  return (
    <section style={{ padding: "var(--theme-section-y) 24px", background: "var(--theme-bg)", color: "var(--theme-text)" }}>
      <div style={{ width: "min(var(--theme-max-width), 100%)", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))", gap: "clamp(42px, 9vw, 140px)" }}>
        <div>
          {eyebrow ? <p style={{ margin: "0 0 18px", textTransform: "uppercase", letterSpacing: ".18em", fontSize: 11, color: "var(--theme-accent)" }}>{eyebrow}</p> : null}
          <h2 style={{ margin: "0 0 24px", fontFamily: "var(--theme-display-font)", fontSize: "clamp(44px, 7vw, 88px)", lineHeight: .92, letterSpacing: "-.05em" }}>{headline}</h2>
          <p style={{ margin: 0, maxWidth: 520, color: "var(--theme-text-muted)", lineHeight: 1.75 }}>{body}</p>
        </div>
        <div style={{ borderTop: "1px solid var(--theme-border)" }}>
          {principles.map((item, index) => <article key={item.title} style={{ display: "grid", gridTemplateColumns: "44px minmax(0, 1fr)", gap: 16, padding: "28px 0", borderBottom: "1px solid var(--theme-border)" }}><span style={{ color: "var(--theme-accent)", fontSize: 12 }}>0{index + 1}</span><div><h3 style={{ margin: "0 0 9px", fontFamily: "var(--theme-display-font)", fontSize: 27 }}>{item.title}</h3><p style={{ margin: 0, color: "var(--theme-text-muted)", lineHeight: 1.65 }}>{item.body}</p></div></article>)}
        </div>
      </div>
    </section>
  );
}
