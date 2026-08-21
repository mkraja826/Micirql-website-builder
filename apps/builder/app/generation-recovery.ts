export type GenerationFailureKind =
  | "timeout"
  | "rate-limit"
  | "provider-unavailable"
  | "network"
  | "malformed-output"
  | "quality-rejected"
  | "authentication"
  | "unknown";

export type GenerationRecoveryAttempt<TProfile> = {
  profile: TProfile;
  profileId: string;
  provider: string;
  model: string;
};

export type GenerationRecoveryFailure = {
  profileId: string;
  provider: string;
  model: string;
  kind: GenerationFailureKind;
  message: string;
  reason: string;
};

export type GenerationRecoveryResult<TResult, TProfile> = {
  result: TResult;
  selectedProfile: TProfile;
  selectedProfileId: string;
  fallbackUsed: boolean;
  failures: GenerationRecoveryFailure[];
};

/**
 * Runs complete generation attempts in priority order. Individual provider adapters
 * remain responsible for short transient retries; this layer handles provider-level
 * fallback after an attempt still fails because of timeout/network errors, malformed
 * output, schema rejection, grounding rejection or quality rejection.
 *
 * No persistence belongs in this function. Callers save only the returned successful
 * result, which guarantees failed/partial candidates never replace the current draft.
 */
export async function runGenerationRecovery<TResult, TProfile>(
  attempts: readonly GenerationRecoveryAttempt<TProfile>[],
  execute: (attempt: GenerationRecoveryAttempt<TProfile>) => Promise<TResult>,
): Promise<GenerationRecoveryResult<TResult, TProfile>> {
  if (!attempts.length) throw new Error("GENERATION_RECOVERY_NO_PROVIDERS");

  const failures: GenerationRecoveryFailure[] = [];
  let lastError: unknown;

  for (const attempt of attempts) {
    try {
      const result = await execute(attempt);
      return {
        result,
        selectedProfile: attempt.profile,
        selectedProfileId: attempt.profileId,
        fallbackUsed: attempt.profileId !== attempts[0]?.profileId,
        failures,
      };
    } catch (error) {
      lastError = error;
      const message = errorMessage(error);
      failures.push({
        profileId: attempt.profileId,
        provider: attempt.provider,
        model: attempt.model,
        kind: classifyGenerationFailure(error),
        message,
        reason: message,
      });
    }
  }

  const failure = new Error(lastError instanceof Error ? lastError.message : "Generation failed for every configured provider.") as Error & {
    code?: string;
    failures?: GenerationRecoveryFailure[];
  };
  failure.code = "GENERATION_RECOVERY_EXHAUSTED";
  failure.failures = failures;
  throw failure;
}

export function classifyGenerationFailure(error: unknown): GenerationFailureKind {
  const message = errorMessage(error).toLowerCase();
  if (/401|403|unauthor|forbidden|invalid api key|authentication/.test(message)) return "authentication";
  if (/429|rate.?limit|quota/.test(message)) return "rate-limit";
  if (/timeout|timed out|aborterror|deadline/.test(message)) return "timeout";
  if (/fetch failed|network|econn|enotfound|socket|dns/.test(message)) return "network";
  if (/502|503|504|service unavailable|provider unavailable|bad gateway|gateway timeout/.test(message)) return "provider-unavailable";
  if (/invalid site snapshot|schema validation|invalid json|json parse|malformed|unexpected token/.test(message)) return "malformed-output";
  if (/content_quality_rejected|quality rejected|quality score|grounding.*not ready/.test(message)) return "quality-rejected";
  return "unknown";
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : typeof error === "string" ? error : "Unknown generation failure";
}