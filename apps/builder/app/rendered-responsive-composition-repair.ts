import type { ResponsiveCompositionIssue } from "./rendered-responsive-composition-quality";

export type ResponsiveCompositionRepairViewport = "mobile" | "tablet" | "desktop";

export type ResponsiveCompositionRepairPlan = {
  required: boolean;
  viewport: ResponsiveCompositionRepairViewport;
  operations: string[];
  reasons: string[];
  css: string;
};

/**
 * One bounded responsive-composition repair pass. It may adjust only layout
 * geometry at the failing breakpoint. Structural overflow remains a hard fail
 * rather than being hidden with overflow clipping.
 */
export function planResponsiveCompositionRepair(input: {
  width: number;
  issues: ResponsiveCompositionIssue[];
  attempt: number;
}): ResponsiveCompositionRepairPlan {
  const viewport: ResponsiveCompositionRepairViewport = input.width <= 430 ? "mobile" : input.width <= 1024 ? "tablet" : "desktop";
  if (input.attempt > 0 || input.issues.length === 0) return empty(viewport);

  const codes = new Set(input.issues.map((issue) => issue.code));
  const operations: string[] = [];
  if (codes.has("CONTENT_GUTTER_TOO_TIGHT")) operations.push("restore-safe-gutters");
  if (codes.has("CARD_COLUMN_TOO_NARROW") || codes.has("TOO_MANY_CARD_COLUMNS")) operations.push("rebalance-card-grid");
  if (codes.has("TOUCH_TARGET_TOO_SMALL")) operations.push("normalize-touch-targets");
  if (codes.has("ACTION_OVERLAP")) operations.push("separate-actions");
  if (codes.has("MOBILE_MEDIA_TEXT_NOT_STACKED") && viewport === "mobile") operations.push("stack-media-text");

  // Horizontal overflow is deliberately not repairable here: clipping would
  // conceal a structural defect rather than certify a correct composition.
  if (!operations.length) return empty(viewport);

  const root = ":where(.renderer-preview-document,body)";
  const rules: string[] = [];
  if (operations.includes("restore-safe-gutters")) {
    const gutter = viewport === "mobile" ? "16px" : viewport === "tablet" ? "24px" : "32px";
    rules.push(`${root} .mi-section__inner,${root} .mi-section__content{padding-inline:max(var(--mi-section-inline,0px),${gutter});box-sizing:border-box}`);
  }
  if (operations.includes("rebalance-card-grid")) {
    const columns = viewport === "mobile" ? 1 : viewport === "tablet" ? 2 : 3;
    rules.push(`${root} .mi-section [class*='grid']:has(> .mi-card),${root} .mi-section [class*='grid']:has(> .mi-service-item){grid-template-columns:repeat(${columns},minmax(0,1fr))!important}`);
    rules.push(`${root} .mi-section [class*='cards'],${root} .mi-section [class*='services']{grid-template-columns:repeat(${columns},minmax(0,1fr))!important}`);
  }
  if (operations.includes("normalize-touch-targets")) {
    rules.push(`${root} button,${root} .mi-section__action,${root} [role='button']{min-width:44px;min-height:44px}`);
  }
  if (operations.includes("separate-actions")) {
    rules.push(`${root} [class*='actions'],${root} [class*='buttons'],${root} [class*='cta']{gap:max(.75rem,var(--mi-action-gap,.75rem));flex-wrap:wrap}`);
  }
  if (operations.includes("stack-media-text")) {
    rules.push(`${root} .mi-section__inner:has(img),${root} .mi-section__content:has(img){grid-template-columns:minmax(0,1fr)!important}`);
    rules.push(`${root} .mi-section__inner:has(img),${root} .mi-section__content:has(img){flex-direction:column}`);
  }

  return {
    required: rules.length > 0,
    viewport,
    operations,
    reasons: [...codes],
    css: rules.join("\n"),
  };
}

function empty(viewport: ResponsiveCompositionRepairViewport): ResponsiveCompositionRepairPlan {
  return { required: false, viewport, operations: [], reasons: [], css: "" };
}
