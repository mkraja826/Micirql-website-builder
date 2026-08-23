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
  const rules: string[] = [];
  if (operations.includes("rebalance-heading-wrap")) {
    const h1 = viewport === "mobile" ? "clamp(2rem,7.5vw,2.65rem)" : viewport === "tablet" ? "clamp(2.5rem,4.8vw,3.75rem)" : "clamp(3rem,4vw,5rem)";
    const h2 = viewport === "mobile" ? "clamp(1.75rem,6vw,2.25rem)" : viewport === "tablet" ? "clamp(2rem,3.8vw,2.85rem)" : "clamp(2.25rem,3vw,3.4rem)";
    const h1Measure = viewport === "mobile" ? "24ch" : viewport === "tablet" ? "28ch" : "32ch";
    const h2Measure = viewport === "mobile" ? "26ch" : viewport === "tablet" ? "30ch" : "34ch";
    rules.push(`${root} h1{font-size:${h1};line-height:1;max-width:${h1Measure};text-wrap:balance}`);
    rules.push(`${root} h2{font-size:${h2};line-height:1.05;max-width:${h2Measure};text-wrap:balance}`);
    rules.push(`${root} h3{max-width:32ch;line-height:1.12;text-wrap:balance}`);
  }
  if (operations.includes("stabilize-action-wrap")) {
    const actionSize = viewport === "mobile" ? "clamp(.8rem,3.2vw,.95rem)" : viewport === "tablet" ? "clamp(.84rem,1.8vw,.98rem)" : "clamp(.88rem,1.2vw,1rem)";
    const actionPadding = viewport === "mobile" ? ".65rem" : viewport === "tablet" ? ".8rem" : ".9rem";
    const actionGroup = `${root} .mi-section__actions,${root} [class*='actions'],${root} [class*='cta-group'],${root} [class*='button-group']`;

    rules.push(`${root} a,${root} button{max-width:100%;min-width:0;overflow-wrap:normal;word-break:normal;hyphens:none;line-height:1.15;font-size:${actionSize}}`);
    rules.push(`${root} .mi-section__action,${root} [class*='cta'] a,${root} [class*='cta'] button{white-space:normal;line-height:1.15;min-height:44px;padding-inline:${actionPadding};text-align:center;width:fit-content;max-width:100%;min-width:0}`);
    rules.push(`${actionGroup}{display:flex;flex-wrap:wrap;align-items:stretch;gap:min(.75rem,2vw);min-width:0;max-width:100%}`);

    if (viewport === "mobile") {
      rules.push(`${actionGroup}{width:100%;flex-direction:column}`);
      rules.push(`${actionGroup}>a,${actionGroup}>button,${root} .mi-section__action{width:100%;max-width:100%;flex:0 1 100%}`);
    } else {
      rules.push(`${actionGroup}>a,${actionGroup}>button{flex:0 1 auto;max-width:100%}`);
    }

    rules.push(`${root} nav a,${root} header a,${root} nav button,${root} header button{white-space:nowrap;font-size:clamp(.78rem,1.6vw,.95rem);padding-inline:min(.75rem,2vw)}`);
  }
  if (operations.includes("relax-paragraph-measure")) {
    rules.push(`${root} p,${root} .mi-type--body,${root} .mi-type--body-sm{max-width:${viewport === "mobile" ? "58ch" : "64ch"};line-height:1.65}`);
  }
  if (operations.includes("normalize-card-title-rhythm")) {
    rules.push(`${root} .mi-card h3,${root} .mi-service-item h3,${root} [class*='card'] h3,${root} [class*='item'] h3{min-height:2.24em;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}`);
  }

  return {
    required: rules.length > 0,
    viewport,
    operations,
    reasons: [...codes],
    css: rules.join("\n"),
  };
}
