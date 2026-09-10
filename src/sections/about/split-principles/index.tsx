type Principle = { title: string; body: string };

export function SplitPrinciplesAbout({ eyebrow, headline, body, principles }: { eyebrow?: string; headline: string; body: string; principles: Principle[] }) {
  return (
    <section style={{ padding: "92px 24px", background: "var(--theme-bg)", color: "var(--theme-text)" }}>
      <div style={{ width: "min(1180px, 100%)", margin: "0 auto", display: "grid", gridTemplateColumns: "minmax(0, .9fr) minmax(0, 1.1fr)", gap: "clamp(36px, 7vw, 96px)" }}>
        <div>{eyebrow ? <p style={{ margin: 0, color: "var(--theme-accent)", textTransform: "uppercase", letterSpacing: ".16em", fontSize: 11 }}>{eyebrow}</p> : null}<h2 style={{ margin: "14px 0 20px", fontFamily: "var(--theme-display-font)", fontSize: "clamp(42px, 6vw, 74px)", lineHeight: .98, fontWeight: 400 }}>{headline}</h2><p style={{ margin: 0, color: "var(--theme-text-muted)", fontSize: 18, lineHeight: 1.7 }}>{body}</p></div>
        <div>{principles.map((principle, index) => <article key={principle.title} style={{ padding: "24px 0", borderTop: "1px solid var(--theme-border)", display: "grid", gridTemplateColumns: "48px 1fr", gap: 18 }}><span style={{ color: "var(--theme-accent)", fontSize: 12 }}>{String(index + 1).padStart(2, "0")}</span><div><h3 style={{ margin: "0 0 8px", fontFamily: "var(--theme-display-font)", fontSize: 25, fontWeight: 400 }}>{principle.title}</h3><p style={{ margin: 0, color: "var(--theme-text-muted)", lineHeight: 1.6 }}>{principle.body}</p></div></article>)}</div>
      </div>
    </section>
  );
}
