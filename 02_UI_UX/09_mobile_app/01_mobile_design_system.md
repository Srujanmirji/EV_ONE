# Mobile Design System

Proposed tokens for the iOS and Android apps. They follow the owner's master brief and reference images, which differ from the approved web tokens in `UI_UX.md` (see `06_open_decisions.md`).

## Colour

| Token | Value | Use |
|---|---|---|
| Obsidian | `#0B0B0D` | App background, text on white buttons |
| Charcoal | `#17191D` | Raised dark surfaces |
| Titanium | `#AEB4BC` | Secondary text on dark, metal accents |
| Pearl | `#F7F7F5` | Product photo grounds |
| White | `#FFFFFF` | Primary text on dark, primary buttons |
| Soft Grey | `#E7E8EA` | Body text on dark glass |
| Text grey (light surfaces) | `#565B63` | Secondary text on white (Titanium fails contrast there) |
| Success | `#8EE0AE` / tag bg `rgba(46,155,91,.22)` | Verified, fits, saved |
| Warning | `#F2C879` / tag bg `rgba(224,166,58,.2)` | Changes requested, waiting, estimated |
| Error | `#FF8A80` | Errors and destructive actions on dark |

No accent hue. Status colours appear only in tags, form states and confirmations.

## Backdrop and glass

- **Backdrop:** `#0B0B0D` with three soft radial glows (`rgba(174,180,188,.30)` top-left, `rgba(120,132,152,.26)` right, `rgba(174,180,188,.18)` bottom). Glass needs something behind it to blur.
- **Glass surface:** `rgba(255,255,255,.08)`, `backdrop-filter: blur(24px) saturate(140%)`, `1px solid rgba(255,255,255,.16)`, top highlight `inset 0 1px 0 rgba(255,255,255,.2)`.
- **Sheets:** `rgba(23,25,29,.62)` with `blur(30px)`, 28 px top corners, drag handle.
- **Primary buttons stay solid white**, never glass.

## Type

| Role | Font | Size / weight |
|---|---|---|
| Wordmark | Michroma | 16–44 px, letter-spacing .12–.22em |
| Large title | Manrope | 28–34 / 800 |
| Title | Manrope | 19–24 / 700–800 |
| Price | Manrope | 15–30 / 800, tabular figures |
| Body | Inter | 15–17 / 400 |
| Label | Inter | 11 / 600, uppercase, +.14em |
| Meta | Inter | 12–13 / 400 |

Minimum 12 px for metadata, 13 px for content. All sizes must scale with Dynamic Type / Android font size.

## Layout

- iOS frame 393×852; top 54 pt status area and bottom 34 pt home indicator kept clear.
- Android frame 412×915; 40 px status bar, 24 px gesture bar.
- Side margin 20, gap 8–12, card radius 16–24, field radius 14–16, pills 999.
- Touch targets ≥ 44 pt (iOS) / 48 dp (Android).

## Shared components (canvas files)

| Component | File | Notes |
|---|---|---|
| Tab bar (iOS) | `IosTabBar.dc.html` | Home · Listings · ⚡ Charging · News · Account; `active` prop |
| Navigation bar (Android) | `AndNavBar.dc.html` | Full width, pill indicator behind active icon |
| Car artwork | `IosCar.dc.html` | Placeholder; `w`, `tone` (graphite / silver / obsidian) |
| Onboarding slide | `IosOnboard.dc.html` / `AndOnboard.dc.html` | `step`, `title`, `body`, `art`, `next` |

Patterns used across screens: glass card, white pill button, secondary glass button, chip (on = white fill), tag (Claimed / Seller / Checked / Estimated), bottom sheet, iOS alert / Material 3 dialog, segmented control, switch, stepper, skeleton block, status timeline, sticky bottom action bar.

## Motion and accessibility

- Motion only where state changes (sheet open, skeleton pulse, splash progress); all of it stops under Reduce Motion / Remove animations.
- Every icon-only button has an accessible name; switches, radios, tabs and checkboxes use the matching roles.
- Contrast (calculated against the solid backdrop, not measured on device): white and `#E7E8EA` are well above 10:1; `#AEB4BC` is about 9:1. Re-check over bright glows and photos.
