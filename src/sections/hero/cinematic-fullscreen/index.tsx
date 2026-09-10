import styles from "./styles.module.css";

type Link = { label: string; href: string };
type Media = { src: string; alt: string; kind?: "image" };

export function CinematicFullscreenHero({ eyebrow, headline, body, primaryCta, secondaryCta, media, visualLabel }: { eyebrow?: string; headline: string; body: string; primaryCta: Link; secondaryCta?: Link; media?: Media; visualLabel?: string }) {
  return (
    <section className={styles.hero}>
      {media ? <img className={styles.media} src={media.src} alt={media.alt} /> : <div className={styles.backdrop} aria-hidden="true"><div className={styles.orb}/><div className={styles.line}/></div>}
      <div className={styles.overlay} aria-hidden="true"/>
      <div className={styles.content}>
        {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
        <h1>{headline}</h1>
        <p className={styles.body}>{body}</p>
        <div className={styles.actions}>
          <a className={styles.primary} href={primaryCta.href}>{primaryCta.label}</a>
          {secondaryCta ? <a className={styles.secondary} href={secondaryCta.href}>{secondaryCta.label}<span>↗</span></a> : null}
        </div>
        {visualLabel ? <span className={styles.visualLabel}>{visualLabel}</span> : null}
      </div>
    </section>
  );
}
