import type { ReactNode } from "react";
import { Card, Gallery, Stats } from "@micirql/components";
import { Container, Stack, Typography } from "@micirql/primitives";
import type { SectionFamily, SectionVariant } from "./catalog";
import { StructuralFooter, StructuralNavbar } from "./shell-sections";
import { StructuralAbout, StructuralProof, StructuralServices } from "./content-sections";

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

type VariantProps = UniversalSectionProps & { variant: SectionVariant };

function InlineField({ path, children }: { path: string; children: ReactNode }) {
  return <span data-mi-prop-path={path}>{children}</span>;
}

function Actions({ primaryAction, secondaryAction }: Pick<UniversalSectionProps, "primaryAction" | "secondaryAction">) {
  if (!primaryAction && !secondaryAction) return null;
  return <div className="mi-section__actions">{primaryAction ? <a className="mi-section__action mi-section__action--primary" href={primaryAction.href}><InlineField path="primaryAction.label">{primaryAction.label}</InlineField></a> : null}{secondaryAction ? <a className="mi-section__action mi-section__action--secondary" href={secondaryAction.href}><InlineField path="secondaryAction.label">{secondaryAction.label}</InlineField></a> : null}</div>;
}

function Heading(props: UniversalSectionProps) {
  return <Stack gap="sm" className="mi-section__heading">{props.eyebrow ? <Typography variant="eyebrow"><InlineField path="eyebrow">{props.eyebrow}</InlineField></Typography> : null}<Typography as="h2" variant="h2"><InlineField path="title">{props.title}</InlineField></Typography>{props.description ? <Typography variant="body"><InlineField path="description">{props.description}</InlineField></Typography> : null}</Stack>;
}

function ItemGrid({ items = [] }: Pick<UniversalSectionProps, "items">) {
  return <div className="mi-section__grid">{items.map((item, index) => <Card key={`${item.title}-${index}`} className="mi-section__card">{item.image ? <img src={item.image} alt="" loading="lazy" data-mi-image-field={`items.${index}.image`} /> : null}<Typography as="h3" variant="h3"><InlineField path={`items.${index}.title`}>{item.title}</InlineField></Typography>{item.description ? <Typography variant="body-sm"><InlineField path={`items.${index}.description`}>{item.description}</InlineField></Typography> : null}</Card>)}</div>;
}

function NavbarSection(props: VariantProps) {
  return <StructuralNavbar {...props} />;
}

function HeroCopy(props: UniversalSectionProps) {
  return <Stack gap="md" className="mi-hero__copy">{props.eyebrow ? <Typography variant="eyebrow"><InlineField path="eyebrow">{props.eyebrow}</InlineField></Typography> : null}<Typography as="h1" variant="display"><InlineField path="title">{props.title}</InlineField></Typography>{props.description ? <Typography variant="body"><InlineField path="description">{props.description}</InlineField></Typography> : null}<Actions {...props} /></Stack>;
}

function HeroMedia(props: UniversalSectionProps) {
  return props.image ? <figure className="mi-section__media"><img src={props.image.src} alt={props.image.alt} loading="eager" data-mi-image-field="image" /></figure> : null;
}

function HeroSection(props: VariantProps) {
  if (props.variant === 2) return <section className="mi-section mi-section--hero mi-hero--media-first"><Container><div className="mi-hero__split"><HeroMedia {...props} /><HeroCopy {...props} /></div></Container></section>;
  if (props.variant === 3) return <section className="mi-section mi-section--hero mi-hero--centered"><Container><HeroCopy {...props} /><HeroMedia {...props} /></Container></section>;
  if (props.variant === 4) return <section className="mi-section mi-section--hero mi-hero--editorial"><Container><div className="mi-hero__editorial-grid"><div className="mi-hero__index">01</div><HeroCopy {...props} /><HeroMedia {...props} /></div></Container></section>;
  if (props.variant === 5) return <section className="mi-section mi-section--hero mi-hero--immersive"><HeroMedia {...props} /><div className="mi-hero__overlay"><Container><HeroCopy {...props} /></Container></div></section>;
  return <section className="mi-section mi-section--hero mi-hero--split"><Container><div className="mi-hero__split"><HeroCopy {...props} /><HeroMedia {...props} /></div></Container></section>;
}

function StandardSection(props: VariantProps) {
  if (props.variant === 2) return <section className="mi-section"><Container><div className="mi-standard--split"><Heading {...props} /><div><ItemGrid items={props.items ?? []} /><Actions {...props} /></div></div></Container></section>;
  if (props.variant === 3) return <section className="mi-section mi-standard--center"><Container><Stack gap="xl"><Heading {...props} /><ItemGrid items={props.items ?? []} /><Actions {...props} /></Stack></Container></section>;
  if (props.variant === 4) return <section className="mi-section mi-standard--rail"><Container><div className="mi-standard__rail"><Heading {...props} /><ItemGrid items={props.items ?? []} /></div><Actions {...props} /></Container></section>;
  if (props.variant === 5) return <section className="mi-section mi-standard--band"><Container><div className="mi-standard__band"><Heading {...props} /><Actions {...props} /></div><ItemGrid items={props.items ?? []} /></Container></section>;
  return <section className="mi-section"><Container><Stack gap="xl"><Heading {...props} /><ItemGrid items={props.items ?? []} /><Actions {...props} /></Stack></Container></section>;
}

function StatsSection(props: VariantProps) {
  const statItems = (props.items ?? []).map((item, index) => ({ value: String(index + 1).padStart(2, "0"), label: item.title, ...(item.description === undefined ? {} : { detail: item.description }) }));
  return <section className="mi-section"><Container><div className={props.variant === 2 ? "mi-standard--split" : ""}><Heading {...props} /><Stats items={statItems} /></div></Container></section>;
}

function GallerySection(props: VariantProps) {
  const galleryItems = (props.items ?? []).filter((item): item is Item & { image: string } => Boolean(item.image)).map((item) => ({ src: item.image, alt: item.title }));
  return <section className="mi-section"><Container><Stack gap="xl"><Heading {...props} />{galleryItems.length ? <Gallery items={galleryItems} /> : <ItemGrid items={props.items ?? []} />}</Stack></Container></section>;
}

function ContactForm(props: UniversalSectionProps) {
  return props.formAction ? <form className="mi-section__form" action={props.formAction} method="post"><label>Name<input name="name" required /></label><label>Email<input name="email" type="email" required /></label><label>Message<textarea name="message" required /></label><button type="submit">Send enquiry</button></form> : <div><Actions {...props} /></div>;
}

function ContactSection(props: VariantProps) {
  if (props.variant === 3) return <section className="mi-section mi-contact--center"><Container><Heading {...props} /><div className="mi-contact__form-wrap"><ContactForm {...props} /></div></Container></section>;
  if (props.variant === 4) return <section className="mi-section mi-contact--panel"><Container><div className="mi-contact__panel"><Heading {...props} /><ContactForm {...props} /></div></Container></section>;
  return <section className="mi-section"><Container><div className="mi-section__layout"><Heading {...props} /><ContactForm {...props} /></div></Container></section>;
}

function CtaSection(props: VariantProps) {
  if (props.variant === 2) return <section className="mi-section mi-cta--split"><Container><div className="mi-cta__row"><Heading {...props} /><Actions {...props} /></div></Container></section>;
  if (props.variant === 3) return <section className="mi-section mi-cta--center"><Container><Heading {...props} /><Actions {...props} /></Container></section>;
  if (props.variant === 4) return <section className="mi-section mi-cta--outline"><Container><div className="mi-cta__outline"><Heading {...props} /><Actions {...props} /></div></Container></section>;
  if (props.variant === 5) return <section className="mi-section mi-cta--accent"><Container><div className="mi-cta__row"><Heading {...props} /><Actions {...props} /></div></Container></section>;
  return <StandardSection {...props} />;
}

function FooterSection(props: VariantProps) {
  return <StructuralFooter {...props} />;
}

const renderers: Record<SectionFamily, (props: VariantProps) => ReactNode> = {
  navbar: NavbarSection,
  hero: HeroSection,
  about: StructuralAbout,
  services: StructuralServices,
  features: StandardSection,
  process: StatsSection,
  testimonials: StructuralProof,
  gallery: GallerySection,
  team: StandardSection,
  cta: CtaSection,
  contact: ContactSection,
  footer: FooterSection,
};

export function SeedSection({ family, variant, props }: { family: SectionFamily; variant: SectionVariant; props: UniversalSectionProps }) {
  const Renderer = renderers[family];
  return <div className={`mi-section-variant mi-section-variant--${variant}`} data-section-family={family} data-section-variant={variant}><Renderer {...props} variant={variant} /></div>;
}
