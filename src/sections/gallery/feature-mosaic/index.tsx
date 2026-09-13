export type FeatureMosaicItem = { src:string; alt:string; caption?:string };

export function FeatureMosaicGallery({ eyebrow, headline, items }: { eyebrow:string; headline:string; items:FeatureMosaicItem[] }) {
  const [lead,...rest] = items;
  if (!lead) return null;
  return <section className="shell"><div><p className="eyebrow">{eyebrow}</p><h2>{headline}</h2></div><div style={{display:"grid",gap:"1rem",gridTemplateColumns:"repeat(auto-fit,minmax(16rem,1fr))",marginTop:"2rem"}}><figure style={{margin:0,gridRow:"span 2"}}><img src={lead.src} alt={lead.alt} style={{width:"100%",height:"100%",minHeight:"24rem",objectFit:"cover"}} />{lead.caption ? <figcaption>{lead.caption}</figcaption> : null}</figure><div style={{display:"grid",gap:"1rem"}}>{rest.map(item=><figure key={`${item.src}-${item.caption ?? item.alt}`} style={{margin:0}}><img src={item.src} alt={item.alt} style={{width:"100%",aspectRatio:"4 / 3",objectFit:"cover"}} />{item.caption ? <figcaption>{item.caption}</figcaption> : null}</figure>)}</div></div></section>;
}
