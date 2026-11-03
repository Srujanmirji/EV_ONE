# Production Launch, Pilot Operations, and Incident Runbook

## T-minus gate checklist
- [ ] UI baseline signed off; no fabricated inventory, ratings, partners or metrics.
- [ ] Agreements on seller listings/photos; domain, support inbox, business contact.
- [ ] Auth vendor/terms configured with correct callback URLs, token issuer/audience.
- [ ] Charging data source/attribution/caching permissions reviewed.
- [ ] Regulated loan/insurance features legally reviewed; disable if not approved.
- [ ] Consent/privacy/terms/refunds/shipping policies approved and reachable.
- [ ] Accessibility/SEO/performance tested; no broken CTAs.
- [ ] Secure upload flow, moderation and fraudulent listing reporting operational.
- [ ] Razorpay production account configured, webhook signature and reconciliation tested.
- [ ] Production DB migrated, indexes verified, backups verified and restore rehearsed.
- [ ] Sentry alert/Slack or email on-call receiver tested; provider quotas and budgets set.
- [ ] Payment pending/refund/support playbook exists.
- [ ] Feature flags can disable payments/finance/leads/charger status independently.

## Release day
1. Check DB backup and deployment tag.
2. Apply safe migration in staged sequence.
3. Deploy backend and worker, smoke `/health` and authenticated routes.
4. Deploy web/admin, validate metadata, assets, robot/sitemap.
5. Run live non-financial smoke: search, listing view, save, create draft, moderation.
6. Controlled low-value live accessory test with refund in authorized business environment; no false test purchases with third parties.
7. Confirm email, outbox and logs redacted; verify role boundaries.
8. Open traffic gradually; watch errors, map spend, payment recon and enquiry spam.

## On-call dashboard
HTTP error rate, API p95, failed auth rate, DB connections, jobs queued/DLQ, payment mismatch count, partner lead sends, charging provider quota/errors, unusual listing reports, support queue.

## Rollback
Disable dangerous integration by feature flag immediately; roll back app deployments to last known-good tag; DB schema backwards-compatible per expand/contract; notify customers for transactional errors and reconcile payment status. Never delete payment evidence to “fix” mismatch.

## Incident response
Capture incident ID, owner, impact, start/end, affected data, mitigation, external notification obligations and postmortem; avoid PII in public status updates. Report suspected privacy breach to designated legal/security lead immediately.

## Pilot rhythm
Daily review seller approval, enquiry response, accessory orders, stuck payments, support and charger reports. Weekly team review funnels, actual supply by region, content quality, data source staleness, partner performance and cost.
