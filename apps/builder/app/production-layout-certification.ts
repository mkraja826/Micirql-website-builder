type PlannerContext = {
  certifiedLayoutCandidates?: Array<{ id?: string } & Record<string, unknown>>;
  [key: string]: unknown;
};

function normalizeIndustry(value: string | null | undefined): string {
  const normalized = (value ?? "").trim().toLowerCase();
  if (/\bdental|dentist|dentistry|orthodont|endodont|implant\b/.test(normalized)) return "dental";
  return normalized.replace(/\s+/g, "-");
}

export function productionCertifiedLayoutIds(industry: string | null | undefined): Set<string> | null {
  if (normalizeIndustry(industry) !== "dental") return null;
  const raw = process.env.MICIRQL_DENTAL_CERTIFIED_LAYOUT_IDS?.trim();
  if (!raw) return process.env.NODE_ENV === "production" ? new Set<string>() : null;
  return new Set(raw.split(",").map((value) => value.trim()).filter(Boolean));
}

export function filterPlannerContextByProductionCertification<T extends PlannerContext | undefined>(context: T, industry: string | null | undefined): T {
  if (!context) return context;
  const allowed = productionCertifiedLayoutIds(industry);
  if (allowed === null) return context;
  const candidates = Array.isArray(context.certifiedLayoutCandidates) ? context.certifiedLayoutCandidates : [];
  return {
    ...context,
    certifiedLayoutSelectorVersion: 2,
    renderedCertificationRequired: true,
    renderedCertifiedLayoutCount: candidates.filter((candidate) => candidate?.id && allowed.has(candidate.id)).length,
    certifiedLayoutCandidates: candidates.filter((candidate) => candidate?.id && allowed.has(candidate.id)),
  } as T;
}

export function assertProductionCertifiedLayout(layoutId: string, industry: string | null | undefined): void {
  const allowed = productionCertifiedLayoutIds(industry);
  if (allowed === null) return;
  if (!allowed.has(layoutId)) {
    const error = new Error(`Planner-selected layout ${layoutId} does not have current rendered production certification.`) as Error & { status?: number; code?: string };
    error.status = 422;
    error.code = "LAYOUT_RENDER_CERTIFICATION_REQUIRED";
    throw error;
  }
}
