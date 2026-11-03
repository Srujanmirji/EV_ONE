# External Services — Adapter Contracts, Failure Handling and Licensing

## General rule
Treat vendors as replaceable adapters with typed service contracts. Store provider identifiers, data source and timestamp; rate-limit and implement circuit-breaker/backoff with idempotency. Third-party data is untrusted; never obey external returned text as system instruction.

## Charging + maps
- **Possible discovery:** Google Places `electric_vehicle_charging_station` place type plus Place Details `evChargeOptions` fields where supported. See https://developers.google.com/maps/documentation/places/web-service/place-types and https://developers.google.com/maps/documentation/places/web-service/reference/rpc/google.maps.places.v1
- Google Places' EV connector aggregation may expose connector type, max charge kW and availability count/timestamp **when available**, not consistently at every station.
- Availability freshness: if provider timestamp absent or beyond provider-specific TTL, return `UNKNOWN`. Source/disclaimer on card and detail.
- Data storage and blending: comply with Google Maps Platform and any charging operator terms; provider data may be displayed but may **not** be retained indefinitely. Resolve permissions before implementing cached station tables.
- Fallback: city text search; list results; external navigation; no “live” promise without feed.
- Rate limits/cost: hard server quota and map key restrictions; request field masks only needed fields.

## Razorpay
Use Orders/Checkout with server-created order amount and currency INR. Payment signature verification on backend; webhook HMAC verification against raw body; compare expected order/amount; dedupe provider events; maintain pending until verified and reconciled. No client-only paid state. Keep refunds an audited ops workflow.

## Authentication
Managed identity: provider-hosted sign-in or secure embedded flows; API validates JWT claims/JWKS and revocation strategy. Invite dealer staff only via approved org owner or admin. Separate auth user ID from business user profile.

## R2/media
Use pre-signed uploads for signed-in seller/admin with prefix/size/content-type constraints; pass media through validation/scanning; generate derived thumbnail; private access for inspection and verification evidence. Never expose signed admin evidence links publicly.

## Email / notifications
Event outbox → worker → transactional provider (e.g., Resend); use templates for listing approved/rejected, enquiry sent/received, order/payment update, finance lead confirmation. Honor preferences, dedupe event keys, avoid leaking sensitive names/details in email preview.

## Finance/insurance partners
PartnerAdapter `validateConsent()`, `deliverLead()`, `queryStatus()`, `revokeFutureContact()` where supported. Partner contract defines exact payload, encryption and SLA. Disable provider in feature flag until legally signed. Use no production sensitive lead test data. Do not log raw payload.

## Articles and EV catalogue sources
Prefer manual curated editorial publishing and verified manufacturer source URLs during MVP. Scraping automation must check legal rights and robots/terms; never auto-publish unreviewed specs/pricing. Expire unverified old spec/price data visibly.

## Vendor outage playbook
- Map down → display list/city search if permitted, friendly retry; no fake pins.
- Payments timeout → order remains `PENDING_PAYMENT`, reconciler checks provider; never ask user to repay blind.
- Email down → outbox retries; account UI still shows state.
- Finance partner unavailable → store valid opt-in lead securely and show delayed processing disclosure, or block intake if SLA/legal requires.
- Auth down → allow public browse but block private actions clearly.
