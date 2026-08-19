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
    const h1 = viewport === "mobile" ? "clamp(2rem,9vw,2.8rem)" : viewport === "tablet" ? "clamp(2.5rem,6vw,4rem)" : "clamp(3rem,5vw,5.5rem)";
    const h2 = viewport === "mobile" ? "clamp(1.75rem,7vw,2.35rem)" : viewport === "tablet" ? "clamp(2rem,4.5vw,3rem)" : "clamp(2.25rem,3.4vw,3.6rem)";
    rules.push(`${root} h1{font-size:${h1};line-height:.98;max-width:18ch;text-wrap:balance}`);
    rules.push(`${root} h2{font-size:${h2};line-height:1.04;max-width:22ch;text-wrap:balance}`);
    rules.push(`${root} h3{max-width:28ch;line-height:1.12;text-wrap:balance}`);
  }
  if (operations.includes("stabilize-action-wrap")) {
    rules.push(`${root} a,${root} button{max-width:100%;overflow-wrap:anywhere}`);
    rules.push(`${root} .mi-section__action{white-space:normal;line-height:1.2;min-height:44px;padding-inline:1.1rem;text-align:center}`);
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
