import type { Locator } from "@playwright/test";

export type RenderedTypographyIssue = {
  code: string;
  severity: "warning" | "error";
  selector: string;
  detail: string;
};

export type RenderedTypographyMetrics = {
  width: number;
  headingCount: number;
  paragraphCount: number;
  actionCount: number;
  cardTitleCount: number;
  maxHeadingLines: number;
  orphanHeadingCount: number;
  overflowingActionCount: number;
  wrappedActionCount: number;
  denseParagraphCount: number;
  unevenCardTitleGroups: number;
  issues: RenderedTypographyIssue[];
  passed: boolean;
};

/**
 * Measures typography as rendered by the browser. This intentionally checks
 * geometry rather than source-string length so responsive wrapping, loaded font
 * metrics, and real component widths are represented in certification.
 */
export async function measureRenderedPageTypography(rootLocator: Locator, width: number): Promise<RenderedTypographyMetrics> {
  return rootLocator.evaluate((element, targetWidth) => {
    const root = element as HTMLElement;
    const editorSelector = "[data-mi-canvas-action],.mi-editor-insert-zone,.mi-editor-canvas-toolbar";
    const hidden = (node: Element) => {
      if (node.closest(editorSelector)) return true;
      if (node.matches("[hidden],[aria-hidden='true']")) return true;
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display === "none" || style.visibility === "hidden" || Number.parseFloat(style.opacity || "1") === 0 || rect.width <= 0 || rect.height <= 0;
    };
    const visible = <T extends Element>(nodes: T[]) => nodes.filter((node) => !hidden(node));
    const lineHeight = (node: Element) => {
      const style = getComputedStyle(node);
      const explicit = Number.parseFloat(style.lineHeight);
      const fontSize = Number.parseFloat(style.fontSize) || 16;
      return Number.isFinite(explicit) ? explicit : fontSize * 1.2;
    };
    const lineCount = (node: Element) => Math.max(1, Math.round(node.getBoundingClientRect().height / Math.max(1, lineHeight(node))));
    const selectorFor = (node: Element) => {
      const section = node.closest("[data-mi-section-id]");
      const sectionId = section?.getAttribute("data-mi-section-id") ?? "page";
      const cls = (node.getAttribute("class") ?? "").split(/\s+/).filter(Boolean).slice(0, 2).join(".");
      return `[data-mi-section-id='${sectionId}'] ${node.tagName.toLowerCase()}${cls ? `.${cls}` : ""}`;
    };
    const lastRenderedLineRatio = (node: Element) => {
      const text = (node.textContent ?? "").trim().replace(/\s+/g, " ");
      if (!text || text.split(" ").length < 3) return 1;
      const words = text.split(" ");
      const range = document.createRange();
      const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
      const textNodes: Text[] = [];
      while (walker.nextNode()) textNodes.push(walker.currentNode as Text);
      if (!textNodes.length) return 1;
      const rect = node.getBoundingClientRect();
      const allRects: DOMRect[] = [];
      for (const textNode of textNodes) {
        const value = textNode.data;
        for (let offset = 0; offset < value.length; offset += 1) {
          if (/\s/.test(value[offset] ?? "")) continue;
          range.setStart(textNode, offset);
          range.setEnd(textNode, Math.min(value.length, offset + 1));
          const client = range.getBoundingClientRect();
          if (client.width > 0 && client.height > 0) allRects.push(client);
        }
      }
      if (!allRects.length || rect.width <= 0) return 1;
      const bottom = Math.max(...allRects.map((item) => item.bottom));
      const last = allRects.filter((item) => Math.abs(item.bottom - bottom) <= 2);
      if (!last.length) return 1;
      const left = Math.min(...last.map((item) => item.left));
      const right = Math.max(...last.map((item) => item.right));
      return Math.max(0, Math.min(1, (right - left) / rect.width));
    };

    const headings = visible([...root.querySelectorAll("h1,h2,h3")]);
    const paragraphs = visible([...root.querySelectorAll("p,.mi-type--body,.mi-type--body-sm")]);
    const actions = visible([...root.querySelectorAll("a,button")]).filter((node) => !node.closest(editorSelector));
    const cardTitles = visible([...root.querySelectorAll(".mi-card h3,.mi-service-item h3,[class*='card'] h3,[class*='item'] h3")]);
    const issues: RenderedTypographyIssue[] = [];
    const mobile = targetWidth <= 430;
    const tablet = targetWidth > 430 && targetWidth <= 1024;
    const maxHeadingLines = mobile ? 4 : tablet ? 4 : 3;

    let observedMaxHeadingLines = 0;
    let orphanHeadingCount = 0;
    for (const heading of headings) {
      const lines = lineCount(heading);
      observedMaxHeadingLines = Math.max(observedMaxHeadingLines, lines);
      const tag = heading.tagName.toLowerCase();
      const limit = tag === "h1" ? maxHeadingLines : mobile ? 4 : 3;
      if (lines > limit) issues.push({ code: "HEADING_TOO_MANY_RENDERED_LINES", severity: "error", selector: selectorFor(heading), detail: `${tag} renders ${lines} lines; limit ${limit}` });
      const ratio = lines > 1 ? lastRenderedLineRatio(heading) : 1;
      if (lines > 1 && ratio < 0.2) {
        orphanHeadingCount += 1;
        issues.push({ code: "HEADING_ORPHAN_LAST_LINE", severity: "warning", selector: selectorFor(heading), detail: `last line occupies ${Math.round(ratio * 100)}% of heading width` });
      }
    }

    let overflowingActionCount = 0;
    let wrappedActionCount = 0;
    for (const action of actions) {
      const rect = action.getBoundingClientRect();
      if (action.scrollWidth > action.clientWidth + 1 || rect.right > root.getBoundingClientRect().right + 1 || rect.left < root.getBoundingClientRect().left - 1) {
        overflowingActionCount += 1;
        issues.push({ code: "ACTION_TEXT_OVERFLOW", severity: "error", selector: selectorFor(action), detail: `action scrollWidth ${action.scrollWidth}px exceeds clientWidth ${action.clientWidth}px` });
      }
      const lines = lineCount(action);
      if (lines > 2) {
        wrappedActionCount += 1;
        issues.push({ code: "ACTION_WRAP_EXCESSIVE", severity: "error", selector: selectorFor(action), detail: `action renders ${lines} text lines` });
      }
    }

    let denseParagraphCount = 0;
    for (const paragraph of paragraphs) {
      const text = (paragraph.textContent ?? "").trim();
      if (text.length < 90) continue;
      const lines = lineCount(paragraph);
      const rect = paragraph.getBoundingClientRect();
      const limit = mobile ? 9 : tablet ? 8 : 7;
      if (lines > limit && rect.width > (mobile ? 220 : 300)) {
        denseParagraphCount += 1;
        issues.push({ code: "PARAGRAPH_RENDERED_TOO_DENSE", severity: lines > limit + 2 ? "error" : "warning", selector: selectorFor(paragraph), detail: `${lines} rendered lines at ${Math.round(rect.width)}px measure` });
      }
    }

    const titleGroups = new Map<Element, Element[]>();
    for (const title of cardTitles) {
      const parent = title.parentElement?.parentElement ?? title.parentElement;
      if (!parent) continue;
      const group = parent.parentElement ?? parent;
      const list = titleGroups.get(group) ?? [];
      list.push(title);
      titleGroups.set(group, list);
    }
    let unevenCardTitleGroups = 0;
    for (const titles of titleGroups.values()) {
      if (titles.length < 2) continue;
      const heights = titles.map((title) => title.getBoundingClientRect().height);
      const min = Math.min(...heights);
      const max = Math.max(...heights);
      const threshold = Math.max(24, lineHeight(titles[0]!) * 1.15);
      if (max - min > threshold) {
        unevenCardTitleGroups += 1;
        issues.push({ code: "CARD_TITLE_HEIGHT_VARIANCE", severity: "warning", selector: selectorFor(titles[0]!), detail: `card-title height spread ${Math.round(max - min)}px` });
      }
    }

    const errorCount = issues.filter((issue) => issue.severity === "error").length;
    const warningCount = issues.length - errorCount;
    return {
      width: targetWidth,
      headingCount: headings.length,
      paragraphCount: paragraphs.length,
      actionCount: actions.length,
      cardTitleCount: cardTitles.length,
      maxHeadingLines: observedMaxHeadingLines,
      orphanHeadingCount,
      overflowingActionCount,
      wrappedActionCount,
      denseParagraphCount,
      unevenCardTitleGroups,
      issues,
      passed: errorCount === 0 && warningCount <= (mobile ? 4 : 5),
    };
  }, width);
}
