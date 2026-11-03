# EV-010 — Lint, typecheck, format and unit tooling evidence

Date: 2026-11-03. Branch: `claude/vigilant-heisenberg-uoozxp`. Status: EV-010 complete.

**Done when:** CI fails invalid types and formatting. Proven by a CI step that injects broken probe files and requires each gate to fail, plus a clean run where every gate passes.

## Changed files

- Root: `package.json` (`test`, `test:unit`, `test:e2e`, `verify:gates`), `turbo.json` (`test:unit`, `test:e2e` with `PW_CHROMIUM_EXECUTABLE`/`CI` passthrough), `pnpm-workspace.yaml` (`engineStrict`, `saveExact`), `pnpm-lock.yaml`, `.npmrc` removed.
- CI: `.github/workflows/ci.yml` adds `pnpm test:unit`, `pnpm verify:gates` and `pnpm test:e2e`.
- Gate proof: `scripts/verify-quality-gates.mjs`.
- Web: `apps/web/package.json` (Vitest 5.0.5, split test scripts), `vitest.config.ts`, `lib/site-metadata.ts`, `lib/site-metadata.test.ts`, `app/layout.tsx` (consumes the metadata module), `playwright.config.ts` (full Chromium channel, optional executable override).
- Documentation: `README.md`, `PROJECT_SETUP.md`, `TASKS.md`, this record.

## Decisions

- **Vitest** (TECH_STACK.md) for unit tests, co-located as `*.test.ts`. The first test guards a product rule rather than padding coverage: the preview must stay `noindex, nofollow`, be labelled as a preview, and disclose that discovery and transactions are unavailable.
- **pnpm settings moved to `pnpm-workspace.yaml`.** pnpm 11 ignored `engine-strict` in `.npmrc`: on Node 22.23.4 an install only warned. With `engineStrict: true` in the workspace file the same install exits 1; on Node 24.18.0 it succeeds.
- **Playwright uses full Chromium** (`channel: "chromium"`). The default headless shell never requests a favicon, which hid a real 404 until the EV-009 audit.

## Verification

Local runs used Node 24.18.0 and pnpm 11.20.0 on Linux, with `PW_CHROMIUM_EXECUTABLE` pointing to the sandbox's preinstalled Chromium.

| Command / check | Actual result |
|---|---|
| `pnpm install --frozen-lockfile` (Node 22.23.4) | Exit 1, engine mismatch, as intended |
| `pnpm install --frozen-lockfile` (Node 24.18.0) | Pass |
| `pnpm format:check` | Pass |
| `pnpm lint` | Pass, zero warnings |
| `pnpm typecheck` | Pass |
| `pnpm build` | Pass: `/`, `/_not-found`, `/icon.svg` |
| `pnpm test` | Unit 3/3 passed; e2e 8/8 passed at 375, 768, 1280 and 1920 px |
| `pnpm verify:gates` | typecheck exit 2, format:check exit 1, lint exit 1, test:unit exit 1 on probes; script exit 0 |

[Hosted Foundation checks run 41655114949](https://github.com/Srujanmirji/EV_ONE/actions/runs/41655114949) passed on Ubuntu for commit `6274ab9`: frozen install, format, lint, typecheck, unit tests, build, gate proof, Chromium install and 8/8 browser tests. The gate-proof step can only succeed if all four gates reject their probes.

## Remaining gaps

- The gate proof covers the web app only; EV-012 must add the API package to the same script.
- No coverage threshold is set: there is too little logic for a percentage to mean anything yet.
- Pre-commit hooks were not added; CI is the enforcing gate.
- Contract checks (`contract:check`) and integration tests belong to EV-018 and EV-013/EV-014.

## Rollback

Revert the EV-010 commits. No deployment, migration or external data change occurred.
