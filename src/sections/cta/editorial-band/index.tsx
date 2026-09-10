import styles from "./styles.module.css";

type Link = { label: string; href: string };

export function EditorialCtaBand({ eyebrow, headline, body, primaryCta, secondaryCta }: { eyebrow?: string; headline: string; body?: string; primaryCta: Link; secondaryCta?: Link }) {
  return (
    <section className={styles.band}>
      <div className={styles.inner}>
        <div>
          {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
          <h2>{headline}</h2>
        </div>
        <div className={styles.actionArea}>
          {body ? <p>{body}</p> : null}
          <a className={styles.primary} href={primaryCta.href}>{primaryCta.label}<span>↗</span></a>
          {secondaryCta ? <a className={styles.secondary} href={secondaryCta.href}>{secondaryCta.label}</a> : null}
        </div>
      </div>
    </section>
  );
}
