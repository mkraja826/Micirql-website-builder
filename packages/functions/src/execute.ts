import type {
  AuditSink,
  FunctionAdapter,
  FunctionExecutionContext,
  FunctionResult,
  RateLimiter,
  RuntimeFunctionDefinition,
} from "./types";

export type FunctionRuntime = {
  definitions: RuntimeFunctionDefinition[];
  adapters: Record<string, FunctionAdapter | undefined>;
  rateLimiter: RateLimiter;
  auditSink?: AuditSink;
};

export async function executeFunction(
  runtime: FunctionRuntime,
  args: {
    actionId: string;
    payload: unknown;
    context: FunctionExecutionContext;
  },
): Promise<FunctionResult> {
  const definition = runtime.definitions.find((item) => item.id === args.actionId);
  if (!definition) {
    return failure("NOT_FOUND", "This action is not registered.", args.context.requestId);
  }

  const accessFailure = checkAccess(definition, args.context);
  if (accessFailure) return accessFailure;

  const parsed = definition.input.safeParse(args.payload);
  if (!parsed.success) {
    await writeAudit(runtime, definition, args.context, false, "INVALID_INPUT");
    return failure("INVALID_INPUT", "The submitted information is invalid.", args.context.requestId);
  }

  const rateKey = buildRateLimitKey(definition, args.context);
  const rate = await runtime.rateLimiter.consume({
    key: rateKey,
    limit: definition.rateLimit.limit,
    windowSeconds: definition.rateLimit.windowSeconds,
  });
  if (!rate.allowed) {
    await writeAudit(runtime, definition, args.context, false, "RATE_LIMITED");
    return failure("RATE_LIMITED", "Too many requests. Please try again later.", args.context.requestId);
  }

  const adapter = runtime.adapters[definition.adapterKey];
  if (!adapter) {
    await writeAudit(runtime, definition, args.context, false, "NOT_CONFIGURED");
    return failure("NOT_CONFIGURED", "This action is not configured for execution yet.", args.context.requestId);
  }

  try {
    const rawOutput = await adapter.execute({
      definition,
      input: parsed.data,
      context: args.context,
    });
    const output = definition.output.safeParse(rawOutput);
    if (!output.success) throw new Error("Adapter returned an invalid output payload.");

    await writeAudit(runtime, definition, args.context, true);
    return { ok: true, data: output.data, requestId: args.context.requestId };
  } catch {
    await writeAudit(runtime, definition, args.context, false, "EXECUTION_FAILED");
    return failure("EXECUTION_FAILED", "The request could not be completed.", args.context.requestId);
  }
}

function checkAccess(
  definition: RuntimeFunctionDefinition,
  context: FunctionExecutionContext,
): FunctionResult<never> | undefined {
  if (definition.access === "authenticated" && !context.actor.userId) {
    return failure("FORBIDDEN", "Authentication is required.", context.requestId);
  }
  if (definition.access === "role-restricted") {
    if (!context.actor.userId || !context.actor.role || !definition.allowedRoles?.includes(context.actor.role)) {
      return failure("FORBIDDEN", "You do not have permission to perform this action.", context.requestId);
    }
  }
  return undefined;
}

function buildRateLimitKey(definition: RuntimeFunctionDefinition, context: FunctionExecutionContext): string {
  const prefix = `${definition.id}:${context.siteId}`;
  if (definition.rateLimit.key === "site") return prefix;
  if (definition.rateLimit.key === "site-user") return `${prefix}:user:${context.actor.userId ?? "anonymous"}`;
  return `${prefix}:ip:${context.actor.ipHash ?? "unknown"}`;
}

async function writeAudit(
  runtime: FunctionRuntime,
  definition: RuntimeFunctionDefinition,
  context: FunctionExecutionContext,
  success: boolean,
  code?: string,
) {
  if (!definition.audit || !runtime.auditSink) return;
  await runtime.auditSink.write({
    actionId: definition.id,
    siteId: context.siteId,
    workspaceId: context.workspaceId,
    requestId: context.requestId,
    actorUserId: context.actor.userId,
    success,
    code,
    occurredAt: context.now.toISOString(),
  });
}

function failure(code: Extract<FunctionResult, { ok: false }>["code"], message: string, requestId: string): FunctionResult<never> {
  return { ok: false, code, message, requestId };
}
