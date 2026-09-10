import styles from "./styles.module.css";

type Link={label:string;href:string};
type Media={src:string;alt:string};
export function HumanSplitCta({eyebrow,headline,body,primaryCta,secondaryCta,media}:{eyebrow?:string;headline:string;body:string;primaryCta:Link;secondaryCta?:Link;media?:Media}){
 return <section className={styles.section}><div className={styles.media}>{media?<img src={media.src} alt={media.alt}/>:<div className={styles.placeholder} aria-hidden="true"/>}</div><div className={styles.copy}>{eyebrow?<p className={styles.eyebrow}>{eyebrow}</p>:null}<h2>{headline}</h2><p>{body}</p><div className={styles.actions}><a className={styles.primary} href={primaryCta.href}>{primaryCta.label}</a>{secondaryCta?<a className={styles.secondary} href={secondaryCta.href}>{secondaryCta.label}</a>:null}</div></div></section>;
}
