import type { FunctionResult } from "./types";
import type { FunctionRuntime } from "./execute";
import { executeFunction } from "./execute";

export type ResolvedSiteContext = {
  siteId: string;
  workspaceId: string;
  hostname: string;
  siteName?: string;
  status: "active" | "preview";
};

export type GatewayRequest = {
  hostname: string;
  actionId: string;
  payload: unknown;
  requestId: string;
  idempotencyKey?: string;
  actor?: {
    userId?: string;
    role?: string;
    ipHash?: string;
  };
  botToken?: string;
};

export type SiteResolver = {
  resolve(hostname: string): Promise<ResolvedSiteContext | undefined>;
};

export type BotCheck = {
  verify(args: {
    hostname: string;
    actionId: string;
    token?: string;
    ipHash?: string;
  }): Promise<{ allowed: boolean; reason?: string }>;
};

export type IdempotencyStore = {
  get(key: string): Promise<FunctionResult | undefined>;
  put(key: string, result: FunctionResult, ttlSeconds: number): Promise<void>;
};

export type FunctionNotificationHook = {
  afterSuccess(args: {
    site: ResolvedSiteContext;
    actionId: string;
    result: Extract<FunctionResult, { ok: true }>;
    requestId: string;
  }): Promise<void>;
};

export type FunctionGateway = {
  handle(request: GatewayRequest): Promise<FunctionResult>;
};

export function createFunctionGateway(args: {
  runtime: FunctionRuntime;
  siteResolver: SiteResolver;
  botCheck: BotCheck;
  idempotencyStore?: IdempotencyStore;
  notificationHooks?: FunctionNotificationHook[];
  idempotencyTtlSeconds?: number;
}): FunctionGateway {
  return {
    async handle(request) {
      const site = await args.siteResolver.resolve(normalizeHostname(request.hostname));
      if (!site || site.status !== "active") {
        return failure("NOT_FOUND", "Website action endpoint is unavailable.", request.requestId);
      }

      const bot = await args.botCheck.verify({
        hostname: site.hostname,
        actionId: request.actionId,
        ...(request.botToken ? { token: request.botToken } : {}),
        ...(request.actor?.ipHash ? { ipHash: request.actor.ipHash } : {}),
      });
      if (!bot.allowed) {
        return failure("FORBIDDEN", "Request verification failed.", request.requestId);
      }

      const idempotencyKey = request.idempotencyKey
        ? `${site.siteId}:${request.actionId}:${request.idempotencyKey}`
        : undefined;

      if (idempotencyKey && args.idempotencyStore) {
        const existing = await args.idempotencyStore.get(idempotencyKey);
        if (existing) return existing;
      }

      const result = await executeFunction(args.runtime, {
        actionId: request.actionId,
        payload: request.payload,
        context: {
          siteId: site.siteId,
          workspaceId: site.workspaceId,
          actor: {
            ...(request.actor?.userId ? { userId: request.actor.userId } : {}),
            ...(request.actor?.role ? { role: request.actor.role } : {}),
            ...(request.actor?.ipHash ? { ipHash: request.actor.ipHash } : {}),
          },
          requestId: request.requestId,
          ...(request.idempotencyKey ? { idempotencyKey: request.idempotencyKey } : {}),
          now: new Date(),
        },
      });

      if (idempotencyKey && args.idempotencyStore && result.ok) {
        await args.idempotencyStore.put(idempotencyKey, result, args.idempotencyTtlSeconds ?? 86_400);
      }

      if (result.ok) {
        for (const hook of args.notificationHooks ?? []) {
          try {
            await hook.afterSuccess({ site, actionId: request.actionId, result, requestId: request.requestId });
          } catch {
            // Notification failures must not convert a successful persisted submission into a failed user action.
          }
        }
      }

      return result;
    },
  };
}

function normalizeHostname(value: string): string {
  return value.trim().toLowerCase().replace(/:\d+$/, "").replace(/^www\./, "");
}

function failure(
  code: Extract<FunctionResult, { ok: false }>["code"],
  message: string,
  requestId: string,
): FunctionResult<never> {
  return { ok: false, code, message, requestId };
}
