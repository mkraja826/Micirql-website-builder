import type { NotificationDestination, NotificationDirectory } from "./notifications";
import type { QueryDriver } from "./server-adapters";

export type OwnerEmailDestination = NotificationDestination & { recipient?: string };

export function createSqlOwnerEmailNotificationDirectory(
  db: QueryDriver,
  base: NotificationDirectory,
  options: { provider?: string; configRef?: string } = {},
): NotificationDirectory {
  const provider = options.provider ?? "resend";
  const configRef = options.configRef ?? "micirql-default-email";
  return {
    async destinationsFor(siteId, actionId) {
      const destinations = await base.destinationsFor(siteId, actionId);
      const preference = await db.one<{ siteId:string; emailAddress:string|null; emailEnabled:boolean }>(
        `select site_id::text as "siteId", email_address as "emailAddress", email_enabled as "emailEnabled"
         from site_notification_preferences
         where site_id::text = $1 and email_enabled = true
         limit 1`,
        [siteId],
      );
      if (!preference?.emailEnabled || !validEmail(preference.emailAddress)) return destinations;
      if (destinations.some(destination => destination.channel === "email" && destination.id === preference.siteId)) return destinations;
      const owner: OwnerEmailDestination = {
        id: preference.siteId,
        channel: "email",
        provider,
        configRef,
        enabled: true,
        recipient: preference.emailAddress!,
      };
      return [...destinations, owner];
    },
  };
}

export function ownerEmailRecipient(destination: NotificationDestination): string[] {
  const recipient = (destination as OwnerEmailDestination).recipient?.trim().toLowerCase();
  return validEmail(recipient) ? [recipient!] : [];
}

function validEmail(value?: string | null): value is string {
  return Boolean(value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
}
