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

## Observability
- `request_id`, user pseudonymous id, role/scope, route name, status, latency; do not log phone, email, lead free text or auth secrets.
- Sentry errors with scrubbing; trace key flows (search, checkout, lead send) and external provider response time.
- Business counter alert for failed payment reconciliation, queue DLQ, unusual listing approvals, provider outage, elevated error rate.
- Feature flags disable finance partner sends, payment intake, charger live-status and article publishing independently.

## Incident levels
P0: data leak, unauthorized access, incorrect charge/capture, widespread loss of access → immediate containment and counsel/partner escalation. P1: checkout down, seller enquiry not delivered, bad published public data → flag off and clear customer messaging. P2: cosmetic or noncritical editorial errors → scheduled fix.

## Recovery
Daily encrypted backup and periodic tested restore. Payment reconciliation job with safe idempotency, queued email retries, manual moderation fallback. Document incidents and learnings; avoid claiming published uptime SLA until measured and contracted.
