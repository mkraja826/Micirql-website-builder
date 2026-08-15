import { businessProfileSchema, seoBlueprintSchema, type BusinessProfile } from "@micirql/schema";
import type { z } from "zod";
import { getDomainPack } from "./index";
import { getSubtypeRule } from "./subtypes";
import type { DiscoveryAnswer } from "./discovery-types";
import { validateDiscoveryCompleteness } from "./discovery";

export type SeoBlueprint = z.infer<typeof seoBlueprintSchema>;

export type PlanningInput = {
  domain: BusinessProfile["domain"];
  subtype?: string;
  answers: DiscoveryAnswer[];
};

export type PlanningTransformResult = {
  complete: boolean;
  missingQuestionIds: string[];
  businessProfile?: BusinessProfile;
  seoBlueprint?: SeoBlueprint;
  requiredPages: Array<{
    path: string;
    name: string;
    purpose: string;
    requiredSectionFamilies: string[];
  }>;
  requiredActions: string[];
  optionalActions: string[];
  trustSignals: string[];
  avoid: string[];
};

export function transformDiscoveryToPlanning(input: PlanningInput): PlanningTransformResult {
  const completeness = validateDiscoveryCompleteness(input.domain, input.answers, input.subtype);
  const pack = getDomainPack(input.domain);
  const subtypeRule = input.subtype ? getSubtypeRule(input.domain, input.subtype) : undefined;

  const requiredPages = [
    ...pack.defaultPages.filter((page) => page.required).map((page) => ({
      path: page.slug,
      name: page.label,
      purpose: page.purpose,
      requiredSectionFamilies: [...page.sectionFamilies],
    })),
    ...(subtypeRule?.extraPages ?? []).map((page) => ({
      path: page.slug,
      name: page.label,
      purpose: page.purpose,
      requiredSectionFamilies: [...page.sectionFamilies],
    })),
  ];

  const requiredActions = unique([
    ...pack.requiredActions,
    ...(subtypeRule?.extraRequiredActions ?? []),
  ]);
  const optionalActions = unique([
    ...pack.optionalActions,
    ...(subtypeRule?.extraOptionalActions ?? []),
  ]);

  const baseResult = {
    complete: completeness.complete,
    missingQuestionIds: completeness.missing,
    requiredPages: dedupePages(requiredPages),
    requiredActions,
    optionalActions,
    trustSignals: unique([
      ...pack.recommendedTrustSignals,
      ...(subtypeRule?.extraTrustSignals ?? []),
    ]),
    avoid: unique([
      ...pack.avoidByDefault,
      ...(subtypeRule?.avoid ?? []),
    ]),
  };

  if (!completeness.complete) return baseResult;

  const answers = answerMap(input.answers);
  const locations = stringArray(answers.get("seo.locations"));
  const languages = stringArray(answers.get("seo.languages"));
  const topics = stringArray(answers.get("seo.services-topics"));
  const audiences = splitFreeText(answers.get("business.audience"));

  const businessProfile = businessProfileSchema.parse({
    businessName: requiredString(answers, "business.name"),
    domain: input.domain,
    subtype: input.subtype,
    primaryGoal: requiredString(answers, "business.primary-goal"),
    audiences,
    locations,
    positioning: inferPositioning(stringArray(answers.get("brand.personality"))),
    requiredFunctions: requiredActions,
  });

  const seoBlueprint = seoBlueprintSchema.parse({
    primaryGoal: requiredString(answers, "seo.goal"),
    targetLocations: locations,
    priorityTopics: topics,
    audiences,
    languages: languages.length > 0 ? languages : ["en"],
    localSeo: pack.seo.defaultScope === "local" || pack.seo.defaultScope === "regional",
    servicePages: pack.seo.serviceOrTopicPages || Boolean(subtypeRule?.seoTopics?.length),
    locationPages: pack.seo.locationPages && locations.length > 0,
    blog: pack.seo.blogRecommended && booleanValue(answers.get("seo.content-growth")),
  });

  return { ...baseResult, businessProfile, seoBlueprint };
}

function answerMap(answers: DiscoveryAnswer[]) {
  return new Map(answers.map((answer) => [answer.questionId, answer.value]));
}

function requiredString(answers: Map<string, DiscoveryAnswer["value"]>, id: string): string {
  const value = answers.get(id);
  if (typeof value === "string" && value.trim()) return value.trim();
  if (Array.isArray(value) && value.length > 0) return value[0]!;
  throw new Error(`Missing required discovery answer: ${id}`);
}

function stringArray(value: DiscoveryAnswer["value"] | undefined): string[] {
  if (Array.isArray(value)) return value.map((item) => item.trim()).filter(Boolean);
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

function splitFreeText(value: DiscoveryAnswer["value"] | undefined): string[] {
  if (Array.isArray(value)) return stringArray(value);
  if (typeof value !== "string") return [];
  return value.split(/[,;\n]/).map((item) => item.trim()).filter(Boolean);
}

function booleanValue(value: DiscoveryAnswer["value"] | undefined): boolean {
  return value === true || value === "true" || value === "yes";
}

function inferPositioning(personalities: string[]): BusinessProfile["positioning"] {
  const normalized = new Set(personalities.map((value) => value.toLowerCase()));
  if (normalized.has("luxury")) return "luxury";
  if (normalized.has("premium")) return "premium";
  return "mid-market";
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function dedupePages<T extends { path: string }>(pages: T[]): T[] {
  const seen = new Set<string>();
  return pages.filter((page) => {
    if (seen.has(page.path)) return false;
    seen.add(page.path);
    return true;
  });
}
