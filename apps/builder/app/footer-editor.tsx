"use client";

import type { SiteSection } from "@micirql/schema";

type FooterLink = { label: string; href: string };

export function FooterEditor({ section, onLinksChange, onTextChange }: {
  section: SiteSection;
  onLinksChange(links: FooterLink[]): void;
  onTextChange(path: string, value: string): void;
}) {
  const links = footerLinks(section.props.footerLinks);
  return <div className="inspector-form footer-editor">
    <p className="inspector-hint">Control the brand note, footer navigation and copyright shown at the bottom of the site.</p>
    <label>Business name<input aria-label="Footer business name" value={String(section.props.title ?? "")} onChange={(event) => onTextChange("title", event.target.value)} /></label>
    <label>Short description<textarea aria-label="Footer description" value={String(section.props.description ?? "")} onChange={(event) => onTextChange("description", event.target.value)} /></label>
    <fieldset className="footer-editor__links">
      <legend>Footer links</legend>
      {links.map((link, index) => <div className="footer-editor__link" key={`footer-link-${index}`}>
        <label>Label<input aria-label={`Footer link ${index + 1} label`} value={link.label} onChange={(event) => onLinksChange(links.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item))} /></label>
        <label>Destination<input aria-label={`Footer link ${index + 1} destination`} value={link.href} placeholder="/about or #contact" onChange={(event) => onLinksChange(links.map((item, itemIndex) => itemIndex === index ? { ...item, href: event.target.value } : item))} /></label>
        <button type="button" className="danger" onClick={() => onLinksChange(links.filter((_, itemIndex) => itemIndex !== index))}>Remove link</button>
      </div>)}
      <button type="button" onClick={() => onLinksChange([...links, { label: "New link", href: "/" }])}>Add footer link</button>
    </fieldset>
    <label>Copyright<input aria-label="Footer copyright" value={String(section.props.copyright ?? "")} onChange={(event) => onTextChange("copyright", event.target.value)} /></label>
  </div>;
}

function footerLinks(value: unknown): FooterLink[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    return [{ label: typeof record.label === "string" ? record.label : "", href: typeof record.href === "string" ? record.href : "" }];
  });
}