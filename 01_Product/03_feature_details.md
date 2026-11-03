# Detailed Feature Catalogue and Edge Cases

## Used EV marketplace
**Browse:** city, vehicle type, brand/model, price, model year, km driven, seller type; optional claimed range and actual verified inspection filters. **Listing detail:** price, photos, vehicle variant, source of specs, self-reported condition, ownership count, seller status, timestamp. **Sell:** draft, add media, price, submit, moderations, archive, mark sold. **Enquiry:** user message with consent and rate limiting. **Exceptions:** duplicate plates/photos, model variant unavailable, rejected listing, deleted seller, blocked enquiry, stale sold listing.

## EV catalogue
Brand → model → variant canonical hierarchy; published variant specs, photo gallery, available/upcoming states, region-specific price and source checked date. Compare up to 3 variants. **Exceptions:** missing charging speed, contradictory OEM spec update, date unverified, variant discontinued. Explicitly show missing data.

## Accessories
Single-store first-party products with compatibility mapping, stock, delivery region check, taxes/shipping, Razorpay, order timeline, refunds. **Exceptions:** stock lost between cart and checkout, duplicate webhook, expired session, unavailable PIN code, failed payment, split shipment deferred, refund pending. Never auto-claim compatibility without reviewed mapping.

## EV savings
Compute ICE fuel cost vs EV charging energy cost. Optional charging mix, losses and purchase delta modeled explicitly. Provide scenario assumptions, reference date and no guaranteed savings. **Exceptions:** 0 km, invalid fuel efficiency, impossible price, negative delta, divide by zero, lack of EV model. Offer manual values with units.

## Charging
Map/list results from authorized provider, source label and timestamp, connector filters, navigation, report a problem. **Exceptions:** denied GPS permission, no stations, provider timeout, map quota, stale status. Fall back to search by city and list mode. Never mark stale as available.

## News/reviews
Factual newsroom, product launch coverage, buying advice, editorial authors, sourced claims and article revisions. For MVP, 'Reviews' refers to **editorial reviews**, not unmoderated user-generated owner reviews. **Exceptions:** article unpublished, copyright/license, corrections, outdated price or specifications.

## Finance/insurance
EMI estimator; split enquiries with optional partner-specific consent and notices; route with encryption and audit after legal review. **Exceptions:** missing or withdrawn consent, provider outage, duplicate lead, data subject deletion, approved partner expiry. Avoid credit eligibility inference.

## User & operations
Auth/account preferences, notifications, favourites, listing/order/enquiry history, dealer inventory, moderation queues, article CMS and audit. **Exceptions:** auth revoked, role removed, seller banned, account deletion pending, abusive photo/report.

## Connected product mechanics
- CTA from EV model detail to used listings prefiltered on model/variant.
- Accessories recommend only `CONFIRMED` compatible products; otherwise show generic accessories with clear caveat.
- Calculator can prefill a model's energy efficiency **only with provenance** and editable values.
- Charger connector filter can prefill from model variant, but user can override.
- Finance lead retains vehicle context but avoids exposing sensitive buyer interest to unrelated parties.
