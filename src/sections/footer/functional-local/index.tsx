import styles from "./styles.module.css";

type Link={label:string;href:string};
export function FunctionalLocalFooter({brand,description,location,contactLabel,contactHref,links,legal}:{brand:string;description:string;location?:string;contactLabel?:string;contactHref?:string;links:Link[];legal?:string}){
 return <footer className={styles.footer}><div className={styles.top}><div><p className={styles.brand}>{brand}</p><p className={styles.description}>{description}</p></div><div className={styles.local}>{location?<p><span>Visit</span>{location}</p>:null}{contactLabel&&contactHref?<a href={contactHref}><span>Contact</span>{contactLabel}</a>:null}</div><nav aria-label="Footer navigation">{links.map(link=><a key={link.href} href={link.href}>{link.label}</a>)}</nav></div><div className={styles.bottom}><span>{legal??`© ${new Date().getFullYear()} ${brand}`}</span><a href="#top">Back to top ↑</a></div></footer>;
}
