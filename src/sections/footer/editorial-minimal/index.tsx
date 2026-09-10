export function EditorialMinimalFooter({ brand, statement, note }: { brand:string; statement:string; note:string }) {
  return <footer><div className="shell footerInner"><div className="brand footerBrand"><span className="brandMark">{brand.slice(0,1)}</span><span>{brand}</span></div><p>{statement}</p><div><a href="#care">Care</a><a href="#faq">FAQ</a><a href="#contact">Contact</a></div><small>{note}</small></div></footer>;
}
