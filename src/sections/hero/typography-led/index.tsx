import styles from "./styles.module.css";

type Link = { label: string; href: string };

export function TypographyLedHero({ eyebrow, headline, body, primaryCta, accent }: { eyebrow?: string; headline: string; body: string; primaryCta: Link; accent?: string }) {
  return (
    <section className={styles.hero}>
      <div className={styles.inner}>
        <div className={styles.topline}>{eyebrow ? <span>{eyebrow}</span> : <span/>}<span className={styles.index}>01 / Direction</span></div>
        <h1>{headline}</h1>
        <div className={styles.bottom}>
          <p>{body}</p>
          <a href={primaryCta.href}>{primaryCta.label}<span>↗</span></a>
        </div>
        {accent ? <div className={styles.accent} aria-hidden="true">{accent}</div> : null}
      </div>
    </section>
  );
}
