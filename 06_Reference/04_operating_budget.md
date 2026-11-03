# Pilot Budget Template and Unit-Economics Worksheet (Estimates)

## Cost buckets to quantify before launch
| Bucket | Upfront | Monthly | Notes |
|---|---|---|---|
| Design/engineering | founder/team time | maintenance time | not free even when self-built |
| Domain/branding | TBD | renewals | trademark and business check |
| Hosting | setup | web, API, worker, DB, Redis | choose tier with backups |
| Storage/CDN | initial media | objects/egress | especially vehicle photos |
| Map/charging data | integration | API usage + partner fees | quota alerts mandatory |
| Auth/OTP | setup | active users/messages | provider commercial terms |
| Email/SMS/notifications | setup | messages | transactional and alerts |
| Payments | verification | per transaction/refund | Razorpay merchant terms |
| Support/moderation | process setup | staff hours | key early operational cost |
| Marketing/content | copy/photos | SEO, articles, ads | supply first |
| Legal/tax/insurance | agreements | recurring compliance | especially finance/insurance |

## Unit economics worksheet
```text
Gross order profit = Net merchandise revenue - COGS - shipping subsidy - payment charges - returns/refunds - support burden
Cost per qualified used EV lead = allocated acquisition + moderation + notification + support cost / qualified leads
Dealer subscription margin = recurring fees - service/ops/payment cost per dealer
Map cost per useful station search = map/charging bills / search sessions with an actionable station result
```

## Financial discipline
Budget API key quotas, webhook alerts and marketing test caps. Never publish arbitrary unit economics or market sizing without source-backed assumptions. Collect actual service prices from vendors before committing a runway estimate.
