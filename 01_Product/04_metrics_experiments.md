# Metrics, Instrumentation, and Validation Experiments

## Event naming
Use `snake_case`; events contain event_id, occurred_at, anonymous_or_user_id, session_id, screen, non-PII object IDs and experiment assignment. Avoid full names, phone/email, free-text enquiries, tokens or precise GPS in analytics.

| Funnel | Events |
|---|---|
| Marketplace | `listing_search`, `listing_filter_apply`, `listing_view`, `seller_contact_start`, `enquiry_submit`, `seller_enquiry_ack` |
| Supply | `listing_draft_create`, `listing_submit`, `listing_approved`, `listing_rejected`, `listing_mark_sold` |
| Catalogue | `ev_model_view`, `ev_variant_select`, `compare_start`, `compare_complete` |
| Accessories | `product_view`, `compatibility_check`, `add_to_cart`, `checkout_start`, `order_paid`, `refund_completed` |
| Utilities | `calculator_complete`, `charger_search`, `station_navigation_click`, `charger_error_report` |
| Content/finance | `article_view`, `finance_lead_start`, `finance_consent_grant`, `finance_lead_submitted` |

## KPI definitions
- **Active approved listings:** published, not sold/archived, updated within freshness policy.
- **Qualified enquiry:** valid contact, specific listing, not spam/duplicate, seller acknowledged within defined window.
- **Lead-to-contact rate:** seller acknowledgements / qualified enquiries; counted within same cohort window.
- **Supply liquidity:** qualified enquiries per active approved listing / month; segment car vs scooter.
- **Moderation rejection rate:** rejected / submitted; report reason categories.
- **Accessory gross margin:** net collected revenue − COGS − shipping subsidy − payment fees − refunds/returns (define cohort).
- **Station quality:** % results with connector metadata and known update time; availability unknown rate.
- **Editorial contribution:** search impressions → article entrances → meaningful model/listing exploration; do not equate with direct sale.

## Suggested initial experiments (hypotheses)
1. Does an explicit seller status badge improve enquiry-to-contact without increasing misleading trust assumptions?
2. Does canonical EV model prefill reduce listing completion time and wrong variant rate?
3. Does city-first filtering increase relevant search results for pilot users?
4. Do honest savings assumptions improve calculator-to-EV-explore CTR?
5. Does a vehicle-fit selector improve accessory cart conversion and decrease returns?

## Dashboards
Founder weekly: supply by type/city; approved rate; response p50/p90; top filters/no-results; real inquiries; gross margin; refunds; incidents; partner leads only in aggregated form. Configure consent-aware analytics retention and access controls.

## Launch criteria are NOT vanity metrics
Never display “10k+ listings,” “500 verified dealers,” user-review ratings or partner badges from the mockup until audited actual data supports them.
