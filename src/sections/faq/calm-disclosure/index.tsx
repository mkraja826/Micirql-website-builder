export type FaqItem = [string,string];
export function CalmDisclosureFaq({ eyebrow, headline, items }: { eyebrow:string; headline:string; items:FaqItem[] }) {
  return <section className="faq shell" id="faq"><div><p className="eyebrow">{eyebrow}</p><h2>{headline}</h2></div><div className="faqList">{items.map(([q,a])=><details key={q}><summary>{q}<span>+</span></summary><p>{a}</p></details>)}</div></section>;
}
