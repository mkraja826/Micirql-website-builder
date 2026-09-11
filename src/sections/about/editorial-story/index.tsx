import styles from "./styles.module.css";

type Media = { src: string; alt: string; focalPoint?: { x: number; y: number } };

export function EditorialStory({ eyebrow, headline, body, quote, visualLabel, media }: { eyebrow?: string; headline: string; body: string; quote?: string; visualLabel?: string; media?: Media }) {
  const objectPosition = media?.focalPoint ? `${Math.round(media.focalPoint.x * 100)}% ${Math.round(media.focalPoint.y * 100)}%` : "50% 50%";
  return (
    <section className={styles.section}>
      <div className={styles.visual}>
        {media ? <img className={styles.media} src={media.src} alt={media.alt} style={{ objectPosition }} /> : null}
        <span>{visualLabel ?? "Story"}</span><i aria-hidden="true"/>
      </div>
      <div className={styles.copy}>
        {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
        <h2>{headline}</h2>
        <p className={styles.body}>{body}</p>
        {quote ? <blockquote>{quote}</blockquote> : null}
      </div>
    </section>
  );
}
