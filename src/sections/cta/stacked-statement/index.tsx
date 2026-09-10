type Link = { label: string; href: string };

export function StackedStatementCta({ eyebrow, headline, body, primaryCta, secondaryCta }: { eyebrow?: string; headline: string; body: string; primaryCta: Link; secondaryCta?: Link }) {
  return (
    <section style={{ padding: "92px 24px", background: "var(--theme-surface-strong)", color: "var(--theme-text)" }}>
      <div style={{ width: "min(1100px, 100%)", margin: "0 auto", textAlign: "center" }}>
        {eyebrow ? <p style={{ margin: 0, color: "var(--theme-accent)", textTransform: "uppercase", letterSpacing: ".18em", fontSize: 11 }}>{eyebrow}</p> : null}
        <h2 style={{ margin: "18px auto", maxWidth: 920, fontFamily: "var(--theme-display-font)", fontSize: "clamp(46px, 8vw, 96px)", lineHeight: .92, fontWeight: 400, letterSpacing: "-.045em" }}>{headline}</h2>
        <p style={{ margin: "0 auto", maxWidth: 620, color: "var(--theme-text-muted)", fontSize: 18, lineHeight: 1.7 }}>{body}</p>
        <div style={{ marginTop: 30, display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}><a href={primaryCta.href} style={{ padding: "15px 20px", background: "var(--theme-accent)", color: "var(--theme-accent-contrast)", textDecoration: "none" }}>{primaryCta.label}</a>{secondaryCta ? <a href={secondaryCta.href} style={{ padding: "15px 20px", border: "1px solid var(--theme-border)", color: "var(--theme-text)", textDecoration: "none" }}>{secondaryCta.label}</a> : null}</div>
      </div>
    </section>
  );
}
