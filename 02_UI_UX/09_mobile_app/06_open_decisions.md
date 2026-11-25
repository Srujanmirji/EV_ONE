# Open Decisions for the Mobile Designs

Items the owner needs to decide before any mobile code. Recorded so they are not guessed later; add accepted outcomes to `06_Reference/02_decision_register.md`.

## Conflicts with approved docs

| Topic | Approved (`UI_UX.md`, web code) | Mobile designs | Decision needed |
|---|---|---|---|
| Palette | Ink `#090B0F`, Pearl `#F8F9FB`, Titanium `#C7CCD4`, muted `#596170` | Obsidian `#0B0B0D`, Pearl `#F7F7F5`, Titanium `#AEB4BC`, grey `#565B63` | Which palette is canonical; if the brief wins, web tokens in `packages/ui/src/tokens.css` must change too |
| Surface style | Pearl-white content, glass only in the hero | Dark-first app with glass panels throughout | Confirm dark-first for mobile only, or for web too |
| Wordmark | Manrope | Michroma, wide-spaced | Font licence check and brand approval (EV-003) |
| Homepage order | 11 blocks | Brief's 10 sections | Which order the web follows |

## Product proposals made in the designs (not from docs)

- Listing review target "within 1 working day" (shown as a target).
- Relist within 30 days after marking sold.
- Installation fee ₹2,500 and 7-day unused return window for accessories.
- Partner contact target "within 1 working day".
- Mobile tab bar: Home · Listings · Charging · News · Account.

## Blockers inherited from `TASKS.md`

- **EV-004** final UI reference and sitemap not approved.
- **EV-005** auth vendor (Clerk) not accepted for production; mobile sign-in options depend on it.
- **EV-006** charging data provider and map terms; station data and live status depend on it.
- **EV-007** legal review of finance/insurance leads; that module should ship behind a disabled flag.
- **EV-008** accessory fulfilment and installation partner.
- **EV-085** native app itself waits for the mobile-need evidence in `03_Engineering/07_mobile_progressive.md`.

## Assets

- Licensed vehicle and product photography to replace the drawn car component.
- Final app icon and wordmark files.
