# Production observability

Cloudflare Workers observability is enabled in `wrangler.jsonc`. Application operational events are emitted as one-line JSON records to the Worker logs with schema `micirql.operational.v1`.

## Event fields

Events contain a bounded operation and outcome, a correlation ID, elapsed milliseconds, HTTP status, and only safe site or publication revision identifiers when available. Failures use a fixed `failureCode`; raw exception messages are never recorded. Tokens, authorization headers, request or enquiry bodies, hostnames, emails, and credentials are excluded.

A valid UUID `x-request-id` is preserved for API correlation. Cloudflare `cf-ray` IDs are accepted for edge correlation. If neither is available, the application generates a UUID. The publish and reconciliation API returns the ID in its `x-request-id` response header.

## Instrumented V1 paths

- `publication.publish`: verified publication success, definitive rejection, authentication failure, invalid request, and uncertain outcome.
- `publication.reconcile`: active revision confirmation, missing publication, tenant access rejection, and reconciliation failure.
- `published_site.render`: public snapshot render success, missing site, and load/render failure.
- `site_action.submit`: privacy-safe public request acceptance, validation rejection, rate-limit response, and service failure.

Filter Worker logs by `operation`, `outcome`, or `failureCode` to review failure rates and latency. Use `requestId` to follow one request and `siteId` / `versionId` to identify the affected publication without exposing visitor or business contact data. Alert on repeated `published_site.render` failures and on `publication.publish` events with outcome `uncertain`.

This first observability slice covers publication, public rendering, and request submission boundaries. Generation, editing, enquiry delivery, and custom-domain routing are instrumented as those operational paths are introduced.
