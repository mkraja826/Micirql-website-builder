"use client";

import type { SitePage, SiteSection } from "@micirql/schema";
import { SECTION_FAMILIES, sectionDesignId, type SectionFamily } from "@micirql/sections";
import type { ThemeFamily } from "@micirql/schema";

const ADDABLE_FAMILIES = SECTION_FAMILIES.filter((family) => family !== "navbar" && family !== "footer");

export function SectionControls({ page, themeFamily, selectedSectionId, onSelect, onAdd, onMove, onToggleHidden, onRemove }: {
  page: SitePage;
  themeFamily: ThemeFamily;
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
        onAdd(newSection(family, themeFamily));
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

function newSection(family: SectionFamily, theme: ThemeFamily): SiteSection {
  return { id: `${family}-${crypto.randomUUID()}`, component: { componentId: sectionDesignId(theme, family, 1), version: "1.0.0" }, props: defaultProps(family), bindings: {}, hidden: false };
}

function defaultProps(family: SectionFamily): Record<string, unknown> {
  switch (family) {
    case "hero": return { eyebrow: "A better way forward", heading: "Designed around what matters most", body: "Clear, confident communication that helps visitors take the next step.", ctaLabel: "Get started" };
    case "about": return { heading: "Built with purpose", body: "Share the story, expertise and approach that make this business worth choosing." };
    case "services": return { heading: "What we do", body: "Explore the services and solutions designed around your needs.", items: [] };
    case "features": return { heading: "Why clients choose us", body: "Highlight the strengths and details that set this experience apart.", items: [] };
    case "process": return { heading: "A simple path forward", body: "Show visitors what to expect, from the first conversation to the final result.", items: [] };
    case "testimonials": return { heading: "Trusted by the people we serve", body: "Add verified feedback that helps future customers choose with confidence.", items: [] };
    case "gallery": return { heading: "Selected work", body: "Show the spaces, products or projects that best represent your standard.", items: [] };
    case "team": return { heading: "The people behind the work", body: "Introduce the experience and personalities that make this business distinctive.", items: [] };
    case "cta": return { heading: "Ready when you are", body: "Give visitors one clear, low-friction next step.", ctaLabel: "Get started" };
    case "contact": return { heading: "Let’s talk", body: "Make it easy for visitors to reach the right person.", ctaLabel: "Contact us" };
    case "navbar": return {};
    case "footer": return {};
  }
}

function labelFor(section: SiteSection): string {
  return title(section.component.componentId.split(".")[0] || section.id);
}
function title(value: string): string { return value.replace(/[-_]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()); }
