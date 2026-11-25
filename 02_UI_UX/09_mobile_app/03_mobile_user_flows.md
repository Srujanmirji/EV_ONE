# Mobile User Flows

Screen numbers refer to `02_screen_inventory.md`. Every flow below is clickable on the canvas.

## Navigation model

- **Tab bar:** Home (13) · Listings (18) · ⚡ Charging (94) · News (106) · Account (125).
- Sell, New EVs, Store, Savings and Finance are reached from Home tiles and sections, not extra tabs.
- Back: chevron / swipe on iOS; arrow / system back on Android.

## First launch

Splash (1) → intro slides (3 → 4 → 5, Skip goes to 6) → Get started (6) → Sign in (7) or Create account (8) → OTP (9) → Location permission (11; "Choose a city" → 17) → Notification permission (12) → Home (13). "Browse without an account" skips sign-in and goes to 11.

Sign in (7): email + password with live validation, Forgot password (10), Google, Apple (iOS only) and mobile-number OTP.

## Buy a used EV

Home (13) or Listings tab → Marketplace (18) → Listings (19) → Filters (20) / Sort (21) / Brand (22) / Price (23) / Type (24) → Vehicle detail (28) → Gallery (29), Specs (30), Battery (31), Seller (32) → Enquiry (33: consent required) → Sent (34) → Conversation (35). Saved vehicles: 36. States: 25 no results, 26 loading, 27 network error.

## Sell an EV

Home "Sell Your EV" → Landing (37) → 9 steps (38–46: type, brand/model/variant, details, registration, battery, photos, price, location, preview) → Declarations (47: all three required) → Submitted (48) → Seller dashboard (49) → My listings (50) → Manage (51: pause, mark sold, delete) → Edit (52) → Status with reviewer feedback (53) → Listing enquiries (54).

## Handle enquiries as a seller

New-enquiry banner (145) → Inbox (137; tabs 138–140) → Enquiry details (141: close, block) → Conversation (142) → Quick replies (143). Empty inbox: 144.

## Discover a new EV

Home → New EVs (55) → Catalogue (56) / Filters (57) / Brands (58) / Cars, Scooters, Bikes (59–61) → EV detail with variants (62) → Full specs (63) → Compare 2–3 (65) → Dealer enquiry (66: consent required) → Sent (67). Upcoming launches: 64.

## Buy an accessory

Home → Store (68) → Categories (69) → Listing (70) → Filters (71) → Product (72) → Fit check (73) → Gallery (74) → Added (75) → Cart (76) → Address (77) → Checkout review (78) → Payment on Razorpay (79) → Order placed (80) → Orders (81) → Tracking (82). Wishlist: 83.

## Estimate savings

Home → Intro (84) → Vehicles (85) → Distance (86) → Fuel cost (87) → Electricity (88) → Results with live sliders (89) → Monthly (90), Yearly (91), Petrol vs EV (92), Share (93).

## Find a charger

⚡ tab → Map (94) ↔ List (95) → Search (96) → Speed filter (97) / Connector filter (98) → Station (99) → Facilities (100) → Directions (101). States: 102 location off, 103 none found, 104 loading, 105 provider down.

## Read news

News tab → News & Reviews (106) → Topics (107) / Feed (108) → Featured (109) / Article (110) → Related (113); Reviews (111) → Review (112); Saved articles (114).

## Finance and insurance

Home → Finance (115) → Loan info (116) → EMI calculator (117) → Breakdown (118) → Loan enquiry (119: valid mobile + consent) → Sent (120). Insurance (121) → Coverage (122) → Quote request (123) → Sent (124).

## Account

Account tab (125) → Profile (126) → Edit (127); My enquiries (128) → Detail (129); Saved (130); Orders (131); Notification settings (132); Settings (133); Help (134); Privacy and consents (135); Log out (136).
