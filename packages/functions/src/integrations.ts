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
  html?: string;
  replyTo?: string;
};

export type EmailTransport = {
  send(message: EmailMessage, configRef: string): Promise<{ messageId?: string; queued?: boolean }>;
};

export type EmailProviderConfig = {
  apiKey: string;
  from: string;
};

export type EmailProviderConfigResolver = {
  resolve(configRef: string): Promise<EmailProviderConfig | undefined>;
};

export function createResendEmailTransport(args: {
  config: EmailProviderConfigResolver;
  apiBaseUrl?: string;
  fetcher?: typeof fetch;
}): EmailTransport {
  const base = (args.apiBaseUrl ?? "https://api.resend.com").replace(/\/$/, "");
  const fetcher = args.fetcher ?? fetch;
  return {
    async send(message, configRef) {
      const config = await args.config.resolve(configRef);
      if (!config?.apiKey || !config.from) throw new Error("Email notification provider is not configured.");
      const response = await fetcher(`${base}/emails`, {
        method: "POST",
        headers: { authorization: `Bearer ${config.apiKey}`, "content-type": "application/json" },
        body: JSON.stringify({
          from: config.from,
          to: message.to,
          subject: message.subject,
          text: message.text,
          ...(message.html ? { html: message.html } : {}),
          ...(message.replyTo ? { reply_to: message.replyTo } : {}),
        }),
      });
      if (!response.ok) throw new Error(`Email delivery failed (${response.status}).`);
      const result = await response.json().catch(() => ({})) as { id?: string };
      return { ...(result.id ? { messageId: result.id } : {}), queued: true };
    },
  };
}

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
  manageBaseUrl?: string;
}): NotificationAdapter {
  return {
    provider: args.provider,
    channel: "email",
    async deliver({ destination, event }) {
      const recipients = await args.resolveRecipients(destination);
      if (recipients.length === 0) return skipped(destination);
      const manageUrl = buildManageUrl(args.manageBaseUrl, event);
      const siteLabel = event.siteName?.trim() || event.hostname;
      const text = `${event.summary}\n\nWebsite: ${siteLabel}\nAction: ${event.actionId}\nRequest: ${event.requestId}${event.recordId ? `\nRecord: ${event.recordId}` : ""}${manageUrl ? `\n\nView enquiry: ${manageUrl}` : ""}\n\nSent by MiCirql`;
      const html = `<div style="margin:0;background:#f5f5f7;padding:28px;font-family:Arial,Helvetica,sans-serif;color:#17171b"><div style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #e5e5ea;border-radius:18px;overflow:hidden"><div style="background:#111116;color:#ffffff;padding:22px 26px"><div style="font-size:13px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#a89fff">MiCirql</div><h1 style="font-size:22px;line-height:1.25;margin:8px 0 0">${escapeHtml(event.subject)}</h1></div><div style="padding:26px"><p style="font-size:16px;line-height:1.55;margin:0 0 20px">${escapeHtml(event.summary)}</p><div style="background:#f7f7fa;border-radius:12px;padding:15px 17px;margin-bottom:22px"><div style="margin:0 0 7px"><strong>Website:</strong> ${escapeHtml(siteLabel)}</div><div style="margin:0 0 7px"><strong>Request type:</strong> ${escapeHtml(event.actionId)}</div><div><strong>Received:</strong> ${escapeHtml(new Date(event.occurredAt).toUTCString())}</div></div>${manageUrl ? `<a href="${escapeHtml(manageUrl)}" style="display:inline-block;background:#6d5dfc;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:10px">View enquiry in MiCirql</a>` : ""}<p style="margin:24px 0 0;font-size:12px;line-height:1.5;color:#777783">This notification was sent because enquiry notifications are enabled for this website.</p></div></div></div>`;

      const sent = await args.transport.send(
        {
          to: recipients,
          subject: event.subject,
          text,
          html,
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

function buildManageUrl(baseUrl: string | undefined, event: NotificationEvent) {
  const base = baseUrl?.trim().replace(/\/$/, "");
  if (!base) return undefined;
  const params = new URLSearchParams({ siteId: event.siteId });
  if (event.siteName?.trim()) params.set("name", event.siteName.trim());
  if (event.recordId) params.set("recordId", event.recordId);
  return `${base}/enquiries?${params.toString()}`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
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
