# Public request abuse controls

The published request form submits through `public.submit_site_action`. The database RPC is the enforcement boundary; browser attributes only improve feedback.

## Enforced limits

- 100 submissions per published site/action per hour, through the existing atomic rate-limit function.
- One accepted result per site/action/request ID for 24 hours. A transaction-scoped advisory lock serializes concurrent retries before the idempotency lookup, preventing duplicate lead rows.
- Maximum lengths: name 120 characters, email 254, phone 32, message 4,000, source path 512.
- At most 20 custom fields and 8 KiB of serialized JSON fields.
- Source page values must be a local path and cannot be a protocol-relative URL.
- A hidden `_website` honeypot is checked by the database. Trap submissions receive a neutral acknowledgement, create no lead, and the trap value is not stored.

The published form supplies safe default values and matching HTML `maxLength` constraints. Callers cannot bypass server-side validation by invoking the RPC directly.

The current V1 request action has a per-site/action hourly ceiling. Plan-based generation, storage, and job concurrency quotas belong to the corresponding server operation boundaries and are added as those operations ship. The form submits through a same-origin server API that calls the same narrow RPC with a publishable key. It translates the rate-limit rejection to HTTP 429 with a 3,600-second `Retry-After` header and shows a clear wait message. Request bodies are capped at 16 KiB before parsing. The server logs a privacy-safe `site_action.submit` event and never records request fields, contact details, or raw database errors.
