export function QuietLuxuryNavbar({ brand }: { brand: string }) {
  return <header className="nav shell"><a className="brand" href="#top" aria-label={`${brand} home`}><span className="brandMark">{brand.slice(0,1)}</span><span>{brand}</span></a><nav aria-label="Primary navigation"><a href="#care">Care</a><a href="#approach">Approach</a><a href="#faq">FAQ</a><a href="#contact">Contact</a></nav><a className="button buttonSmall" href="#contact">Book appointment</a></header>;
}
