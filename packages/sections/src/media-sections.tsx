import { Container, Stack, Typography } from "@micirql/primitives";
import type { SectionVariant } from "./catalog";
import type { UniversalSectionProps } from "./sections";

type VariantProps = UniversalSectionProps & { variant: SectionVariant };
type Item = NonNullable<UniversalSectionProps["items"]>[number];

function InlineField({ path, children }: { path: string; children: React.ReactNode }) {
  return <span data-mi-prop-path={path}>{children}</span>;
}

function Heading(props: UniversalSectionProps) {
  return <Stack gap="sm" className="mi-section__heading">{props.eyebrow ? <Typography variant="eyebrow"><InlineField path="eyebrow">{props.eyebrow}</InlineField></Typography> : null}<Typography as="h2" variant="h2"><InlineField path="title">{props.title}</InlineField></Typography>{props.description ? <Typography variant="body"><InlineField path="description">{props.description}</InlineField></Typography> : null}</Stack>;
}

function Actions(props: UniversalSectionProps) {
  if (!props.primaryAction && !props.secondaryAction) return null;
  return <div className="mi-section__actions">{props.primaryAction ? <a className="mi-section__action mi-section__action--primary" href={props.primaryAction.href}><InlineField path="primaryAction.label">{props.primaryAction.label}</InlineField></a> : null}{props.secondaryAction ? <a className="mi-section__action mi-section__action--secondary" href={props.secondaryAction.href}><InlineField path="secondaryAction.label">{props.secondaryAction.label}</InlineField></a> : null}</div>;
}

function FeatureItem({ item, index, mode }: { item: Item; index: number; mode: string }) {
  return <article className={`mi-feature-item mi-feature-item--${mode}`}>{item.image ? <img src={item.image} alt="" loading="lazy" data-mi-image-field={`items.${index}.image`} /> : <span className="mi-feature-index">{String(index + 1).padStart(2, "0")}</span>}<div><h3><InlineField path={`items.${index}.title`}>{item.title}</InlineField></h3>{item.description ? <p><InlineField path={`items.${index}.description`}>{item.description}</InlineField></p> : null}</div></article>;
}

export function StructuralFeatures(props: VariantProps) {
  const items = props.items ?? [];
  if (props.variant === 2) return <section className="mi-section mi-features mi-features--split"><Container><div className="mi-features-split"><div><Heading {...props} /><Actions {...props} /></div><div className="mi-features-list">{items.map((item, index) => <FeatureItem key={`${item.title}-${index}`} item={item} index={index} mode="list" />)}</div></div></Container></section>;
  if (props.variant === 3) return <section className="mi-section mi-features mi-features--bento"><Container><Heading {...props} /><div className="mi-features-bento">{items.map((item, index) => <FeatureItem key={`${item.title}-${index}`} item={item} index={index} mode={index % 3 === 0 ? "wide" : "tile"} />)}</div></Container></section>;
  if (props.variant === 4) return <section className="mi-section mi-features mi-features--editorial"><Container><div className="mi-features-editorial"><Heading {...props} /><div className="mi-features-editorial__items">{items.map((item, index) => <FeatureItem key={`${item.title}-${index}`} item={item} index={index} mode="editorial" />)}</div></div></Container></section>;
  if (props.variant === 5) return <section className="mi-section mi-features mi-features--dark"><Container><div className="mi-features-dark"><Heading {...props} /><div className="mi-features-dark__grid">{items.map((item, index) => <FeatureItem key={`${item.title}-${index}`} item={item} index={index} mode="dark" />)}</div><Actions {...props} /></div></Container></section>;
  return <section className="mi-section mi-features mi-features--grid"><Container><Stack gap="xl"><Heading {...props} /><div className="mi-features-grid">{items.map((item, index) => <FeatureItem key={`${item.title}-${index}`} item={item} index={index} mode="card" />)}</div><Actions {...props} /></Stack></Container></section>;
}

function TeamCard({ item, index, mode }: { item: Item; index: number; mode: string }) {
  return <article className={`mi-team-card mi-team-card--${mode}`}>{item.image ? <img src={item.image} alt="" loading="lazy" data-mi-image-field={`items.${index}.image`} /> : <div className="mi-team-avatar">{item.title.slice(0, 1)}</div>}<div><h3><InlineField path={`items.${index}.title`}>{item.title}</InlineField></h3>{item.description ? <p><InlineField path={`items.${index}.description`}>{item.description}</InlineField></p> : null}</div></article>;
}

export function StructuralTeam(props: VariantProps) {
  const items = props.items ?? [];
  if (props.variant === 2) return <section className="mi-section mi-team mi-team--featured"><Container><Heading {...props} />{items[0] ? <div className="mi-team-featured"><TeamCard item={items[0]} index={0} mode="lead" /><div className="mi-team-featured__grid">{items.slice(1).map((item, i) => <TeamCard key={`${item.title}-${i}`} item={item} index={i + 1} mode="compact" />)}</div></div> : null}</Container></section>;
  if (props.variant === 3) return <section className="mi-section mi-team mi-team--profiles"><Container><div className="mi-team-profile-layout"><Heading {...props} /><div className="mi-team-profile-list">{items.map((item, index) => <TeamCard key={`${item.title}-${index}`} item={item} index={index} mode="profile" />)}</div></div></Container></section>;
  if (props.variant === 4) return <section className="mi-section mi-team mi-team--editorial"><Container><div className="mi-team-editorial"><Heading {...props} /><div className="mi-team-editorial__rail">{items.map((item, index) => <TeamCard key={`${item.title}-${index}`} item={item} index={index} mode="editorial" />)}</div></div></Container></section>;
  if (props.variant === 5) return <section className="mi-section mi-team mi-team--dark"><Container><Heading {...props} /><div className="mi-team-dark__grid">{items.map((item, index) => <TeamCard key={`${item.title}-${index}`} item={item} index={index} mode="dark" />)}</div></Container></section>;
  return <section className="mi-section mi-team mi-team--grid"><Container><Stack gap="xl"><Heading {...props} /><div className="mi-team-grid">{items.map((item, index) => <TeamCard key={`${item.title}-${index}`} item={item} index={index} mode="grid" />)}</div></Stack></Container></section>;
}

function GalleryItem({ item, index, mode }: { item: Item; index: number; mode: string }) {
  return <figure className={`mi-gallery-card mi-gallery-card--${mode}`}>{item.image ? <img src={item.image} alt={item.title} loading="lazy" data-mi-image-field={`items.${index}.image`} /> : <div className="mi-gallery-placeholder" />}<figcaption><strong><InlineField path={`items.${index}.title`}>{item.title}</InlineField></strong>{item.description ? <span><InlineField path={`items.${index}.description`}>{item.description}</InlineField></span> : null}</figcaption></figure>;
}

export function StructuralGallery(props: VariantProps) {
  const items = props.items ?? [];
  if (props.variant === 2) return <section className="mi-section mi-gallery-section mi-gallery-section--mosaic"><Container><Heading {...props} /><div className="mi-gallery-mosaic">{items.map((item, index) => <GalleryItem key={`${item.title}-${index}`} item={item} index={index} mode={index % 4 === 0 ? "large" : "small"} />)}</div></Container></section>;
  if (props.variant === 3) return <section className="mi-section mi-gallery-section mi-gallery-section--rail"><Container><Heading {...props} /><div className="mi-gallery-rail">{items.map((item, index) => <GalleryItem key={`${item.title}-${index}`} item={item} index={index} mode="rail" />)}</div></Container></section>;
  if (props.variant === 4) return <section className="mi-section mi-gallery-section mi-gallery-section--editorial"><Container><div className="mi-gallery-editorial"><Heading {...props} /><div>{items.map((item, index) => <GalleryItem key={`${item.title}-${index}`} item={item} index={index} mode="editorial" />)}</div></div></Container></section>;
  if (props.variant === 5) return <section className="mi-section mi-gallery-section mi-gallery-section--full"><div className="mi-gallery-full">{items.map((item, index) => <GalleryItem key={`${item.title}-${index}`} item={item} index={index} mode="full" />)}</div></section>;
  return <section className="mi-section mi-gallery-section mi-gallery-section--grid"><Container><Stack gap="xl"><Heading {...props} /><div className="mi-gallery-struct-grid">{items.map((item, index) => <GalleryItem key={`${item.title}-${index}`} item={item} index={index} mode="grid" />)}</div></Stack></Container></section>;
}
