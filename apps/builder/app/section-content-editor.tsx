"use client";

import type { SiteSection } from "@micirql/schema";
import type { SectionFamily } from "@micirql/sections";

const COLLECTION_FAMILIES = new Set<SectionFamily>([
  "services",
  "features",
  "process",
  "testimonials",
  "gallery",
  "team",
]);

const IMAGE_ITEM_FAMILIES = new Set<SectionFamily>([
  "services",
  "features",
  "testimonials",
  "gallery",
  "team",
]);

export function SectionContentEditor({
  section,
  family,
  onTextChange,
  onItemsChange,
  onChooseImage,
}: {
  section: SiteSection;
  family: SectionFamily;
  onTextChange(propPath: string, value: string): void;
  onItemsChange(value: Array<Record<string, unknown>>): void;
  onChooseImage(propPath: string): void;
}) {
  const items = recordList(section.props.items);
  const showItems = COLLECTION_FAMILIES.has(family) || items.length > 0;

  return (
    <div className="selected-section-editor">
      <div className="selected-section-heading">
        <span>Selected section</span>
        <strong>{sectionLabel(family)}</strong>
        <p>Edit the visible copy and repeatable content for this section.</p>
      </div>

      <div className="inspector-form">
        {section.props.eyebrow !== undefined ? (
          <label>
            Eyebrow
            <input
              value={String(section.props.eyebrow ?? "")}
              onChange={(event) => onTextChange("eyebrow", event.target.value)}
            />
          </label>
        ) : null}
        <label>
          Heading
          <input
            value={String(section.props.heading ?? section.props.title ?? "")}
            onChange={(event) =>
              onTextChange(
                section.props.title !== undefined ? "title" : "heading",
                event.target.value,
              )
            }
          />
        </label>
        <label>
          Body
          <textarea
            value={String(
              section.props.body ?? section.props.description ?? "",
            )}
            onChange={(event) =>
              onTextChange(
                section.props.description !== undefined
                  ? "description"
                  : "body",
                event.target.value,
              )
            }
          />
        </label>
        {section.props.ctaLabel !== undefined ? (
          <label>
            Button label
            <input
              value={String(section.props.ctaLabel ?? "")}
              onChange={(event) => onTextChange("ctaLabel", event.target.value)}
            />
          </label>
        ) : null}
        {section.props.ctaHref !== undefined ? (
          <label>
            Button destination
            <input
              inputMode="url"
              value={String(section.props.ctaHref ?? "")}
              onChange={(event) => onTextChange("ctaHref", event.target.value)}
            />
          </label>
        ) : null}
      </div>

      {showItems ? (
        <CollectionItemsEditor
          family={family}
          items={items}
          onChange={onItemsChange}
          onChooseImage={onChooseImage}
        />
      ) : null}
    </div>
  );
}

function CollectionItemsEditor({
  family,
  items,
  onChange,
  onChooseImage,
}: {
  family: SectionFamily;
  items: Array<Record<string, unknown>>;
  onChange(value: Array<Record<string, unknown>>): void;
  onChooseImage(propPath: string): void;
}) {
  const patchItem = (index: number, patch: Record<string, unknown>) =>
    onChange(
      items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    );

  const moveItem = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item!);
    onChange(next);
  };

  return (
    <section
      className="collection-editor"
      aria-label={`${sectionLabel(family)} items`}
    >
      <div className="collection-editor-heading">
        <div>
          <span>Repeatable content</span>
          <strong>
            {items.length ? `${items.length} items` : "No items yet"}
          </strong>
        </div>
        <button
          type="button"
          onClick={() => onChange([...items, createItem(family, items.length)])}
        >
          Add item
        </button>
      </div>

      {items.length ? (
        <div className="collection-editor-list">
          {items.map((item, index) => (
            <fieldset className="collection-item" key={`item-${index}`}>
              <legend>Item {index + 1}</legend>
              <label>
                Title
                <input
                  value={stringValue(item.title)}
                  onChange={(event) =>
                    patchItem(index, { title: event.target.value })
                  }
                />
              </label>
              {family === "services" ? (
                <label>
                  Group (optional)
                  <input
                    value={stringValue(item.group)}
                    onChange={(event) =>
                      patchItem(index, { group: event.target.value })
                    }
                  />
                </label>
              ) : null}
              <label>
                {metaLabel(family)}
                <input
                  value={stringValue(item.meta)}
                  onChange={(event) =>
                    patchItem(index, { meta: event.target.value })
                  }
                />
              </label>
              <label>
                Description
                <textarea
                  value={stringValue(item.description)}
                  onChange={(event) =>
                    patchItem(index, { description: event.target.value })
                  }
                />
              </label>
              <div
                className="collection-item-actions"
                role="group"
                aria-label={`Item ${index + 1} actions`}
              >
                {IMAGE_ITEM_FAMILIES.has(family) ? (
                  <button
                    type="button"
                    onClick={() => onChooseImage(`items.${index}.image`)}
                  >
                    {item.image ? "Change image" : "Choose image"}
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => moveItem(index, -1)}
                >
                  Move up
                </button>
                <button
                  type="button"
                  disabled={index === items.length - 1}
                  onClick={() => moveItem(index, 1)}
                >
                  Move down
                </button>
                <button
                  className="danger"
                  type="button"
                  onClick={() =>
                    onChange(
                      items.filter((_, itemIndex) => itemIndex !== index),
                    )
                  }
                >
                  Remove
                </button>
              </div>
            </fieldset>
          ))}
        </div>
      ) : (
        <p className="collection-editor-empty">
          Add the first item, then enter only facts and media supplied by this
          business.
        </p>
      )}
    </section>
  );
}

function createItem(
  family: SectionFamily,
  index: number,
): Record<string, unknown> {
  const labels: Partial<Record<SectionFamily, string>> = {
    services: "New service",
    features: "New benefit",
    process: `Step ${index + 1}`,
    testimonials: "Verified customer story",
    gallery: "Gallery item",
    team: "Team member",
  };
  return { title: labels[family] ?? `Item ${index + 1}`, description: "" };
}

function recordList(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is Record<string, unknown> =>
      Boolean(item) && typeof item === "object" && !Array.isArray(item),
  );
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function metaLabel(family: SectionFamily): string {
  if (family === "services") return "Price or supporting detail (optional)";
  if (family === "team") return "Role or credential (optional)";
  if (family === "testimonials") return "Source or context (optional)";
  return "Supporting detail (optional)";
}

function sectionLabel(family: SectionFamily): string {
  if (family === "cta") return "Call to action";
  return family
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
