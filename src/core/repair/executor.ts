import type { CandidateRepairPlan } from "./schema";

export function repairPlanToScopedCss(plan: CandidateRepairPlan, scope: string) {
  const rules: string[] = [];
  for (const instruction of plan.instructions) {
    const target = instruction.target;
    if (instruction.boundedAction === "normalize-heading-scale") {
      const rule = `${scope} h1{font-size:clamp(2.75rem,5vw,4.75rem)!important;}`;
      rules.push(target === "mobile" ? `@media(max-width:767px){${rule}}` : target === "desktop" ? `@media(min-width:768px){${rule}}` : rule);
    }
    if (instruction.boundedAction === "constrain-readable-width") {
      const rule = `${scope} p,${scope} li{max-width:min(100%,42rem);}`;
      rules.push(target === "mobile" ? `@media(max-width:767px){${rule}}` : target === "desktop" ? `@media(min-width:768px){${rule}}` : rule);
    }
    if (instruction.boundedAction === "normalize-hero-height") {
      const rule = `${scope} [data-section-tone="hero"]{min-height:auto!important;} ${scope} [data-section-tone="hero"]>div{min-height:auto!important;}`;
      rules.push(target === "mobile" ? `@media(max-width:767px){${rule}}` : target === "desktop" ? `@media(min-width:768px){${rule}}` : rule);
    }
    if (instruction.boundedAction === "contain-horizontal-layout") {
      const rule = `${scope}{overflow-x:clip;} ${scope} *{max-width:100%;}`;
      rules.push(target === "mobile" ? `@media(max-width:767px){${rule}}` : target === "desktop" ? `@media(min-width:768px){${rule}}` : rule);
    }
  }
  return rules.join("\n");
}
