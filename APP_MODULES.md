# EVONE — Application Modules, Pages and Ownership

## Primary customer application
| Module | Core routes | Data owner | Core user action |
|---|---|---|---|
| Used EV marketplace | `/used-evs`, `/used-evs/[slug]`, `/sell` | marketplace/dealers | search, contact, list vehicle |
| EV model research | `/evs`, `/evs/...`, `/compare` | catalogue | compare verified specs |
| Accessories | `/accessories`, `/cart`, `/checkout` | commerce | purchase compatible product |
| Savings calculator | `/calculator` | calculator | compute transparent estimate |
| Charging locator | `/charging` | charging | navigate to charger |
| News/reviews | `/news`, `/reviews` | editorial | research/learn |
| Loans & insurance | `/finance`, `/finance/loan`, `/finance/insurance` | finance | optional partner enquiry |
| Account | `/account` | identity + module projections | manage listings, orders and preferences |

## Back office
- `/dealer`: tenant-scoped inventory, enquiries, team and dealer profile.
- `/admin`: moderation, seller verification, catalogue, products/orders/refunds, editorial, partner queue, customer support, audit.

## Cross-cutting services
Authentication/authorization, privacy/consent, source/provenance, search, notification queue, payment reconciliation, storage/images, logging/observability, SEO and analytics. Each module has its own API routes and tests; the same underlying model/variant IDs link all relevant modules.

## Backend owners
`identity`, `catalogue`, `marketplace`, `dealers`, `commerce`, `calculator`, `charging`, `editorial`, `finance`, `notifications`, `admin`. The API gateway boundary is NestJS—not a collection of separate standalone backend apps.

## MVP flow vs later feature
- For used EVs, no `vehicle order`, no platform collection of sale price, no escrow; a buyer sends an enquiry to a seller.
- For accessories, order/payment/fulfillment is real and first-party.
- For finance/insurance, an approved partner may contact an opted-in user; EVONE does not promise approval.
- For battery passport/live charging/owner garage, provide a future design placeholder only if clearly labelled and disabled until evidence/partners exist.
