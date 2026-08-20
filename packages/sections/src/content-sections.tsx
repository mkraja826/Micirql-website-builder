import { Container, Stack, Typography } from "@micirql/primitives";
import type { SectionVariant } from "./catalog";
import type { UniversalSectionProps } from "./sections";

type VariantProps = UniversalSectionProps & { variant: SectionVariant };
type Item = NonNullable<UniversalSectionProps["items"]>[number];

function InlineField({ path, children }: { path: string; children: React.ReactNode }) {
  return <span data-mi-prop-path={path}>{children}</span>;
}

function Heading({ eyebrow, title, description }: UniversalSectionProps) {
  return <Stack gap="sm" className="mi-content-heading">
    {eyebrow ? <Typography variant="eyebrow"><InlineField path="eyebrow">{eyebrow}</InlineField></Typography> : null}
    <Typography as="h2" variant="h2"><InlineField path="title">{title}</InlineField></Typography>
    {description ? <Typography variant="body"><InlineField path="description">{description}</InlineField></Typography> : null}
  </Stack>;
}

function Actions({ primaryAction, secondaryAction }: UniversalSectionProps) {
  if (!primaryAction && !secondaryAction) return null;
  return <div className="mi-content-actions">
    {primaryAction ? <a className="mi-section__action mi-section__action--primary" href={primaryAction.href}><InlineField path="primaryAction.label">{primaryAction.label}</InlineField></a> : null}
    {secondaryAction ? <a className="mi-section__action mi-section__action--secondary" href={secondaryAction.href}><InlineField path="secondaryAction.label">{secondaryAction.label}</InlineField></a> : null}
  </div>;
}

function ServiceItem({ item, index, numbered = false }: { item: Item; index: number; numbered?: boolean }) {
  const detail = <div><Typography as="h3" variant="h3"><InlineField path={`items.${index}.title`}>{item.title}</InlineField></Typography>{item.description ? <Typography variant="body-sm"><InlineField path={`items.${index}.description`}>{item.description}</InlineField></Typography> : null}</div>;
  return <article className={`mi-service-item${item.href ? " mi-service-item--linked" : ""}`}>
    {numbered ? <span className="mi-service-index">{String(index + 1).padStart(2, "0")}</span> : null}
    {item.image ? <img src={item.image} alt="" loading="lazy" data-mi-image-field={`items.${index}.image`} /> : null}
    {item.href ? <a className="mi-service-item__link" href={item.href} aria-label={`Learn more about ${item.title}`}>{detail}<span className="mi-service-item__arrow" aria-hidden="true">→</span></a> : detail}
  </article>;
}

export function StructuralServices(props: VariantProps) {
  const items = props.items ?? [];
  if (props.variant === 2) return <section className="mi-section mi-services mi-services--list"><Container><div className="mi-services-split"><Heading {...props} /><div className="mi-services-list">{items.map((item, index) => <ServiceItem key={`${item.title}-${index}`} item={item} index={index} numbered />)}</div></div><Actions {...props} /></Container></section>;
  if (props.variant === 3) return <section className="mi-section mi-services mi-services--spotlight"><Container><Heading {...props} /><div className="mi-services-spotlight">{items.map((item, index) => <ServiceItem key={`${item.title}-${index}`} item={item} index={index} />)}</div><Actions {...props} /></Container></section>;
  if (props.variant === 4) return <section className="mi-section mi-services mi-services--editorial"><Container><div className="mi-services-editorial-head"><Heading {...props} /><Actions {...props} /></div><div className="mi-services-editorial-grid">{items.map((item, index) => <ServiceItem key={`${item.title}-${index}`} item={item} index={index} numbered />)}</div></Container></section>;
  if (props.variant === 5) return <section className="mi-section mi-services mi-services--band"><Container><div className="mi-services-band-head"><Heading {...props} /></div><div className="mi-services-band-grid">{items.map((item, index) => <ServiceItem key={`${item.title}-${index}`} item={item} index={index} />)}</div><Actions {...props} /></Container></section>;
  return <section className="mi-section mi-services mi-services--cards"><Container><Stack gap="xl"><Heading {...props} /><div className="mi-services-card-grid">{items.map((item, index) => <ServiceItem key={`${item.title}-${index}`} item={item} index={index} />)}</div><Actions {...props} /></Stack></Container></section>;
}

function AboutMedia(props: UniversalSectionProps) {
  return props.image ? <figure className="mi-about-media"><img src={props.image.src} alt={props.image.alt} loading="lazy" data-mi-image-field="image" /></figure> : null;
}

export function StructuralAbout(props: VariantProps) {
  const items = props.items ?? [];
  if (props.variant === 2) return <section className="mi-section mi-about mi-about--story"><Container><div className="mi-about-story"><div className="mi-about-kicker"><span>Our story</span></div><div><Heading {...props} /><Actions {...props} /></div><AboutMedia {...props} /></div></Container></section>;
  if (props.variant === 3) return <section className="mi-section mi-about mi-about--center"><Container><div className="mi-about-center"><Heading {...props} /><AboutMedia {...props} /><div className="mi-about-values">{items.slice(0, 4).map((item, index) => <article key={`${item.title}-${index}`}><strong><InlineField path={`items.${index}.title`}>{item.title}</InlineField></strong>{item.description ? <p><InlineField path={`items.${index}.description`}>{item.description}</InlineField></p> : null}</article>)}</div><Actions {...props} /></div></Container></section>;
  if (props.variant === 4) return <section className="mi-section mi-about mi-about--editorial"><Container><div className="mi-about-editorial"><div className="mi-about-editorial-title"><Heading {...props} /></div><div className="mi-about-editorial-media"><AboutMedia {...props} /></div><div className="mi-about-editorial-detail">{items.slice(0, 3).map((item, index) => <div key={`${item.title}-${index}`}><span>{String(index + 1).padStart(2, "0")}</span><strong><InlineField path={`items.${index}.title`}>{item.title}</InlineField></strong>{item.description ? <p><InlineField path={`items.${index}.description`}>{item.description}</InlineField></p> : null}</div>)}<Actions {...props} /></div></div></Container></section>;
  if (props.variant === 5) return <section className="mi-section mi-about mi-about--statement"><Container><div className="mi-about-statement"><Heading {...props} /><div className="mi-about-statement-bottom"><AboutMedia {...props} /><div className="mi-about-values">{items.slice(0, 3).map((item, index) => <article key={`${item.title}-${index}`}><strong><InlineField path={`items.${index}.title`}>{item.title}</InlineField></strong>{item.description ? <p><InlineField path={`items.${index}.description`}>{item.description}</InlineField></p> : null}</article>)}</div></div><Actions {...props} /></div></Container></section>;
  return <section className="mi-section mi-about mi-about--split"><Container><div className="mi-about-split"><AboutMedia {...props} /><div><Heading {...props} /><div className="mi-about-values">{items.slice(0, 3).map((item, index) => <article key={`${item.title}-${index}`}><strong><InlineField path={`items.${index}.title`}>{item.title}</InlineField></strong>{item.description ? <p><InlineField path={`items.${index}.description`}>{item.description}</InlineField></p> : null}</article>)}</div><Actions {...props} /></div></div></Container></section>;
}

export function StructuralProof(props: VariantProps) {
  const items = props.items ?? [];
  if (props.variant === 2) return <section className="mi-section mi-proof mi-proof--quote"><Container><div className="mi-proof-quote"><Heading {...props} />{items[0] ? <blockquote><p>“<InlineField path="items.0.description">{items[0].description ?? items[0].title}</InlineField>”</p><cite><InlineField path="items.0.title">{items[0].title}</InlineField></cite></blockquote> : null}</div></Container></section>;
  if (props.variant === 3) return <section className="mi-section mi-proof mi-proof--metrics"><Container><Heading {...props} /><div className="mi-proof-metrics">{items.map((item, index) => <article key={`${item.title}-${index}`}><span>{String(index + 1).padStart(2, "0")}</span><strong><InlineField path={`items.${index}.title`}>{item.title}</InlineField></strong>{item.description ? <p><InlineField path={`items.${index}.description`}>{item.description}</InlineField></p> : null}</article>)}</div></Container></section>;
  if (props.variant === 4) return <section className="mi-section mi-proof mi-proof--wall"><Container><div className="mi-proof-wall-head"><Heading {...props} /></div><div className="mi-proof-wall">{items.map((item, index) => <blockquote key={`${item.title}-${index}`}><p><InlineField path={`items.${index}.description`}>{item.description ?? item.title}</InlineField></p><cite><InlineField path={`items.${index}.title`}>{item.title}</InlineField></cite></blockquote>)}</div></Container></section>;
  if (props.variant === 5) return <section className="mi-section mi-proof mi-proof--dark"><Container><div className="mi-proof-dark"><Heading {...props} /><div className="mi-proof-dark-grid">{items.slice(0, 4).map((item, index) => <article key={`${item.title}-${index}`}><strong><InlineField path={`items.${index}.title`}>{item.title}</InlineField></strong>{item.description ? <p><InlineField path={`items.${index}.description`}>{item.description}</InlineField></p> : null}</article>)}</div></div></Container></section>;
  return <section className="mi-section mi-proof mi-proof--cards"><Container><Heading {...props} /><div className="mi-proof-card-grid">{items.map((item, index) => <blockquote key={`${item.title}-${index}`}><p><InlineField path={`items.${index}.description`}>{item.description ?? item.title}</InlineField></p><cite><InlineField path={`items.${index}.title`}>{item.title}</InlineField></cite></blockquote>)}</div></Container></section>;
}
