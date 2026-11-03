# Screen-by-Screen UI/UX Specifications (UX-01 to UX-25)

**Deliverable:** separate 1440px desktop and 390px mobile artboards per core screen. The approved image is a *visual reference*, not permission to squeeze all pages into one composite.

## UX-01 — Homepage `/`
**Goal:** immediately understand EVONE and discover used EVs. **Order:** cinematic hero/search → seven simple navigation shortcuts → featured listings → new EVs → dark savings teaser → accessories → charging → journal → compact finance → final CTA/footer. **Primary CTA:** Explore Used EVs. **Mobile:** hero headline, relevant image crop, stacked search, horizontal shortcuts if necessary but all accessible. **States:** missing live inventory shows truthful “Coming soon” and city waitlist instead of fabricated cards.

## UX-02 — Used listings `/used-evs`
**Goal:** find relevant vehicles. Sticky header, title/results count, prominent filters (left desktop, sheet mobile), search/sort, three-column result cards, verified labels only from evidence, URL query persistence. **States:** loading skeleton, no-results with reset, server error with retry; location permission denied falls back to city selector.

## UX-03 — Vehicle details `/used-evs/[slug]`
**Goal:** assess and enquire. Gallery 60/40 desktop, price/seller box, key specs, condition disclosures, ownership, documents summary, source/updated date, enquiry CTA, seller response expectations, related listings. **Mobile:** sticky contact action, swipe gallery, detail accordion. No direct “Buy Now” for used vehicles. Inspection report if verified and user permitted to view.

## UX-04 — Sell EV `/sell`
**Goal:** publish a useful listing. Nine-step wizard: type → model/variant → age/km → condition/history → photos → pricing → seller/contact → review → submit. Progress bar, save and resume, evidence upload, required-field errors, rejection re-edit. Warn not to publish plate/owner address by default.

## UX-05 — Seller/dealer profile `/sellers/[id]`, `/dealers/[id]`
**Goal:** assess account/dealer credibility. Display published inventory, city, contact method, genuine verification scope and expiry, seller metadata allowed by policy; do not expose private KYC docs. Suspended dealer profile hidden from public.

## UX-06 — New EV browse `/evs`
**Goal:** research models. Vehicle type tabs, recently launched/upcoming filters, brand and price/range, large studio cards, comparison selection up to three, source checked dates.

## UX-07 — EV model/variant `/evs/[brand]/[model]/[variant]`
**Goal:** understand complete specifications. Cinematic photo; visible variant picker; manufacturer-stated range labelled with test cycle; price by city and date if verified; charging, capacity, motor, warranty; prose review and source links; CTA to compare and relevant used listings.

## UX-08 — Compare `/compare?ids=...`
**Goal:** compare 2–3 variants. Sticky column headers, side-by-side desktop, mobile horizontally scrollable spec table with fixed attribute labels, grouped spec sections, differences toggle and unknown `—`.

## UX-09 — Accessories browse `/accessories`
**Goal:** shop compatible accessories. Categories and vehicle selector, product grid, price/stock, delivery information, compatibility trust labels, search/filters, sorting; mobile bottom sheet.

## UX-10 — Product detail `/accessories/[slug]`
**Goal:** confirm fit and buy. Product photos, specs, compatibility by exact EV variant, price, availability, delivery PIN, return policy, add to cart. Unknown fit labelled “Compatibility not verified” with support link.

## UX-11 — Cart / checkout `/cart`, `/checkout`, `/checkout/success`
**Goal:** safe first-party order. Editable items, pricing, delivery address, shipping/tax breakdown, Razorpay payment; one CTA per step; confirmation only after server-verified payment. Failure/retry/resume states, no double order.

## UX-12 — Orders `/account/orders`, `/account/orders/[id]`
**Goal:** track order. Timeline `paid → processing → shipped → delivered`, tracking if available, support/cancellation/refund status, receipt.

## UX-13 — Savings `/calculator`
**Goal:** understand estimated fuel/energy costs. Editable monthly km, fuel rate, ICE mileage, EV kWh/km, tariff/mix; result chart, monthly/yearly savings, optional purchase delta/break-even. Place assumptions above CTA, no guaranteed outcomes, keyboard and mobile form validation.

## UX-14 — Charging map `/charging`
**Goal:** find compatible charger. Map and result list split desktop, map/list toggle mobile, connector/power/location filters, permission prompt, attribution, last-updated/unknown status. Retry/backoff provider errors.

## UX-15 — Station detail `/charging/[provider]/[id]`
**Goal:** decide whether to navigate. Address, connector types/count/power, operator, hours, tariff where supplied, status only if timely data, last-updated and report-problem CTA, external navigation.

## UX-16 — EV Journal `/news`
**Goal:** discover useful, current content. Featured editorial story, categories, article cards, author/date, search, no fabricated readership/review counts.

## UX-17 — Article `/news/[slug]`
**Goal:** read/share. Hero, headline, author/date, reading time, editorial body, source/corrections, share, related vehicle model/articles. Large reading width ~760px.

## UX-18 — Reviews `/reviews`
**Goal:** find editorial EV assessment. Model rating only if real method; pros/cons, tested conditions and reviewer, owner reviews deferred until moderation exists.

## UX-19 — Loans & Insurance `/finance`
**Goal:** understand available enquiry routes. Two cards with clear partner role and disclaimers, EMI preview, distinguish loan from insurance; no implied approval.

## UX-20 — Loan enquiry `/finance/loan`
**Goal:** consented request. Vehicle selection, name/contact, optional requested amount, clear data sharing disclosure, unchecked consent, submit/confirmation, edit/delete request pathway. Do not ask for PAN/Aadhaar in MVP.

## UX-21 — Insurance enquiry `/finance/insurance`
**Goal:** request quote. Vehicle and registration-related details minimized, current policy dates only when necessary, partner consent and confirmation. No unapproved policy comparison claims.

## UX-22 — Auth `/login`, `/signup`
**Goal:** simple account creation. Managed provider screens matching EVONE theme, accurate OTP/login provider promise, recovery, privacy links, errors, no autoplay immersive hero blocking controls.

## UX-23 — Account `/account`
**Goal:** manage owned workflows. Saved listings, created listings, enquiries, accessory orders, notifications and privacy requests. Empty states linked to actionable discovery.

## UX-24 — Dealer console `/dealer`
**Goal:** manage inventory and respond to leads. Dense but restrained admin UI, tables with filter/status, add listing, scoped staff invite, enquiry actions, no marketing cinematic hero. Cross-org membership security.

## UX-25 — Admin `/admin`
**Goal:** oversee trust and operations. Moderation queue, explicit review decisions/reasons, products/orders, catalogue, editorial, finance-lead restricted queue, audit/metrics; always display who changed an object and when.

## Cross-screen navigation and states
- Nav/back state preserved via URL and browser history.
- Authentication required only for private action; guest browse uninterrupted.
- Toast after save, error summary and inline errors, loading skeletons; clear report/support path.
- Status/badges always grounded in backend data.
- Every page ships with desktop, mobile, 360px test, keyboard and reduced-motion states.
