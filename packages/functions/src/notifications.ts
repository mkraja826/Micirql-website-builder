import type { FunctionNotificationHook, ResolvedSiteContext } from "./gateway";
import type { FunctionResult } from "./types";

export type NotificationChannel = "email" | "whatsapp" | "sms" | "webhook" | "calendar" | "crm";

export type NotificationEvent = {
  eventId: string;
  siteId: string;
  workspaceId: string;
  hostname: string;
  siteName?: string;
  actionId: string;
  requestId: string;
  occurredAt: string;
  subject: string;
  summary: string;
  recordId?: string;
};

export type NotificationDestination = {
  id: string;
  channel: NotificationChannel;
  enabled: boolean;
  provider: string;
  configRef: string;
  actionIds?: string[];
};

export type NotificationDirectory = {
  destinationsFor(siteId: string, actionId: string): Promise<NotificationDestination[]>;
};

export type NotificationDelivery = {
  destinationId: string;
  channel: NotificationChannel;
  provider: string;
  providerMessageId?: string;
  status: "sent" | "queued" | "skipped" | "failed";
};

export type NotificationAdapter = {
  provider: string;
  channel: NotificationChannel;
  deliver(args: {
    destination: NotificationDestination;
    event: NotificationEvent;
  }): Promise<NotificationDelivery>;
};

export type NotificationAdapterRegistry = {
  get(channel: NotificationChannel, provider: string): NotificationAdapter | undefined;
};

export type NotificationDeliverySink = {
  write(event: NotificationEvent, delivery: NotificationDelivery): Promise<void>;
};

export function createNotificationHook(args: {
  directory: NotificationDirectory;
  adapters: NotificationAdapterRegistry;
  deliverySink?: NotificationDeliverySink;
  now?: () => Date;
}): FunctionNotificationHook {
  return {
    async afterSuccess({ site, actionId, result, requestId }) {
      const event = toNotificationEvent(site, actionId, result, requestId, args.now?.() ?? new Date());
      const destinations = await args.directory.destinationsFor(site.siteId, actionId);

      for (const destination of destinations) {
        if (!destination.enabled) continue;
        if (destination.actionIds && !destination.actionIds.includes(actionId)) continue;

        const adapter = args.adapters.get(destination.channel, destination.provider);
        if (!adapter) {
          await args.deliverySink?.write(event, {
            destinationId: destination.id,
            channel: destination.channel,
            provider: destination.provider,
            status: "skipped",
          });
          continue;
        }

        try {
          const delivery = await adapter.deliver({ destination, event });
          await args.deliverySink?.write(event, delivery);
        } catch {
          await args.deliverySink?.write(event, {
            destinationId: destination.id,
            channel: destination.channel,
            provider: destination.provider,
            status: "failed",
          });
        }
      }
    },
  };
}

export function createNotificationAdapterRegistry(adapters: NotificationAdapter[]): NotificationAdapterRegistry {
  const map = new Map(adapters.map((adapter) => [`${adapter.channel}:${adapter.provider}`, adapter]));
  return {
    get(channel, provider) {
      return map.get(`${channel}:${provider}`);
    },
  };
}

function toNotificationEvent(
  site: ResolvedSiteContext,
  actionId: string,
  result: Extract<FunctionResult, { ok: true }>,
  requestId: string,
  now: Date,
): NotificationEvent {
  const data = asRecord(result.data);
  const recordId = stringField(data, "recordId");
  const label = actionLabel(actionId);
  const siteLabel = site.siteName?.trim() || site.hostname;

  return {
    eventId: `${site.siteId}:${requestId}:${actionId}`,
    siteId: site.siteId,
    workspaceId: site.workspaceId,
    hostname: site.hostname,
    ...(site.siteName?.trim() ? { siteName: site.siteName.trim() } : {}),
    actionId,
    requestId,
    occurredAt: now.toISOString(),
    subject: `New ${label} for ${siteLabel}`,
    summary: `A new ${label} was received for ${siteLabel}.`,
    ...(recordId ? { recordId } : {}),
  };
}

function actionLabel(actionId: string): string {
  const labels: Record<string, string> = {
    "lead.create": "website enquiry",
    "appointment.request": "appointment request",
    "reservation.request": "reservation request",
    "quote.request": "quote request",
    "newsletter.subscribe": "newsletter subscription",
    "property.enquiry": "property enquiry",
    "demo.request": "demo request",
    "booking.request": "booking request",
    "enrollment.enquiry": "enrolment enquiry",
  };
  return labels[actionId] ?? "website submission";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringField(value: Record<string, unknown>, key: string): string | undefined {
  const item = value[key];
  return typeof item === "string" && item.trim() ? item.trim() : undefined;
}
