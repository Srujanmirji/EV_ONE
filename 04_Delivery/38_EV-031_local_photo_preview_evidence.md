# EV-031 — Local synthetic listing photo previews

The owner approved a local-only prototype. `LOCAL_LISTING_PREVIEWS=true` requires the existing local Clerk/media modes, a loopback API bind and a loopback storage endpoint. Use a disposable database and synthetic images only. The default API omits preview paths and returns 404 for preview requests. Production refuses opt-in.

1. The generated SDK receives ordered attachment metadata and optional preview paths. The web detail checks they match the expected attachment route and the API origin is loopback.
2. The API resolves the attachment within the published demo listing, checks seller and catalogue visibility, and accepts only the committed sanitized WebP key. It bounds reads to the existing media limit.
3. The API checks the same eligibility after storage I/O and returns no-store WebP bytes. The gallery uses the supplied alt text and shows an unavailable-message fallback for a failed image.

The S3-shaped fixture can exercise the contract and visibility rules without any cloud credentials or real listing data. The prototype does not establish live bucket or photo rights acceptance. EV-031 remains unchecked.

## Verification

| Command | Result |
| --- | --- |
| `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test:unit && pnpm build` | Passed |
| `pnpm contract:check` | Passed, generated OpenAPI and SDK match |
| `pnpm test:integration` | 261 passed (52 database and 209 API/queue). Preview tests cover binary response, invalid path, draft, wrong listing, archive, disabled/production and storage failure. |
| `pnpm --filter @evone/web test:e2e` | 256 passed, 4 existing viewport skips, with preview opt-in off |
| `git diff --check` | Passed |

The loopback database used PostgreSQL 18 with the non-spatial migrations and Redis. The local browser used installed Chromium via `PW_CHROMIUM_EXECUTABLE`. A separate browser pass enabled previews against the real Nest API and loopback storage. Chromium decoded both synthetic WebP swatches at 375px, 390px and 1280px. Enter and arrow navigation, visible focus, no horizontal overflow, and axe WCAG 2.2 AA checks passed.

- [390px](evidence/EV-031/ev031-local-preview-390.png)
- [1280px](evidence/EV-031/ev031-local-preview-1280.png)
