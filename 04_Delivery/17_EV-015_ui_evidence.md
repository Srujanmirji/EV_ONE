# EV-015 — Design tokens and components evidence

Date: 2026-11-03. Branch: `claude/vigilant-heisenberg-uoozxp`. Status: EV-015 complete.

**Done when:** tokens, buttons, inputs, cards, modals, and empty and error states exist. All are in `@evone/ui`, used by the web shell, shown at `/ui-kit`, and checked in a real browser with axe (WCAG 2.2 AA).

## Package `@evone/ui` (`packages/ui`)

| Item | File | Behaviour that matters |
|---|---|---|
| Tokens | `src/tokens.css` | Every UI_UX.md colour, font, radius, container and section spacing as Tailwind v4 theme variables; added `danger`, `danger-surface`, `success` |
| Button, `buttonClasses` | `src/button.tsx` | primary / secondary / ghost / on-dark; md (44 px) and lg (48 px); `type="button"` by default; `loading` sets `aria-busy` and disables; `buttonClasses` keeps links as real links |
| TextField, SelectField, Checkbox | `src/field.tsx` | Visible label; hint and error linked by `aria-describedby`; `aria-invalid` only when an error is present; "(required)" in text, not colour alone; checkbox unchecked by default (consent is opt-in) |
| Card | `src/card.tsx` | paper / mist / dark tones; optional interactive hover |
| Modal | `src/modal.tsx` | Native `<dialog>` + `showModal()` (inert background); Escape, backdrop and close button all call `onClose`; Tab and Shift+Tab wrap inside; focus returns to the opener |
| EmptyState, ErrorState, Skeleton | `src/states.tsx` | Empty is `role="status"` (polite); Error is `role="alert"`; Skeleton is one `aria-busy` status with hidden bars; pulse disabled under reduced motion |

The web app consumes the package source (`transpilePackages`). Tailwind scans it with `@source`, and the tokens are imported once in `globals.css`, replacing the copy that lived in the app. The header, mobile menu, coming-soon pages and 404 now use these components.

## Deviations (documented in UI_UX.md and TECH_STACK.md)

1. **`text-secondary` is `#596170`, not UI_UX.md's `#747B87`.** The specified colour is about 4.3:1 on pearl. With it, the axe scan reports contrast violations on every page (mutation check below). UI_UX.md also requires WCAG 2.2 AA, so the darker value wins.
2. **No shadcn/ui CLI or Radix.** The components follow the shadcn approach (Tailwind variants on native elements). The modal relies on the browser's native dialog plus explicit Tab wrapping, which adds no runtime dependencies.

## Defects found by the new tests and fixed

- **The first invalid field did not receive focus after a failed submit.** The code queried `aria-invalid` before React re-rendered. It now focuses by field name.
- **Tab could leave the native modal dialog** (Chromium moves focus to browser UI after the last control). Explicit wrapping was added, as the WAI-ARIA dialog pattern expects.

## Mutation checks

| Break | Result |
|---|---|
| Tab wrapping disabled (condition never true; build passes) | "modal traps focus…" fails |
| `--color-secondary` set to the spec's `#747b87` | axe fails on `/`, `/ui-kit`, 404 and every section page |
| First attempt at the Tab mutation left unreachable code | The build failed and no tests ran, so it was not counted and was redone as above |

## Tests and verification

Local runs used Node 24.18.0, pnpm 11.20.0, and full Chromium.

| Command | Actual result |
|---|---|
| `pnpm --filter @evone/ui test:unit` | 9/9 (jsdom: button type, loading, touch targets; field labelling and error wiring; unchecked consent; status, alert and skeleton semantics) |
| `pnpm test:e2e` (web) | 108 passed, 4 skipped by design: axe on 11 pages × 4 widths, modal and form behaviour × 4, ui-kit noindex and sitemap exclusion, plus the shell and preview suites |
| `pnpm verify:gates` | 18/18 probes rejected (now including @evone/ui; its Vitest includes `.test.ts` so the probe cannot be skipped) |
| `pnpm format:check`, `lint`, `typecheck`, `build`, `contract:check`, `test:integration` | Pass |

Screenshots of `/ui-kit` (with form errors shown, and with the dialog open) were inspected at 1280 px.

[Hosted Foundation checks run 41672655002](https://github.com/Srujanmirji/EV_ONE/actions/runs/41672655002) (commit `9e3341a`) passed all 20 steps on Ubuntu in about 4 minutes. These include the 18-probe gate proof and `pnpm test:e2e` (85 s) with the axe and component suites in full Chromium.

## Changed files

- `packages/ui/{package.json,tsconfig.json,vitest.config.ts,eslint.config.mjs}`, `src/{tokens.css,cn.ts,button.tsx,field.tsx,card.tsx,modal.tsx,states.tsx,index.ts,components.test.tsx}`.
- `apps/web`: `next.config.ts`, `app/globals.css`, `app/page.tsx`, `app/not-found.tsx`, `app/ui-kit/{page,ui-kit}.tsx`, `components/{site-header,nav-client,coming-soon}.tsx`, `tests/ui-kit.spec.ts`, `package.json` (`@evone/ui`, `@axe-core/playwright`).
- Workspace: `pnpm-lock.yaml`, `scripts/verify-quality-gates.mjs`.
- Documentation: `UI_UX.md`, `TECH_STACK.md`, `TASKS.md`, this record.

## Remaining gaps

- **No Toast component yet** (02_screen_specs mentions "toast after save"). Add it with the first save flow.
- **No filter bottom sheet for mobile** (UX-02). Build it with EV-024 or EV-030 on top of `Modal`.
- **One light theme only**, matching the approved reference.
- **EV-004 sign-off may change token values;** components read tokens only.

## Rollback

Revert the EV-015 commits. UI only; no data or API change.
