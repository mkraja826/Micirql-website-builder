import type { BackendImplementationContract } from "@micirql/schema";
import type { SupabaseCertificationProbeResult } from "./supabase-staging-executor";

export type SupabasePaymentProbeQueryExecutor = (
  projectRef: string,
  sql: string,
  readOnly: boolean,
) => Promise<unknown>;

export function createSupabasePaymentProbeRunner(query: SupabasePaymentProbeQueryExecutor) {
  return async function runSupabasePaymentProbes(
    projectRef: string,
    contract: BackendImplementationContract,
  ): Promise<SupabaseCertificationProbeResult> {
    const requiresPayment = contract.acceptanceChecks.some((check) => check.required && check.id === "payment-idempotency");
    if (!requiresPayment) return { paymentIdempotencyPassed: true, errors: [] };

    const errors: string[] = [];
    const orders = contract.tables.find((table) => table.name === "orders");
    const events = contract.tables.find((table) => table.name === "payment_events");
    const createRoute = contract.routes.find((route) => route.id === "payment-create");
    const webhookRoute = contract.routes.find((route) => route.id === "payment-webhook");
    const integration = contract.integrations.find((item) => item.id === "payments");

    if (!orders?.columns.some((column) => column.name === "idempotency_key" && column.unique)) errors.push("orders.idempotency_key must exist and be unique.");
    if (!events?.columns.some((column) => column.name === "provider_event_id" && column.unique)) errors.push("payment_events.provider_event_id must exist and be unique.");
    if (!createRoute?.idempotent) errors.push("Payment creation route is not declared idempotent.");
    if (!webhookRoute?.idempotent || webhookRoute.auth !== "webhook") errors.push("Payment webhook route must be idempotent and webhook-authenticated.");
    if (!integration?.webhookVerificationRequired) errors.push("Payment integration does not require webhook signature verification.");

    if (errors.length) return { paymentIdempotencyPassed: false, errors };

    const idempotencyKey = `micirql-probe-${crypto.randomUUID()}`;
    const providerEventId = `evt_probe_${crypto.randomUUID()}`;
    const orderId = crypto.randomUUID();
    const eventId = crypto.randomUUID();

    try {
      await query(projectRef, `insert into public."orders" ("id", "owner_user_id", "status", "amount", "idempotency_key") values ('${orderId}', '${crypto.randomUUID()}', 'pending', 1, '${idempotencyKey}') on conflict ("idempotency_key") do nothing;`, false);
      await query(projectRef, `insert into public."orders" ("id", "owner_user_id", "status", "amount", "idempotency_key") values ('${crypto.randomUUID()}', '${crypto.randomUUID()}', 'pending', 1, '${idempotencyKey}') on conflict ("idempotency_key") do nothing;`, false);
      const orderCount = scalarCount(await query(projectRef, `select count(*)::int as count from public."orders" where "idempotency_key" = '${idempotencyKey}'`, true));

      await query(projectRef, `insert into public."payment_events" ("id", "provider_event_id", "event_type", "payload") values ('${eventId}', '${providerEventId}', 'payment.succeeded', '{}'::jsonb) on conflict ("provider_event_id") do nothing;`, false);
      await query(projectRef, `insert into public."payment_events" ("id", "provider_event_id", "event_type", "payload") values ('${crypto.randomUUID()}', '${providerEventId}', 'payment.succeeded', '{}'::jsonb) on conflict ("provider_event_id") do nothing;`, false);
      const eventCount = scalarCount(await query(projectRef, `select count(*)::int as count from public."payment_events" where "provider_event_id" = '${providerEventId}'`, true));

      const passed = orderCount === 1 && eventCount === 1;
      if (orderCount !== 1) errors.push(`Duplicate payment creation key produced ${orderCount} order rows.`);
      if (eventCount !== 1) errors.push(`Duplicate provider webhook event produced ${eventCount} event rows.`);
      return { paymentIdempotencyPassed: passed, errors };
    } catch (error) {
      return { paymentIdempotencyPassed: false, errors: [`Payment idempotency probe failed: ${errorMessage(error)}`] };
    } finally {
      await safeCleanup(query, projectRef, "orders", "idempotency_key", idempotencyKey);
      await safeCleanup(query, projectRef, "payment_events", "provider_event_id", providerEventId);
    }
  };
}

async function safeCleanup(query: SupabasePaymentProbeQueryExecutor, projectRef: string, table: string, column: string, value: string) {
  try {
    await query(projectRef, `delete from public."${table}" where "${column}" = '${value.replace(/'/g, "''")}'`, false);
  } catch {
    // Preview branches are disposable; cleanup failure must not hide the probe result.
  }
}

function scalarCount(value: unknown) {
  const rows = normalizeRows(value);
  const count = rows[0]?.count;
  if (typeof count === "number") return count;
  if (typeof count === "string" && /^\d+$/.test(count)) return Number(count);
  return -1;
}

function normalizeRows(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) return value.filter(isRecord);
  if (isRecord(value)) {
    for (const key of ["result", "data", "rows"]) {
      const candidate = value[key];
      if (Array.isArray(candidate)) return candidate.filter(isRecord);
    }
  }
  return [];
}
function isRecord(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function errorMessage(error: unknown) { return error instanceof Error ? error.message : String(error); }
