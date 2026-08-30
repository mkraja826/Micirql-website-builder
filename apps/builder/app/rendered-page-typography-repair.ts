export type RenderedTypographyRepairViewport = "mobile" | "tablet" | "desktop";

export type RenderedTypographyRepairPlan = {
  required: boolean;
  viewport: RenderedTypographyRepairViewport;
  operations: string[];
  reasons: string[];
  css: string;
};

/**
 * One bounded rendered-typography repair pass. It may only adjust responsive
 * typography geometry. It never rewrites copy, changes font families, hides
 * content, removes sections, or changes component variants.
 */
export function planRenderedPageTypographyRepair(input: {
  width: number;
  issues: Array<{ code: string; severity: "warning" | "error" }>;
  attempt: number;
}): RenderedTypographyRepairPlan {
  const viewport: RenderedTypographyRepairViewport = input.width <= 430 ? "mobile" : input.width <= 1024 ? "tablet" : "desktop";
  if (input.attempt > 0 || input.issues.length === 0) return { required: false, viewport, operations: [], reasons: [], css: "" };

  const codes = new Set(input.issues.map((issue) => issue.code));
  const operations: string[] = [];
  if (codes.has("HEADING_TOO_MANY_RENDERED_LINES") || codes.has("HEADING_ORPHAN_LAST_LINE")) operations.push("rebalance-heading-wrap");
  if (codes.has("ACTION_TEXT_OVERFLOW") || codes.has("ACTION_WRAP_EXCESSIVE")) operations.push("stabilize-action-wrap");
  if (codes.has("PARAGRAPH_RENDERED_TOO_DENSE")) operations.push("relax-paragraph-measure");
  if (codes.has("CARD_TITLE_HEIGHT_VARIANCE")) operations.push("normalize-card-title-rhythm");
  if (!operations.length) return { required: false, viewport, operations: [], reasons: [], css: "" };

  const root = "[data-mi-rendered-typography-repair='1']";
  // Repair CSS is injected after authored layout CSS, but authored blueprints may
  // legitimately use high-specificity !important typography rules. Repeat the
  // same repair marker to raise specificity without broadening the selector or
  // coupling repair logic to individual Dental blueprints.
  const priorityRoot = `${root}${root}${root}${root}`;
  const rules: string[] = [];
  if (operations.includes("rebalance-heading-wrap")) {
    const h1 = viewport === "mobile" ? "clamp(2rem,7.5vw,2.65rem)" : viewport === "tablet" ? "clamp(2.25rem,4vw,3.25rem)" : "clamp(2.5rem,3vw,3.75rem)";
    const h2 = viewport === "mobile" ? "clamp(1.6rem,5.5vw,2.1rem)" : viewport === "tablet" ? "clamp(1.85rem,3.2vw,2.5rem)" : "clamp(2rem,2.4vw,2.75rem)";
    const h1Measure = viewport === "mobile" ? "24ch" : viewport === "tablet" ? "28ch" : "32ch";
    const h2Measure = viewport === "mobile" ? "26ch" : viewport === "tablet" ? "30ch" : "34ch";
    rules.push(`${priorityRoot} h1{font-size:${h1}!important;line-height:1!important;max-width:${h1Measure}!important;text-wrap:balance!important}`);
    rules.push(`${priorityRoot} h2{font-size:${h2}!important;line-height:1.05!important;max-width:${h2Measure}!important;text-wrap:balance!important}`);
    rules.push(`${priorityRoot} h3{max-width:32ch!important;line-height:1.12!important;text-wrap:balance!important}`);
  }
  if (operations.includes("stabilize-action-wrap")) {
    const actionSize = viewport === "mobile" ? "clamp(.8rem,3.2vw,.95rem)" : viewport === "tablet" ? "clamp(.84rem,1.8vw,.98rem)" : "clamp(.88rem,1.2vw,1rem)";
    const actionPadding = viewport === "mobile" ? ".65rem" : viewport === "tablet" ? ".8rem" : ".9rem";
    const actionGroup = `${priorityRoot} .mi-section__actions,${priorityRoot} [class*='actions'],${priorityRoot} [class*='cta-group'],${priorityRoot} [class*='button-group']`;

    rules.push(`${priorityRoot} a,${priorityRoot} button{max-width:100%!important;min-width:0!important;overflow-wrap:normal!important;word-break:normal!important;hyphens:none!important;line-height:1.15!important;font-size:${actionSize}!important}`);
    rules.push(`${priorityRoot} .mi-section__action,${priorityRoot} [class*='cta'] a,${priorityRoot} [class*='cta'] button{white-space:normal!important;line-height:1.15!important;min-height:44px!important;padding-inline:${actionPadding}!important;text-align:center!important;width:fit-content!important;max-width:100%!important;min-width:0!important}`);
    rules.push(`${actionGroup}{display:flex!important;flex-wrap:wrap!important;align-items:stretch!important;gap:min(.75rem,2vw)!important;min-width:0!important;max-width:100%!important}`);

    if (viewport === "mobile") {
      rules.push(`${actionGroup}{width:100%!important;flex-direction:column!important}`);
      rules.push(`${actionGroup}>a,${actionGroup}>button,${priorityRoot} .mi-section__action{width:100%!important;max-width:100%!important;flex:0 1 100%!important}`);
    } else {
      rules.push(`${actionGroup}>a,${actionGroup}>button{flex:0 1 auto!important;max-width:100%!important}`);
    }

    rules.push(`${priorityRoot} nav a,${priorityRoot} header a,${priorityRoot} nav button,${priorityRoot} header button{white-space:nowrap!important;font-size:clamp(.78rem,1.6vw,.95rem)!important;padding-inline:min(.75rem,2vw)!important}`);
  }
  if (operations.includes("relax-paragraph-measure")) {
    rules.push(`${priorityRoot} p,${priorityRoot} .mi-type--body,${priorityRoot} .mi-type--body-sm{max-width:${viewport === "mobile" ? "58ch" : "64ch"}!important;line-height:1.65!important}`);
  }
  if (operations.includes("normalize-card-title-rhythm")) {
    rules.push(`${priorityRoot} .mi-card h3,${priorityRoot} .mi-service-item h3,${priorityRoot} [class*='card'] h3,${priorityRoot} [class*='item'] h3{min-height:2.24em!important;display:-webkit-box!important;-webkit-box-orient:vertical!important;-webkit-line-clamp:2!important;overflow:hidden!important}`);
  }

  return {
    required: rules.length > 0,
    viewport,
    operations,
    reasons: [...codes],
    css: rules.join("\n"),
  };
}
