type Link = { label: string; href: string };

export function InvertedMarqueeCta({ eyebrow, headline, body, primaryCta, secondaryCta }: { eyebrow?: string; headline: string; body: string; primaryCta: Link; secondaryCta?: Link }) {
  return (
    <section style={{ padding: "clamp(70px, 10vw, 140px) 24px", background: "var(--theme-text)", color: "var(--theme-bg)" }}>
      <div style={{ width: "min(var(--theme-max-width), 100%)", margin: "0 auto" }}>
        {eyebrow ? <p style={{ margin: "0 0 20px", textTransform: "uppercase", letterSpacing: ".22em", fontSize: 11, opacity: .66 }}>{eyebrow}</p> : null}
        <h2 style={{ margin: 0, maxWidth: 1080, fontFamily: "var(--theme-display-font)", fontSize: "clamp(54px, 10vw, 136px)", lineHeight: .82, letterSpacing: "-.06em" }}>{headline}</h2>
        <div style={{ marginTop: "clamp(36px, 7vw, 86px)", borderTop: "1px solid currentColor", paddingTop: 22, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
          <p style={{ margin: 0, maxWidth: 560, lineHeight: 1.7, opacity: .72 }}>{body}</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><a href={primaryCta.href} style={{ padding: "15px 20px", background: "var(--theme-accent)", color: "var(--theme-accent-contrast)", textDecoration: "none", fontWeight: 700 }}>{primaryCta.label}</a>{secondaryCta ? <a href={secondaryCta.href} style={{ padding: "15px 20px", border: "1px solid currentColor", color: "inherit", textDecoration: "none" }}>{secondaryCta.label}</a> : null}</div>
        </div>
      </div>
    </section>
  );
}
