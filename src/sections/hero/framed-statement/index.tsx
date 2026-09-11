type Link = { label: string; href: string };

export function FramedStatementHero({ eyebrow, headline, body, primaryCta, secondaryCta }: { eyebrow?: string; headline: string; body: string; primaryCta: Link; secondaryCta?: Link }) {
  return (
    <section style={{ padding: "clamp(44px, 7vw, 72px) 24px", background: "var(--theme-bg)", color: "var(--theme-text)" }}>
      <div style={{ width: "min(1180px, 100%)", margin: "0 auto", border: "1px solid var(--theme-border)", padding: "clamp(28px, 7vw, 84px)", display: "grid", gap: 28 }}>
        {eyebrow ? <p style={{ margin: 0, textTransform: "uppercase", letterSpacing: ".18em", fontSize: 11, color: "var(--theme-accent)" }}>{eyebrow}</p> : null}
        <h1 style={{ margin: 0, maxWidth: 900, fontFamily: "var(--theme-display-font)", fontSize: "clamp(46px, 9vw, 118px)", lineHeight: .9, letterSpacing: "-.055em", fontWeight: 400 }}>{headline}</h1>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: 28, alignItems: "end" }}>
          <p style={{ margin: 0, maxWidth: 620, color: "var(--theme-text-muted)", fontSize: 18, lineHeight: 1.7 }}>{body}</p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "flex-start" }}><a href={primaryCta.href} style={{ padding: "14px 18px", background: "var(--theme-accent)", color: "var(--theme-accent-contrast)", textDecoration: "none" }}>{primaryCta.label}</a>{secondaryCta ? <a href={secondaryCta.href} style={{ padding: "14px 18px", border: "1px solid var(--theme-border)", color: "var(--theme-text)", textDecoration: "none" }}>{secondaryCta.label}</a> : null}</div>
        </div>
      </div>
    </section>
  );
}
