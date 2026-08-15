import type { Domain } from "@micirql/schema";
import type { DiscoveryAnswer } from "./discovery-types";
import { getDomainPack } from "./index";
import { getSubtypeRule } from "./subtypes";
import { validateDiscoveryCompleteness } from "./discovery";

export type PlanningDecision = {
  canPlan: boolean;
  mustAskMore: string[];
  allowedOptionalPages: string[];
  allowedOptionalActions: string[];
  forbiddenInventions: string[];
  notes: string[];
};

export function evaluatePlanningPolicy(domain: Domain, answers: DiscoveryAnswer[], subtype?: string): PlanningDecision {
  const pack = getDomainPack(domain);
  const subtypeRule = subtype ? getSubtypeRule(domain, subtype) : undefined;
  const completeness = validateDiscoveryCompleteness(domain, answers, subtype);

  const forbiddenInventions = [
    ...pack.avoidByDefault,
    ...(subtypeRule?.avoidByDefault ?? []),
    "invented business facts",
    "invented credentials or certifications",
    "invented prices, availability, guarantees or outcomes",
    "unregistered backend capabilities",
  ];

  const allowedOptionalPages = [
    ...pack.defaultPages.filter((page) => !page.required).map((page) => page.slug),
    ...(subtypeRule?.extraPages ?? []).map((page) => page.slug),
  ];

  const allowedOptionalActions = [
    ...pack.optionalActions,
    ...(subtypeRule?.extraActions ?? []),
  ];

  return {
    canPlan: completeness.complete,
    mustAskMore: completeness.missing,
    allowedOptionalPages: unique(allowedOptionalPages),
    allowedOptionalActions: unique(allowedOptionalActions),
    forbiddenInventions: unique(forbiddenInventions),
    notes: [
      "Required domain pages and actions are always preserved unless the user explicitly removes them and the protocol allows it.",
      "Optional pages may only be added when supported by discovery answers, SEO goals, or subtype rules.",
      "Optional actions may only be planned when the Function Registry contains a matching approved action.",
      "Missing required business facts must trigger follow-up discovery instead of AI fabrication.",
      "SEO expansion must follow real services, locations, audiences and content intent supplied by the user.",
    ],
  };
}

export function canAddOptionalPage(domain: Domain, slug: string, answers: DiscoveryAnswer[], subtype?: string) {
  const decision = evaluatePlanningPolicy(domain, answers, subtype);
  return {
    allowed: decision.canPlan && decision.allowedOptionalPages.includes(slug),
    reasons: decision.canPlan
      ? decision.allowedOptionalPages.includes(slug)
        ? []
        : [`${slug} is not an allowed optional page for this domain/subtype.`]
      : [`Discovery is incomplete: ${decision.mustAskMore.join(", ")}`],
  };
}

export function canAddOptionalAction(domain: Domain, actionId: string, answers: DiscoveryAnswer[], subtype?: string) {
  const decision = evaluatePlanningPolicy(domain, answers, subtype);
  return {
    allowed: decision.canPlan && decision.allowedOptionalActions.includes(actionId),
    reasons: decision.canPlan
      ? decision.allowedOptionalActions.includes(actionId)
        ? []
        : [`${actionId} is not an allowed optional action for this domain/subtype.`]
      : [`Discovery is incomplete: ${decision.mustAskMore.join(", ")}`],
  };
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
