export type FooterLink = { label:string; href:string };

export function EditorialMinimalFooter({ brand, statement, links, note }: { brand:string; statement:string; links:FooterLink[]; note:string }) {
  return <footer><div className="shell footerInner"><div className="brand footerBrand"><span className="brandMark">{brand.slice(0,1)}</span><span>{brand}</span></div><p>{statement}</p><div>{links.map((link)=><a key={link.href} href={link.href}>{link.label}</a>)}</div><small>{note}</small></div></footer>;
}
