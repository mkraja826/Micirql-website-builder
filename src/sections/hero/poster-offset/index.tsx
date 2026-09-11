type Link = { label: string; href: string };

export function PosterOffsetHero({ eyebrow, headline, body, primaryCta, secondaryCta }: { eyebrow?: string; headline: string; body: string; primaryCta: Link; secondaryCta?: Link }) {
  return (
    <section style={{ padding: "clamp(56px, 9vw, 132px) 24px", background: "var(--theme-text)", color: "var(--theme-bg)", overflow: "hidden" }}>
      <div style={{ width: "min(var(--theme-max-width), 100%)", margin: "0 auto", display: "grid", gridTemplateColumns: "minmax(0, 1.5fr) minmax(240px, .5fr)", gap: "clamp(36px, 8vw, 120px)", alignItems: "end" }}>
        <div>
          {eyebrow ? <p style={{ margin: "0 0 28px", textTransform: "uppercase", letterSpacing: ".24em", fontSize: 11, opacity: .7 }}>{eyebrow}</p> : null}
          <h1 style={{ margin: 0, fontFamily: "var(--theme-display-font)", fontSize: "clamp(64px, 12vw, 176px)", lineHeight: .78, letterSpacing: "-.07em", fontWeight: 700, maxWidth: 980 }}>{headline}</h1>
        </div>
        <div style={{ borderTop: "1px solid currentColor", paddingTop: 22 }}>
          <p style={{ margin: "0 0 28px", fontSize: 17, lineHeight: 1.65, opacity: .76 }}>{body}</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a href={primaryCta.href} style={{ padding: "14px 18px", background: "var(--theme-accent)", color: "var(--theme-accent-contrast)", textDecoration: "none", fontWeight: 700 }}>{primaryCta.label}</a>
            {secondaryCta ? <a href={secondaryCta.href} style={{ padding: "14px 18px", border: "1px solid currentColor", color: "inherit", textDecoration: "none" }}>{secondaryCta.label}</a> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
