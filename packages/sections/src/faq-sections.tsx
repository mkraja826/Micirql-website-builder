import { Container, Stack, Typography } from "@micirql/primitives";
import type { SectionVariant } from "./catalog";
import type { UniversalSectionProps } from "./sections";

type VariantProps = UniversalSectionProps & { variant: SectionVariant };
type Item = NonNullable<UniversalSectionProps["items"]>[number];

function InlineField({ path, children }: { path: string; children: React.ReactNode }) {
  return <span data-mi-prop-path={path}>{children}</span>;
}

function slug(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 56) || "question";
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function Heading(props: UniversalSectionProps) {
  return <Stack gap="sm" className="mi-faq-heading">
    {props.eyebrow ? <Typography variant="eyebrow"><InlineField path="eyebrow">{props.eyebrow}</InlineField></Typography> : null}
    <Typography as="h2" variant="h2"><InlineField path="title">{props.title}</InlineField></Typography>
    {props.description ? <Typography variant="body"><InlineField path="description">{props.description}</InlineField></Typography> : null}
  </Stack>;
}

function FaqList({ props, variant }: { props: UniversalSectionProps; variant: SectionVariant }) {
  // Keep visible FAQ pairs and FAQPage JSON-LD on one content contract: a
  // disclosure only exists when both the question and answer are present, and
  // the first visible occurrence of a repeated question is authoritative.
  const seenQuestions = new Set<string>();
  const items = (props.items ?? [])
    .map((item: Item, sourceIndex) => ({ sourceIndex, question: text(item.title), answer: text(item.description) }))
    .filter((entry) => entry.question && entry.answer)
    .filter((entry) => {
      if (seenQuestions.has(entry.question)) return false;
      seenQuestions.add(entry.question);
      return true;
    });
  const mode = props.faqMode ?? (variant === 2 || variant === 4 ? "multi" : "single");
  const groupId = `faq-${slug(props.title)}-${variant}`;
  return <div className="mi-faq-list" data-mi-faq data-mi-faq-mode={mode} data-mi-faq-group={groupId}>
    {items.map(({ sourceIndex, question, answer }, visibleIndex) => {
      const itemId = `${groupId}-${slug(question)}-${visibleIndex + 1}`;
      const questionId = `${itemId}-question`;
      const answerId = `${itemId}-answer`;
      return <details id={itemId} className="mi-faq-item" data-mi-faq-item key={`${question}-${sourceIndex}`}>
        <summary id={questionId} className="mi-faq-summary" data-mi-faq-summary aria-controls={answerId} aria-expanded="false">
          <span className="mi-faq-question"><InlineField path={`items.${sourceIndex}.title`}>{question}</InlineField></span>
          <span className="mi-faq-icon" aria-hidden="true">+</span>
        </summary>
        <div id={answerId} className="mi-faq-answer" data-mi-faq-panel role="region" aria-labelledby={questionId}>
          <p><InlineField path={`items.${sourceIndex}.description`}>{answer}</InlineField></p>
        </div>
      </details>;
    })}
  </div>;
}

function Actions(props: UniversalSectionProps) {
  if (!props.primaryAction && !props.secondaryAction) return null;
  return <div className="mi-faq-actions">
    {props.primaryAction ? <a className="mi-section__action mi-section__action--primary" href={props.primaryAction.href}><InlineField path="primaryAction.label">{props.primaryAction.label}</InlineField></a> : null}
    {props.secondaryAction ? <a className="mi-section__action mi-section__action--secondary" href={props.secondaryAction.href}><InlineField path="secondaryAction.label">{props.secondaryAction.label}</InlineField></a> : null}
  </div>;
}

export function StructuralFaq(props: VariantProps) {
  const list = <FaqList props={props} variant={props.variant} />;
  const actions = <Actions {...props} />;

  if (props.variant === 2) return <section className="mi-section mi-faq-section mi-faq-section--split"><Container><div className="mi-faq-split"><div className="mi-faq-intro"><Heading {...props} />{actions}</div>{list}</div></Container></section>;
  if (props.variant === 3) return <section className="mi-section mi-faq-section mi-faq-section--centered"><Container><div className="mi-faq-centered"><Heading {...props} />{list}{actions}</div></Container></section>;
  if (props.variant === 4) return <section className="mi-section mi-faq-section mi-faq-section--editorial"><Container><div className="mi-faq-editorial"><div className="mi-faq-editorial__index" aria-hidden="true">FAQ</div><div><Heading {...props} />{actions}</div>{list}</div></Container></section>;
  if (props.variant === 5) return <section className="mi-section mi-faq-section mi-faq-section--immersive"><Container><div className="mi-faq-immersive"><div className="mi-faq-immersive__head"><Heading {...props} />{actions}</div>{list}</div></Container></section>;
  return <section className="mi-section mi-faq-section mi-faq-section--stacked"><Container><Stack gap="xl"><Heading {...props} />{list}{actions}</Stack></Container></section>;
}
