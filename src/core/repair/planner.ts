import type { CandidateRepairPlan, RepairInstruction, RepairTarget } from "./schema";

type RepairSignals = {
  candidateId: string;
  renderedCautions?: { desktop?: string[]; mobile?: string[] };
  perceptualCautions?: string[];
};

function targetFromPrefix(value: string): RepairTarget {
  if (value.toLowerCase().startsWith("mobile:")) return "mobile";
  if (value.toLowerCase().startsWith("desktop:")) return "desktop";
  return "both";
}

function instructionFor(caution: string, source: RepairInstruction["source"]): RepairInstruction | undefined {
  const normalized = caution.toLowerCase();
  const target = targetFromPrefix(caution);
  if (normalized.includes("tap target") || normalized.includes("small interactive")) return { kind:"tap-target", target, reason:caution, source, boundedAction:"increase-interactive-hit-area" };
  if (normalized.includes("wide body copy") || normalized.includes("text measure")) return { kind:"text-measure", target, reason:caution, source, boundedAction:"constrain-readable-width" };
  if (normalized.includes("heading scale")) return { kind:"heading-scale", target, reason:caution, source, boundedAction:"normalize-heading-scale" };
  if (normalized.includes("hero scale") || normalized.includes("hero proportion")) return { kind:"hero-proportion", target, reason:caution, source, boundedAction:"normalize-hero-height" };
  if (normalized.includes("no rendered imagery") || normalized.includes("missing imagery")) return { kind:"media-presence", target, reason:caution, source, boundedAction:"request-planned-media" };
  if (normalized.includes("image treatment") || normalized.includes("image aspect")) return { kind:"media-variety", target, reason:caution, source, boundedAction:"vary-planned-media-aspect" };
  if (normalized.includes("viewport") || normalized.includes("horizontal overflow") || normalized.includes("outside mobile")) return { kind:"viewport-overflow", target, reason:caution, source, boundedAction:"contain-horizontal-layout" };
  return undefined;
}

export function planTargetedRepairs(signals: RepairSignals): CandidateRepairPlan {
  const instructions: RepairInstruction[] = [];
  for (const [target, cautions] of Object.entries(signals.renderedCautions ?? {})) {
    for (const caution of cautions ?? []) {
      const instruction = instructionFor(`${target}: ${caution}`, "rendered-audit");
      if (instruction) instructions.push(instruction);
    }
  }
  for (const caution of signals.perceptualCautions ?? []) {
    const instruction = instructionFor(caution, "perceptual-audit");
    if (instruction) instructions.push(instruction);
  }

  const unique = Array.from(new Map(instructions.map((instruction) => [
    `${instruction.kind}:${instruction.target}:${instruction.boundedAction}`,
    instruction,
  ])).values());

  return {
    version: "1.0",
    candidateId: signals.candidateId,
    instructions: unique,
    requiresRegeneration: unique.some((instruction) => instruction.kind === "media-presence" || instruction.kind === "media-variety"),
    allowsArbitraryCodeRewrite: false,
  };
}
