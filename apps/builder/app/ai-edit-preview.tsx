import type { AiEditorOperation } from "./ai-edit-types";
import styles from "./ai-edit-preview.module.css";

type PreviewRow = { label: string; before: string; after: string };

export function AiEditPreview({ operation, target }: { operation: AiEditorOperation; target: string }) {
  const rows = previewRows(operation);
  return <div className={styles.preview} aria-label="Proposed change preview">
    <div className={styles.header}>
      <span>Before</span>
      <strong>Change preview</strong>
      <span>After</span>
    </div>
    <div className={styles.target}>{target}</div>
    {rows.map((row) => <div className={styles.row} key={row.label}>
      <small>{row.label}</small>
      <div className={styles.before}>{row.before}</div>
      <div className={styles.arrow} aria-hidden="true">→</div>
      <div className={styles.after}>{row.after}</div>
    </div>)}
  </div>;
}

function previewRows(operation: AiEditorOperation): PreviewRow[] {
  switch (operation.type) {
    case "section.variant":
      return [
        { label: "Layout", before: "Current section layout", after: `Variant ${operation.variant}` },
        ...(operation.heading ? [{ label: "Heading", before: "Current heading", after: operation.heading }] : []),
        ...(operation.body ? [{ label: "Body", before: "Current body copy", after: operation.body }] : []),
      ];
    case "section.copy":
      return [
        ...(operation.heading ? [{ label: "Heading", before: "Current heading", after: operation.heading }] : []),
        ...(operation.body ? [{ label: "Body", before: "Current body copy", after: operation.body }] : []),
      ];
    case "section.add":
      return [{ label: "Structure", before: "No section here", after: `Add ${operation.family} · ${operation.position === "after-selected" ? "after selected" : "at page end"}` }];
    case "section.visibility":
      return [{ label: "Visibility", before: operation.hidden ? "Visible" : "Hidden", after: operation.hidden ? "Hidden" : "Visible" }];
    case "section.remove":
      return [{ label: "Structure", before: "Section present", after: "Section removed" }];
    case "section.move":
      return [{ label: "Position", before: "Current position", after: `Move ${operation.direction}` }];
    case "media.open":
      return [{ label: "Media", before: "Current media", after: "Open media picker before changing" }];
    case "functions.open":
      return [{ label: "Action", before: "Current action setup", after: "Open function setup before changing" }];
    case "seo.patch":
      return [
        ...(operation.title ? [{ label: "SEO title", before: "Current SEO title", after: operation.title }] : []),
        ...(operation.description ? [{ label: "Description", before: "Current SEO description", after: operation.description }] : []),
      ];
    case "page.add":
      return [
        { label: "Page", before: "No page", after: operation.name },
        { label: "Path", before: "—", after: operation.path },
      ];
  }
}
