import styles from "./styles.module.css";

type Link = { label: string; href: string };
type Media = { src: string; alt: string; focalPoint?: { x: number; y: number } };

export function TypographyLedHero({ eyebrow, headline, body, primaryCta, accent, media }: { eyebrow?: string; headline: string; body: string; primaryCta: Link; accent?: string; media?: Media }) {
  const objectPosition = media?.focalPoint ? `${media.focalPoint.x * 100}% ${media.focalPoint.y * 100}%` : "center";
  return (
    <section className={styles.hero}>
      <div className={styles.inner}>
        <div className={styles.topline}>{eyebrow ? <span>{eyebrow}</span> : <span/>}<span className={styles.index}>01 / Direction</span></div>
        <h1>{headline}</h1>
        <div className={styles.bottom}>
          <p>{body}</p>
          <a href={primaryCta.href}>{primaryCta.label}<span>↗</span></a>
        </div>
        {media ? <div style={{ marginTop: "clamp(28px, 5vw, 64px)", aspectRatio: "16 / 7", minHeight: 220, overflow: "hidden" }}><img src={media.src} alt={media.alt} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition, display: "block" }} /></div> : null}
        {accent ? <div className={styles.accent} aria-hidden="true">{accent}</div> : null}
      </div>
    </section>
  );
}
