import type { ReactNode } from "react";
import { Card, Gallery, NavigationMenu, Stats } from "@micirql/components";
import { Container, Stack, Typography } from "@micirql/primitives";
import type { SectionFamily, SectionVariant } from "./catalog";

type Action = { label: string; href: string };
type Item = { title: string; description?: string; image?: string };

export type UniversalSectionProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  primaryAction?: Action;
  secondaryAction?: Action;
  items?: Item[];
  image?: { src: string; alt: string };
  formAction?: string;
};

function Actions({ primaryAction, secondaryAction }: Pick<UniversalSectionProps, "primaryAction" | "secondaryAction">) {
  if (!primaryAction && !secondaryAction) return null;
  return <div className="mi-section__actions">{primaryAction ? <a className="mi-section__action mi-section__action--primary" href={primaryAction.href}>{primaryAction.label}</a> : null}{secondaryAction ? <a className="mi-section__action mi-section__action--secondary" href={secondaryAction.href}>{secondaryAction.label}</a> : null}</div>;
}

function Heading(props: UniversalSectionProps) {
  return <Stack gap="sm" className="mi-section__heading">{props.eyebrow ? <Typography variant="eyebrow">{props.eyebrow}</Typography> : null}<Typography as="h2" variant="h2">{props.title}</Typography>{props.description ? <Typography variant="body">{props.description}</Typography> : null}</Stack>;
}

function ItemGrid({ items = [] }: Pick<UniversalSectionProps, "items">) {
  return <div className="mi-section__grid">{items.map((item, index) => <Card key={`${item.title}-${index}`} className="mi-section__card">{item.image ? <img src={item.image} alt="" loading="lazy" /> : null}<Typography as="h3" variant="h3">{item.title}</Typography>{item.description ? <Typography variant="body-sm">{item.description}</Typography> : null}</Card>)}</div>;
}

function NavbarSection({ title, items = [], primaryAction }: UniversalSectionProps) {
  return <header className="mi-section mi-section--navbar"><Container><div className="mi-navbar"><a href="/" className="mi-navbar__brand">{title}</a><NavigationMenu items={items.map((item, i) => ({ label: item.title, href: `#section-${i + 1}` }))} />{primaryAction ? <a className="mi-section__action mi-section__action--primary" href={primaryAction.href}>{primaryAction.label}</a> : null}</div></Container></header>;
}

function HeroSection(props: UniversalSectionProps) {
  return <section className="mi-section mi-section--hero"><Container><div className="mi-section__layout"><div><Stack gap="md">{props.eyebrow ? <Typography variant="eyebrow">{props.eyebrow}</Typography> : null}<Typography as="h1" variant="display">{props.title}</Typography>{props.description ? <Typography variant="body">{props.description}</Typography> : null}<Actions {...props} /></Stack></div>{props.image ? <figure className="mi-section__media"><img src={props.image.src} alt={props.image.alt} loading="eager" /></figure> : null}</div></Container></section>;
}

function StandardSection(props: UniversalSectionProps) {
  return <section className="mi-section"><Container><Stack gap="xl"><Heading {...props} /><ItemGrid items={props.items ?? []} /><Actions {...props} /></Stack></Container></section>;
}

function StatsSection(props: UniversalSectionProps) {
  const statItems = (props.items ?? []).map((item, index) => ({
    value: String(index + 1).padStart(2, "0"),
    label: item.title,
    ...(item.description === undefined ? {} : { detail: item.description }),
  }));
  return <section className="mi-section"><Container><Stack gap="xl"><Heading {...props} /><Stats items={statItems} /></Stack></Container></section>;
}

function GallerySection(props: UniversalSectionProps) {
  const galleryItems = (props.items ?? []).filter((item): item is Item & { image: string } => Boolean(item.image)).map((item) => ({ src: item.image, alt: item.title }));
  return <section className="mi-section"><Container><Stack gap="xl"><Heading {...props} />{galleryItems.length ? <Gallery items={galleryItems} /> : <ItemGrid items={props.items ?? []} />}</Stack></Container></section>;
}

function ContactSection(props: UniversalSectionProps) {
  return <section className="mi-section"><Container><div className="mi-section__layout"><Heading {...props} />{props.formAction ? <form className="mi-section__form" action={props.formAction} method="post"><label>Name<input name="name" required /></label><label>Email<input name="email" type="email" required /></label><label>Message<textarea name="message" required /></label><button type="submit">Send enquiry</button></form> : <div><Actions {...props} /></div>}</div></Container></section>;
}

function FooterSection(props: UniversalSectionProps) {
  return <footer className="mi-section mi-section--footer"><Container><div className="mi-footer"><div><strong>{props.title}</strong>{props.description ? <p>{props.description}</p> : null}</div><nav aria-label="Footer navigation">{(props.items ?? []).map((item, index) => <a key={`${item.title}-${index}`} href={`#section-${index + 1}`}>{item.title}</a>)}</nav></div></Container></footer>;
}

const renderers: Record<SectionFamily, (props: UniversalSectionProps) => ReactNode> = {
  navbar: NavbarSection,
  hero: HeroSection,
  about: StandardSection,
  services: StandardSection,
  features: StandardSection,
  process: StatsSection,
  testimonials: StandardSection,
  gallery: GallerySection,
  team: StandardSection,
  cta: StandardSection,
  contact: ContactSection,
  footer: FooterSection,
};

export function SeedSection({ family, variant, props }: { family: SectionFamily; variant: SectionVariant; props: UniversalSectionProps }) {
  const Renderer = renderers[family];
  return <div className={`mi-section-variant mi-section-variant--${variant}`} data-section-family={family} data-section-variant={variant}><Renderer {...props} /></div>;
}
