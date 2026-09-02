"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Site } from "@micirql/schema";
import type { EditorViewport } from "@micirql/workspace";
import type { AiEditorOperation } from "./ai-edit-types";
import { proposedSiteForAiEdit } from "./ai-edit-proposed-site";
import { RendererPreview } from "./renderer-preview";
import styles from "./ai-edit-visual-preview.module.css";

const VIEWPORTS: Array<{ id: EditorViewport; label: string }> = [
  { id: "desktop", label: "Desktop" },
  { id: "tablet", label: "Tablet" },
  { id: "mobile", label: "Mobile" },
];

export function AiEditVisualPreview({ site, pageId, sectionId, operation }: { site: Site; pageId: string; sectionId?: string; operation: AiEditorOperation }) {
  const frame = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState<EditorViewport>("desktop");
  const proposal = useMemo(() => proposedSiteForAiEdit(site, pageId, sectionId, operation), [site, pageId, sectionId, operation]);

  useEffect(() => {
    const node = frame.current;
    if (!node) return;
    node.setAttribute("inert", "");
    return () => node.removeAttribute("inert");
  }, [proposal.site, proposal.path, viewport]);

  return <section className={styles.shell} aria-label="Visual proposal preview">
    <div className={styles.heading}>
      <div><span>Visual preview</span><strong>{proposal.site ? "Proposed canvas" : "No canvas change"}</strong></div>
      <small>{proposal.site ? "Preview only · nothing has been applied" : proposal.note}</small>
    </div>
    {proposal.site ? <>
      <div className={styles.viewportPicker} role="group" aria-label="Proposal preview device">
        {VIEWPORTS.map((item) => <button key={item.id} type="button" aria-pressed={viewport === item.id} className={viewport === item.id ? styles.viewportActive : ""} onClick={() => setViewport(item.id)}>{item.label}</button>)}
      </div>
      <div className={`${styles.viewport} ${styles[viewport]}`} aria-hidden="true">
        <div ref={frame} className={`${styles.frame} ${styles[`frame${viewport.charAt(0).toUpperCase()}${viewport.slice(1)}`]}`}>
          <RendererPreview site={proposal.site} path={proposal.path} viewport={viewport} {...(proposal.selectedSectionId ? { selectedSectionId: proposal.selectedSectionId } : {})} onSelectSection={() => {}} />
        </div>
      </div>
    </> : null}
  </section>;
}
