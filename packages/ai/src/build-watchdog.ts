import { siteSchema, type Site, type SitePlan } from "@micirql/schema";

export type BuildWatchdogIssue = {
  code: "BUILD_TIMEOUT" | "MISSING_PLANNED_PAGE" | "EMPTY_PAGE" | "SECTION_COUNT_SHORTFALL" | "BUILD_FAILED";
  message: string;
  pagePath?: string;
};

export type BuildWatchdogResult<T> =
  | { ok: true; value: T; elapsedMs: number; issues: [] }
  | { ok: false; recovered: boolean; fallbackSite?: Site; elapsedMs: number; issues: BuildWatchdogIssue[] };

export function inspectBuildCompleteness(site: Site, plan?: SitePlan): BuildWatchdogIssue[] {
  const parsed = siteSchema.parse(site);
  const issues: BuildWatchdogIssue[] = [];
  const byPath = new Map(parsed.pages.map((page) => [normalizePath(page.path), page]));

  if (plan) {
    for (const planned of plan.pages) {
      const path = normalizePath(planned.path);
      const page = byPath.get(path);
      if (!page) {
        issues.push({ code: "MISSING_PLANNED_PAGE", message: `Planned page ${path} is missing from the generated website.`, pagePath: path });
        continue;
      }
      if (page.sections.length === 0) {
        issues.push({ code: "EMPTY_PAGE", message: `Generated page ${path} contains no sections.`, pagePath: path });
        continue;
      }
      const plannedCount = Array.isArray((planned as { sections?: unknown[] }).sections)
        ? ((planned as { sections?: unknown[] }).sections?.length ?? 0)
        : 0;
      if (plannedCount > 0 && page.sections.length < plannedCount) {
        issues.push({
          code: "SECTION_COUNT_SHORTFALL",
          message: `Generated page ${path} contains ${page.sections.length} section${page.sections.length === 1 ? "" : "s"}, below the planned ${plannedCount}.`,
          pagePath: path,
        });
      }
    }
  }

  for (const page of parsed.pages) {
    if (page.sections.length === 0 && !issues.some((issue) => issue.code === "EMPTY_PAGE" && issue.pagePath === normalizePath(page.path))) {
      issues.push({ code: "EMPTY_PAGE", message: `Generated page ${page.path} contains no sections.`, pagePath: page.path });
    }
  }
  return issues;
}

export async function runBuildWithWatchdog<T extends { site: Site; plan?: SitePlan }>(input: {
  execute: () => Promise<T>;
  timeoutMs?: number | undefined;
  lastKnownGood?: Site | undefined;
}): Promise<BuildWatchdogResult<T>> {
  const timeoutMs = Math.max(1_000, input.timeoutMs ?? 90_000);
  const startedAt = Date.now();
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new BuildTimeoutError(timeoutMs)), timeoutMs);
    });
    const value = await Promise.race([input.execute(), timeout]);
    if (timer) clearTimeout(timer);
    const issues = inspectBuildCompleteness(value.site, value.plan);
    if (!issues.length) return { ok: true, value, elapsedMs: Date.now() - startedAt, issues: [] };
    return recoveryResult(issues, input.lastKnownGood, Date.now() - startedAt);
  } catch (error) {
    if (timer) clearTimeout(timer);
    const issue: BuildWatchdogIssue = error instanceof BuildTimeoutError
      ? { code: "BUILD_TIMEOUT", message: error.message }
      : { code: "BUILD_FAILED", message: error instanceof Error ? error.message : "Website generation failed." };
    return recoveryResult([issue], input.lastKnownGood, Date.now() - startedAt);
  }
}

function recoveryResult(issues: BuildWatchdogIssue[], fallback: Site | undefined, elapsedMs: number): BuildWatchdogResult<never> {
  if (!fallback) return { ok: false, recovered: false, elapsedMs, issues };
  return { ok: false, recovered: true, fallbackSite: siteSchema.parse(fallback), elapsedMs, issues };
}

class BuildTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Website generation exceeded the ${timeoutMs}ms watchdog deadline.`);
    this.name = "BuildTimeoutError";
  }
}

function normalizePath(path: string) {
  if (!path) return "/";
  const clean = path.startsWith("/") ? path : `/${path}`;
  return clean.length > 1 ? clean.replace(/\/+$/, "") : clean;
}