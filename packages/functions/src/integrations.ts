import type {
  NotificationAdapter,
  NotificationDelivery,
  NotificationDestination,
  NotificationEvent,
} from "./notifications";

export type EmailMessage = {
  to: string[];
  subject: string;
  text: string;
  replyTo?: string;
};

export type EmailTransport = {
  send(message: EmailMessage, configRef: string): Promise<{ messageId?: string; queued?: boolean }>;
};

export type WebhookTransport = {
  post(args: { configRef: string; event: NotificationEvent }): Promise<{ messageId?: string; queued?: boolean }>;
};

export type MessagingTransport = {
  send(args: {
    configRef: string;
    channel: "whatsapp" | "sms";
    text: string;
  }): Promise<{ messageId?: string; queued?: boolean }>;
};

export function createEmailNotificationAdapter(args: {
  provider: string;
  transport: EmailTransport;
  resolveRecipients(destination: NotificationDestination): Promise<string[]>;
}): NotificationAdapter {
  return {
    provider: args.provider,
    channel: "email",
    async deliver({ destination, event }) {
      const recipients = await args.resolveRecipients(destination);
      if (recipients.length === 0) return skipped(destination);

      const sent = await args.transport.send(
        {
          to: recipients,
          subject: event.subject,
          text: `${event.summary}\n\nAction: ${event.actionId}\nWebsite: ${event.hostname}\nRequest: ${event.requestId}${event.recordId ? `\nRecord: ${event.recordId}` : ""}`,
        },
        destination.configRef,
      );

      return delivered(destination, sent.messageId, sent.queued);
    },
  };
}

export function createWebhookNotificationAdapter(args: {
  provider: string;
  transport: WebhookTransport;
}): NotificationAdapter {
  return {
    provider: args.provider,
    channel: "webhook",
    async deliver({ destination, event }) {
      const sent = await args.transport.post({ configRef: destination.configRef, event });
      return delivered(destination, sent.messageId, sent.queued);
    },
  };
}

export function createMessagingNotificationAdapter(args: {
  provider: string;
  channel: "whatsapp" | "sms";
  transport: MessagingTransport;
}): NotificationAdapter {
  return {
    provider: args.provider,
    channel: args.channel,
    async deliver({ destination, event }) {
      const sent = await args.transport.send({
        configRef: destination.configRef,
        channel: args.channel,
        text: `${event.subject}. ${event.summary}`,
      });
      return delivered(destination, sent.messageId, sent.queued);
    },
  };
}

function delivered(
  destination: NotificationDestination,
  providerMessageId?: string,
  queued?: boolean,
): NotificationDelivery {
  return {
    destinationId: destination.id,
    channel: destination.channel,
    provider: destination.provider,
    status: queued ? "queued" : "sent",
    ...(providerMessageId ? { providerMessageId } : {}),
  };
}

function skipped(destination: NotificationDestination): NotificationDelivery {
  return {
    destinationId: destination.id,
    channel: destination.channel,
    provider: destination.provider,
    status: "skipped",
  };
}
