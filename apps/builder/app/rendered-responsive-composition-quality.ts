export type ResponsiveCompositionIssue = {
  code:
    | "HORIZONTAL_OVERFLOW"
    | "CONTENT_GUTTER_TOO_TIGHT"
    | "CARD_COLUMN_TOO_NARROW"
    | "TOO_MANY_CARD_COLUMNS"
    | "TOUCH_TARGET_TOO_SMALL"
    | "ACTION_OVERLAP"
    | "MOBILE_MEDIA_TEXT_NOT_STACKED";
  severity: "warning" | "error";
  detail: string;
};

/**
 * Browser-level responsive composition QA for generated review candidates.
 * This intentionally measures geometry rather than component names so it can
 * protect every certified dental design without flattening editorial variants.
 */
export function measureResponsiveCompositionIssues(root: HTMLElement, width: number): ResponsiveCompositionIssue[] {
  const issues: ResponsiveCompositionIssue[] = [];
  const mobile = width <= 430;
  const tablet = width > 430 && width <= 1024;
  const rootRect = root.getBoundingClientRect();
  const editorSelector = "[data-mi-canvas-action],.mi-editor-insert-zone,.mi-editor-canvas-toolbar";
  const visible = (node: Element) => {
    if (node.closest(editorSelector)) return false;
    const style = getComputedStyle(node);
    const rect = node.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" && Number.parseFloat(style.opacity || "1") !== 0 && rect.width > 0 && rect.height > 0;
  };

  if (root.scrollWidth > root.clientWidth + 3) {
    issues.push({ code: "HORIZONTAL_OVERFLOW", severity: "error", detail: `${root.scrollWidth}px>${root.clientWidth}px` });
  }

  const minGutter = mobile ? 12 : tablet ? 18 : 24;
  const contentCandidates = [...root.querySelectorAll<HTMLElement>("section > div,.mi-section__inner,.mi-content-heading,.mi-section__content")]
    .filter(visible)
    .filter((node) => {
      const rect = node.getBoundingClientRect();
      return rect.width < rootRect.width * 0.985 && rect.width > 120;
    });
  for (const node of contentCandidates) {
    const rect = node.getBoundingClientRect();
    const left = rect.left - rootRect.left;
    const right = rootRect.right - rect.right;
    if (left >= 0 && right >= 0 && Math.min(left, right) < minGutter) {
      issues.push({ code: "CONTENT_GUTTER_TOO_TIGHT", severity: "warning", detail: `${Math.round(Math.min(left, right))}px<${minGutter}px` });
      break;
    }
  }

  const cardSelector = ".mi-card,.mi-service-item,[class*='card'],[class*='item']";
  const cardParents = new Set<HTMLElement>();
  for (const card of [...root.querySelectorAll<HTMLElement>(cardSelector)].filter(visible)) {
    if (card.parentElement) cardParents.add(card.parentElement);
  }
  for (const parent of cardParents) {
    const cards = [...parent.children].filter((child): child is HTMLElement => child instanceof HTMLElement && child.matches(cardSelector) && visible(child));
    if (cards.length < 2) continue;
    const rows = groupRows(cards);
    const maxColumns = Math.max(...rows.map((row) => row.length));
    const minWidth = Math.min(...cards.map((card) => card.getBoundingClientRect().width));
    const allowedColumns = mobile ? 2 : tablet ? 3 : 4;
    const safeCardWidth = mobile ? 148 : tablet ? 180 : 210;
    if (maxColumns > allowedColumns) {
      issues.push({ code: "TOO_MANY_CARD_COLUMNS", severity: "error", detail: `${maxColumns}>${allowedColumns} at ${width}px` });
    }
    if (minWidth < safeCardWidth) {
      issues.push({ code: "CARD_COLUMN_TOO_NARROW", severity: minWidth < safeCardWidth - 28 ? "error" : "warning", detail: `${Math.round(minWidth)}px<${safeCardWidth}px` });
    }
  }

  if (mobile || tablet) {
    const touchTargets = [...root.querySelectorAll<HTMLElement>("button,.mi-section__action,input,select,textarea,[role='button']")].filter(visible);
    for (const target of touchTargets) {
      const rect = target.getBoundingClientRect();
      if (rect.height < 40 || rect.width < 40) {
        issues.push({ code: "TOUCH_TARGET_TOO_SMALL", severity: rect.height < 34 || rect.width < 34 ? "error" : "warning", detail: `${Math.round(rect.width)}x${Math.round(rect.height)}` });
      }
    }
    for (let i = 0; i < touchTargets.length; i += 1) {
      const a = touchTargets[i]!.getBoundingClientRect();
      for (let j = i + 1; j < touchTargets.length; j += 1) {
        const b = touchTargets[j]!.getBoundingClientRect();
        if (rectanglesOverlap(a, b)) {
          issues.push({ code: "ACTION_OVERLAP", severity: "error", detail: `interactive elements overlap at ${width}px` });
          i = touchTargets.length;
          break;
        }
      }
    }
  }

  if (mobile) {
    for (const section of [...root.querySelectorAll<HTMLElement>("section")].filter(visible)) {
      const image = [...section.querySelectorAll<HTMLElement>("img,picture,video")].find(visible);
      const text = [...section.querySelectorAll<HTMLElement>("h1,h2,h3,p")].find(visible);
      if (!image || !text) continue;
      const imageRect = image.getBoundingClientRect();
      const textRect = text.getBoundingClientRect();
      const horizontallyParallel = overlapLength(imageRect.top, imageRect.bottom, textRect.top, textRect.bottom) > Math.min(imageRect.height, textRect.height) * 0.35;
      const bothColumns = imageRect.width < rootRect.width * 0.58 && textRect.width < rootRect.width * 0.58;
      if (horizontallyParallel && bothColumns) {
        issues.push({ code: "MOBILE_MEDIA_TEXT_NOT_STACKED", severity: "warning", detail: `media/text remain side-by-side at ${width}px` });
      }
    }
  }

  return dedupeIssues(issues);
}

function groupRows(nodes: HTMLElement[]): HTMLElement[][] {
  const sorted = [...nodes].sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top || a.getBoundingClientRect().left - b.getBoundingClientRect().left);
  const rows: HTMLElement[][] = [];
  for (const node of sorted) {
    const top = node.getBoundingClientRect().top;
    const row = rows.find((entry) => Math.abs(entry[0]!.getBoundingClientRect().top - top) <= 8);
    if (row) row.push(node);
    else rows.push([node]);
  }
  return rows;
}

function rectanglesOverlap(a: DOMRect, b: DOMRect): boolean {
  return a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1;
}

function overlapLength(a1: number, a2: number, b1: number, b2: number): number {
  return Math.max(0, Math.min(a2, b2) - Math.max(a1, b1));
}

function dedupeIssues(issues: ResponsiveCompositionIssue[]): ResponsiveCompositionIssue[] {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = `${issue.code}:${issue.detail}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
