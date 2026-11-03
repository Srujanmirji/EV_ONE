# Auth, Security, Privacy and India Compliance Review

> This is an engineering checklist, **not legal advice**. India privacy, consumer, lending, insurance and intermediary obligations need counsel and partner review before public monetization.

## Authentication decision
Baseline: managed identity provider (candidate: Clerk) with web authentication and secure access tokens. Next.js uses secure cookies/session patterns; API verifies JWT `issuer`, `audience`, `signature`, `exp` via provider JWKS. Expo later uses secure platform credential storage, token refresh/rotation. Do **not** store access tokens in browser localStorage. Review auth provider commercial/legal terms and region requirements.

## Server-side authorization
`USER`, `DEALER_STAFF`, `DEALER_OWNER`, `EDITOR`, `MODERATOR`, `ADMIN` roles plus resource-scoped permissions. Protect every read/write path, files, events and background worker. Negative test another user's drafts, orders, phone, leads and dealer inventory. Admin 'impersonation' disallowed by default; support break-glass only with audit and approval.

## Threat model / mitigations
| Threat | Mitigation |
|---|---|
| Fake dealer / phishing | manual approval, evidence-scoped badges, reporting, rate limits |
| Scam listings | review + duplication heuristics + takedown + complaints |
| OTP abuse / credential stuffing | managed auth throttles, device anomaly, CAPTCHA by risk |
| Mass contact scraping | signed-in contact gate, anti-automation, rate limits, audit |
| Image/doc leak | private buckets for sensitive evidence, short-lived signed URL, RBAC |
| XSS in content | sanitized rich text, CSP, avoid unsafe HTML, editorial workflow |
| CSRF | SameSite cookies + anti-CSRF on cookie-auth state mutations |
| SSRF via media URLs | no arbitrary remote URL fetch; strict allow-list proxy if needed |
| Payment spoof/replay | server-side signature checks, idempotency, reconciliation |
| Loan lead leak | data minimization, restricted staff/partner access, encryption, TTL |
| Maps overbilling | API quotas, key restrictions, budgets, request caching per terms |
| Secrets/log PII | secret manager, key rotation, redacted structured logging |

## Privacy by design
- Separate necessary account/contact data, marketing consent, and **purpose-specific partner lead consent**.
- Show privacy notice near action, name partner(s), record version/time and partner purpose; do not default checked.
- Minimal data for finance (name, phone, requested contact and vehicle) and accessory fulfillment (delivery details). No PAN, Aadhaar, bank statements in MVP lead form.
- Support access, correction and deletion request pathway; retention matrix, backups deletion horizon and legal hold policy to be approved.
- Mask phone/email unless permitted; never share user saved searches with dealers by default.
- No high-resolution location in analytics; location use with purpose and permission.

## India legal/regulatory review (must verify current scope)
1. **DPDP Act/Rules:** review current provisions, notice/consent, data principal rights, breach response and staged commencement. Official MEITY rules/timeline: https://www.meity.gov.in/documents/act-and-policies/digital-personal-data-protection-rules-2025-gDOxUjMtQWa?pageTitle=Digital-Personal-Data-Protection-Rules-2025%3B
2. **RBI Digital Lending Directions, 2025:** if partnering with regulated lender as LSP/DLA or offering digital lending intermediation, obligations can be substantial; review exact role with partner/legal. Direction PDF: https://www.fidcindia.org.in/wp-content/uploads/2025/05/RBI-DIGITAL-LENDING-DIRECTIONS-08-05-25.pdf (RBI-issued text mirrored).
3. **IRDAI web aggregators:** comparing/soliciting insurance or receiving insurance lead compensation may trigger authorization and conduct conditions. Official government resource: https://financialservices.gov.in/insurance-act-1938-and-insurance-regulatory-and-development-authority-act-1999
4. **E-commerce/consumer:** legal counsel to approve seller classification, merchant-of-record, return/refund/cancellation, grievance contact, pricing/taxes and consumer disclosure.
5. **Used vehicle sales:** platform provides introductions; ownership transfer, encumbrance checks, insurance and taxes are external responsibilities. Guidance content must not be falsely presented as legally completed transfer.
6. **Images/content:** license OEM photos, user listing photos and journal content; respect attribution.
7. **CPO/map provider:** display/attribution/cache rights; no unlicensed dataset aggregation.

## Go-live compliance gate
Signed owner checklist: privacy notice, terms, consent texts, partner agreements, business registration/tax needs, customer support/grievance process, R2 regional/storage rules as required by actual role, documented breach/incident response. A checkbox in UI alone does not equal compliant service.

## Security release checklist
`[ ]` threat model reviewed · `[ ]` auth/RBAC negative tests · `[ ]` API rate limits · `[ ]` upload safety · `[ ]` secret rotation · `[ ]` CSRF/CSP · `[ ]` webhook signature/replay tests · `[ ]` PII redaction · `[ ]` backups restored · `[ ]` pen-test findings addressed · `[ ]` legal approvals.
