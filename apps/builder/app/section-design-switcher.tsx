"use client";

import { LAYOUT_VARIANTS, sectionDesignId, type SectionFamily, type SectionVariant } from "@micirql/sections";
import type { ThemeFamily } from "@micirql/schema";

const VARIANTS: SectionVariant[] = [1, 2, 3, 4, 5];

export function SectionDesignSwitcher({
  family,
  theme,
  currentComponentId,
  onSelect,
}: {
  family: SectionFamily;
  theme: ThemeFamily;
  currentComponentId: string;
  onSelect(componentId: string, version: string): void;
}) {
  return (
    <div className="design-switcher">
      <div className="design-switcher-copy">
        <strong>Section design</strong>
        <span>Your content, images and actions stay unchanged.</span>
      </div>
      <div className="design-grid">
        {VARIANTS.map((variant) => {
          const componentId = sectionDesignId(theme, family, variant);
          const current = componentId === currentComponentId || legacyVariantMatches(currentComponentId, family, variant);
          return (
            <button
              key={componentId}
              type="button"
              className={`design-card ${current ? "is-current" : ""}`}
              onClick={() => onSelect(componentId, "1.0.0")}
              aria-pressed={current}
            >
              <DesignSchematic variant={variant} />
              <div>
                <strong>{LAYOUT_VARIANTS[variant]}</strong>
                <span>{current ? "Current" : `Variant ${variant}`}</span>
              </div>
            </button>
          );
        })}
      </div>
      <p className="design-switcher-note">Preview variants can be tested here. Only production-approved Registry designs may be published.</p>
    </div>
  );
}

function DesignSchematic({ variant }: { variant: SectionVariant }) {
  return (
    <span className={`design-schematic design-schematic-${variant}`} aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}

function legacyVariantMatches(componentId: string, family: SectionFamily, variant: SectionVariant): boolean {
  return variant === 1 && (componentId === `${family}.placeholder` || componentId.startsWith(`${family}.`));
}
