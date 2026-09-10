import styles from "./styles.module.css";

type Link={label:string;href:string};
type Media={src:string;alt:string};

export function ConversionSplitHero({eyebrow,headline,body,primaryCta,secondaryCta,media,proof}:{eyebrow?:string;headline:string;body:string;primaryCta:Link;secondaryCta?:Link;media?:Media;proof?:string[]}){
  return <section className={styles.hero}>
    <div className={styles.copy}>
      {eyebrow?<p className={styles.eyebrow}>{eyebrow}</p>:null}
      <h1>{headline}</h1><p className={styles.body}>{body}</p>
      <div className={styles.actions}><a className={styles.primary} href={primaryCta.href}>{primaryCta.label}</a>{secondaryCta?<a className={styles.secondary} href={secondaryCta.href}>{secondaryCta.label}</a>:null}</div>
      {proof?.length?<ul className={styles.proof}>{proof.map((item)=><li key={item}>{item}</li>)}</ul>:null}
    </div>
    <div className={styles.visual}>{media?<img src={media.src} alt={media.alt}/>:<div className={styles.placeholder} aria-hidden="true"><span/><span/></div>}</div>
  </section>;
}
