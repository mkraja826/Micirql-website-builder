import styles from "./styles.module.css";

export function EditorialStory({ eyebrow, headline, body, quote, visualLabel }: { eyebrow?: string; headline: string; body: string; quote?: string; visualLabel?: string }) {
  return (
    <section className={styles.section}>
      <div className={styles.visual} aria-hidden="true"><span>{visualLabel ?? "Story"}</span><i/></div>
      <div className={styles.copy}>
        {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
        <h2>{headline}</h2>
        <p className={styles.body}>{body}</p>
        {quote ? <blockquote>{quote}</blockquote> : null}
      </div>
    </section>
  );
}
