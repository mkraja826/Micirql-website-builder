"use client";

import { useState } from "react";
import type { SitePage, SiteSection, ThemeFamily } from "@micirql/schema";
import { type SectionFamily, type SectionVariant } from "@micirql/sections";
import { SectionLibraryBrowser } from "./section-library-browser";
import styles from "./section-controls.module.css";

export function SectionControls({ page, theme, selectedSectionId, onSelect, onAdd, onMove, onToggleHidden, onRemove }: {
  page: SitePage;
  theme?: ThemeFamily;
  selectedSectionId?: string;
  onSelect(sectionId: string): void;
  onAdd(section: SiteSection): void;
  onMove(sectionId: string, toIndex: number): void;
  onToggleHidden(sectionId: string, hidden: boolean): void;
  onRemove(sectionId: string): void;
}) {
  const [libraryOpen, setLibraryOpen] = useState(false);
  const selectedIndex = selectedSectionId ? page.sections.findIndex((section) => section.id === selectedSectionId) : -1;
  const selected = selectedIndex >= 0 ? page.sections[selectedIndex] : undefined;
  const selectedIsGlobal = selected ? isGlobalShell(selected) : false;
  const activeTheme = theme ?? inferTheme(page);

  return <div className={styles.root}>
    <div className={styles.heading}>
      <div><span>Page structure</span><strong>{page.sections.length} sections</strong></div>
      <button type="button" className={styles.add} onClick={() => setLibraryOpen(true)}>＋ Add section</button>
    </div>

    <div className={styles.layers}>
      {page.sections.map((section, index) => {
        const global = isGlobalShell(section);
        return <button type="button" key={section.id} className={`${styles.layer} ${section.id === selectedSectionId ? styles.active : ""} ${section.hidden ? styles.hidden : ""}`} onClick={() => onSelect(section.id)}>
          <span className={styles.index}>{String(index + 1).padStart(2, "0")}</span>
          <span><strong>{labelFor(section)}{global ? " · Global" : ""}</strong><small>{global ? "Shared across every page" : section.hidden ? "Hidden" : section.component.componentId}</small></span>
        </button>;
      })}
    </div>

    {selected ? selectedIsGlobal ? <div className={styles.actions}><span>Global section — edit its copy or design once and MiCirql applies it across the website.</span></div> : <div className={styles.actions}>
      <button type="button" disabled={selectedIndex <= 0} onClick={() => onMove(selected.id, selectedIndex - 1)}>↑ Up</button>
      <button type="button" disabled={selectedIndex >= page.sections.length - 1} onClick={() => onMove(selected.id, selectedIndex + 1)}>↓ Down</button>
      <button type="button" onClick={() => onToggleHidden(selected.id, !selected.hidden)}>{selected.hidden ? "Show" : "Hide"}</button>
      <button type="button" className={styles.danger} onClick={() => onRemove(selected.id)}>Delete</button>
    </div> : null}

    {libraryOpen ? <SectionLibraryBrowser theme={activeTheme} onClose={() => setLibraryOpen(false)} onAdd={(family, variant, componentId) => {
      onAdd(newSection(family, variant, componentId));
      setLibraryOpen(false);
    }} /> : null}
  </div>;
}

function newSection(family: SectionFamily, _variant: SectionVariant, componentId: string): SiteSection {
  return { id: `${family}-${crypto.randomUUID()}`, component: { componentId, version: "1.0.0" }, props: defaultProps(family), bindings: {}, hidden: false };
}

function inferTheme(page: SitePage): ThemeFamily {
  const prefix = page.sections.map((section) => section.component.componentId.split("-")[0]).find((value) => value && value.length === 3)?.toUpperCase();
  const themes: Record<string, ThemeFamily> = { MIN: "minimalist", COR: "corporate", LUX: "luxury", EDT: "editorial", GLS: "glass", MAX: "maximalist", ORG: "organic", FUT: "futuristic", PLY: "playful", CIN: "cinematic" };
  return prefix && themes[prefix] ? themes[prefix] : "minimalist";
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
    case "faq": return { heading: "Frequently asked questions", body: "Answer the common questions visitors need before taking the next step.", items: [] };
    case "cta": return { heading: "Ready to get started?", body: "Give visitors one clear next step.", ctaLabel: "Get started" };
    case "contact": return { heading: "Contact us", body: "Make it easy for visitors to reach your team.", ctaLabel: "Contact us" };
    case "navbar": return {};
    case "footer": return {};
  }
}

function labelFor(section: SiteSection): string {
  const componentId = section.component.componentId;
  const codeMatch = componentId.match(/^[A-Z]{3}-(?:NAV|HERO|ABOUT|SERV|FEAT|PROC|TEST|GALL|TEAM|FAQ|CTA|CONT|FOOT)-/);
  if (codeMatch) {
    const familyCode = componentId.split("-")[1] ?? "";
    const names: Record<string, string> = { NAV: "Navbar", HERO: "Hero", ABOUT: "About", SERV: "Services", FEAT: "Features", PROC: "Process", TEST: "Testimonials", GALL: "Gallery", TEAM: "Team", FAQ: "FAQ", CTA: "Call to action", CONT: "Contact", FOOT: "Footer" };
    return names[familyCode] ?? componentId;
  }
  return title(componentId.split(".")[0] || section.id);
}
function isGlobalShell(section: SiteSection): boolean { const id=section.component.componentId.toLowerCase();return id.startsWith("navbar.")||id.startsWith("footer.")||id.includes("-nav-")||id.includes("-foot-")||id.includes("-footer-"); }
function title(value: string): string { return value.replace(/[-_]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()); }