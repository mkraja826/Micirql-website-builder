"use client";

import { useEffect, useMemo, useRef } from "react";
import type { Site } from "@micirql/schema";
import type { AiEditorOperation } from "./ai-edit-types";
import { proposedSiteForAiEdit } from "./ai-edit-proposed-site";
import { RendererPreview } from "./renderer-preview";
import styles from "./ai-edit-visual-preview.module.css";

export function AiEditVisualPreview({ site, pageId, sectionId, operation }: { site: Site; pageId: string; sectionId?: string; operation: AiEditorOperation }) {
  const frame = useRef<HTMLDivElement>(null);
  const proposal = useMemo(() => proposedSiteForAiEdit(site, pageId, sectionId, operation), [site, pageId, sectionId, operation]);

  useEffect(() => {
    const node = frame.current;
    if (!node) return;
    node.setAttribute("inert", "");
    return () => node.removeAttribute("inert");
  }, [proposal.site, proposal.path]);

  return <section className={styles.shell} aria-label="Visual proposal preview">
    <div className={styles.heading}>
      <div><span>Visual preview</span><strong>{proposal.site ? "Proposed canvas" : "No canvas change"}</strong></div>
      <small>{proposal.site ? "Preview only · nothing has been applied" : proposal.note}</small>
    </div>
    {proposal.site ? <div className={styles.viewport} aria-hidden="true">
      <div ref={frame} className={styles.frame}>
        <RendererPreview site={proposal.site} path={proposal.path} viewport="desktop" selectedSectionId={proposal.selectedSectionId} onSelectSection={() => {}} />
      </div>
    </div> : null}
  </section>;
}
