type GalleryItem = { src: string; alt: string; caption?: string };

export function AsymmetricEditorialGallery({ eyebrow, headline, items }: { eyebrow?: string; headline: string; items: GalleryItem[] }) {
  return (
    <section style={{ background: "var(--theme-bg)", color: "var(--theme-text)", padding: "96px 24px" }}>
      <div style={{ width: "min(1180px, 100%)", margin: "0 auto" }}>
        {eyebrow ? <p style={{ margin: 0, color: "var(--theme-accent)", textTransform: "uppercase", letterSpacing: ".16em", fontSize: 11 }}>{eyebrow}</p> : null}
        <h2 style={{ margin: "14px 0 44px", maxWidth: 860, fontFamily: "var(--theme-display-font)", fontSize: "clamp(40px, 6vw, 76px)", lineHeight: .96, fontWeight: 400 }}>{headline}</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 18, alignItems: "start" }}>
          {items.map((item, index) => (
            <figure key={`${item.src}-${index}`} style={{ margin: 0, transform: index % 3 === 1 ? "translateY(28px)" : undefined }}>
              <div style={{ aspectRatio: index % 3 === 0 ? "4 / 5" : index % 3 === 1 ? "1 / 1" : "5 / 4", borderRadius: 24, overflow: "hidden", background: "var(--theme-surface)" }}>
                <img src={item.src} alt={item.alt} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </div>
              {item.caption ? <figcaption style={{ marginTop: 10, color: "var(--theme-text-muted)", fontSize: 12, lineHeight: 1.5 }}>{item.caption}</figcaption> : null}
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
