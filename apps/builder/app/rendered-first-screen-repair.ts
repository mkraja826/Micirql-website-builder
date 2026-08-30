export type RenderedFirstScreenFailure =
  | `headline-too-small:${string}`
  | `headline-wraps-too-many-lines:${string}`
  | `headline-too-low:${string}`
  | `navbar-too-tall:${string}`
  | `cta-below-conversion-fold:${string}`
  | `cta-not-visible-in-first-screen:${string}`
  | `hero-starts-too-low:${string}`
  | `excess-space-before-headline:${string}`
  | "missing-visible-h1"
  | "missing-visible-hero-cta"
  | string;

export type FirstScreenRepairViewport = "mobile" | "tablet" | "desktop";

export type FirstScreenRepairPlan = {
  required: boolean;
  viewport: FirstScreenRepairViewport;
  attempt: 0 | 1;
  reasons: string[];
  operations: Array<
    | "increase-headline-scale"
    | "tighten-headline-leading"
    | "reduce-headline-wrap"
    | "compress-navigation"
    | "reduce-hero-top-space"
    | "compact-hero-stack"
    | "raise-primary-cta"
  >;
  css: string;
};

const ROOT = "[data-mi-first-screen-repair='1']";
// Match only the marked repair root while outranking authored !important rules
// that use multiple layout/class selectors. Repeating the same marker raises
// specificity without making the repair global or blueprint-specific.
const PRIORITY_ROOT = `${ROOT}${ROOT}${ROOT}${ROOT}`;

export function planRenderedFirstScreenRepair(input: {
  width: number;
  failures: RenderedFirstScreenFailure[];
  attempt?: number;
}): FirstScreenRepairPlan {
  const viewport = viewportFor(input.width);
  const failures = [...new Set(input.failures.filter(Boolean))];
  const attempt = input.attempt === 1 ? 1 : 0;

  if (attempt >= 1 || failures.length === 0) {
    return { required: false, viewport, attempt: attempt as 0 | 1, reasons: failures, operations: [], css: "" };
  }

  const operations = new Set<FirstScreenRepairPlan["operations"][number]>();

  for (const failure of failures) {
    if (failure.startsWith("headline-too-small:")) operations.add("increase-headline-scale");
    if (failure.startsWith("headline-wraps-too-many-lines:")) {
      operations.add("reduce-headline-wrap");
      operations.add("tighten-headline-leading");
    }
    if (failure.startsWith("headline-too-low:") || failure.startsWith("hero-starts-too-low:") || failure.startsWith("excess-space-before-headline:")) {
      operations.add("reduce-hero-top-space");
    }
    if (failure.startsWith("navbar-too-tall:")) operations.add("compress-navigation");
    if (failure.startsWith("cta-below-conversion-fold:") || failure.startsWith("cta-not-visible-in-first-screen:")) {
      operations.add("compact-hero-stack");
      operations.add("raise-primary-cta");
    }
  }

  const ordered = [...operations];
  const css = buildRepairCss(viewport, ordered);

  return {
    required: ordered.length > 0,
    viewport,
    attempt: 0,
    reasons: failures,
    operations: ordered,
    css,
  };
}

export function markFirstScreenRepairAttempt(root: HTMLElement) {
  root.setAttribute("data-mi-first-screen-repair", "1");
  root.setAttribute("data-mi-first-screen-repair-attempt", "1");
}

function viewportFor(width: number): FirstScreenRepairViewport {
  if (width <= 430) return "mobile";
  if (width <= 1024) return "tablet";
  return "desktop";
}

function buildRepairCss(viewport: FirstScreenRepairViewport, operations: FirstScreenRepairPlan["operations"]): string {
  if (!operations.length) return "";

  const rules: string[] = [];
  const hero = `${PRIORITY_ROOT} section:has(h1), ${PRIORITY_ROOT} .mi-editor-section:has(h1)`;
  const heroInner = `${hero}>*`;
  const heroInnerDeep = `${hero}>*>*`;
  const h1 = `${PRIORITY_ROOT} h1`;
  const nav = `${PRIORITY_ROOT} header, ${PRIORITY_ROOT} nav`;
  const cta = `${hero} a, ${hero} button`;

  if (operations.includes("increase-headline-scale")) {
    const min = viewport === "mobile" ? "28px" : viewport === "tablet" ? "34px" : "40px";
    rules.push(`${h1}{font-size:max(${min},var(--mi-first-screen-original-h1,1em))!important;}`);
  }

  if (operations.includes("tighten-headline-leading")) {
    rules.push(`${h1}{line-height:1.05!important;}`);
  }

  if (operations.includes("reduce-headline-wrap")) {
    const maxWidth = viewport === "mobile" ? "24ch" : viewport === "tablet" ? "28ch" : "32ch";
    const fontSize = viewport === "mobile"
      ? "clamp(2rem,7.5vw,2.65rem)"
      : viewport === "tablet"
        ? "clamp(2.25rem,4vw,3.25rem)"
        : "clamp(2.5rem,3vw,3.75rem)";
    rules.push(`${h1}{font-size:${fontSize}!important;max-width:${maxWidth}!important;text-wrap:balance!important;}`);
  }

  if (operations.includes("compress-navigation")) {
    const maxHeight = viewport === "mobile" ? "88px" : "104px";
    rules.push(`${nav}{min-height:0!important;max-height:${maxHeight}!important;}`);
    rules.push(`${nav}>*{padding-top:min(16px,2vw)!important;padding-bottom:min(16px,2vw)!important;}`);
  }

  if (operations.includes("reduce-hero-top-space")) {
    const top = viewport === "mobile" ? "clamp(16px,4vw,32px)" : viewport === "tablet" ? "clamp(20px,3vw,40px)" : "clamp(28px,3vw,48px)";
    rules.push(`${hero}{padding-top:${top}!important;margin-top:0!important;min-height:0!important;align-content:start!important;justify-content:flex-start!important;place-content:start!important;}`);
    rules.push(`${heroInner}{min-height:0!important;margin-top:0!important;padding-top:0!important;align-self:start!important;}`);
    rules.push(`${heroInnerDeep}{margin-top:0!important;}`);
    rules.push(`${hero} h1{margin-top:0!important;}`);
  }

  if (operations.includes("compact-hero-stack")) {
    const bottom = viewport === "mobile" ? "clamp(28px,7vw,56px)" : "clamp(40px,6vw,80px)";
    rules.push(`${hero}{padding-bottom:${bottom}!important;}`);
    rules.push(`${hero} h1+*, ${hero} p{margin-top:min(18px,4vw)!important;}`);
  }

  if (operations.includes("raise-primary-cta")) {
    rules.push(`${cta}{margin-top:min(20px,4vw)!important;}`);
  }

  return rules.join("\n");
}
