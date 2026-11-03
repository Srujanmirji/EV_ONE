# Sitemap and End-to-End User Journeys

## Sitemap
```text
/
├── /used-evs ── /used-evs/[slug]
├── /sell ── wizard / draft / success
├── /sellers/[id]  /dealers/[id]
├── /evs ── /evs/[brand]/[model]/[variant]  /compare
├── /accessories ── /accessories/[slug]  /cart  /checkout
├── /calculator
├── /charging ── /charging/[provider]/[id]
├── /news ── /news/[slug]  /reviews
├── /finance ── /finance/loan  /finance/insurance
├── /login /signup
├── /account ── listings, favourites, enquiries, orders, settings
├── /dealer ── inventory, leads, team, profile
└── /admin ── moderation, EV catalogue, products, orders, content, finance, audit
```

Implementation note (EV-026): the comparison page is `/compare` (top level) rather than `/evs/compare`, because `/evs/{brand}` would otherwise shadow a brand with the slug `compare`.

## Flow A — Used EV purchase enquiry
Search → filter → card → detail → sign-in if needed → privacy notice → enquiry → seller notified → seller acknowledges → buyer sees status. **Not** vehicle checkout.

## Flow B — Selling
Sell CTA → authenticate → model selection → condition/photos/price → preview → submit → moderation → approve/reject → seller notification → listing live → enquiries → sold/archive.

## Flow C — Accessory checkout
Category → select vehicle → compatibility check → product → cart → shipping/charges → payment provider → verified webhook → order receipt → tracking/support. Browser redirect alone cannot mark paid.

## Flow D — EV discovery and compare
Homepage/catelogue → filter → variant details → compare 2–3 → use model as prefilter for marketplace or energy input for calculator.

## Flow E — Savings
Calculate → validate units → estimated costs/month/year → reveal exclusions → optionally explore models. Input remains editable; no fake savings.

## Flow F — Charger
Location or city → list/map → filter by plug/power → station → source/freshness → navigate or report incorrect info. Location denied must not block usage.

## Flow G — Finance
Finance information → EMI estimate → named partner disclosure → explicit unchecked opt-in → confirmation → secure partner dispatch → status. No loan issuance or insurance policy transaction in EVONE MVP.

## Flow H — Dealer
Sign-in → dealer membership approval → listing creation/updates → incoming scoped enquiries → response, with audit and staff roles.

## Flow I — Moderation
Pending item → source inspection → reason and decision → badge verification conditional → publish/reject → email → reviewer audit.

## Failure flow discipline
Any integration fails → preserve user progress (if safe) → precise nonmisleading state → retry or handoff → write telemetry. Consent revoked → prevent new partner sends. Account banned → hide private operations and revoke roles.
