import type { ReactNode } from "react";
import { Card } from "@micirql/components";
import { Container, Stack, Typography } from "@micirql/primitives";
import type { SectionFamily, SectionVariant } from "./catalog";
import { StructuralFooter, StructuralNavbar } from "./shell-sections";
import { StructuralAbout, StructuralProof, StructuralServices } from "./content-sections";
import { StructuralContact, StructuralCta, StructuralProcess } from "./conversion-sections";
import { StructuralFeatures, StructuralGallery, StructuralTeam } from "./media-sections";

type Action = { label: string; href: string };
type Item = { title: string; description?: string; image?: string };
export type PaletteRole = "background" | "surface" | "primary" | "secondary" | "accent";
export type ImageSlotMode = "none" | "section" | "items" | "both";
export type ImageRatio = "1:1" | "4:5" | "3:2" | "4:3" | "16:10" | "16:9" | "21:9";

export type UniversalSectionProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  primaryAction?: Action;
  secondaryAction?: Action;
  items?: Item[];
  image?: { src: string; alt: string };
  formAction?: string;
  paletteRole?: PaletteRole;
  cardPaletteRole?: PaletteRole;
  ctaPaletteRole?: PaletteRole;
  imageSlotMode?: ImageSlotMode;
  imageRatio?: ImageRatio;
  itemImageRatio?: ImageRatio;
  imageFit?: "cover" | "contain";
  imageFocalPoint?: "center" | "top" | "face-safe";
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

function wantsSectionImage(props: UniversalSectionProps): boolean {
  return props.imageSlotMode === "section" || props.imageSlotMode === "both";
}

function wantsItemImages(props: UniversalSectionProps): boolean {
  return props.imageSlotMode === "items" || props.imageSlotMode === "both";
}

function Placeholder({ label = "Add photo" }: { label?: string }) {
  return <div className="mi-image-slot-placeholder" aria-label={label}><span>{label}</span></div>;
}

function ItemGrid({ items = [], showPlaceholders = false }: Pick<UniversalSectionProps, "items"> & { showPlaceholders?: boolean }) {
  return <div className="mi-section__grid">{items.map((item, index) => <Card key={`${item.title}-${index}`} className="mi-section__card">{item.image ? <img src={item.image} alt="" loading="lazy" data-mi-image-field={`items.${index}.image`} /> : showPlaceholders ? <Placeholder /> : null}<Typography as="h3" variant="h3"><InlineField path={`items.${index}.title`}>{item.title}</InlineField></Typography>{item.description ? <Typography variant="body-sm"><InlineField path={`items.${index}.description`}>{item.description}</InlineField></Typography> : null}</Card>)}</div>;
}

function NavbarSection(props: VariantProps) {
  return <StructuralNavbar {...props} />;
}

function HeroCopy(props: UniversalSectionProps) {
  return <Stack gap="md" className="mi-hero__copy">{props.eyebrow ? <Typography variant="eyebrow"><InlineField path="eyebrow">{props.eyebrow}</InlineField></Typography> : null}<Typography as="h1" variant="display"><InlineField path="title">{props.title}</InlineField></Typography>{props.description ? <Typography variant="body"><InlineField path="description">{props.description}</InlineField></Typography> : null}<Actions {...props} /></Stack>;
}

function HeroMedia(props: UniversalSectionProps) {
  if (props.image) return <figure className="mi-section__media"><img src={props.image.src} alt={props.image.alt} loading="eager" data-mi-image-field="image" /></figure>;
  return wantsSectionImage(props) ? <figure className="mi-section__media mi-section__media--placeholder"><Placeholder label="Add hero photo" /></figure> : null;
}

function HeroSection(props: VariantProps) {
  if (props.variant === 2) return <section className="mi-section mi-section--hero mi-hero--media-first"><Container><div className="mi-hero__split"><HeroMedia {...props} /><HeroCopy {...props} /></div></Container></section>;
  if (props.variant === 3) return <section className="mi-section mi-section--hero mi-hero--centered"><Container><HeroCopy {...props} /><HeroMedia {...props} /></Container></section>;
  if (props.variant === 4) return <section className="mi-section mi-section--hero mi-hero--editorial"><Container><div className="mi-hero__editorial-grid"><div className="mi-hero__index">01</div><HeroCopy {...props} /><HeroMedia {...props} /></div></Container></section>;
  if (props.variant === 5) return <section className="mi-section mi-section--hero mi-hero--immersive"><HeroMedia {...props} /><div className="mi-hero__overlay"><Container><HeroCopy {...props} /></Container></div></section>;
  return <section className="mi-section mi-section--hero mi-hero--split"><Container><div className="mi-hero__split"><HeroCopy {...props} /><HeroMedia {...props} /></div></Container></section>;
}

function StandardSection(props: VariantProps) {
  const itemGrid = <ItemGrid items={props.items ?? []} showPlaceholders={wantsItemImages(props)} />;
  if (props.variant === 2) return <section className="mi-section"><Container><div className="mi-standard--split"><Heading {...props} /><div>{itemGrid}<Actions {...props} /></div></div></Container></section>;
  if (props.variant === 3) return <section className="mi-section mi-standard--center"><Container><Stack gap="xl"><Heading {...props} />{itemGrid}<Actions {...props} /></Stack></Container></section>;
  if (props.variant === 4) return <section className="mi-section mi-standard--rail"><Container><div className="mi-standard__rail"><Heading {...props} />{itemGrid}</div><Actions {...props} /></Container></section>;
  if (props.variant === 5) return <section className="mi-section mi-standard--band"><Container><div className="mi-standard__band"><Heading {...props} /><Actions {...props} /></div>{itemGrid}</Container></section>;
  return <section className="mi-section"><Container><Stack gap="xl"><Heading {...props} />{itemGrid}<Actions {...props} /></Stack></Container></section>;
}

function FooterSection(props: VariantProps) {
  return <StructuralFooter {...props} />;
}

const renderers: Record<SectionFamily, (props: VariantProps) => ReactNode> = {
  navbar: NavbarSection,
  hero: HeroSection,
  about: StructuralAbout,
  services: StructuralServices,
  features: StructuralFeatures,
  process: StructuralProcess,
  testimonials: StructuralProof,
  gallery: StructuralGallery,
  team: StructuralTeam,
  cta: StructuralCta,
  contact: StructuralContact,
  footer: FooterSection,
};

export function SeedSection({ family, variant, props }: { family: SectionFamily; variant: SectionVariant; props: UniversalSectionProps }) {
  const Renderer = renderers[family];
  return <div
    className={`mi-section-variant mi-section-variant--${variant}`}
    data-section-family={family}
    data-section-variant={variant}
    data-mi-palette-role={props.paletteRole ?? "surface"}
    data-mi-card-palette-role={props.cardPaletteRole ?? "background"}
    data-mi-cta-palette-role={props.ctaPaletteRole ?? "primary"}
    data-mi-image-slot-mode={props.imageSlotMode ?? "none"}
    data-mi-image-ratio={props.imageRatio ?? "4:3"}
    data-mi-item-image-ratio={props.itemImageRatio ?? "4:3"}
    data-mi-image-fit={props.imageFit ?? "cover"}
    data-mi-image-focal={props.imageFocalPoint ?? "center"}
  ><Renderer {...props} variant={variant} /></div>;
}
