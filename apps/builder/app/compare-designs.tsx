"use client";

import { useRef } from "react";
import type { Site } from "@micirql/schema";
import { RendererPreview } from "./renderer-preview";
import type { ReviewDirection } from "./review-directions";
import styles from "./first-build-review.module.css";

type Viewport = "desktop" | "mobile";

export function CompareDesigns({
  directions,
  viewport,
  savingId,
  onViewportChange,
  onClose,
  onChoose,
}: {
  directions: ReviewDirection[];
  viewport: Viewport;
  savingId?: string;
  onViewportChange(viewport: Viewport): void;
  onClose(): void;
  onChoose(direction: ReviewDirection): void;
}) {
  const panes = useRef<Array<HTMLDivElement | null>>([]);
  const syncing = useRef(false);

  function syncScroll(sourceIndex: number) {
    if (syncing.current) return;
    const source = panes.current[sourceIndex];
    const target = panes.current[sourceIndex === 0 ? 1 : 0];
    if (!source || !target) return;
    const sourceRange = Math.max(1, source.scrollHeight - source.clientHeight);
    const targetRange = Math.max(0, target.scrollHeight - target.clientHeight);
    syncing.current = true;
    target.scrollTop = (source.scrollTop / sourceRange) * targetRange;
    window.requestAnimationFrame(() => { syncing.current = false; });
  }

  return <div className={styles.modalBackdrop} role="dialog" aria-modal="true" aria-label="Compare designs">
    <div className={`${styles.modal} ${styles.compareModal}`}>
      <div className={styles.modalHeader}>
        <div><small>Side-by-side</small><strong>Compare designs</strong></div>
        <div className={styles.modalTools}>
          <button type="button" className={viewport === "desktop" ? styles.selectedAction : ""} onClick={() => onViewportChange("desktop")}>Desktop</button>
          <button type="button" className={viewport === "mobile" ? styles.selectedAction : ""} onClick={() => onViewportChange("mobile")}>Mobile</button>
          <button type="button" onClick={onClose}>Close</button>
        </div>
      </div>
      <div className={styles.compareGrid} data-viewport={viewport}>
        {directions.map((direction, index) => <div key={direction.id} className={styles.comparePane}>
          <h3>{displayDirectionName(direction.name)}</h3>
          <div
            className={styles.comparePreview}
            ref={(node) => { panes.current[index] = node; }}
            onScroll={() => syncScroll(index)}
          >
            <div style={viewport === "mobile" ? { width: 390, minWidth: 390, margin: "0 auto" } : undefined}>
              <RendererPreview site={direction.site as Site} path={direction.site.pages[0]?.path ?? "/"} viewport={viewport} onSelectSection={() => {}} />
            </div>
          </div>
          <button type="button" disabled={Boolean(savingId)} onClick={() => onChoose(direction)}>{savingId === direction.id ? "Saving…" : "Use this design"}</button>
        </div>)}
      </div>
    </div>
  </div>;
}

function displayDirectionName(name: string) {
  return name.replace(/\s*·\s*variation\s+\d+\s*$/i, "").trim();
}
