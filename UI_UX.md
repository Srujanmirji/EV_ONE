# EVONE — UI/UX Master Specification

**Approved visual target:** `assets/approved_ui_reference.png` (conceptual mockup, not production data). Follow the visual style, **not** its decorative counts, badges or sample claims.

## Vision
Tesla-level cinematic product hierarchy plus Apple-inspired **restrained** translucent glass interfaces. Elegant dark hero, pearl-white content area, sleek silver vehicle photography, clear accessible text and substantial whitespace. **Not** seven full product dashboards on the homepage; each module gets a dedicated page.

## Design tokens
| Token | Value | Usage |
|---|---|---|
| Ink | `#090B0F` | headings, CTA, dark section |
| Graphite | `#15171C` | footer and cinematic panels |
| White | `#FFFFFF` | base cards |
| Pearl | `#F8F9FB` | general content backgrounds |
| Mist | `#EFF1F5` | alternating surface |
| Titanium | `#C7CCD4` | decorative metal accents |
| Muted text | `#747B87` | secondary labels |
| Glass light | `rgba(255,255,255,.18)` | **hero only** frosted search/nav |
| Border light | `rgba(255,255,255,.35)` | dark hero glass border |
| Border standard | `#E4E7EC` | decorative list/card borders |
| Control border | `#747B87` | input/select boundaries (4.26:1 on white); never body text |

Typography: `Manrope` headings, `Inter` body. Desktop max width 1280px, responsive grid 12 cols, 24px gutters; section spacing 96–128px desktop and 56–72px mobile. Buttons radius 999px; cards 16–20px. Glass blur 16–24px only where background has enough contrast. Strong keyboard focus rings; never disable contrast for beauty.

**Implementation (EV-015).** Tokens live in `packages/ui/src/tokens.css`, and components in `@evone/ui`: Button and `buttonClasses`, TextField, SelectField, Checkbox, Card, Modal, EmptyState, ErrorState and Skeleton. Visual reference and automated accessibility checks run at `/ui-kit` (not indexed, not linked). Two deliberate differences:
- **Muted text uses `#596170`, not `#747B87`.** The specified colour is about 4.3:1 on pearl and fails WCAG AA; an axe scan with it fails on every page.
- **Components follow shadcn/ui's approach** (Tailwind variants on native elements) without its CLI or Radix dependencies. The modal is a native `<dialog>` plus explicit Tab wrapping.

## Approved page hierarchy
1. Hero with headline + silver EV photo and primary actions.
2. Single glass search bar with used/new/accessories tabs.
3. Seven **small** ecosystem shortcuts, no oversized cards.
4. Featured used vehicles (commercial focus).
5. Editorial showcase of new EVs.
6. One compact dark savings teaser.
7. Curated accessories preview.
8. One charging locator preview.
9. EV Journal teaser.
10. Small side-by-side loans and insurance CTA.
11. Final black cinematic banner + footer.

## Screen inventory and IDs
Full details in [`02_UI_UX/02_screen_specs.md`](02_UI_UX/02_screen_specs.md). Screen IDs map to backlog/test tasks:
- `UX-01` homepage desktop/mobile; `UX-02` used EV results; `UX-03` listing details; `UX-04` sell EV wizard; `UX-05` seller/dealer profiles.
- `UX-06` EV catalogue; `UX-07` model detail; `UX-08` comparison.
- `UX-09` accessories results; `UX-10` product detail; `UX-11` cart/checkout/confirmation; `UX-12` orders.
- `UX-13` savings calculator; `UX-14` charging map; `UX-15` station detail.
- `UX-16` journal; `UX-17` article; `UX-18` reviews.
- `UX-19` finance landing; `UX-20` loan lead; `UX-21` insurance lead.
- `UX-22` auth; `UX-23` account; `UX-24` dealer console; `UX-25` admin console.

## Component behavior and state matrix
Every screen must specify: **default, loading, empty, error, form-invalid, auth-required and success**. Filters should retain values in URL; listings keep scroll position when returning; forms save drafts only when permitted. At mobile width ≤768px, filters become a bottom sheet, search panel collapses to progressive steps, vehicle detail CTA becomes a fixed accessible bottom action.

## Accessibility and honesty
Meet WCAG 2.2 AA wherever feasible; keyboard support, 44×44px touch-target intent, reduced motion, predictable forms, accessible error messaging and text contrast. Never fabricate ratings, seller verification, range or charging availability. Distinguish demo text clearly while prototyping.

## Stitch workflow
Generate homepage, then approved used-vehicle listing/detail flow, then catalogue, commerce, calculators/charging, editorial/finance, account and dashboards. Use [`02_UI_UX/04_stitch_prompts.md`](02_UI_UX/04_stitch_prompts.md); attach `assets/approved_ui_reference.png` to every new Stitch project generation for consistency.

EV-049 implements UX-13 using the established tokens/components. See `02_UI_UX/08_EV-049_calculator_direction.md` for inherited visual direction, responsive composition and accessibility decisions.
