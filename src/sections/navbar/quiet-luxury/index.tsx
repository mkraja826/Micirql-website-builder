export type NavbarLink = { label: string; href: string };

export function QuietLuxuryNavbar({ brand, links, cta }: { brand: string; links: NavbarLink[]; cta: NavbarLink }) {
  return <header className="nav shell"><a className="brand" href="#top" aria-label={`${brand} home`}><span className="brandMark">{brand.slice(0,1)}</span><span>{brand}</span></a><nav aria-label="Primary navigation">{links.map((link)=><a key={link.href} href={link.href}>{link.label}</a>)}</nav><a className="button buttonSmall" href={cta.href}>{cta.label}</a></header>;
}
