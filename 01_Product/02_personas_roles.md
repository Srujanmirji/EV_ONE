# Personas, Jobs-to-be-Done, and Role Permissions

## Buyer (guest or signed in)
**Job:** find an EV that fits budget/location/range, inspect trustworthy details and contact the right seller. **Friction:** duplicate/stale listings, misleading battery labels, hidden contact requests. **Success:** 2–3 suitable listings and an acknowledged seller enquiry.

## Private seller
**Job:** post once, manage photos and buyer contact, mark sold. **Friction:** long form, spam, privacy risk. **Success:** moderated listing published with good enquiries, easy status updates.

## Dealer owner / dealer staff
**Job:** add inventory, route enquiries, measure quality. **Success:** lead inbox and scoped member access without leaking other dealers' information.

## Researcher / new EV shopper
**Job:** understand model/variant differences, claimed range, launch status and indicative cost. **Success:** informed shortlist and comparison.

## Accessory customer
**Job:** buy compatible equipment with visible delivered price/returns. **Success:** completed and fulfilled order without compatibility dispute.

## Charging user
**Job:** locate relevant chargers and get directions. **Success:** source/last-updated visible and sensible fallback when status unknown.

## Finance enquiry customer
**Job:** understand indicative EMI and opt into contact with named provider. **Success:** transparent consent and lead outcome, not misleading 'pre-approved' offer.

## Authorization matrix
| Capability | Guest | User | Dealer staff | Dealer owner | Editor | Moderator | Admin |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Browse listings/catalogue/news | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Save / enquire | - | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Create own listing | - | ✓ | scoped | scoped | - | - | ✓ |
| Edit dealer listing | - | - | scoped | scoped | - | - | ✓ |
| Review/publish seller listings | - | - | - | - | - | ✓ | ✓ |
| Edit catalogue/articles | - | - | - | - | ✓ | - | ✓ |
| Approve identity/battery verification | - | - | - | - | - | approved verifier | ✓ |
| Manage customer order/refund | - | own view | - | - | - | - | ✓ |
| Export finance lead | - | - | - | - | - | - | approved ops only |
| View audit logs | - | - | - | - | - | limited | ✓ |

## Multi-role rule
A single person may be a buyer and seller. `dealer_staff` actions require membership within exact dealer tenant; role check alone is insufficient. Staff must not see admin finance leads by default.

## Permissions implementation
Define policies as action + resource + scope (e.g. `listing:update` plus `ownerId` or active dealer membership). Check server-side on every API endpoint, integration callback and worker action. Do not use client role-gating as security boundary.
