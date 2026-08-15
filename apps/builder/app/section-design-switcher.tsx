"use client";

import { useState } from "react";
import { LAYOUT_VARIANTS, sectionDesignId, type SectionFamily, type SectionVariant } from "@micirql/sections";
import type { Site, SiteSection, ThemeFamily } from "@micirql/schema";
import { SectionCompositionPicker } from "./section-composition-picker";
import type { AiEditorSectionFamily } from "./ai-edit-types";

const VARIANTS: SectionVariant[] = [1, 2, 3, 4, 5];

export function SectionDesignSwitcher({ site, pageId, section, family, theme, currentComponentId, onSelect }: {
  site: Site;
  pageId: string;
  section: SiteSection;
  family: SectionFamily;
  theme: ThemeFamily;
  currentComponentId: string;
  onSelect(componentId: string, version: string): void;
}) {
  const [replaceOpen, setReplaceOpen] = useState(false);

  if (replaceOpen && isAiFamily(family)) {
    return <SectionCompositionPicker site={site} pageId={pageId} family={family} currentSection={section} mode="replace" onCancel={() => setReplaceOpen(false)} onChoose={(candidate) => { onSelect(candidate.componentId, candidate.version); setReplaceOpen(false); }} />;
  }

  return <div className="design-switcher">
    <div className="design-switcher-copy"><strong>Section design</strong><span>Your content, images and actions stay unchanged.</span></div>
    {isAiFamily(family) ? <button type="button" className="design-replace-button" onClick={() => setReplaceOpen(true)}>Replace design · preview alternatives</button> : null}
    <div className="design-grid">{VARIANTS.map((variant) => {
      const componentId = sectionDesignId(theme, family, variant);
      const current = componentId === currentComponentId || legacyVariantMatches(currentComponentId, family, variant);
      return <button key={componentId} type="button" className={`design-card ${current ? "is-current" : ""}`} onClick={() => onSelect(componentId, "1.0.0")} aria-pressed={current}><DesignSchematic variant={variant} /><div><strong>{LAYOUT_VARIANTS[variant]}</strong><span>{current ? "Current" : `Variant ${variant}`}</span></div></button>;
    })}</div>
    <p className="design-switcher-note">Use Replace design for contextual, preference-aware alternatives. Quick variants remain available for direct manual switching.</p>
  </div>;
}

function DesignSchematic({ variant }: { variant: SectionVariant }) { return <span className={`design-schematic design-schematic-${variant}`} aria-hidden="true"><i /><i /><i /><i /></span>; }
function legacyVariantMatches(componentId: string, family: SectionFamily, variant: SectionVariant): boolean { return variant === 1 && (componentId === `${family}.placeholder` || componentId.startsWith(`${family}.`)); }
function isAiFamily(family: SectionFamily): family is AiEditorSectionFamily { return family !== "navbar" && family !== "footer"; }
