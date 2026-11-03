# EV-009 — Workspace foundation evidence

Date: 2026-11-03. Initial branch: `feat/EV-009-monorepo`, renamed to `main` at the owner's request. Status: EV-009 complete.

## Scope and approval

Owner approved the proposed visual direction, Next.js/NestJS architecture and a limited EV-009 exception on 2026-11-03. Accepted ADR-001 records the exception. EV-004 remains open. EV-009 adds the workspace, one runnable web preview and the shared configuration it consumes. The full web shell, API and component library remain EV-011, EV-012 and EV-015.

## Changed files

- Root: `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `turbo.json`, `.node-version`, `.npmrc`, `.gitignore`, `.env.example`, `.prettierrc.json`, `.prettierignore`.
- CI: `.github/workflows/ci.yml` (frozen install, format/lint/typecheck/build, Chromium smoke tests, browser artifacts; read-only repository permissions).
- Shared package: `packages/config/package.json`, `packages/config/nextjs.json`.
- Web: `apps/web/package.json`, `tsconfig.json`, `next-env.d.ts`, `next.config.ts`, `eslint.config.mjs`, `postcss.config.mjs`, `playwright.config.ts`, `app/globals.css`, `app/layout.tsx`, `app/page.tsx`, `app/not-found.tsx`, `tests/preview.spec.ts`.
- Documentation: `README.md`, `PROJECT_SETUP.md`, `TASKS.md`, `06_Reference/02_decision_register.md`, `04_Delivery/07_initialization_audit.md`, this record.

## Pinned and tested stack

Node 24.18.0; pnpm 11.20.0; Turbo 2.11.10; Next.js 16.4.4; React/React DOM 19.3.1; TypeScript 6.0.3; Tailwind/PostCSS plugin 4.3.4; PostCSS 8.5.32; ESLint 9.39.5; Next ESLint configuration 16.4.4; Prettier 3.9.10; Playwright 1.64.1; Fontsource variable Inter/Manrope 5.3.0. Exact transitive dependencies are locked.

Next's lint plugins currently declare ESLint 9 compatibility; ESLint 10 initially produced peer warnings, so the scaffold pins the compatible 9.x release. pnpm recorded exact Tailwind release-age exceptions during installation; they are scoped in the workspace file rather than disabling its policy globally. No private vendor credentials or services are used.

## Verification

Local results below are verified on macOS. The owner subsequently authorized adding `https://github.com/Srujanmirji/EV_ONE.git`, renaming the branch to `main` and pushing. The remote was empty on inspection. Initial commit `b7a5ba927f70c69dc97a133d5b1fd070a1c1b806` was pushed successfully, with `main` tracking `origin/main`.

[Hosted Foundation checks run 41651932287](https://github.com/Srujanmirji/EV_ONE/actions/runs/41651932287) passed on Ubuntu: frozen install, format, lint, typecheck, production build, Chromium setup, browser tests and artifact upload. `gh run watch 41651932287 --repo Srujanmirji/EV_ONE --exit-status --interval 10` exited 0; the verify job completed in 52 seconds. This satisfies EV-009's CI gate. A follow-up updates the actions to the current official releases (checkout 7.0.1, pnpm/action-setup 6.1.1, setup-node 7.1.0, upload-artifact 7.0.2) to remove the deprecated Node 20 action runtime warning; its run is visible in the repository's Actions history.

| Command / check | Actual result |
|---|---|
| `pnpm install --frozen-lockfile` | Pass, all 3 workspace projects, lockfile unchanged |
| `pnpm peers check` | No peer dependency issues |
| `pnpm format:check` | Pass, all matched files |
| `pnpm lint` | Pass, zero warnings |
| `pnpm typecheck` | Pass, Next route generation and strict TypeScript |
| `pnpm build` | Pass, static `/` and `/_not-found` |
| `pnpm --filter @evone/web exec playwright install chromium` | Pass |
| `pnpm test` | 8 passed; production server on port 3100; Chromium at 375, 768, 1280 and 1920 px |
| `pnpm dev` and local HTTP smoke | Ready at `http://127.0.0.1:3000`; GET `/` returns HTTP 200 |
| Impeccable `detect.mjs --json` on the four app UI files | `[]`, no deterministic issues |
| Rendered browser contrast/font check (Node + Playwright assert script) | Both font families loaded; heading 17.93:1, dark supporting copy 11.11:1, light supporting copy 5.92:1 |

The browser suite checks truthful preview copy, title, noindex metadata, runtime/console errors, horizontal overflow, visible keyboard focus, skip-link focus transfer, real HTTP 404 and keyboard navigation home. Screenshots were visually inspected at 375 and 1280 px; all four widths were captured. No layout defect required another UI edit. The frontend-ui restraint checklist passes: no ornamental gradients, blur, animation, repeated cards or fabricated claims. Only one theme exists.

Screenshots (generated and Git-ignored): `apps/web/test-results/preview-preview-renders-ho-50429-and-supports-keyboard-entry-{mobile,tablet,desktop,wide}/preview.png`. CI uploads its browser evidence as `browser-evidence`.

Initial validation caught and corrected a 404 skip-link target omission, a PostCSS anonymous-export lint warning and an invalid Fontsource stylesheet path. The initial failed commands were `pnpm lint` and `pnpm build`; they are not counted as passes.

## State and accessibility scope

The root is a static, truthfully labelled preview, with no async data surfaces or forms. It is the unavailable-inventory state, not a functional marketplace. Loading, submission, auth and provider failure states become applicable in the tasks that introduce those operations. Unknown paths have a real HTTP 404 with keyboard recovery. The web app has a single light theme with a dark content panel, semantic landmarks, a skip link, visible focus and no motion.

Fonts are bundled locally. No concept screenshot is served as a working interface, no photos have been repurposed for listings, and no verified claims, counts, prices or partner offers are shown. Monitoring for this task is build/CI failures plus browser console/page-error assertions; production telemetry remains EV-019.

## Post-acceptance audit fixes (2026-11-03)

- Full Chromium requested `/favicon.ico` and logged a 404 console error, failing the preview test in every viewport; the headless shell used by CI does not request favicons, so CI stayed green. Added `apps/web/app/icon.svg` (original monogram) and asserted the declared icon returns 200 `image/svg+xml`.
- `apps/web/next-env.d.ts` is generated and was rewritten by every build, dirtying the tree. It is now gitignored; `pnpm typecheck` (`next typegen`) regenerates it.
- Verified locally: format, lint, typecheck and build pass; 8/8 Playwright tests pass against full Chromium.
- Known gap: `engine-strict=true` only warns for the root `engines.node` mismatch under pnpm 11; Node 24.18.0 is enforced in CI via `.node-version` only.

## Remaining gates

- EV-004 core-screen sign-off remains open.
- EV-010 tooling acceptance remains separate despite the minimal scripts needed by this scaffold.
- No API, database, auth, payments, charging, finance, inventory or homepage search implementation.
- No `.Codex/rules/ecc/web/tailwind.md` or `design-quality.md` was found at the supplied paths. The approved local frontend-ui rules and blueprint tokens were used.

## Rollback

Stop the local server and remove the added workspace files if abandoning the scaffold. No remote deployment, migration, external data mutation or user-data collection occurred. Existing blueprint files were preserved in place; their original archive manifest is not a live integrity manifest.
