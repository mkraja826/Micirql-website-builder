"use client";

import { useMemo, useState } from "react";
import type { ThemeFamily } from "@micirql/schema";
import { LAYOUT_VARIANTS, SECTION_FAMILIES, sectionDesignId, type SectionFamily, type SectionVariant } from "@micirql/sections";

const ADDABLE = SECTION_FAMILIES.filter((family) => family !== "navbar" && family !== "footer");
const VARIANTS: SectionVariant[] = [1, 2, 3, 4, 5];

const FAMILY_META: Record<Exclude<SectionFamily, "navbar" | "footer">, { description: string; icon: string }> = {
  hero: { description: "First impression, headline, image and primary CTA", icon: "✦" },
  about: { description: "Brand story, credibility and positioning", icon: "◉" },
  services: { description: "Services, treatments, products or offers", icon: "▦" },
  features: { description: "Benefits, differentiators and trust points", icon: "◇" },
  process: { description: "Steps, timeline or how it works", icon: "→" },
  testimonials: { description: "Reviews, quotes and customer proof", icon: "❞" },
  gallery: { description: "Cases, portfolio, spaces or visual work", icon: "▧" },
  team: { description: "Doctors, team members or leadership", icon: "◎" },
  cta: { description: "Focused conversion call-to-action", icon: "↗" },
  contact: { description: "Contact details, forms and next steps", icon: "@" },
};

export function SectionLibraryBrowser({ theme, onAdd, onClose }: {
  theme: ThemeFamily;
  onAdd(family: SectionFamily, variant: SectionVariant, componentId: string): void;
  onClose(): void;
}) {
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState<SectionFamily | "all">("all");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ADDABLE.filter((item) => {
      if (family !== "all" && item !== family) return false;
      if (!q) return true;
      const meta = FAMILY_META[item as keyof typeof FAMILY_META];
      return `${item} ${meta.description}`.toLowerCase().includes(q);
    });
  }, [family, query]);

  return <div className="section-library-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="section-library" role="dialog" aria-modal="true" aria-label="Add section">
      <header className="section-library-header">
        <div><span>MiCirql library</span><h2>Add a section</h2><p>Choose a section type and one of five layout structures. The current <strong>{title(theme)}</strong> theme is applied automatically.</p></div>
        <button type="button" className="section-library-close" onClick={onClose} aria-label="Close section library">×</button>
      </header>

      <div className="section-library-tools">
        <label className="section-library-search"><span>⌕</span><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search hero, services, gallery…" /></label>
        <div className="section-library-filters" aria-label="Section categories">
          <button className={family === "all" ? "is-active" : ""} onClick={() => setFamily("all")}>All</button>
          {ADDABLE.map((item) => <button key={item} className={family === item ? "is-active" : ""} onClick={() => setFamily(item)}>{title(item)}</button>)}
        </div>
      </div>

      <div className="section-library-results">
        {filtered.map((item) => {
          const meta = FAMILY_META[item as keyof typeof FAMILY_META];
          return <article className="section-family-block" key={item}>
            <div className="section-family-heading"><span className="section-family-icon">{meta.icon}</span><div><h3>{title(item)}</h3><p>{meta.description}</p></div></div>
            <div className="section-variant-grid">
              {VARIANTS.map((variant) => {
                const componentId = sectionDesignId(theme, item, variant);
                return <button key={variant} type="button" className="section-variant-card" onClick={() => onAdd(item, variant, componentId)}>
                  <SectionMiniature family={item} variant={variant} />
                  <span><strong>{title(LAYOUT_VARIANTS[variant])}</strong><small>{componentId}</small></span>
                </button>;
              })}
            </div>
          </article>;
        })}
        {!filtered.length ? <div className="section-library-empty"><strong>No sections found</strong><span>Try another search or category.</span></div> : null}
      </div>
    </section>
  </div>;
}

function SectionMiniature({ family, variant }: { family: SectionFamily; variant: SectionVariant }) {
  return <div className={`section-miniature family-${family} variant-${variant}`} aria-hidden="true">
    <i className="mini-kicker" />
    <i className="mini-title" />
    <i className="mini-copy" />
    <div className="mini-layout"><i /><i /><i /></div>
    <b />
  </div>;
}

function title(value: string) {
  return value.replace(/[-_]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}
