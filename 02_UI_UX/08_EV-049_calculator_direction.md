# EV-049 — Savings calculator direction

Mode: Operate. Date: 2026-11-04. Extension of the established EVONE system and UX-13, not a new visual identity. Authority: `UI_UX.md`, existing catalogue/shell/components/tokens and `assets/approved_ui_reference.png` (visual concept only; its sample claims are not product data).

## Direction written before implementation

Palette: Ink `#090B0F` for type/actions; Graphite `#15171C` for existing shell/footer; Paper `#FFFFFF` for controls/result surface; Pearl `#F8F9FB` for page; Secondary `#596170` for readable secondary text; Mist `#EFF1F5` for chart tracks. Reuse semantic Tailwind tokens, not raw values in components.

Type: Manrope headings/results; Inter body/controls. Existing 14/16/20/24/36/48px scale; labels may be 14px, explanatory body 16px+, tabular numerals for money. Body/help copy measures stay bounded.

Composition: input form on the left and one result panel on the right at desktop width, stacked on mobile. One primary Calculate estimate action; no hero imagery or invented commercial claims. Values are blank initially; examples require an explicitly labeled button.

```text
EV savings calculator
Inputs + Calculate  | Estimate, cost chart, payback
Assumptions         | Monthly and annual amounts
```

Signature: the horizontal petrol/diesel-versus-electricity cost comparison, using real API results with adjacent text amounts. The annual energy difference supplies the one strong typographic emphasis. Everything else stays quiet.

## Implementation and polish

Existing TextField, Button, Skeleton, EmptyState and ErrorState components are reused. Page stays a Server Component; only the interactive calculator is a client leaf. Validation and SDK network calls stay server-side.

States: initial empty instruction, illustrative example, field-invalid, pending, transport/API unavailable, successful savings, higher EV energy cost, zero driving and optional premium/payback cases. User input stays controlled through failures; edits hide stale output. Failed requests have a retry path through the same primary action.

Polish fixed focus scrolling under the sticky header and aligned form controls. Shared input/select boundaries gained a semantic `control-border` token `#747B87`, measured 4.26:1 against actual white input background. It is a border value, not secondary body text. Invalid controls keep the existing danger treatment.

375/768/1280/1920px browser checks pass; keyboard path, visible outlines, focus placement and axe were checked. Light theme only is supported; no new motion beyond the shared reduced-motion-aware loading skeleton. The restraint check found no decorative gradients/glows, redundant containers, emoji icons, arbitrary token values or unrelated animation. Two screenshot rounds (initial/confirmation) completed the bounded polish pass; mechanical Impeccable detector returned no findings.
