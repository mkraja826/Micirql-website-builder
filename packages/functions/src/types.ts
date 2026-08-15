import type { z } from "zod";

export type ActorContext = {
  userId?: string;
  role?: string;
  ipHash?: string;
};

export type FunctionExecutionContext = {
  siteId: string;
  workspaceId: string;
  actor: ActorContext;
  requestId: string;
  idempotencyKey?: string;
  now: Date;
};

export type RateLimitPolicy = {
  limit: number;
  windowSeconds: number;
  key: "site" | "site-ip" | "site-user";
};

export type FunctionResult<T = unknown> =
  | { ok: true; data: T; requestId: string }
  | { ok: false; code: "NOT_FOUND" | "FORBIDDEN" | "INVALID_INPUT" | "RATE_LIMITED" | "NOT_CONFIGURED" | "EXECUTION_FAILED"; message: string; requestId: string };

export type RuntimeFunctionDefinition<TInput = unknown, TOutput = unknown> = {
  id: string;
  version: string;
  description: string;
  input: z.ZodType<TInput>;
  output: z.ZodType<TOutput>;
  access: "public" | "authenticated" | "role-restricted";
  allowedRoles?: string[];
  rateLimit: RateLimitPolicy;
  idempotent: boolean;
  adapterKey: string;
  audit: boolean;
};

export type FunctionAdapter = {
  execute<TInput, TOutput>(args: {
    definition: RuntimeFunctionDefinition<TInput, TOutput>;
    input: TInput;
    context: FunctionExecutionContext;
  }): Promise<TOutput>;
};

export type RateLimiter = {
  consume(args: { key: string; limit: number; windowSeconds: number }): Promise<{ allowed: boolean; remaining: number }>;
};

export type AuditSink = {
  write(event: {
    actionId: string;
    siteId: string;
    workspaceId: string;
    requestId: string;
    actorUserId?: string;
    success: boolean;
    code?: string;
    occurredAt: string;
  }): Promise<void>;
};
