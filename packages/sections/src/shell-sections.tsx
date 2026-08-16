import { Container, Stack, Typography } from "@micirql/primitives";
import type { SectionVariant } from "./catalog";
import type { UniversalSectionProps } from "./sections";

type VariantProps = UniversalSectionProps & { variant: SectionVariant };
type Item = NonNullable<UniversalSectionProps["items"]>[number];

function InlineField({ path, children }: { path: string; children: React.ReactNode }) {
  return <span data-mi-prop-path={path}>{children}</span>;
}

function linkItems(items: Item[]) {
  return items.map((item, index) => ({ ...item, href: `#section-${index + 1}` }));
}

function PrimaryAction({ action }: { action?: UniversalSectionProps["primaryAction"] }) {
  return action ? <a className="mi-shell-cta" href={action.href}><InlineField path="primaryAction.label">{action.label}</InlineField></a> : null;
}

function MobileMenu({ title, items, action }: { title: string; items: Item[]; action?: UniversalSectionProps["primaryAction"] }) {
  const links = linkItems(items);
  return <details className="mi-mobile-nav">
    <summary className="mi-burger" aria-label="Open navigation menu"><span /><span /><span /></summary>
    <div className="mi-mobile-drawer">
      <div className="mi-mobile-drawer__head"><strong>{title}</strong><span aria-hidden="true">Menu</span></div>
      <nav aria-label="Mobile navigation">{links.map((item, index) => <a key={`${item.title}-${index}`} href={item.href}><InlineField path={`items.${index}.title`}>{item.title}</InlineField></a>)}</nav>
      <PrimaryAction action={action} />
    </div>
  </details>;
}

function NavLinks({ items }: { items: Item[] }) {
  return <nav className="mi-shell-links" aria-label="Primary navigation">{linkItems(items).map((item, index) => <a key={`${item.title}-${index}`} href={item.href}><InlineField path={`items.${index}.title`}>{item.title}</InlineField></a>)}</nav>;
}

export function StructuralNavbar(props: VariantProps) {
  const brand = <a href="/" className="mi-shell-brand"><InlineField path="title">{props.title}</InlineField></a>;
  const menu = <MobileMenu title={props.title} items={props.items ?? []} action={props.primaryAction} />;

  if (props.variant === 2) return <header className="mi-shell-navbar mi-shell-navbar--utility"><div className="mi-nav-utility"><Container><span>{props.description || "Welcome"}</span>{props.primaryAction ? <a href={props.primaryAction.href}>{props.primaryAction.label}</a> : null}</Container></div><Container><div className="mi-nav-row">{brand}<NavLinks items={props.items ?? []} /><PrimaryAction action={props.primaryAction} />{menu}</div></Container></header>;

  if (props.variant === 3) return <header className="mi-shell-navbar mi-shell-navbar--centered"><Container><div className="mi-nav-centered"><NavLinks items={(props.items ?? []).slice(0, Math.ceil((props.items ?? []).length / 2))} />{brand}<NavLinks items={(props.items ?? []).slice(Math.ceil((props.items ?? []).length / 2))} /><div className="mi-nav-centered__action"><PrimaryAction action={props.primaryAction} />{menu}</div></div></Container></header>;

  if (props.variant === 4) return <header className="mi-shell-navbar mi-shell-navbar--floating"><Container><div className="mi-nav-float">{brand}<NavLinks items={props.items ?? []} /><div className="mi-nav-actions"><PrimaryAction action={props.primaryAction} />{menu}</div></div></Container></header>;

  if (props.variant === 5) return <header className="mi-shell-navbar mi-shell-navbar--minimal"><Container><div className="mi-nav-row">{brand}<div className="mi-nav-minimal-copy">{props.description ? <span>{props.description}</span> : null}</div><div className="mi-nav-actions"><PrimaryAction action={props.primaryAction} />{menu}</div></div></Container></header>;

  return <header className="mi-shell-navbar mi-shell-navbar--classic"><Container><div className="mi-nav-row">{brand}<NavLinks items={props.items ?? []} /><div className="mi-nav-actions"><PrimaryAction action={props.primaryAction} />{menu}</div></div></Container></header>;
}

function FooterLinks({ items }: { items: Item[] }) {
  return <nav className="mi-footer-links" aria-label="Footer navigation">{linkItems(items).map((item, index) => <a key={`${item.title}-${index}`} href={item.href}><InlineField path={`items.${index}.title`}>{item.title}</InlineField></a>)}</nav>;
}

export function StructuralFooter(props: VariantProps) {
  const brand = <div className="mi-footer-brand"><strong><InlineField path="title">{props.title}</InlineField></strong>{props.description ? <p><InlineField path="description">{props.description}</InlineField></p> : null}</div>;
  const copyright = <small>© {new Date().getFullYear()} {props.title}. All rights reserved.</small>;

  if (props.variant === 2) return <footer className="mi-shell-footer mi-shell-footer--compact"><Container><div className="mi-footer-compact">{brand}<FooterLinks items={props.items ?? []} />{copyright}</div></Container></footer>;

  if (props.variant === 3) return <footer className="mi-shell-footer mi-shell-footer--cta"><Container><div className="mi-footer-cta"><Stack gap="md"><Typography as="h2" variant="h2">{props.description || "Ready to take the next step?"}</Typography><PrimaryAction action={props.primaryAction} /></Stack></div><div className="mi-footer-bottom">{brand}<FooterLinks items={props.items ?? []} />{copyright}</div></Container></footer>;

  if (props.variant === 4) return <footer className="mi-shell-footer mi-shell-footer--contact"><Container><div className="mi-footer-contact"><div>{brand}<PrimaryAction action={props.primaryAction} /></div><FooterLinks items={props.items ?? []} /></div><div className="mi-footer-legal">{copyright}</div></Container></footer>;

  if (props.variant === 5) return <footer className="mi-shell-footer mi-shell-footer--editorial"><Container><div className="mi-footer-wordmark"><InlineField path="title">{props.title}</InlineField></div><div className="mi-footer-editorial-row"><FooterLinks items={props.items ?? []} /><div>{props.description ? <p><InlineField path="description">{props.description}</InlineField></p> : null}{copyright}</div></div></Container></footer>;

  return <footer className="mi-shell-footer mi-shell-footer--columns"><Container><div className="mi-footer-columns">{brand}<FooterLinks items={props.items ?? []} /><div className="mi-footer-action"><PrimaryAction action={props.primaryAction} /></div></div><div className="mi-footer-legal">{copyright}</div></Container></footer>;
}
