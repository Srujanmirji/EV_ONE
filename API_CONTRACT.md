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

#### Implemented local authentication boundary (EV-016, in progress)

`GET /auth/session` returns `{ data: { authenticated: true }, meta: { requestId } }` only after a valid Clerk bearer token in the approved local mode. It does not expose the subject, profile, claims, roles or permissions. Missing/disabled/invalid authentication returns 401 `UNAUTHENTICATED`, `WWW-Authenticate: Bearer` and the normal envelope. Both success and failure use `Cache-Control: no-store`.

OpenAPI declares an HTTP bearer/JWT security scheme for this route only; public catalogue, health and savings endpoints retain public access. Cookies/query parameters do not authenticate API requests; duplicate Authorization headers are rejected. The guard attaches only a frozen, verified subject/issuer actor to the server request for future resource authorization. No role is derived from caller claims.

`AUTH_MODE` defaults to `disabled`. The sole enabled mode, `clerk-local`, requires development/test, a loopback API bind, a development Clerk issuer, exact audience/authorized party and a pinned RSA-2048 public key. Production configuration rejects this mode before listening. Key rotation is manual in this local stage; no immediate revocation promise or production JWKS flow is implemented. The protected status endpoint is not the future `/me` profile route. EV-005/EV-016 remain in progress; EV-017 owns scoped authorization.

## Response envelopes
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
| GET | `/compare?variantIds=id1,id2` | public | compare 2–3 variants (implemented EV-026: distinct ids, requested order, 404 if any is unpublished) |
| GET | `/model-prices?variantId=&regionCode=` | public | latest sourced price/date |
| POST/PATCH | `/admin/catalogue/models` | editor/admin | publish/maintain model |

**Implemented (EV-023, EV-026):** `GET /brands`, `GET /models`, `GET /brands/{brandSlug}/models/{modelSlug}`, `GET /variants/{id}` and `GET /compare`. `/model-prices` waits for the prices table.
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
    "iceAnnualCostPaise": 8000000,
    "evAnnualCostPaise": 1440000,
    "monthlyEnergySavingsPaise": 546667,
    "annualEnergySavingsPaise": 6560000,
    "estimatedPaybackMonths": 37,
    "exclusions": ["maintenance", "depreciation", "charging losses", "finance"]
  }
}
```
**Implemented EV-048:** `POST /calculators/ev-savings` is public and stateless. It returns 200 in the normal `{ data, meta }` envelope, or 400 `VALIDATION_ERROR` with field errors. No auth, persistence, vehicle data or provider prices are needed. Request JSON is strict; numeric strings and unknown fields are rejected.

Validation: `monthlyKm` 0–20,000; fuel ₹/L 1–500; ICE km/L 1–100; EV kWh/km 0.01–1; electricity ₹/kWh 0–100. Each supports at most six decimal places. Optional `purchasePriceDeltaPaise` is an integer from −1,000,000,000 to 1,000,000,000 (EV price minus ICE price). Bounds are estimate-input safeguards, not observed market prices. The electricity input is the user's blended tariff; tariff mixing/charging-loss inputs are not accepted by this endpoint.

Arithmetic uses exact integer fractions from validated decimal inputs. Each money result is independently rounded once to nearest integer paise, with half-paise rounded away from zero. Annual costs/savings multiply exact monthly values by 12 before rounding, never rounded monthly displays. Consequently, separately rounded cost differences may differ from rounded exact savings by a paise.

Simple payback uses unrounded positive monthly energy savings and ceiling to whole months. Zero premium returns 0 (no extra purchase cost to recover, not a promise of savings); negative or absent premium, nonpositive savings for a positive premium, or an unrepresentable month count returns `null`. Negative premiums mean the EV is cheaper up front. A payback above `Number.MAX_SAFE_INTEGER` months is unrepresentable, not capped. Maintenance, depreciation, charging losses and finance remain excluded. All examples are illustrative; no saving is guaranteed.


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


## Implemented local authorization probe (EV-017, in progress)

`GET /auth/access/{scope}/{scopeId}` requires the existing local Clerk bearer guard followed by app-owned authorization. `scope` is `account` or `dealer`; `scopeId` is a UUID, normalized to canonical lowercase for comparisons. Successful responses contain only `{ data: { authorized: true }, meta: { requestId } }`, without identity/grants/audit data.

| Condition | Result |
|---|---|
| Missing/invalid token or disabled auth | 401 UNAUTHENTICATED |
| Invalid scope/UUID | 400 VALIDATION_ERROR after authentication, no decision audit |
| Unknown/suspended user, absent/revoked/expired grant, cross-account/dealer scope | 403 FORBIDDEN, generic “Access denied”, committed denial audit |
| Exact authorized scope | 200, committed allow audit |
| DB/audit failure | Generic 500; no allow response |

All outcomes inherit no-store from the authentication guard. Token roles, organization IDs and metadata never grant permissions. USER/ADMIN global grants authorize the actor's own account scope only; dealer roles require their exact database scope. These are scope-read probes, not permission to mutate arbitrary business resources. Future domain policies must resolve ownership from their own stored resources and audit actual mutations atomically.

Production auth remains disabled under the approved local-only exception. No profile provisioning, role-management endpoint, dealer approval process or production rollout is implied. Live acceptance remains pending; native PostgreSQL integration passed in PR #14 CI.

## Implemented private media (EV-020, local only, in progress)

All routes are below `/api/v1`, bearer-only and no-store. Media defaults disabled; enabling requires a development/test loopback API and local Clerk configuration. An app-owned ACTIVE user with an active, unexpired GLOBAL USER or ADMIN grant can operate only its own media. ADMIN has no cross-owner bypass; dealer grants alone do not authorize personal media. Input never accepts filenames, object keys, owner IDs or remote URLs.

| Route | Request | 200 data |
|---|---|---|
| POST `/media/presign` | `{ contentType, sizeBytes }`, JPEG/PNG/WebP, 1–5242880 bytes | `{ id, uploadUrl, expiresAt, headers: { "Content-Type" } }` |
| POST `/media/{id}/complete` | `{}` after uploading bytes | `{ id, status: "READY" }` |
| GET `/media/{id}/read-url` | No body | `{ readUrl, expiresInSeconds: 60 }` |

Upload the exact declared bytes with the supplied Content-Type before the five-minute expiry. Content-Length and Content-Type are SigV4 signed; a browser supplies Content-Length itself. Real R2 enforcement and browser CORS await a bucket. URLs are bearer capabilities: do not log/cache/share them. Original objects are quarantine-only and never served through the read route. Completion checks actual length/type, image magic, bounded decoding (16 million pixels), non-animation, re-encodes to WebP at most 1200×1200 and strips metadata. This is not a malware-scanner claim. Reads sign only the committed sanitized object; retries of READY completion do not process a replacement original.

Responses: 400 validation/invalid image/expired or unready asset; 401 authentication; 403 unknown/suspended actor or missing grant; 404 missing/cross-owner resource (same result); 503 disabled mode, storage or DB/audit failure. DB/audit failures release no capability URL. Validation failures before policy evaluation produce no decision audit. Existing signed read URLs remain usable for up to 60 seconds after revocation; upload URLs may recreate private quarantine objects until expiry. Bucket lifecycle cleanup and public-access controls require live acceptance.
