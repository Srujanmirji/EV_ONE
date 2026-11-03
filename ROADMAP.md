# EVONE — Roadmap and Stage Gates

**Planning assumption:** founder-led development, small team, limited pilot inventory. Dates are relative to kickoff, not delivery guarantees. No feature is complete on UI alone.

## Phase 0 — Discovery and visual baseline (Weeks 0–2)
Dealer interviews (≥10), EV buyer interviews (≥15), 20 real listing leads with permission, map/charging provider cost check, legal partner review, approve screens and design tokens. **Gate:** evidence of real supply/demand + decisions on auth, fulfilment, charging data rights and lead compliance.

## Phase 1 — Working MVP (Weeks 3–10, aspirational)
P0 foundation → catalogue → listings/seller flow → enquiries → admin review → accessories/orders/payment → calculator → charging map fallback → editorial → partner leads → analytics/QA. **Gate:** all P0 acceptance criteria pass in staging with real data and incident recovery checks.

## Phase 2 — Controlled local pilot (Weeks 11–14)
One region (e.g. Hubli–Dharwad + curated nearby inventory), limited approved dealers, manual seller moderation, curated accessory inventory, conservative traffic acquisition. Weekly review of enquiries, spam, inventory supply and issue rates. **Gate:** measured qualified leads, repeated dealer participation, order fulfilment and support load tolerable.

## Phase 3 — Expansion (Month 4+)
Seller tools, trustworthy battery inspections, dealer pricing experiments, dedicated SEO/category landing pages, more Indian cities, live charger partner feeds, mobile app only with demonstrated need.

## Operating constraints
A single 4–7 person team should avoid building all 25 screens simultaneously; UI screens can be designed in parallel but backend implementation must follow contracts and dependencies. Keep legal/compliance reviews as hard gates, not “later” TODOs.

## Checkpoints and measurable success
- End discovery: partner/data/licensing feasibility and clickable prototype approved.
- End engineering MVP: stable feature complete staging, no high-severity open security defects.
- Pilot Week 2: enough approved real supply to serve search; inspect lead-to-contact conversion.
- Pilot Week 4: evaluate buyer satisfaction, dealer response time, fraud complaints, accessory gross margin, content traffic.

## Exit/stop criteria
Do not expand geographically when supply is thin, complaints unresolved or manual moderation is overwhelmed. Do not ship live charger badges without trusted feeds. Do not market finance comparisons if partner/legal requirements are unmet.

See [`TASKS.md`](TASKS.md), [`04_Delivery/01_sprint_plan.md`](04_Delivery/01_sprint_plan.md) and [`01_Product/04_metrics_experiments.md`](01_Product/04_metrics_experiments.md).
