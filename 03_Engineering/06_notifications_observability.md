# Events, Queues, Notifications, Telemetry and Incident Response

## Domain events and consumers
| Event | Trigger | Consumer / effect |
|---|---|---|
| `listing.submitted.v1` | seller submits draft | moderation queue + seller acknowledgment |
| `listing.published.v1` | moderator approves | cache revalidation + seller email |
| `listing.rejected.v1` | moderator rejects | seller action-needed email |
| `enquiry.created.v1` | buyer sends enquiry | seller/dealer notification; spam monitor |
| `order.payment_confirmed.v1` | trusted webhook | order fulfillment + receipt |
| `order.shipped.v1` | ops shipment | customer tracking email |
| `finance.lead.consented.v1` | consent validated | gated secure partner routing |
| `charger.reported.v1` | user problem report | operator review queue |
| `article.published.v1` | editor publishes | sitemap/cache revalidation |

## Outbox pattern
Write business change and outbox in one DB transaction. Worker polls outbox and pushes BullMQ jobs. Job `id = event_key`; consumer dedupes by unique id. At-least-once delivery expected; handlers must be idempotent. Dead-letter after max retries, alert operators with no PII.

**Implemented (EV-014):**
- `packages/queue` defines versioned event schemas (`system.ping.v1` so far) and a producer: payloads are validated before enqueue, and the event key is the job id, so a duplicate key runs once.
- Retry policy: 5 attempts with exponential backoff from 1 s; failed jobs are kept for inspection.
- `apps/worker` consumes the queue:
  - invalid or unknown events fail immediately without retries;
  - a job that exhausts its attempts or is rejected is logged as `job.dead_letter` with no payload and passed to an `onDeadLetter` hook, where operator alerting attaches in EV-019;
  - graceful SIGTERM finishes the job in progress;
  - `/health/live` and `/health/ready` serve the host's probes.
- The database outbox that feeds the queue is not built yet. Add it with the first business event (e.g. listing submitted), writing the outbox row in the same transaction.

## Observability
- `request_id`, user pseudonymous id, role/scope, route name, status, latency; do not log phone, email, lead free text or auth secrets.
- Sentry errors with scrubbing; trace key flows (search, checkout, lead send) and external provider response time.
- Business counter alert for failed payment reconciliation, queue DLQ, unusual listing approvals, provider outage, elevated error rate.
- Feature flags disable finance partner sends, payment intake, charger live-status and article publishing independently.

**Implemented (EV-019, partial):**

`@evone/observability` provides `redact`, `createLogger` and Sentry helpers.
- **`redact`** removes values under sensitive keys (password, token, auth, cookie, email, phone, address, name fields, message/notes, Aadhaar/PAN, UPI/IFSC/account, IP, location; camelCase and snake_case both match). It also masks emails, Indian mobile numbers, bearer tokens, JWTs, 4-4-4 digit groups and credentials in URLs inside any string.
- **`createLogger`** writes one redacted JSON line per event.
- **Sentry helpers:** `initErrorTracking` runs with `sendDefaultPii: false` and no tracing; every event and breadcrumb is redacted, and request bodies, cookies, headers, query strings and user are dropped before sending.

**API:**
- one `http.request` line per request (method, path without query, status, duration, requestId), health probes at debug;
- 5xx errors are logged as `http.error` (error name only) and reported to Sentry tagged with requestId and route; 4xx errors are not reported;
- NestJS framework logs go through the same logger.

**Worker:** the same logger; dead letters raise a Sentry alert `job.dead_letter` with event, jobId and reason only.

**Not done:** the "test alert confirmed" acceptance needs a Sentry project. Set `SENTRY_DSN`, run `pnpm --filter @evone/api sentry:test`, and confirm the `sentry.test_alert` event and its tags in Sentry. The web app has no error tracking yet; add `@sentry/nextjs` with the same `beforeSend` when a DSN exists.

## Incident levels
P0: data leak, unauthorized access, incorrect charge/capture, widespread loss of access → immediate containment and counsel/partner escalation. P1: checkout down, seller enquiry not delivered, bad published public data → flag off and clear customer messaging. P2: cosmetic or noncritical editorial errors → scheduled fix.

## Recovery
Daily encrypted backup and periodic tested restore. Payment reconciliation job with safe idempotency, queued email retries, manual moderation fallback. Document incidents and learnings; avoid claiming published uptime SLA until measured and contracted.
