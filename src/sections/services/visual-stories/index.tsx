import styles from "./styles.module.css";

type Story={title:string;body:string;media?:{src:string;alt:string};link?:{label:string;href:string}};
export function VisualStoryServices({eyebrow,headline,stories}:{eyebrow?:string;headline:string;stories:Story[]}){
 return <section className={styles.section}>{eyebrow?<p className={styles.eyebrow}>{eyebrow}</p>:null}<h2>{headline}</h2><div className={styles.stories}>{stories.map((story,i)=><article className={styles.story} key={story.title}><div className={styles.media}>{story.media?<img src={story.media.src} alt={story.media.alt}/>:<span aria-hidden="true">0{i+1}</span>}</div><div className={styles.copy}><span className={styles.index}>0{i+1}</span><h3>{story.title}</h3><p>{story.body}</p>{story.link?<a href={story.link.href}>{story.link.label}<span>↗</span></a>:null}</div></article>)}</div></section>;
}
