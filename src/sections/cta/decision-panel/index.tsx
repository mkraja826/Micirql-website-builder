type Action = { label: string; href: string };

export function DecisionPanelCta({ eyebrow, headline, body, primaryCta, secondaryCta }: { eyebrow?: string; headline: string; body: string; primaryCta: Action; secondaryCta?: Action }) {
  return (
    <section style={{ background: "var(--theme-surface)", color: "var(--theme-text)", padding: "88px 24px" }}>
      <div style={{ width: "min(1080px, 100%)", margin: "0 auto", border: "1px solid var(--theme-border)", borderRadius: 30, padding: "clamp(28px, 5vw, 56px)" }}>
        {eyebrow ? <p style={{ margin: 0, color: "var(--theme-accent)", textTransform: "uppercase", letterSpacing: ".16em", fontSize: 11 }}>{eyebrow}</p> : null}
        <h2 style={{ margin: "14px 0 18px", maxWidth: 820, fontFamily: "var(--theme-display-font)", fontSize: "clamp(40px, 6vw, 72px)", lineHeight: .97, fontWeight: 400 }}>{headline}</h2>
        <p style={{ margin: 0, maxWidth: 700, color: "var(--theme-text-muted)", lineHeight: 1.7 }}>{body}</p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 32 }}><a href={primaryCta.href} style={{ padding: "14px 18px", borderRadius: 999, background: "var(--theme-accent)", color: "var(--theme-accent-contrast)", textDecoration: "none", fontWeight: 700 }}>{primaryCta.label}</a>{secondaryCta ? <a href={secondaryCta.href} style={{ padding: "14px 18px", borderRadius: 999, border: "1px solid var(--theme-border)", color: "var(--theme-text)", textDecoration: "none", fontWeight: 700 }}>{secondaryCta.label}</a> : null}</div>
      </div>
    </section>
  );
}
