import type { CSSProperties, ReactNode } from "react";
import { Card, Gallery, NavigationMenu, Stats } from "@micirql/components";
import { Container, Stack, Typography } from "@micirql/primitives";
import type { SectionFamily, SectionVariant } from "./catalog";

type Action = { label: string; href: string };
type Item = { title: string; description?: string; image?: string; href?: string };
type FooterLink = { label: string; href: string };

type ImageReference = {
  src: string;
  alt: string;
  focalPoint?: { x: number; y: number };
};

export type UniversalSectionProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  primaryAction?: Action;
  secondaryAction?: Action;
  items?: Item[];
  image?: ImageReference;
  formAction?: string;
  footerLinks?: FooterLink[];
  copyright?: string;
};

function InlineField({
  path,
  children,
}: {
  path: string;
  children: ReactNode;
}) {
  return <span data-mi-prop-path={path}>{children}</span>;
}

function Actions({
  primaryAction,
  secondaryAction,
}: Pick<UniversalSectionProps, "primaryAction" | "secondaryAction">) {
  if (!primaryAction && !secondaryAction) return null;
  return (
    <div className="mi-section__actions">
      {primaryAction ? (
        <a
          className="mi-section__action mi-section__action--primary"
          href={primaryAction.href}
        >
          <InlineField path="primaryAction.label">
            {primaryAction.label}
          </InlineField>
        </a>
      ) : null}
      {secondaryAction ? (
        <a
          className="mi-section__action mi-section__action--secondary"
          href={secondaryAction.href}
        >
          <InlineField path="secondaryAction.label">
            {secondaryAction.label}
          </InlineField>
        </a>
      ) : null}
    </div>
  );
}

function Heading(props: UniversalSectionProps) {
  return (
    <Stack gap="sm" className="mi-section__heading">
      {props.eyebrow ? (
        <Typography variant="eyebrow">
          <InlineField path="eyebrow">{props.eyebrow}</InlineField>
        </Typography>
      ) : null}
      <Typography as="h2" variant="h2">
        <InlineField path="title">{props.title}</InlineField>
      </Typography>
      {props.description ? (
        <Typography variant="body">
          <InlineField path="description">{props.description}</InlineField>
        </Typography>
      ) : null}
    </Stack>
  );
}

function ItemGrid({ items = [] }: Pick<UniversalSectionProps, "items">) {
  return (
    <div className="mi-section__grid">
      {items.map((item, index) => (
        <Card key={`${item.title}-${index}`} className="mi-section__card">
          {item.image ? (
            <img
              src={item.image}
              alt={item.title}
              loading="lazy"
              data-mi-image-field={`items.${index}.image`}
            />
          ) : null}
          <span className="mi-section__card-index" aria-hidden="true">
            {String(index + 1).padStart(2, "0")}
          </span>
          <Typography as="h3" variant="h3">
            <InlineField path={`items.${index}.title`}>
              {item.title}
            </InlineField>
          </Typography>
          {item.description ? (
            <Typography variant="body-sm">
              <InlineField path={`items.${index}.description`}>
                {item.description}
              </InlineField>
            </Typography>
          ) : null}
        </Card>
      ))}
    </div>
  );
}

function NavbarSection({
  title,
  items = [],
  primaryAction,
}: UniversalSectionProps) {
  return (
    <header className="mi-section mi-section--navbar">
      <Container>
        <div className="mi-navbar">
          <a href="/" className="mi-navbar__brand">
            <InlineField path="title">{title}</InlineField>
          </a>
          <NavigationMenu
            items={items.map((item, i) => ({
              label: item.title,
              href: item.href ?? `#section-${i + 1}`,
            }))}
          />
          {primaryAction ? (
            <a
              className="mi-navbar__cta mi-section__action mi-section__action--primary"
              href={primaryAction.href}
            >
              <InlineField path="primaryAction.label">
                {primaryAction.label}
              </InlineField>
            </a>
          ) : null}
        </div>
      </Container>
    </header>
  );
}

function HeroSection(props: UniversalSectionProps) {
  const focalPoint = props.image?.focalPoint;
  const imageStyle = focalPoint
    ? ({
        objectPosition: `${percentage(focalPoint.x)} ${percentage(focalPoint.y)}`,
      } as CSSProperties)
    : undefined;
  return (
    <section className="mi-section mi-section--hero">
      <Container>
        <div className="mi-section__layout">
          <div>
            <Stack gap="md">
              {props.eyebrow ? (
                <Typography variant="eyebrow">
                  <InlineField path="eyebrow">{props.eyebrow}</InlineField>
                </Typography>
              ) : null}
              <Typography as="h1" variant="display">
                <InlineField path="title">{props.title}</InlineField>
              </Typography>
              {props.description ? (
                <Typography variant="body">
                  <InlineField path="description">
                    {props.description}
                  </InlineField>
                </Typography>
              ) : null}
              <Actions {...props} />
            </Stack>
          </div>
          {props.image ? (
            <figure className="mi-section__media">
              <img
                src={props.image.src}
                alt={props.image.alt}
                loading="eager"
                data-mi-image-field="image"
                style={imageStyle}
              />
            </figure>
          ) : (
            <div
              className="mi-section__media mi-section__media--placeholder"
              aria-hidden="true"
            >
              <div className="mi-section__visual-mark">
                <span />
              </div>
            </div>
          )}
        </div>
      </Container>
    </section>
  );
}

function StandardSection(props: UniversalSectionProps) {
  return (
    <section className="mi-section">
      <Container>
        <Stack gap="xl">
          <Heading {...props} />
          <ItemGrid items={props.items ?? []} />
          <Actions {...props} />
        </Stack>
      </Container>
    </section>
  );
}

function StatsSection(props: UniversalSectionProps) {
  const statItems = (props.items ?? []).map((item, index) => ({
    value: String(index + 1).padStart(2, "0"),
    label: item.title,
    ...(item.description === undefined ? {} : { detail: item.description }),
  }));
  return (
    <section className="mi-section">
      <Container>
        <Stack gap="xl">
          <Heading {...props} />
          <Stats items={statItems} />
        </Stack>
      </Container>
    </section>
  );
}

function GallerySection(props: UniversalSectionProps) {
  const galleryItems = (props.items ?? [])
    .filter((item): item is Item & { image: string } => Boolean(item.image))
    .map((item) => ({ src: item.image, alt: item.title }));
  return (
    <section className="mi-section">
      <Container>
        <Stack gap="xl">
          <Heading {...props} />
          {galleryItems.length ? (
            <Gallery items={galleryItems} />
          ) : (
            <ItemGrid items={props.items ?? []} />
          )}
        </Stack>
      </Container>
    </section>
  );
}

function ContactSection(props: UniversalSectionProps) {
  return (
    <section className="mi-section">
      <Container>
        <div className="mi-section__layout">
          <Heading {...props} />
          {props.formAction ? (
            <form
              className="mi-section__form"
              action={props.formAction}
              method="post"
            >
              <label>
                Name
                <input name="name" required />
              </label>
              <label>
                Email
                <input name="email" type="email" required />
              </label>
              <label>
                Message
                <textarea name="message" required />
              </label>
              <button type="submit">Send enquiry</button>
            </form>
          ) : (
            <div>
              <Actions {...props} />
            </div>
          )}
        </div>
      </Container>
    </section>
  );
}

function FooterSection(props: UniversalSectionProps) {
  const links = props.footerLinks ?? (props.items ?? []).map((item, index) => ({
    label: item.title,
    href: item.description ?? `#section-${index + 1}`,
  }));
  return (
    <footer className="mi-section mi-section--footer">
      <Container>
        <div className="mi-footer">
          <div className="mi-footer__brand">
            <strong>
              <InlineField path="title">{props.title}</InlineField>
            </strong>
            {props.description ? (
              <p>
                <InlineField path="description">
                  {props.description}
                </InlineField>
              </p>
            ) : null}
          </div>
          {links.length ? <nav aria-label="Footer links">
            {links.map((item, index) => (
              <a key={`${item.label}-${index}`} href={safeFooterHref(item.href)}>
                <InlineField path={`footerLinks.${index}.label`}>{item.label}</InlineField>
              </a>
            ))}
          </nav> : null}
        </div>
        {props.copyright ? <p className="mi-footer__copyright"><InlineField path="copyright">{props.copyright}</InlineField></p> : null}
      </Container>
    </footer>
  );
}

function safeFooterHref(value: string): string {
  const href = value.trim();
  if (/^(?:https:\/\/|mailto:|tel:)/i.test(href)) return href;
  if (href.startsWith("/") && !href.startsWith("//")) return href;
  if (/^#[\w-]+$/.test(href)) return href;
  return "/";
}

const renderers: Record<
  SectionFamily,
  (props: UniversalSectionProps) => ReactNode
> = {
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

export function SeedSection({
  family,
  variant,
  props,
}: {
  family: SectionFamily;
  variant: SectionVariant;
  props: UniversalSectionProps;
}) {
  const Renderer = renderers[family];
  return (
    <div
      className={`mi-section-variant mi-section-variant--${variant}`}
      data-section-family={family}
      data-section-variant={variant}
    >
      <Renderer {...props} />
    </div>
  );
}

function percentage(value: number) {
  return `${Math.min(1, Math.max(0, value)) * 100}%`;
}
