export function TrustManifesto({ eyebrow, headline, body, note }: { eyebrow:string; headline:string; body:string; note:string }) {
  return <section className="manifesto shell" id="approach"><p className="eyebrow">{eyebrow}</p><div className="manifestoGrid"><h2>{headline}</h2><div><p>{body}</p><p className="muted">{note}</p></div></div></section>;
}
