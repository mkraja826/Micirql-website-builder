import type { ReactNode } from "react";
import { getPearlRepairPlan } from "../../../../../src/benchmarks/pearl-repairs";
import { repairPlanToScopedCss } from "../../../../../src/core/repair/executor";

export default async function PearlCandidateRepairLayout({ children, params }: { children: ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const plan = getPearlRepairPlan(id);
  if (!plan) return children;
  const className = `repair-${id}`;
  const css = repairPlanToScopedCss(plan, `.${className}`);
  return (
    <div className={className} data-repair-candidate={id} data-repair-count={plan.instructions.length}>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      {children}
    </div>
  );
}
