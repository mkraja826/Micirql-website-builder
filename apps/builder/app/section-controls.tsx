"use client";

import type { SitePage, SiteSection } from "@micirql/schema";
import { SECTION_FAMILIES, type SectionFamily } from "@micirql/sections";

const ADDABLE_FAMILIES = SECTION_FAMILIES.filter((family) => family !== "navbar" && family !== "footer");

export function SectionControls({ page, selectedSectionId, onSelect, onAdd, onMove, onToggleHidden, onRemove }: {
  page: SitePage;
  selectedSectionId?: string;
  onSelect(sectionId: string): void;
  onAdd(section: SiteSection): void;
  onMove(sectionId: string, toIndex: number): void;
  onToggleHidden(sectionId: string, hidden: boolean): void;
  onRemove(sectionId: string): void;
}) {
  const selectedIndex = selectedSectionId ? page.sections.findIndex((section) => section.id === selectedSectionId) : -1;
  const selected = selectedIndex >= 0 ? page.sections[selectedIndex] : undefined;

  return <div className="section-controls">
    <label>Sections
      <select value={selectedSectionId ?? ""} onChange={(event) => event.target.value && onSelect(event.target.value)}>
        <option value="">Choose a section…</option>
        {page.sections.map((section, index) => <option key={section.id} value={section.id}>{index + 1}. {labelFor(section)}{section.hidden ? " (hidden)" : ""}</option>)}
      </select>
    </label>
    <div className="section-controls-row">
      <select defaultValue="" aria-label="Add section" onChange={(event) => {
        const family = event.target.value as SectionFamily;
        if (!family) return;
        onAdd(newSection(family));
        event.target.value = "";
      }}>
        <option value="">+ Add section</option>
        {ADDABLE_FAMILIES.map((family) => <option key={family} value={family}>{title(family)}</option>)}
      </select>
    </div>
    {selected ? <div className="section-controls-row">
      <button type="button" disabled={selectedIndex <= 0} onClick={() => onMove(selected.id, selectedIndex - 1)}>Move up</button>
      <button type="button" disabled={selectedIndex >= page.sections.length - 1} onClick={() => onMove(selected.id, selectedIndex + 1)}>Move down</button>
      <button type="button" onClick={() => onToggleHidden(selected.id, !selected.hidden)}>{selected.hidden ? "Show" : "Hide"}</button>
      <button type="button" className="danger" onClick={() => onRemove(selected.id)}>Remove</button>
    </div> : null}
  </div>;
}

function newSection(family: SectionFamily): SiteSection {
  return { id: `${family}-${crypto.randomUUID()}`, component: { componentId: `${family}.placeholder`, version: "1.0.0" }, props: defaultProps(family), bindings: {}, hidden: false };
}

function defaultProps(family: SectionFamily): Record<string, unknown> {
  switch (family) {
    case "hero": return { eyebrow: "Your business", heading: "A clear headline for your visitors", body: "Add the main message you want visitors to understand first.", ctaLabel: "Get in touch" };
    case "about": return { heading: "About us", body: "Tell visitors what makes your business useful, credible and different." };
    case "services": return { heading: "Services", body: "Introduce the services you want visitors to explore.", items: [] };
    case "features": return { heading: "Why choose us", body: "Highlight the strengths that matter most to customers.", items: [] };
    case "process": return { heading: "How it works", body: "Explain the next steps clearly.", items: [] };
    case "testimonials": return { heading: "What customers say", body: "Add verified customer feedback here.", items: [] };
    case "gallery": return { heading: "Gallery", body: "Showcase your work, space or products.", items: [] };
    case "team": return { heading: "Meet the team", body: "Introduce the people behind the business.", items: [] };
    case "cta": return { heading: "Ready to get started?", body: "Give visitors one clear next step.", ctaLabel: "Get started" };
    case "contact": return { heading: "Contact us", body: "Make it easy for visitors to reach your team.", ctaLabel: "Contact us" };
    case "navbar": return {};
    case "footer": return {};
  }
}

function labelFor(section: SiteSection): string {
  return title(section.component.componentId.split(".")[0] || section.id);
}
function title(value: string): string { return value.replace(/[-_]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()); }
