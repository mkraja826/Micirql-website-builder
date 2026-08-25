import { Container, Stack, Typography } from "@micirql/primitives";
import type { SectionVariant } from "./catalog";
import type { LogoPresentation, UniversalSectionProps } from "./sections";

type VariantProps = UniversalSectionProps & { variant: SectionVariant };
type BaseItem = NonNullable<UniversalSectionProps["items"]>[number];
type Item = BaseItem & { href?: string };
type NavigationGroup = { label: string; items: Item[] };
type ShellProps = VariantProps & { navigationGroups?: NavigationGroup[] };

function InlineField({ path, children }: { path: string; children: React.ReactNode }) {
  return <span data-mi-prop-path={path}>{children}</span>
}

function linkItems(items: Item[]) {
  return items.map((item, index) => ({ ...item, href: item.href || `#section-${index + 1}` }))
}

function navigationGroups(props: VariantProps): NavigationGroup[] {
  const groups = (props as ShellProps).navigationGroups;
  return Array.isArray(groups) ? groups.filter((group) => group && Array.isArray(group.items) && group.items.length) : []
}

function PrimaryAction({ action }: { action?: UniversalSectionProps["primaryAction"] }) {
  return action ? <a className="mi-shell-cta" href={action.href}><InlineField path="primaryAction.label">{action.label}</InlineField></a> : null
}

function logoPlacement(logo: LogoPresentation, location: "navbar" | "footer") {
  const shape = logo.shape ?? "horizontal";
  const maxHeight = location === "navbar" ? (logo.navbarMaxHeight ?? 44) : (logo.footerMaxHeight ?? 58);
  const desktopWidth = location === "navbar"
    ? shape === "horizontal" ? 240 : shape === "square" ? 96 : 82
    : shape === "horizontal" ? 300 : shape === "square" ? 118 : 96;
  const mobileWidth = location === "navbar"
    ? shape === "horizontal" ? 188 : shape === "square" ? 72 : 62
    : shape === "horizontal" ? 230 : shape === "square" ? 100 : 82;
  const mobileHeight = Math.max(30, Math.round(maxHeight * (location === "navbar" ? 0.84 : 0.92)));
  const surface = logo.treatment === "neutral-container" || logo.treatment === "cleanup-recommended"
    ? "light"
    : logo.backgroundSignal === "embedded" && logo.edgeColor
      ? "embedded"
      : "auto";
  return { shape, maxHeight, desktopWidth, mobileWidth, mobileHeight, surface };
}

function fallbackInitial(title: string) {
  const normalized = title.trim();
  return normalized ? normalized.charAt(0).toUpperCase() : "M";
}

function FallbackBrand({ props, location }: { props: VariantProps; location: "navbar" | "footer" }) {
  const mark = <span
    className={`mi-brand-logo mi-brand-logo--neutral-container mi-brand-logo--square mi-brand-logo--${location}`}
    data-logo-fallback="true"
    data-logo-location={location}
    style={{
      width: location === "navbar" ? "42px" : "48px",
      height: location === "navbar" ? "42px" : "48px",
      flex: "0 0 auto",
      padding: 0,
      fontSize: location === "navbar" ? ".92rem" : "1rem",
      lineHeight: 1,
      fontWeight: 900,
      letterSpacing: "-.03em",
      color: "var(--mi-color-primary)",
      background: "var(--mi-color-surface-elevated)",
    }}
    aria-hidden="true"
  >{fallbackInitial(props.title)}</span>;

  if (location === "navbar") {
    return <a href="/" className="mi-shell-brand mi-shell-brand--fallback" style={{ gap: ".65rem" }}>{mark}<InlineField path="title">{props.title}</InlineField></a>;
  }
  return <div className="mi-footer-brand mi-footer-brand--fallback"><div style={{ display: "flex", alignItems: "center", gap: ".75rem" }}>{mark}<strong><InlineField path="title">{props.title}</InlineField></strong></div>{props.description ? <p><InlineField path="description">{props.description}</InlineField></p> : null}</div>;
}

function BrandMark({ props, location }: { props: VariantProps; location: "navbar" | "footer" }) {
  if (!props.logo?.src) return <FallbackBrand props={props} location={location} />;

  const treatment = props.logo.treatment ?? "direct";
  const placement = logoPlacement(props.logo, location);
  const style = {
    "--mi-logo-max-height": `${placement.maxHeight}px`,
    "--mi-logo-max-width": `${placement.desktopWidth}px`,
    "--mi-logo-mobile-max-height": `${placement.mobileHeight}px`,
    "--mi-logo-mobile-max-width": `${placement.mobileWidth}px`,
    "--mi-logo-padding-scale": String(props.logo.paddingScale ?? 1),
    ...(placement.surface === "embedded" && props.logo.edgeColor ? { "--mi-logo-surface": props.logo.edgeColor } : {}),
  } as React.CSSProperties;
  const image = <img src={props.logo.src} alt={props.logo.alt || `${props.title} logo`} className="mi-brand-logo__image" loading="eager" />;
  const mark = <span data-logo-location={location} data-logo-surface={placement.surface} className={`mi-brand-logo mi-brand-logo--${treatment} mi-brand-logo--${placement.shape} mi-brand-logo--${location}`} style={style}>{image}<span className="mi-visually-hidden"><InlineField path="title">{props.title}</InlineField></span></span>;

  if (location === "navbar") return <a href="/" className="mi-shell-brand mi-shell-brand--logo">{mark}</a>;
  return <div className="mi-footer-brand mi-footer-brand--logo">{mark}{props.description ? <p><InlineField path="description">{props.description}</InlineField></p> : null}</div>
}

function MobileMenu({ title, items, groups, action }: { title: string; items: Item[]; groups: NavigationGroup[]; action?: UniversalSectionProps["primaryAction"] }) {
  const links = linkItems(items);
  return <details className="mi-mobile-nav">
    <summary className="mi-burger" aria-label="Open navigation menu"><span /><span /><span /></summary>
    <div className="mi-mobile-drawer">
      <div className="mi-mobile-drawer__head"><strong>{title}</strong><span aria-hidden="true">Menu</span></div>
      <nav aria-label="Mobile navigation">
        {links.map((item, index) => <a key={`${item.title}-${index}`} href={item.href}><InlineField path={`items.${index}.title`}>{item.title}</InlineField></a>)}
        {groups.map((group, groupIndex) => <div className="mi-mobile-nav-group" key={`${group.label}-${groupIndex}`}><strong>{group.label}</strong>{linkItems(group.items).map((item, itemIndex) => <a key={`${item.title}-${itemIndex}`} href={item.href}>{item.title}</a>)}</div>)}
      </nav>
      <PrimaryAction action={action} />
    </div>
  </details>
}

function NavGroups({ groups }: { groups: NavigationGroup[] }) {
  if (!groups.length) return null;
  return <div className="mi-shell-nav-groups">{groups.map((group, index) => <details className="mi-shell-dropdown" key={`${group.label}-${index}`}><summary>{group.label}<span aria-hidden="true">⌄</span></summary><div className="mi-shell-dropdown__panel">{linkItems(group.items).map((item, itemIndex) => <a key={`${item.title}-${itemIndex}`} href={item.href}>{item.title}</a>)}</div></details>)}</div>
}

function NavLinks({ items, groups = [] }: { items: Item[]; groups?: NavigationGroup[] }) {
  return <nav className="mi-shell-links" aria-label="Primary navigation">{linkItems(items).map((item, index) => <a key={`${item.title}-${index}`} href={item.href}><InlineField path={`items.${index}.title`}>{item.title}</InlineField></a>)}<NavGroups groups={groups} /></nav>
}

export function StructuralNavbar(props: VariantProps) {
  const groups = navigationGroups(props);
  const items = (props.items ?? []) as Item[];
  const brand = <BrandMark props={props} location="navbar" />;
  const menu = <MobileMenu title={props.title} items={items} groups={groups} action={props.primaryAction} />;

  if (props.variant === 2) return <header className="mi-shell-navbar mi-shell-navbar--utility"><div className="mi-nav-utility"><Container><span>{props.description || "Welcome"}</span>{props.primaryAction ? <a href={props.primaryAction.href}>{props.primaryAction.label}</a> : null}</Container></div><Container><div className="mi-nav-row">{brand}<NavLinks items={items} groups={groups} /><PrimaryAction action={props.primaryAction} />{menu}</div></Container></header>;
  if (props.variant === 3) { const midpoint = Math.ceil(items.length / 2); return <header className="mi-shell-navbar mi-shell-navbar--centered"><Container><div className="mi-nav-centered"><NavLinks items={items.slice(0, midpoint)} />{brand}<NavLinks items={items.slice(midpoint)} groups={groups} /><div className="mi-nav-centered__action"><PrimaryAction action={props.primaryAction} />{menu}</div></div></Container></header> }
  if (props.variant === 4) return <header className="mi-shell-navbar mi-shell-navbar--floating"><Container><div className="mi-nav-float">{brand}<NavLinks items={items} groups={groups} /><div className="mi-nav-actions"><PrimaryAction action={props.primaryAction} />{menu}</div></div></Container></header>;
  if (props.variant === 5) return <header className="mi-shell-navbar mi-shell-navbar--minimal"><Container><div className="mi-nav-row">{brand}{items.length || groups.length ? <NavLinks items={items} groups={groups} /> : <div className="mi-nav-minimal-copy">{props.description ? <span>{props.description}</span> : null}</div>}<div className="mi-nav-actions"><PrimaryAction action={props.primaryAction} />{menu}</div></div></Container></header>;
  return <header className="mi-shell-navbar mi-shell-navbar--classic"><Container><div className="mi-nav-row">{brand}<NavLinks items={items} groups={groups} /><div className="mi-nav-actions"><PrimaryAction action={props.primaryAction} />{menu}</div></div></Container></header>
}

function FooterLinks({ items }: { items: Item[] }) {
  return <nav className="mi-footer-links" aria-label="Footer navigation">{linkItems(items).map((item, index) => <a key={`${item.title}-${index}`} href={item.href}><InlineField path={`items.${index}.title`}>{item.title}</InlineField></a>)}</nav>
}

function FooterGroups({ groups }: { groups: NavigationGroup[] }) {
  if (!groups.length) return null;
  return <div className="mi-footer-groups">{groups.map((group, index) => <nav aria-label={`${group.label} footer links`} key={`${group.label}-${index}`}><strong>{group.label}</strong>{linkItems(group.items).map((item, itemIndex) => <a href={item.href} key={`${item.title}-${itemIndex}`}>{item.title}</a>)}</nav>)}</div>
}

export function StructuralFooter(props: VariantProps) {
  const groups = navigationGroups(props);
  const items = (props.items ?? []) as Item[];
  const brand = <BrandMark props={props} location="footer" />;
  const copyright = <small>© {new Date().getFullYear()} {props.title}. All rights reserved.</small>;
  const links = groups.length ? <FooterGroups groups={groups} /> : <FooterLinks items={items} />;

  if (props.variant === 2) return <footer className="mi-shell-footer mi-shell-footer--compact"><Container><div className="mi-footer-compact">{brand}{links}{copyright}</div></Container></footer>;
  if (props.variant === 3) return <footer className="mi-shell-footer mi-shell-footer--cta"><Container><div className="mi-footer-cta"><Stack gap="md"><Typography as="h2" variant="h2">{props.description || "Ready to take the next step?"}</Typography><PrimaryAction action={props.primaryAction} /></Stack></div><div className="mi-footer-bottom">{brand}{links}{copyright}</div></Container></footer>;
  if (props.variant === 4) return <footer className="mi-shell-footer mi-shell-footer--contact"><Container><div className="mi-footer-contact"><div>{brand}<PrimaryAction action={props.primaryAction} /></div>{links}</div><div className="mi-footer-legal">{copyright}</div></Container></footer>;
  if (props.variant === 5) return <footer className="mi-shell-footer mi-shell-footer--editorial"><Container><div className="mi-footer-wordmark"><InlineField path="title">{props.title}</InlineField></div><div className="mi-footer-editorial-row">{links}<div>{props.description ? <p><InlineField path="description">{props.description}</InlineField></p> : null}{copyright}</div></div></Container></footer>;
  return <footer className="mi-shell-footer mi-shell-footer--columns"><Container><div className="mi-footer-columns">{brand}{links}<div className="mi-footer-action"><PrimaryAction action={props.primaryAction} /></div></div><div className="mi-footer-legal">{copyright}</div></Container></footer>
}
