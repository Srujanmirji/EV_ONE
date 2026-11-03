# EVONE — Product Requirements Document (PRD)

**Owner:** Founder/Product · **Version:** 1.0 · **Status:** proposed for build · **Last updated:** 2026-11-03

## 1. Problem
Indian EV buyers and owners must switch between fragmented classified sites, OEM websites, accessory shops, charging maps, news content, and financing contacts. Used EV buyers face particular uncertainty around model/variant specs, battery history, seller trust and pricing. EVONE combines discovery and ownership information around a **single canonical EV model/variant catalogue**.

## 2. Outcome, not just features
**North-star pilot outcome:** qualified buyer–seller connections for verified/quality used EV listings per week, alongside useful EV research and accessory orders. Primary goal: demonstrate trustworthy supply and high-intent demand in a limited geography before national expansion. Metrics definitions: [`01_Product/04_metrics_experiments.md`](01_Product/04_metrics_experiments.md).

## 3. Target audience
- **Used EV buyer:** wants search, transparent condition details, credible seller, and enquiry.
- **Individual seller:** wants quick listing, trustworthy leads and control over public contact details.
- **Dealer/dealer staff:** wants inventory management, enquiries and measurable lead quality.
- **EV researcher/new EV shopper:** wants model/variant specs and comparisons.
- **EV owner:** wants compatible accessories, savings calculations, station lookup and ownership information.
- **Content editor/moderator/admin:** publishes accurate model data, reviews listings and handles complaints.
- **Approved lender/insurance partner:** receives only expressly consented lead data through controlled channels.

## 4. Primary journey / prioritization
1. Visitor lands on premium homepage → chooses Buy Used EV.
2. Filters vehicle listings → opens details with gallery, price, specs, seller identity level.
3. Saves or enquires; consent-gated contact sharing; seller/dealer notified.
4. Seller creates a draft → adds vehicle data/photos → submits for moderation → approved listing becomes public.
5. Other homepage modules remain discoverable as supporting research/commerce tools, **not seven oversized competing hero blocks**.

## 5. Priorities
**P0/MVP:** UX foundations; roles/auth; vehicle catalogue + specs/variant; used EV listings + search; listing creation, image upload, moderation; enquiries + notifications; accessories catalogue + cart/checkout/orders; savings calculator; charging list/map with explicit source/staleness; editorial news; EMI estimator and partner lead forms gated by consent; admin console; legal/content/ops readiness; responsive QA.

**P1/after pilot:** dealer bulk upload, paid featured listings, actual independent battery inspection partner reports, production operator charger live feeds, customer owner reviews, richer CMS workflows, dealer subscriptions, assisted title transfer.

**P2:** Expo mobile app, dynamic TCO engine, ownership garage, service/installer referrals, additional partners, multi-vendor accessory payouts if justified.

## 6. Requirements by domain (IDs used in TASKS and QA)
### CORE: platform and identity
- **CORE-01:** accessible public site, persistent search context, search-engine-indexable catalog/listings/articles with structured metadata.
- **CORE-02:** managed sign-in, verified contact, user profile, privacy choices and account deletion request.
- **CORE-03:** server-enforced permissions across user, dealer staff, editor, moderator and admin roles.
- **CORE-04:** audit trail for changes to public listings, verification, pricing, partner leads and admin actions.

### MARKET: used marketplace
- **MKT-01:** filterable listings by type, make, model, price, year, kilometres, city, seller type and status; shareable URL filters.
- **MKT-02:** vehicle details with image gallery, condition, ownership summary, canonical specs, claimed vs measured data distinctions, price, and timestamp.
- **MKT-03:** create/edit draft listing, upload photos to controlled storage, preview, submit for review.
- **MKT-04:** moderation states `DRAFT → PENDING_REVIEW → PUBLISHED / REJECTED`; owners can archive; audit changes.
- **MKT-05:** enquiry with anti-spam/rate limiting, buyer privacy consent, seller notifications and traceable status.
- **MKT-06:** seller/dealer badge types are separate: self-reported owner, **identity verified**, **dealer verified**, **battery inspected**; inspection label requires actual signed evidence.
- **MKT-07:** no on-platform used-vehicle purchase/escrow in MVP.

### CATALOGUE: research / new EVs
- **CAT-01:** brand → model → variant hierarchy with spec provenance, revision history and published status.
- **CAT-02:** detail pages show battery kWh, claimed test range, motor output, AC/DC charge specs when available, warranty and price provenance/date.
- **CAT-03:** compare up to three compatible vehicle variants side by side; unknown specs display em dash.
- **CAT-04:** upcoming vs available status never presented as fact without verified date/source.

### COMMERCE: accessories
- **COM-01:** admin-curated products/categories/images/compatibility with stock and fulfilment constraints.
- **COM-02:** cart, address, shipping estimate, Razorpay checkout, successful server-verified webhooks, order status and emails.
- **COM-03:** pricing and stock revalidated on server before order creation; idempotent payment webhook processing.
- **COM-04:** returns/cancellations/support policies visible; no marketplace settlement in MVP.

### SAVINGS
- **SAV-01:** inputs monthly km, ICE mileage (km/L), fuel ₹/L, EV energy efficiency (kWh/km or kWh/100km), home/public tariff mix; use consistent units.
- **SAV-02:** show fuel/energy cost per month/year, savings and optional break-even with purchase price delta and disclaimers.
- **SAV-03:** no assumed maintenance, depreciation, charging loss or financing bundled into 'total savings' unless itemized.

### CHARGING
- **CHG-01:** search stations near city/coordinates using licensed source; map/list toggle.
- **CHG-02:** filters connector, AC/DC, kW, source/last-updated where known.
- **CHG-03:** status tri-state `available / unavailable / unknown`; only show available if provider supplied timely availability.
- **CHG-04:** map data attribution and storage/display policy respected; report incorrect station information.

### CONTENT
- **NEWS-01:** editor-managed published articles, categories, dates, authors, source citations and SEO.
- **NEWS-02:** editorial/news vs opinion/review labeling; no fabricated owner reviews.

### FINANCE LEADS
- **FIN-01:** illustrative EMI estimator with principal, annual rate, term and formula explanation.
- **FIN-02:** loan and insurance enquiry forms separate, explicit optional consent to contact/share with named partners.
- **FIN-03:** partner lead delivery is controlled, encrypted, logged, retryable; no promise of eligibility/approval/rate.
- **FIN-04:** go-live conditional on legal/partner review of applicable RBI/IRDAI obligations.

### OPS / performance
- **OPS-01:** admin listing review, catalogue management, accessory inventory, article publishing, partner leads, support and audit log.
- **OPS-02:** Core Web Vitals reviewed, accessible keyboard/mobile UX, good SEO, image optimization.
- **OPS-03:** errors, payment failures and stale data observable; backups and rollback rehearsed before launch.

## 7. Sample acceptance criteria
- **MKT-01:** Given a filter URL, direct navigation and browser back reproduce the same filters/results; empty state has clear reset.
- **MKT-03:** Only listing owner may edit a draft; private photos cannot be read through unsecured URLs; invalid image types rejected.
- **MKT-06:** A listing without independent inspection record never displays “Battery Inspected.” A verified badge needs an approved, unexpired verification record.
- **COM-02:** Client-side 'payment successful' alone never changes order to paid; verified signature and expected amount/currency required.
- **SAV-02:** Example 1,000 km/month, 15 km/L, ₹100/L, 0.15 kWh/km, ₹8/kWh: ICE ₹6,666.67, EV ₹1,200, savings ₹5,466.67/month before other costs. Test rounding.
- **CHG-03:** Missing/old availability displays “Status unavailable” (not a green available badge).
- **FIN-02:** No partner delivery without auditable explicit, purpose-bound consent; consent withdrawal stops future sharing where applicable.

## 8. Homepage constraints
1. Cinematic EV hero + ONE primary search action.
2. Seven small ecosystem navigation shortcuts (not seven competing full sections at top).
3. Featured used EVs (dominant commercial section).
4. New EV research feature.
5. Savings single compact promotion.
6. Accessories preview.
7. Charging preview.
8. News preview.
9. Loan/insurance compact CTA.
10. One final CTA and footer. Generous whitespace and strong hierarchy.

## 9. Risks and dependencies
Inventory liquidity, verified condition claims, charging data licensing, dealer supply, payment fulfillment, spam/fraud, research accuracy, finance/insurance regulatory obligations, SEO, privacy and platform costs. Owners/actions: [`06_Reference/02_decision_register.md`](06_Reference/02_decision_register.md).

## 10. Release gates
No launch without real inventory provenance, seller-contact/privacy choices, visible legal terms, functional admin moderation, payment reconciliation, data licensing, rate limiting, secure document access, backup restore test, production telemetry and mobile QA.

## 11. Non-goals / explicit exclusions
Direct EV vehicle payment/escrow, guarantees of battery health without measurement, OEM integration guarantees, direct loan underwriting/insurance sale, real-time charger status without partner feeds, multi-seller accessory settlement, native mobile app at day-one MVP, AI auto-valuation without validated data.

## 12. Related documents
[`TASKS.md`](TASKS.md) · [`UI_UX.md`](UI_UX.md) · [`SYSTEM_DESIGN.md`](SYSTEM_DESIGN.md) · [`01_Product/02_personas_roles.md`](01_Product/02_personas_roles.md) · [`04_Delivery/02_test_plan.md`](04_Delivery/02_test_plan.md)
