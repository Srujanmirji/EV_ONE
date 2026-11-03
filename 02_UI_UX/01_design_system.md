# EVONE Design System — Tokens, Layout, Components and Interaction

## Style guardrails
**Ref:** `../assets/approved_ui_reference.png`. Cinematic dark graphite hero plus airy pearl-white content. Primary vehicle photography should make the product feel automotive, not a generic app. Glass for 2–3 hero/overlay surfaces, **not** every panel. No 3D scene rendering on list pages. Demo reference numbers are not product claims.

## Tokens
```css
:root {
  --ink: #090B0F; --graphite: #15171C;
  --paper: #FFFFFF; --pearl: #F8F9FB; --mist: #EFF1F5;
  --titanium: #C7CCD4; --muted: #747B87; --line: #E4E7EC;
  --glass: rgba(255,255,255,.18); --glass-border: rgba(255,255,255,.35);
  --radius-sm: 8px; --radius-md: 12px; --radius-lg: 18px; --radius-xl: 24px;
  --content-max: 1280px;
}
```
Type scale desktop: display clamp(44–72), h1 40, h2 32, h3 24, body 16, small 14; minimum readable labels 12 only for metadata. Mobile: display 36–44, h1 32, h2 26, body 16. Heading font Manrope, body Inter. Use 8px spacing basis with common 8/16/24/32/48/64/96/128px intervals.

## Grid and responsive
- Desktop 1440px artboard, max inner content 1280px, 12-col grid, 24px gap.
- Tablet 768–1023px: 8-col; mobile 390px and 360px: 4-col, 16px side gutters.
- Landing hero may fill first viewport; functional pages begin below consistent nav with title, no unnecessary hero.
- Listing grid desktop 3 cols, tablet 2, mobile 1; mobile may scroll horizontally only for **featured previews** not primary results.

## Component specifications
- **Header:** floating transparent/glass when over hero, solid elevated white on scroll and pages; sticky height ~72–80px desktop, 56–64px mobile. Menu items readable against image.
- **Button:** pill (primary dark on light, white on dark), min height 44px, `focus-visible` ring, spinner/busy states; max 1 visually dominant per section.
- **Search glass panel:** 3 tabs, grouped select fields, strong search CTA, works with keyboard/ESC; on mobile search forms stack or use progressive modal.
- **Vehicle card:** 16–20px radius, photo 3:2, seller status, title, year/km, price, one CTA and wishlist; placeholders preserve image frame.
- **Verification badge:** `owner-listed`, `verified dealer`, `battery inspected` are separate independent concepts with auditable evidence; use restrained colors + plain-language tooltips.
- **Product card:** square image, model/compatibility label, price, action; require explicit compatibility state.
- **Savings preview:** compact dark editorial banner; full form on separate page.
- **Charging marker:** accessible popup/list synchronization, provider data attribution.
- **Finance lead:** dedicated page form, optional explicit partner-consent checkbox **unchecked by default**.
- **Feedback:** skeletons, friendly errors, empty-state illustration optional, retry and recovery.

## Glass accessibility
Use translucent surfaces only against controlled image/gradient backgrounds; include readable fallback `background: rgba(255,255,255,.92)` when contrast fails; `backdrop-filter` can be disabled on low-power/reduced-transparency environments; never rely on glass to communicate affordance alone.

## Motion system
Micro 160–240ms, page reveals 300–450ms, ease-out. Reduce/disable ornamental transitions for `prefers-reduced-motion`. Avoid over-animation and heavy 3D layers impacting LCP/CLS.

## Iconography and photo rules
Use a single icon library (Lucide), monochrome strokes; no false Tesla/Apple logos. Vehicle images must have rights and exact model match or clearly labelled conceptual imagery. All catalog images signed/licensed and optimized. No unverified OEM pricing.

## Component handoff states
Every component in Figma/Stitch should show rest, hover, pressed, focus, disabled, error, loading, and empty where relevant. Document semantic labels, validation, and keyboard interactions.
