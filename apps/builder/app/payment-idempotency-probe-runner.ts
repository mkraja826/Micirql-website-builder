import type { BackendImplementationContract } from "@micirql/schema";
import type { SupabaseCertificationProbeResult } from "./supabase-staging-executor";

export type PaymentCreateProbeResult = {
  accepted: boolean;
  orderId?: string;
  paymentId?: string;
};

export type PaymentWebhookProbeResult = {
  accepted: boolean;
  duplicate?: boolean;
};

export type PaymentProbeSnapshot = {
  orderCount: number;
  paymentCount: number;
  fulfillmentCount: number;
  webhookEventCount: number;
};

export type PaymentCertificationAdapter = {
  createPayment: (input: {
    projectRef: string;
    idempotencyKey: string;
  }) => Promise<PaymentCreateProbeResult>;
  deliverWebhook: (input: {
    projectRef: string;
    eventId: string;
    paymentId: string;
    validSignature: boolean;
  }) => Promise<PaymentWebhookProbeResult>;
  inspect: (input: {
    projectRef: string;
    idempotencyKey: string;
    eventId: string;
  }) => Promise<PaymentProbeSnapshot>;
  cleanup?: (input: {
    projectRef: string;
    idempotencyKey: string;
    eventIds: string[];
  }) => Promise<void>;
};

export function createPaymentIdempotencyProbeRunner(adapter?: PaymentCertificationAdapter) {
  return async function runPaymentIdempotencyProbe(
    projectRef: string,
    contract: BackendImplementationContract,
  ): Promise<SupabaseCertificationProbeResult> {
    const requiresPaymentProbe = contract.acceptanceChecks.some(
      (check) => check.required && check.id === "payment-idempotency",
    );
    if (!requiresPaymentProbe) return { paymentIdempotencyPassed: true, errors: [] };
    if (!adapter) {
      return {
        paymentIdempotencyPassed: false,
        errors: ["Payment certification adapter is not configured; payment-enabled builds remain fail-closed."],
      };
    }

    const errors: string[] = [];
    const idempotencyKey = `micirql-probe-${crypto.randomUUID()}`;
    const eventId = `evt_${crypto.randomUUID()}`;
    const invalidEventId = `evt_invalid_${crypto.randomUUID()}`;

    try {
      const first = await adapter.createPayment({ projectRef, idempotencyKey });
      const second = await adapter.createPayment({ projectRef, idempotencyKey });

      if (!first.accepted || !second.accepted) {
        errors.push("Repeated payment-create requests were not both safely accepted/replayed.");
      }
      if (first.orderId && second.orderId && first.orderId !== second.orderId) {
        errors.push("Repeated payment-create requests produced different order identifiers.");
      }
      if (first.paymentId && second.paymentId && first.paymentId !== second.paymentId) {
        errors.push("Repeated payment-create requests produced different payment identifiers.");
      }

      const paymentId = first.paymentId ?? second.paymentId;
      if (!paymentId) {
        errors.push("Payment-create probe did not return a stable payment identifier.");
      } else {
        const webhookFirst = await adapter.deliverWebhook({
          projectRef,
          eventId,
          paymentId,
          validSignature: true,
        });
        const webhookReplay = await adapter.deliverWebhook({
          projectRef,
          eventId,
          paymentId,
          validSignature: true,
        });
        if (!webhookFirst.accepted || !webhookReplay.accepted) {
          errors.push("Valid payment webhook or its replay was not handled safely.");
        }

        const invalid = await adapter.deliverWebhook({
          projectRef,
          eventId: invalidEventId,
          paymentId,
          validSignature: false,
        });
        if (invalid.accepted) {
          errors.push("Webhook with an invalid signature was accepted.");
        }
      }

      const snapshot = await adapter.inspect({ projectRef, idempotencyKey, eventId });
      if (snapshot.orderCount !== 1) errors.push(`Expected exactly one order after retries, observed ${snapshot.orderCount}.`);
      if (snapshot.paymentCount !== 1) errors.push(`Expected exactly one payment after retries, observed ${snapshot.paymentCount}.`);
      if (snapshot.fulfillmentCount > 1) errors.push(`Webhook replay produced duplicate fulfillment (${snapshot.fulfillmentCount}).`);
      if (snapshot.webhookEventCount !== 1) errors.push(`Expected one persisted webhook event, observed ${snapshot.webhookEventCount}.`);
    } catch (error) {
      errors.push(`Payment idempotency probe failed: ${errorMessage(error)}`);
    } finally {
      try {
        await adapter.cleanup?.({ projectRef, idempotencyKey, eventIds: [eventId, invalidEventId] });
      } catch (error) {
        errors.push(`Payment probe cleanup failed: ${errorMessage(error)}`);
      }
    }

    return {
      paymentIdempotencyPassed: errors.length === 0,
      errors,
    };
  };
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
