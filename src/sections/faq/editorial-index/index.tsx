export type EditorialFaqItem = [string, string];

export function EditorialIndexFaq({ eyebrow, headline, intro, items }: { eyebrow:string; headline:string; intro?:string; items:EditorialFaqItem[] }) {
  return <section className="shell" id="faq"><div style={{display:"grid",gap:"1rem",gridTemplateColumns:"repeat(auto-fit,minmax(16rem,1fr))",alignItems:"end"}}><div><p className="eyebrow">{eyebrow}</p><h2>{headline}</h2></div>{intro ? <p>{intro}</p> : null}</div><div style={{marginTop:"2rem",borderTop:"1px solid var(--border, currentColor)"}}>{items.map(([question,answer],index)=><article key={question} style={{display:"grid",gridTemplateColumns:"minmax(3rem,.35fr) minmax(0,1fr)",gap:"1rem",padding:"1.25rem 0",borderBottom:"1px solid var(--border, currentColor)"}}><span aria-hidden="true">{String(index+1).padStart(2,"0")}</span><div><h3>{question}</h3><p>{answer}</p></div></article>)}</div></section>;
}
