"use client";

import { useEffect, useRef } from "react";
import type { Site, SitePage, SiteSection } from "@micirql/schema";
import {
  CERTIFIED_SECTION_COMPONENT_VERSION,
  FAMILY_CODES,
  SECTION_FAMILIES,
  sectionDesignId,
  type SectionFamily,
} from "@micirql/sections";
import type { ThemeFamily } from "@micirql/schema";

const ADDABLE_FAMILIES = SECTION_FAMILIES.filter(
  (family) => family !== "navbar",
);
const SINGLETON_FAMILIES = new Set<SectionFamily>(["navbar", "hero", "footer"]);

export function SectionControls({
  page,
  themeFamily,
  siteName,
  navigation,
  selectedSectionId,
  onSelect,
  onAdd,
  onMove,
  onToggleHidden,
  onRemove,
}: {
  page: SitePage;
  themeFamily: ThemeFamily;
  siteName: string;
  navigation: Site["navigation"];
  selectedSectionId?: string;
  onSelect(sectionId: string): void;
  onAdd(section: SiteSection): void;
  onMove(sectionId: string, toIndex: number): void;
  onToggleHidden(sectionId: string, hidden: boolean): void;
  onRemove(sectionId: string): void;
}) {
  const selectedIndex = selectedSectionId
    ? page.sections.findIndex((section) => section.id === selectedSectionId)
    : -1;
  const selected =
    selectedIndex >= 0 ? page.sections[selectedIndex] : undefined;
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    if (!selectedSectionId) return;
    const list = listRef.current;
    const selectedButton = list?.querySelector<HTMLElement>(
      `[data-section-id="${CSS.escape(selectedSectionId)}"]`,
    );
    if (!list || !selectedButton) return;
    const listBox = list.getBoundingClientRect();
    const buttonBox = selectedButton.getBoundingClientRect();
    if (buttonBox.top < listBox.top) {
      list.scrollTop -= listBox.top - buttonBox.top;
    } else if (buttonBox.bottom > listBox.bottom) {
      list.scrollTop += buttonBox.bottom - listBox.bottom;
    }
  }, [selectedSectionId]);

  const addSection = (family: SectionFamily) => {
    const section = createDefaultSection(family, themeFamily, page.sections);
    if (family === "navbar") {
      section.props.title = siteName;
      section.props.items = navigation.map((item) => ({
        title: item.label,
        href: item.href,
      }));
    }
    if (family === "footer") {
      section.props.title = siteName;
      section.props.footerLinks = navigation.map((item) => ({
        label: item.label,
        href: item.href,
      }));
      section.props.copyright = `© ${new Date().getFullYear()} ${siteName}. All rights reserved.`;
    }
    onAdd(section);
  };

  return (
    <div className="section-controls">
      <div className="section-controls-heading">
        <div>
          <span>Page structure</span>
          <strong>{page.name}</strong>
        </div>
        <small>{page.sections.length} sections</small>
      </div>

      <ol
        ref={listRef}
        className="section-list"
        aria-label={`Sections on ${page.name}`}
      >
        {page.sections.map((section, index) => {
          const active = section.id === selectedSectionId;
          return (
            <li key={section.id}>
              <button
                data-section-id={section.id}
                aria-pressed={active}
                className={active ? "is-active" : ""}
                type="button"
                onClick={() => onSelect(section.id)}
              >
                <span className="section-list-position" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="section-list-copy">
                  <strong>{labelFor(section)}</strong>
                  <small>{section.hidden ? "Hidden" : "Visible"}</small>
                </span>
                <span className="section-list-state" aria-hidden="true">
                  {active ? "Editing" : "Select"}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="section-add-panel">
        <label>
          <span>Add a section</span>
          <select
            aria-label="Add section"
            defaultValue=""
            onChange={(event) => {
              const family = event.target.value as SectionFamily;
              if (!family) return;
              addSection(family);
              event.target.value = "";
            }}
          >
            <option value="">Choose section type…</option>
            {ADDABLE_FAMILIES.filter(
              (family) =>
                !SINGLETON_FAMILIES.has(family) ||
                !page.sections.some((section) =>
                  componentMatches(section.component.componentId, family),
                ),
            ).map((family) => (
              <option key={family} value={family}>
                {title(family)}
              </option>
            ))}
          </select>
        </label>
        <div className="section-quick-add">
          {!page.sections.some((section) =>
            componentMatches(section.component.componentId, "navbar"),
          ) ? (
            <button type="button" onClick={() => addSection("navbar")}>
              Add navigation
            </button>
          ) : null}
          {!page.sections.some((section) =>
            componentMatches(section.component.componentId, "footer"),
          ) ? (
            <button type="button" onClick={() => addSection("footer")}>
              Add footer
            </button>
          ) : null}
        </div>
      </div>

      {selected ? (
        <div
          className="section-actions"
          role="group"
          aria-label="Selected section actions"
        >
          <span>Selected section</span>
          <div>
            <button
              disabled={selectedIndex <= 0}
              type="button"
              onClick={() => onMove(selected.id, selectedIndex - 1)}
            >
              Move up
            </button>
            <button
              disabled={selectedIndex >= page.sections.length - 1}
              type="button"
              onClick={() => onMove(selected.id, selectedIndex + 1)}
            >
              Move down
            </button>
            <button
              type="button"
              onClick={() => onToggleHidden(selected.id, !selected.hidden)}
            >
              {selected.hidden ? "Show" : "Hide"}
            </button>
            <button
              className="danger"
              type="button"
              onClick={() => onRemove(selected.id)}
            >
              Remove
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function createDefaultSection(
  family: SectionFamily,
  theme: ThemeFamily,
  existingSections: SiteSection[],
): SiteSection {
  const props = defaultProps(family);
  const heading = stringValue(props.heading);
  if (heading) {
    const existingHeadings = new Set(
      existingSections
        .map(
          (section) =>
            stringValue(section.props.heading) ??
            stringValue(section.props.title),
        )
        .filter(Boolean)
        .map((value) => value!.toLowerCase()),
    );
    if (existingHeadings.has(heading.toLowerCase())) {
      const alternatives: Record<string, string[]> = {
        "built with purpose": ["Our approach", "What guides us"],
        "what we do": ["Our capabilities", "Explore our work"],
        "why clients choose us": ["The difference we bring", "Why it matters"],
        "a simple path forward": ["How it comes together", "What to expect"],
        "trusted by the people we serve": [
          "Client perspective",
          "In their words",
        ],
        "selected work": ["A closer look", "Featured highlights"],
        "the people behind the work": ["Meet the people", "Our team"],
        "ready when you are": ["Take the next step", "Let’s begin"],
        "let’s talk": ["Start a conversation", "Get in touch"],
      };
      const replacement = alternatives[heading.toLowerCase()]?.find(
        (value) => !existingHeadings.has(value.toLowerCase()),
      );
      if (replacement) props.heading = replacement;
    }
  }
  return {
    id: `${family}-${crypto.randomUUID()}`,
    component: {
      componentId: sectionDesignId(theme, family, 1),
      version: CERTIFIED_SECTION_COMPONENT_VERSION,
    },
    props,
    bindings: {},
    hidden: false,
  };
}

function defaultProps(family: SectionFamily): Record<string, unknown> {
  switch (family) {
    case "hero":
      return {
        eyebrow: "A better way forward",
        heading: "Designed around what matters most",
        body: "Clear, confident communication that helps visitors take the next step.",
        ctaLabel: "Get started",
        ctaHref: "#contact",
      };
    case "about":
      return {
        heading: "Built with purpose",
        body: "Share the story, expertise and approach that make this business worth choosing.",
      };
    case "services":
      return {
        heading: "What we do",
        body: "Explore the services and solutions designed around your needs.",
        items: [],
      };
    case "features":
      return {
        heading: "Why clients choose us",
        body: "Highlight the strengths and details that set this experience apart.",
        items: [],
      };
    case "process":
      return {
        heading: "A simple path forward",
        body: "Show visitors what to expect, from the first conversation to the final result.",
        items: [],
      };
    case "testimonials":
      return {
        heading: "Trusted by the people we serve",
        body: "Add verified feedback that helps future customers choose with confidence.",
        items: [],
      };
    case "gallery":
      return {
        heading: "Selected work",
        body: "Show the spaces, products or projects that best represent your standard.",
        items: [],
      };
    case "team":
      return {
        heading: "The people behind the work",
        body: "Introduce the experience and personalities that make this business distinctive.",
        items: [],
      };
    case "cta":
      return {
        heading: "Ready when you are",
        body: "Give visitors one clear, low-friction next step.",
        ctaLabel: "Get started",
        ctaHref: "#contact",
      };
    case "contact":
      return {
        heading: "Let’s talk",
        body: "Make it easy for visitors to reach the right person.",
        ctaLabel: "Contact us",
        ctaHref: "#contact",
      };
    case "navbar":
      return {};
    case "footer":
      return {
        title: "Your business",
        description: "A short note about what you do and who you serve.",
        footerLinks: [
          { label: "Services", href: "#services" },
          { label: "About", href: "#about" },
          { label: "Contact", href: "#contact" },
        ],
        copyright: `© ${new Date().getFullYear()} Your business. All rights reserved.`,
      };
  }
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function labelFor(section: SiteSection): string {
  const family = SECTION_FAMILIES.find((candidate) =>
    componentMatches(section.component.componentId, candidate),
  );
  if (family) return title(family);
  return title(section.component.componentId.split(".")[0] || section.id);
}
function componentMatches(componentId: string, family: SectionFamily): boolean {
  const value = componentId.toLowerCase();
  return (
    value === `${family}.placeholder` ||
    value.startsWith(`${family}.`) ||
    value.includes(`-${FAMILY_CODES[family].toLowerCase()}-`) ||
    value.includes(`-${family === "navbar" ? "nav" : family}-`)
  );
}
function title(value: string): string {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
