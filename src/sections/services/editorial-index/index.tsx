export type EditorialServiceItem = { title:string; body:string };
export function EditorialServiceIndex({ eyebrow, headline, intro, items }: { eyebrow:string; headline:string; intro:string; items:EditorialServiceItem[] }) {
  return <section className="services shell" id="care"><div className="sectionHead"><div><p className="eyebrow">{eyebrow}</p><h2>{headline}</h2></div><p>{intro}</p></div><div className="serviceList">{items.map((item,index)=><article key={item.title}><span>0{index+1}</span><h3>{item.title}<i aria-hidden="true"/></h3><p>{item.body}</p><a href="#contact" aria-label={`Ask about ${item.title}`}>Ask about this care ↗</a></article>)}</div></section>;
}
