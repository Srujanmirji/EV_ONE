# QA / Testing Plan — Unit, API, E2E, Security, Performance

## Test hierarchy
- **Unit (Vitest/Jest):** pure calculators, state transitions, validators, permission policy, pricing, inventory math.
- **Integration (NestJS + test Postgres/Redis):** repositories, API authorization, transaction boundaries, queues, idempotent webhooks.
- **Contract (OpenAPI / SDK):** no response schema drift; all P0 endpoint examples validate.
- **E2E (Playwright):** full user journeys at desktop and mobile widths, staging partner sandbox.
- **Manual:** accessibility, Android/iOS web browsers, real slow network, provider failures, UI accuracy against reference.

## P0 acceptance test matrix
| Test ID | Requirement | Test scenario | Expected |
|---|---|---|---|
| QA-001 | CORE-02 | expired/malformed JWT | 401, no private response |
| QA-002 | CORE-03 | Dealer A requests Dealer B lead | 403/404, audit entry |
| QA-003 | MKT-01 | filter then share URL/reload | results/filters preserved |
| QA-004 | MKT-02 | unpublished listing accessed by stranger | 404 |
| QA-005 | MKT-03 | wrong owner media upload | rejected, no object attach |
| QA-006 | MKT-04 | reject listing with reason | seller can revise, reason logged |
| QA-007 | MKT-06 | missing inspection evidence | no battery badge displayed |
| QA-008 | MKT-05 | 50 automated enquiries | throttled, no seller spam flood |
| QA-009 | CAT-02 | unverified range source | explicitly unknown/not published |
| QA-010 | CAT-03 | compare 2 variants w/missing kW | no crash, `—` shown |
| QA-011 | COM-03 | stock runs out during cart | checkout blocks gracefully |
| QA-012 | COM-02 | fake client success callback | order stays pending |
| QA-013 | COM-02 | duplicate valid webhook | one payment/order fulfilment |
| QA-014 | COM-02 | signature wrong | 4xx; no paid state |
| QA-015 | COM-02 | payment pending then webhook delayed | user sees confirming state; reconciled |
| QA-016 | SAV-02 | example 1000km/15kmL/₹100/0.15kWhkm/₹8 | ~₹5,466.67 monthly energy savings |
| QA-017 | SAV-03 | electricity more costly | negative savings presented honestly |
| QA-018 | CHG-03 | missing/stale available count | status unknown, never green |
| QA-019 | CHG-04 | provider denies API | map/list error/retry, attribution preserved |
| QA-020 | FIN-02 | unchecked lead consent | no partner delivery, clear prompt |
| QA-021 | FIN-03 | withdrawn consent before worker runs | job not sent |
| QA-022 | FIN-03 | partner API offline | retry/DLQ, PII not logged |
| QA-023 | NEWS-01 | editor unpublishes article | public no longer resolves |
| QA-024 | OPS-02 | keyboard full journey | all controls usable/focus visible |
| QA-025 | OPS-03 | DB backup restore in staging | service recovers with reconciled records |

## Mobile/browser matrix
- 360px/390px iOS Safari and Chrome Android; 768px tablet; 1280px and 1440px desktop Chrome/Firefox/Safari (available coverage).
- Low-end laptop, slow 3G/4G throttling; reduced motion; denied location; one-handed controls; keyboard open on sell wizard and lead forms.

## Performance targets (proposed)
Set budgets by real pilot metrics: hero LCP target <2.5s at chosen test profile, CLS <0.1, INP <200ms where feasible; listing API p95 target ≤400ms under representative load, vendor calls excluded/isolated. Record real measurements per environment and release; never claim before testing.

## Security tests
OWASP API risks: BOLA, excessive data exposure, mass assignment, broken auth, SSRF, insecure direct object references, rate-limit bypass; cookie CSRF, XSS from news, upload malware, session rotation, partner export permissions.

## Release exit
All P0 test IDs pass; no high-severity vulnerabilities; relevant third-party sandbox signs off; manual seller and buyer journeys pass; accessibility blockers resolved; incident/rollback ready.
