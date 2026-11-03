# EVONE — REST API Contract (v1 planning specification)

**Base:** `/api/v1` · JSON over HTTPS · OpenAPI 3.1 generated from shared validation contracts · responses use UTC ISO-8601 timestamps, IDs UUID, amounts integer paise. This document is the **endpoint design**, not a claim that endpoints are implemented.

## Shared conventions
- Public GET endpoints do not require authentication unless personalization requested.
- Auth: managed identity provider access JWT verified by API (JWKS, issuer, audience); scopes/roles checked on every write.
- Requests validated with Zod schemas; unknown fields rejected for sensitive mutations.
- Pagination `?limit=20&cursor=...` with max limit 50; stable sort by `(createdAt,id)` or relevance.
- Mutating payment/order endpoints require `Idempotency-Key` UUID; retry-safe.
- `X-Request-ID` returned for troubleshooting; API logs redact PII.
- `429` includes `Retry-After`; `401` unauthenticated, `403` forbidden, `404` not found/visibility safe, `409` version conflict, `422` domain validation.

### Response envelopes
```json
{
  "data": {"id": "uuid", "status": "PUBLISHED"},
  "meta": {"requestId": "uuid"}
}
```
```json
{
  "data": [{"id": "uuid", "title": "sample"}],
  "page": {"nextCursor": null, "hasMore": false},
  "meta": {"requestId": "uuid"}
}
```
```json
{
  "error": {"code": "VALIDATION_ERROR", "message": "Check the highlighted fields", "fields": {"pricePaise": "Must be positive"}},
  "meta": {"requestId": "uuid"}
}
```

## Identity and account
| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/me` | user | role/profile/permissions |
| PATCH | `/me/profile` | user | change display data |
| GET | `/me/consents` | user | consent history |
| POST | `/me/consents` | user/guest | purpose-specific consent grant |
| POST | `/me/consents/{id}/withdraw` | user | withdraw future use where possible |
| POST | `/me/delete-request` | user | privacy deletion request |

## Catalogue and comparison
| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/brands` | public | brands/vehicle type filters |
| GET | `/models?brandId=&vehicleType=` | public | published models |
| GET | `/brands/{brandSlug}/models/{modelSlug}` | public | model with variants (model slugs are unique per brand; replaces the ambiguous `/models/{slug}`) |
| GET | `/variants/{id}` | public | canonical spec + data provenance |
| GET | `/compare?variantIds=id1,id2` | public | compare 2–3 variants |
| GET | `/model-prices?variantId=&regionCode=` | public | latest sourced price/date |
| POST/PATCH | `/admin/catalogue/models` | editor/admin | publish/maintain model |

**Implemented (EV-023):** `GET /brands`, `GET /models`, `GET /brands/{brandSlug}/models/{modelSlug}` and `GET /variants/{id}`. `/compare` is EV-026, and `/model-prices` waits for the prices table.
- **Published only.** Brand, model and variant must all be `PUBLISHED`. Anything else returns 404, the same as missing. `is_demo` rows are excluded when `NODE_ENV=production` and flagged `isDemo` elsewhere.
- **`/brands`** lists only published brands that have at least one published model. It is not paginated: brands are a small, bounded set.
- **`/models`** is ordered by `(name, id)`, not `(createdAt, id)`. Postgres timestamps keep microseconds that a JavaScript `Date` drops, so a timestamp cursor can skip or repeat rows; text and UUID compare exactly. `nextCursor` is opaque.
- **Specs:** `null` means unknown. `claimedRange` is always `{ km, standard }` or `null`. `sources` lists only reviewed sources and never exposes reviewer identity.
- **Errors:** invalid query or path values, unknown parameters and tampered cursors return 400 `VALIDATION_ERROR` with per-field `fields`.

## Used EV marketplace
| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/listings?type=&brand=&minPrice=&maxPrice=&city=&cursor=` | public | filtered public listings |
| GET | `/listings/{idOrSlug}` | public/owner | published detail; draft owner-only |
| POST | `/listings` | user/dealer | create draft listing |
| PATCH | `/listings/{id}` | listing owner or allowed dealer staff | edit draft / version check |
| POST | `/listings/{id}/submit` | owner | submit for moderation |
| POST | `/listings/{id}/archive` | owner | remove from public results |
| POST | `/listings/{id}/mark-sold` | owner | mark sold (self-reported) |
| POST | `/media/presign` | authenticated | upload limited file with safe key |
| POST | `/listings/{id}/media` | owner | attach scanned media |
| POST | `/listings/{id}/enquiries` | user | private enquiry with consent |
| GET | `/me/enquiries` | buyer | own enquiries |
| GET | `/seller/enquiries` | seller/dealer | leads received |
| GET/POST/DELETE | `/me/favourites` | user | saved listings |
| GET | `/dealers/{id}` | public | approved dealer profile |

### Example create listing
```json
{
  "variantId": "uuid",
  "year": 2023,
  "odometerKm": 18000,
  "city": "Dharwad",
  "askingPricePaise": 145000000,
  "conditionNotes": "Service record available",
  "ownershipCount": 1
}
```
Server returns `DRAFT`, not `PUBLISHED`. Submit and moderation are separate actions.

## Admin and dealer operations
| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/admin/listings?status=PENDING_REVIEW` | moderator | review queue |
| POST | `/admin/listings/{id}/approve` | moderator | publish + audit |
| POST | `/admin/listings/{id}/reject` | moderator | reason required |
| POST | `/admin/verifications/{id}/approve` | authorized verifier | approve evidence |
| GET | `/dealer/me/inventory` | dealer staff | scoped dealer inventory |
| GET | `/dealer/me/enquiries` | dealer staff | scoped lead inbox |
| GET | `/admin/audit` | admin | audited restricted access |

## Accessories / checkout
| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/products?category=&variantId=&cursor=` | public | active products |
| GET | `/products/{slug}` | public | product/compatibility |
| GET | `/cart` | user/session | current cart |
| PUT | `/cart/items/{productId}` | user/session | set quantity |
| DELETE | `/cart/items/{productId}` | user/session | remove item |
| POST | `/checkout/quote` | user/session | price/tax/shipping server quote |
| POST | `/checkout/orders` | user | create immutable pending order |
| POST | `/checkout/payments` | user | provider order for valid order |
| POST | `/webhooks/razorpay` | verified provider | signature-checked event processing |
| GET | `/orders` | user | own orders |
| GET | `/orders/{id}` | order owner/admin | order details |
| POST | `/orders/{id}/cancel-request` | owner | request cancellation |
| POST | `/admin/orders/{id}/refund` | authorized ops | approved refund request |

## Calculators
| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/calculators/ev-savings` | public | deterministic estimate (pure service) |
| POST | `/calculators/emi` | public | deterministic EMI with assumption disclosure |

### Savings request / response
```json
{
  "monthlyKm": 1000,
  "fuelPriceInrPerLitre": 100,
  "iceKmPerLitre": 15,
  "evKwhPerKm": 0.15,
  "electricityInrPerKwh": 8,
  "purchasePriceDeltaPaise": 20000000
}
```
```json
{
  "data": {
    "iceMonthlyCostPaise": 666667,
    "evMonthlyCostPaise": 120000,
    "monthlyEnergySavingsPaise": 546667,
    "annualEnergySavingsPaise": 6560000,
    "estimatedPaybackMonths": 37,
    "exclusions": ["maintenance", "depreciation", "charging losses", "finance"]
  }
}
```
`annualEnergySavingsPaise` rounds from exact internal arithmetic, not multiplied from already-rounded monthly display where possible; example is illustrative. The implementation must define and test rounding precision; annual savings must be calculated from unrounded monthly arithmetic and rounded once.

## Charging
| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/charging/stations?lat=&lng=&radiusKm=&connector=&acDc=` | public | authorized provider data normalized |
| GET | `/charging/stations/{sourceId}` | public | details and freshness |
| POST | `/charging/reports` | user/guest throttled | report bad station info |

Never silently translate null `availableCount` to 0 or status `AVAILABLE`.

## Articles, finance, communications
| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/articles?category=&cursor=` | public | published article list |
| GET | `/articles/{slug}` | public | published article detail |
| POST | `/admin/articles` | editor | create draft |
| POST | `/admin/articles/{id}/publish` | editor/admin | publish with provenance |
| POST | `/finance/leads/loan` | user/guest | consented loan lead |
| POST | `/finance/leads/insurance` | user/guest | consented insurance lead |
| GET | `/me/finance-leads` | user | own lead status |
| GET | `/admin/finance-leads` | authorized ops | restricted queue |
| POST | `/admin/finance-leads/{id}/route` | authorized ops | approved partner dispatch |
| GET | `/notifications` | user | status updates |

## Example lead data contract
```json
{
  "kind": "LOAN",
  "vehicleVariantId": "uuid",
  "contact": {"name": "Example User", "phoneE164": "+919999999999"},
  "consent": {"purpose": "Share my enquiry with Partner A for contact about EV financing", "partnerId": "partner-uuid", "privacyVersion": "v1"}
}
```
Legal review must approve fields/text. Do not collect PAN, Aadhaar or bank records in an MVP referral form.

## Security and acceptance notes
- Public browse endpoints return only published, visible resources; unpublished id access responds 404 for non-owner.
- A user cannot enumerate another user's leads, orders or listing drafts.
- Rate limit listing creation, enquiries, reviews, finance leads and auth callbacks.
- Admin activity is traceable; webhook routes never trust session/browser state.
- Partner integrations store encrypted credentials and verify response signatures/ACKs.

## OpenAPI generation
`packages/contracts` contains Zod schemas and shared enums. API code validates the same schemas; CI generates `openapi.json` and typed `packages/sdk` client. Breaking changes require API versioning and contract tests.

**Implemented (EV-018).** Health endpoints since EV-018; catalogue reads since EV-023 (see above).

To add or change an endpoint:
1. Define or extend strict Zod schemas in `packages/contracts/src` (`z.strictObject`, so undocumented fields fail). Register every exposed schema with `component(id, schema)` or `dataEnvelope(id, data)`.
2. Add the route to `routes` in `packages/contracts/src/routes.ts`, with every status code it returns.
3. Implement it in `apps/api`, typing responses with the contract types.
4. Run `pnpm build && pnpm contract:generate` and commit the regenerated `packages/contracts/openapi.json` and `packages/sdk/src/schema.ts`.

CI enforces all of this:
- `pnpm contract:check` fails if the generated files are stale.
- `apps/api/test/contract.integration.test.ts` (against PostgreSQL) fails if the API serves a route the registry lacks, lacks a route the registry lists, has no request for a documented status, or returns a body that does not parse with its schema.
- The API end-to-end tests call the built server through `@evone/sdk`.

Clients use `createEvoneClient({ origin })` from `@evone/sdk`. Types are compile-time only; responses are not re-validated at runtime.
