import { Container, Stack, Typography } from "@micirql/primitives";
import type { SectionVariant } from "./catalog";
import type { UniversalSectionProps } from "./sections";
import { FunctionalContactForm } from "./functional-form";

type VariantProps = UniversalSectionProps & { variant: SectionVariant };
type Item = NonNullable<UniversalSectionProps["items"]>[number];

function InlineField({ path, children }: { path: string; children: React.ReactNode }) {
  return <span data-mi-prop-path={path}>{children}</span>;
}

function Heading(props: UniversalSectionProps) {
  return <Stack gap="sm" className="mi-conv-heading">
    {props.eyebrow ? <Typography variant="eyebrow"><InlineField path="eyebrow">{props.eyebrow}</InlineField></Typography> : null}
    <Typography as="h2" variant="h2"><InlineField path="title">{props.title}</InlineField></Typography>
    {props.description ? <Typography variant="body"><InlineField path="description">{props.description}</InlineField></Typography> : null}
  </Stack>;
}

function Actions(props: UniversalSectionProps) {
  if (!props.primaryAction && !props.secondaryAction) return null;
  return <div className="mi-conv-actions">
    {props.primaryAction ? <a className="mi-conv-btn mi-conv-btn--primary" href={props.primaryAction.href}><InlineField path="primaryAction.label">{props.primaryAction.label}</InlineField></a> : null}
    {props.secondaryAction ? <a className="mi-conv-btn mi-conv-btn--secondary" href={props.secondaryAction.href}><InlineField path="secondaryAction.label">{props.secondaryAction.label}</InlineField></a> : null}
  </div>;
}

function ProcessItems({ items = [] }: { items?: Item[] }) {
  return <ol className="mi-process-list">{items.map((item, index) => <li key={`${item.title}-${index}`} className="mi-process-item">
    <span className="mi-process-index">{String(index + 1).padStart(2, "0")}</span>
    <div><Typography as="h3" variant="h3"><InlineField path={`items.${index}.title`}>{item.title}</InlineField></Typography>{item.description ? <Typography variant="body-sm"><InlineField path={`items.${index}.description`}>{item.description}</InlineField></Typography> : null}</div>
  </li>)}</ol>;
}

export function StructuralProcess(props: VariantProps) {
  if (props.variant === 2) return <section className="mi-section mi-process mi-process--split"><Container><div className="mi-process-split"><Heading {...props} /><ProcessItems items={props.items} /></div></Container></section>;
  if (props.variant === 3) return <section className="mi-section mi-process mi-process--timeline"><Container><Heading {...props} /><div className="mi-process-timeline">{(props.items ?? []).map((item, index) => <article key={`${item.title}-${index}`} className="mi-process-node"><span>{index + 1}</span><Typography as="h3" variant="h3"><InlineField path={`items.${index}.title`}>{item.title}</InlineField></Typography>{item.description ? <Typography variant="body-sm"><InlineField path={`items.${index}.description`}>{item.description}</InlineField></Typography> : null}</article>)}</div></Container></section>;
  if (props.variant === 4) return <section className="mi-section mi-process mi-process--sticky"><Container><div className="mi-process-sticky"><div><Heading {...props} /><Actions {...props} /></div><ProcessItems items={props.items} /></div></Container></section>;
  if (props.variant === 5) return <section className="mi-section mi-process mi-process--band"><Container><Heading {...props} /><div className="mi-process-band">{(props.items ?? []).map((item, index) => <article key={`${item.title}-${index}`}><strong>{String(index + 1).padStart(2, "0")}</strong><div><Typography as="h3" variant="h3"><InlineField path={`items.${index}.title`}>{item.title}</InlineField></Typography>{item.description ? <Typography variant="body-sm"><InlineField path={`items.${index}.description`}>{item.description}</InlineField></Typography> : null}</div></article>)}</div></Container></section>;
  return <section className="mi-section mi-process mi-process--cards"><Container><Heading {...props} /><div className="mi-process-cards">{(props.items ?? []).map((item, index) => <article key={`${item.title}-${index}`}><span>{String(index + 1).padStart(2, "0")}</span><Typography as="h3" variant="h3"><InlineField path={`items.${index}.title`}>{item.title}</InlineField></Typography>{item.description ? <Typography variant="body-sm"><InlineField path={`items.${index}.description`}>{item.description}</InlineField></Typography> : null}</article>)}</div></Container></section>;
}

export function StructuralCta(props: VariantProps) {
  if (props.variant === 2) return <section className="mi-section mi-conv-cta mi-conv-cta--split"><Container><div className="mi-cta-split"><Heading {...props} /><Actions {...props} /></div></Container></section>;
  if (props.variant === 3) return <section className="mi-section mi-conv-cta mi-conv-cta--center"><Container><div className="mi-cta-center"><Heading {...props} /><Actions {...props} /></div></Container></section>;
  if (props.variant === 4) return <section className="mi-section mi-conv-cta mi-conv-cta--panel"><Container><div className="mi-cta-panel"><Heading {...props} /><Actions {...props} /></div></Container></section>;
  if (props.variant === 5) return <section className="mi-section mi-conv-cta mi-conv-cta--brand"><Container><div className="mi-cta-brand"><div className="mi-cta-brand__mark">↗</div><Heading {...props} /><Actions {...props} /></div></Container></section>;
  return <section className="mi-section mi-conv-cta mi-conv-cta--band"><Container><div className="mi-cta-band"><Heading {...props} /><Actions {...props} /></div></Container></section>;
}

function ContactForm(props: UniversalSectionProps) {
  if (!props.formAction) return <div className="mi-contact-actions"><Actions {...props} /></div>;
  return <FunctionalContactForm {...(props as UniversalSectionProps & Record<string, unknown>)} />;
}

export function StructuralContact(props: VariantProps) {
  if (props.variant === 2) return <section className="mi-section mi-contact-struct mi-contact-struct--split"><Container><div className="mi-contact-split"><div><Heading {...props} /><Actions {...props} /></div><ContactForm {...props} /></div></Container></section>;
  if (props.variant === 3) return <section className="mi-section mi-contact-struct mi-contact-struct--center"><Container><div className="mi-contact-center"><Heading {...props} /><ContactForm {...props} /></div></Container></section>;
  if (props.variant === 4) return <section className="mi-section mi-contact-struct mi-contact-struct--panel"><Container><div className="mi-contact-panel"><div className="mi-contact-panel__aside"><Heading {...props} /><div className="mi-contact-panel__meta">Fast response · Clear next steps · No obligation</div></div><ContactForm {...props} /></div></Container></section>;
  if (props.variant === 5) return <section className="mi-section mi-contact-struct mi-contact-struct--dark"><Container><div className="mi-contact-dark"><div><Heading {...props} /><Actions {...props} /></div><ContactForm {...props} /></div></Container></section>;
  return <section className="mi-section mi-contact-struct mi-contact-struct--classic"><Container><div className="mi-contact-classic"><Heading {...props} /><ContactForm {...props} /></div></Container></section>;
}
