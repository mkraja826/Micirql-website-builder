"use client";

import { useState } from "react";
import type { Site } from "@micirql/schema";
import { SectionCompositionPicker } from "./section-composition-picker";
import type { AiEditorSectionFamily } from "./ai-edit-types";

const FAMILIES: Array<{ family: AiEditorSectionFamily; label: string; hint: string }> = [
  { family: "hero", label: "Hero", hint: "Opening message and primary action" },
  { family: "about", label: "About", hint: "Business story and positioning" },
  { family: "services", label: "Services", hint: "Core offers and treatments" },
  { family: "features", label: "Benefits", hint: "Reasons to choose the business" },
  { family: "process", label: "Process", hint: "Steps, timeline or workflow" },
  { family: "testimonials", label: "Testimonials", hint: "Customer trust and social proof" },
  { family: "gallery", label: "Gallery", hint: "Work, cases, spaces or results" },
  { family: "team", label: "Team", hint: "People, doctors or specialists" },
  { family: "cta", label: "Call to action", hint: "Focused conversion moment" },
  { family: "contact", label: "Contact", hint: "Enquiry or contact details" },
];

type Candidate = {
  componentId: string;
  version: string;
  displayName: string;
  score: number;
  reasons: string[];
  previewOnly: boolean;
  theme: string;
  modifiers: string[];
};

export function CanvasAddSectionFlow({
  site,
  pageId,
  afterSectionId,
  onChoose,
  onCancel,
}: {
  site: Site;
  pageId: string;
  afterSectionId?: string;
  onChoose(family: AiEditorSectionFamily, candidate: Candidate): void;
  onCancel(): void;
}) {
  const [family, setFamily] = useState<AiEditorSectionFamily>();

  if (family) {
    return (
      <div className="canvas-add-section-panel">
        <button type="button" className="canvas-add-section-back" onClick={() => setFamily(undefined)}>← Section types</button>
        <SectionCompositionPicker
          site={site}
          pageId={pageId}
          family={family}
          afterSectionId={afterSectionId}
          onCancel={onCancel}
          onChoose={(candidate) => onChoose(family, candidate)}
        />
      </div>
    );
  }

  return (
    <section className="canvas-add-section-panel">
      <div className="canvas-add-section-head">
        <div><span>Add section</span><strong>What should go here?</strong><small>Choose a purpose. MiCirql will rank matching designs for this exact position.</small></div>
        <button type="button" onClick={onCancel} aria-label="Close add section">×</button>
      </div>
      <div className="canvas-add-section-grid">
        {FAMILIES.map((item) => (
          <button key={item.family} type="button" onClick={() => setFamily(item.family)}>
            <strong>{item.label}</strong>
            <span>{item.hint}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
