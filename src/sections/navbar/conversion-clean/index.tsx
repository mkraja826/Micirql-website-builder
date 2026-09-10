import styles from "./styles.module.css";

type Link={label:string;href:string};
export function ConversionCleanNavbar({brand,links,primaryCta,secondaryCta}:{brand:string;links:Link[];primaryCta:Link;secondaryCta?:Link}){
 return <header className={styles.header}><a className={styles.brand} href="#top">{brand}</a><nav aria-label="Primary navigation">{links.map(link=><a key={link.href} href={link.href}>{link.label}</a>)}</nav><div className={styles.actions}>{secondaryCta?<a className={styles.secondary} href={secondaryCta.href}>{secondaryCta.label}</a>:null}<a className={styles.primary} href={primaryCta.href}>{primaryCta.label}</a></div></header>;
}
