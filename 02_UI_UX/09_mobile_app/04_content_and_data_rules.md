# Content and Data Rules in the Mobile Designs

These rules come from `PRD.md`, `SYSTEM_DESIGN.md`, `AGENTS.md` and `05_Operations/`. The mobile screens apply them visibly; production must enforce them server-side.

## Honest data

- Every vehicle figure carries a source tag: **Confirmed** (maker document), **Claimed** (test cycle such as MIDC, ARAI or WLTP), **Estimated** (not announced), **Seller** (declared, not checked), **Checked by EVONE**, or **Measured** (our review).
- Unknown values show "—". Nothing is guessed.
- Battery health stays "Not independently inspected" unless a signed report exists; only then can the "Battery inspected" badge appear.
- Verification badges (Dealer verified, Identity verified) show an expiry date on detail screens.
- Charger availability is shown only with its source and check time ("checked 6 min ago · may have changed"). Otherwise: "Availability unknown". If the provider fails, saved stations show without live status.
- No star ratings until reviews come from real buyers. Reviews separate the maker's claim from measured results and name who supplied the test car.
- Upcoming models stay "Estimated" until the maker confirms them.

## Privacy

- Others see a person as first name + initial and city.
- Buyer and seller phone numbers are hidden unless that person chooses to share.
- Exact address is never shown; a sell listing shows an area circle; registration shows the state code only.
- No export or copy-all of buyer contacts.
- Every consent is listed in Privacy and security with a Withdraw button.
- Delete account removes profile, listings and saved items; invoices are kept where the law requires.

## Consent

- Consent boxes start unticked; Send stays disabled until ticked (and, for finance, until the mobile number is valid). An inline line explains why the button is off.
- Finance and insurance use the PRD wording: "I agree that EVONE may share my contact details and selected vehicle with [named partner] to respond to this [loan/insurance] enquiry. I can withdraw future contact permission."
- Dealer enquiries share with one authorised dealer only.

## Money

- Used EVs: enquiry only. No vehicle payment, escrow or "Buy now".
- New EVs: dealer enquiry only. No booking.
- Accessories: the only in-app purchase, paid on Razorpay's screen. EVONE never sees card or UPI details; an order is confirmed only after the payment is verified.
- Prices include GST. EMI, savings and premiums are labelled estimates with their assumptions and exclusions.
- Finance never asks for PAN, Aadhaar, bank statements or credit scores.

## Sample content

All listings, dealers, prices, counts, stories, partners, order IDs and AWB numbers in the designs are samples or placeholders (`[ORDER ID]`, `[Partner bank A]`, `[Network A]`). Real values must come from reviewed sources.
