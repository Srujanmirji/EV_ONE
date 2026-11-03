# Google Stitch Prompts — Preserve Approved EVONE Aesthetic

## Workflow (important)
Upload `../assets/approved_ui_reference.png` and ask Stitch to generate **one full screen per request**. Avoid 'all screens in one image' requests, which yield unreadable thumbnail collages. Approve spacing and components on first two screens before scaling. Each screen needs desktop 1440px and mobile 390px separately.

## Global style prefix — prepend to every prompt
> Design for EVONE, an India-focused electric vehicle ecosystem. Match the uploaded EVONE reference image precisely for visual language: cinematic slate/graphite/silver electric SUV hero imagery, clear large sans-serif typography, pearl-white backgrounds, selective translucent Apple-like glass search/overlay panels, elegant black pill CTAs, quiet shadows, 18px radius cards and generous whitespace. Tesla-inspired restraint, not Tesla branding. Avoid clutter, neon, generic SaaS gradients, fake statistics, overly dense cards, fabricated verified badges or stock photos unrelated to EVs. Single screen, full-size desktop at 1440px with responsive mobile 390px adaptation, meaningful hierarchy. Use ₹/km/kWh. The UI must be clearly functional and accessible.

## Prompt 1 — Homepage (generate first)
> Generate one polished EVONE homepage (not a collage). Dark cinematic hero with silver EV in minimal modern architecture; headline “Everything EV. One Premium Platform.”; “Explore Used EVs” primary action; one floating Liquid Glass search bar with Buy Used / Explore New / Accessories tabs. Below: modest row of seven minimalist shortcuts, featured used listings (3 truthful sample cards labelled demo), new EV editorial showcase, a compact savings teaser, simple accessories row, charging teaser, journal excerpt, small loans/insurance CTA, final dark banner and footer. Wide breathing room, precise alignment, strong visual hierarchy. The used marketplace dominates; other modules remain brief teasers.

## Prompt 2 — Marketplace listings
> Generate a **standalone** used EV search results desktop + mobile UI in the same EVONE style. Heading, sticky simple filters (vehicle type, make/model, city, budget, year, mileage), three wide photo cards per row, seller-type label, valid evidence-only verification badge slots, price, year/km and a single View Details action. Mobile filters use a bottom sheet. No cinematic full-screen hero. Show default, loading and empty-results examples as smaller companion states rather than crowding the main screen.

## Prompt 3 — Used EV detail
> Generate a standalone EVONE vehicle detail page. Left 60% gallery, right 40% price + enquiry action, clean facts: year, km, variant, source-labelled manufacturer range, seller category, condition, ownership, verification section only when evidence exists, buyer enquiry with privacy context, mobile sticky contact CTA. No “Buy Now” for vehicle purchases.

## Prompt 4 — Sell your EV
> Generate a focused premium nine-step listing wizard with progress, large white form, vehicle make/model/variant picker, km/year, condition, photo upload, asking price, identity/contact controls, preview and submit for moderation. Clear draft/autosave/error states, no random marketplace elements in this workflow.

## Prompt 5 — New EV catalogue and comparison
> Generate a clean editorial EV research listing and separate model-detail layout. Model hero with silver EV, variants, sourced specs and price as-of date, claimed range labelled, detailed spec table, comparison selection. A distinct side-by-side comparison screen supports 2–3 EVs with clear unknown values.

## Prompt 6 — Accessories
> Generate a standalone EVONE accessories category page: pearl-white product cards with generous imagery, category navigation, vehicle-fit selector and price. Then separate product detail, cart and checkout screens with visible compatibility status and returns information. No invented ratings.

## Prompt 7 — Savings calculator
> Generate a standalone EVONE savings calculator, left side labelled input form with units, right side dark premium savings result panel with comparison chart, assumptions and exclusions. Use accessible numeric fields, and clearly mark illustrative values.

## Prompt 8 — Charger map
> Generate a standalone charging locator with left list panel/right light map, search by city, AC/DC connector and kW filters, station cards with operator/source/updated time. If status unknown, say “Availability not provided,” not green available. Mobile map/list switch with accessible map controls.

## Prompt 9 — EV Journal
> Generate a standalone premium automotive magazine listing with featured editorial story, categories, clean source/date metadata, thumbnail cards, and a separate long-form article page. Very readable typography, no fabricated ratings.

## Prompt 10 — Financing
> Generate a restrained EV loan and insurance landing page with two clear enquiry paths; simple EMI estimator; separate loan and insurance lead forms with purpose-specific unchecked consent and named partner disclosure, no “instant approval” claim.

## Prompt 11 — Account / dealer / admin
> Create **separate** account, dealer and admin screens using EVONE tokens but operationally efficient layouts. Account: favourites, enquiries, listings, orders. Dealer: scoped inventory and leads table. Admin: moderation queue, catalogue, products, articles, finance leads with restricted status, audits. Do not reuse cinematic hero on dashboards.

## Stitch review checklist
- Is the hero/search still aligned with approved reference?
- Is each screen unique and not a collage?
- Is one action dominant per section?
- Are title/type sizes legible at native viewport?
- Do badges and prices avoid fabricated claims?
- Does the mobile layout work without horizontal overflow?
- Are all seven modules discoverable but not equally loud?
- Are empty/loading/error states specified for engineers?
