type Link = { label: string; href: string };

export function ActionDossierCta({ eyebrow, headline, body, primaryCta, secondaryCta }: { eyebrow?: string; headline: string; body: string; primaryCta: Link; secondaryCta?: Link }) {
  return (
    <section style={{ padding: "var(--theme-section-y) 24px", background: "var(--theme-bg)", color: "var(--theme-text)" }}>
      <div className="actionDossierGrid" style={{ width: "min(var(--theme-max-width), 100%)", margin: "0 auto", display: "grid", gridTemplateColumns: "minmax(0,1.25fr) minmax(300px,.75fr)", gap: 20 }}>
        <div style={{ padding: "clamp(34px,6vw,72px)", background: "var(--theme-text)", color: "var(--theme-bg)" }}>
          {eyebrow ? <p style={{ margin: "0 0 22px", textTransform: "uppercase", letterSpacing: ".2em", fontSize: 11, opacity: .68 }}>{eyebrow}</p> : null}
          <h2 style={{ margin: 0, maxWidth: 800, fontFamily: "var(--theme-display-font)", fontSize: "clamp(48px,7vw,96px)", lineHeight: .88, letterSpacing: "-.055em" }}>{headline}</h2>
        </div>
        <aside style={{ padding: "clamp(30px,5vw,54px)", background: "var(--theme-surface)", border: "1px solid var(--theme-border)", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 48 }}>
          <p style={{ margin: 0, color: "var(--theme-text-muted)", lineHeight: 1.75 }}>{body}</p>
          <div><a href={primaryCta.href} style={{ display: "block", padding: "16px 18px", textAlign: "center", background: "var(--theme-accent)", color: "var(--theme-accent-contrast)", textDecoration: "none", fontWeight: 700 }}>{primaryCta.label}</a>{secondaryCta ? <a href={secondaryCta.href} style={{ display: "block", marginTop: 10, padding: "15px 18px", textAlign: "center", border: "1px solid var(--theme-border)", color: "inherit", textDecoration: "none" }}>{secondaryCta.label}</a> : null}</div>
        </aside>
      </div>
      <style>{`@media(max-width:760px){.actionDossierGrid{grid-template-columns:1fr!important}}`}</style>
    </section>
  );
}
