import type { CandidateRepairPlan } from "./schema";

export function repairPlanToScopedCss(plan: CandidateRepairPlan, scope: string) {
  const rules: string[] = [];
  for (const instruction of plan.instructions) {
    const target = instruction.target;
    if (instruction.boundedAction === "normalize-heading-scale") {
      const rule = `${scope} h1,${scope} h2,${scope} h3{font-size:min(var(--repair-heading-size,4.75rem),4.75rem)!important;} ${scope} h1{--repair-heading-size:clamp(2.75rem,5vw,4.75rem);} ${scope} h2{--repair-heading-size:clamp(2.25rem,4vw,4rem);} ${scope} h3{--repair-heading-size:clamp(1.75rem,3vw,3rem);}`;
      rules.push(target === "mobile" ? `@media(max-width:767px){${rule}}` : target === "desktop" ? `@media(min-width:768px){${rule}}` : rule);
    }
    if (instruction.boundedAction === "constrain-readable-width") {
      const desktopRule = `${scope} p,${scope} li{max-width:min(100%,42rem);}`;
      const mobileRule = `${scope} p,${scope} li{width:min(100%,82vw);max-width:82vw;}`;
      rules.push(target === "mobile" ? `@media(max-width:767px){${mobileRule}}` : target === "desktop" ? `@media(min-width:768px){${desktopRule}}` : `${desktopRule}@media(max-width:767px){${mobileRule}}`);
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
