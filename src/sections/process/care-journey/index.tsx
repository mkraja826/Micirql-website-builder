export type CareJourneyStep = { title:string; body:string };
export function CareJourney({ eyebrow, headline, steps }: { eyebrow:string; headline:string; steps:CareJourneyStep[] }) {
  return <section className="journey"><div className="shell journeyInner"><p className="eyebrow eyebrowLight">{eyebrow}</p><h2>{headline}</h2><div className="steps">{steps.map((step,index)=><div key={step.title}><span>0{index+1}</span><h3>{step.title}</h3><p>{step.body}</p></div>)}</div></div></section>;
}
