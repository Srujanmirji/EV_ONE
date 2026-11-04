# EV-005 — Authentication decision and spike plan

Date: 2026-11-04. Branch: `codex/EV-005-auth-decision`. Status: owner selected Clerk for a development spike and authorized local implementation/testing with no instance. Runnable local spike implemented; real sign-in evidence pending. No production auth guards or RBAC.

## Recorded development decision

The owner selected **Clerk for a development spike**, using email verification first. This is an engineering judgment based on the existing Next.js/NestJS split, Clerk's documented App Router integration and its existing candidate status in ADR-003. It is not a production procurement, privacy or residency approval. Supabase Auth is a credible alternative if its broader project/operations model is preferred.

| Criterion | Clerk | Supabase Auth |
|---|---|---|
| Web integration | Official Next.js SDK and prebuilt sign-in/sign-up components | Official SSR client/cookie flow; application assembles the sign-in experience |
| API verification | SDK supports configured issuer, audience and authorized parties (`azp`); templates can issue custom audience tokens | Asymmetric signing keys expose JWKS; validate issuer/audience/signature/expiry with a maintained library |
| Fit with current design | Dedicated managed identity provider; business records remain in EVONE PostgreSQL | Can supply identity, but does not replace the existing Prisma/Nest ownership boundary; broader Supabase adoption needs a separate decision |
| Published free usage limit | 50,000 monthly retained users per app | 50,000 monthly active users; free projects pause after one week of inactivity |
| Cost caveats | MRU is not MAU; pricing lists MFA and SMS availability under Pro. Verify paid plan, SMS country coverage and delivery costs before enabling them | Production Pro starts at $25/month; Auth email/SMS delivery and provider quotas need separate validation |
| Unverified for EVONE | Real instance, delivery, region/subprocessors, deletion/export, production MFA plan and cost | Same operational/privacy checks, plus SMTP and any SMS provider setup |

Pricing was read from official pages on 2026-11-04; limits/fees are subject to change. Neither free quota establishes total cost or production suitability. Do not enable paid plans, SMS or real customer onboarding as part of this proposal.

## Proposed implementation model after selection

- Next.js owns sign-in and session handling through the selected provider's documented SDK. No access/refresh tokens in localStorage or URLs. Preserve provider-prescribed cookie protections; do not claim every SDK cookie is HttpOnly. Clerk documents a JavaScript-set `__session` cookie alongside a protected client cookie, which must be reviewed in the spike.
- Prefer the existing server-to-server path for authenticated web actions: validate the web session, obtain an API-scoped token server-side and send it as an Authorization bearer header to Nest. Keep secret keys server-only and separate development/production instances.
- API pins the expected issuer, audience, accepted algorithm and trusted key source in private configuration. Reject missing/invalid/expired/not-yet-valid tokens, wrong issuer/audience and unknown keys. Never derive the JWKS URL from an untrusted token.
- For Clerk, explicitly configure the API audience rather than assuming the default session token contains it. The documented JWT-template flow can set `aud`; verify the actual issued token and current SDK behavior before choosing that mechanism. Check authorized frontend parties where relevant. A decoded token is not authentication.
- Use provider identity only to identify the actor. App-owned roles, resource ownership and dealer membership stay server-enforced in EV-017; do not trust user-editable metadata for privileges. EV-016/017 own production guards, identity records and RBAC.
- Auth stays unavailable if configuration is missing. Public catalogue/calculator routes continue to work. Return safe errors without tokens, email addresses, raw provider failures or personal data in logs. No auth database migration is part of EV-005.

## Smallest complete spike and acceptance evidence

With Clerk selected, use an isolated development configuration and the supported SDK versions compatible with the pinned Next.js/React/Node versions. Record exact versions and required environment variable names, never values.

1. **Sign-in:** prove a development sign-up/sign-in, signed-in page/server action, sign-out and rejected stale session; check reload, canceled flow, delivery failure and accessible recovery. Use only owner-approved development identities and avoid PII in screenshots/logs. If no instance is available, local fixtures can prove handling, but must not be reported as a successful provider sign-in.
2. **JWT:** use maintained verification code with a loopback JWKS test server and ephemeral test keys; prove valid token, tamper, expiry, future `nbf`, wrong issuer/audience/algorithm, unknown `kid`, unavailable JWKS and rotation. Ephemeral local fixtures do not prove the provider's actual claims or revocation behavior.
3. **Session/security:** inspect actual cookie flags, safe redirect destinations, trusted origins, cache isolation and CSRF protection for cookie-authenticated mutations. Check logout/revocation limits rather than assuming a signed token revokes immediately.
4. **Operations:** document email delivery, allowed domains/redirects, MFA/privileged-user plan, quota/cost controls and deletion/export flow. Production region, retention and provider terms remain explicit owner/legal checks.
5. **Completion:** record evidence and the accepted ADR-003 choice only after the vendor decision and sign-in/JWT spike pass. Until then EV-005 remains in progress and EV-016/017 remain blocked.

An isolated `/auth-spike` SDK page and pinned-key token probe are implemented behind development-only configuration. No global auth provider/middleware, production guard, identity database or RBAC has been added. Real provider sign-in remains unverified, so EV-005 is not complete.

## Official references

- [Clerk Next.js App Router quickstart](https://clerk.com/docs/nextjs/getting-started/quickstart)
- [Clerk token verification options](https://clerk.com/docs/reference/backend/verify-token)
- [Clerk JWT templates and custom audience](https://clerk.com/docs/guides/sessions/jwt-templates)
- [Clerk session/cookie architecture](https://clerk.com/docs/guides/how-clerk-works/overview)
- [Clerk pricing](https://clerk.com/pricing)
- [Supabase SSR authentication](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Supabase JWT verification and JWKS](https://supabase.com/docs/guides/auth/jwts)
- [Supabase pricing](https://supabase.com/pricing)


## Local implementation evidence

- Pinned `@clerk/nextjs` 7.9.24 and `@clerk/backend` 3.26.6; declared Node/Next/React ranges match this workspace. Added the same jsdom/React Testing Library versions already used by `@evone/ui` to the web test dependencies. No new DOM test framework is retained.
- `lib/auth-spike/config.ts`: production/test disabled regardless of flag; opt-in, matching test instance/publishable key, loopback-only origin and RSA-2048 public-key validation. Blank/bad config never instantiates Clerk.
- `lib/auth-spike/verify.ts`: actual SDK signature/issuer/audience/authorized-party checks, pinned RS256 public key, explicit nonempty subject/audience and safe time checks. Tests found SDK tolerance for missing audience, empty subject and extreme invalid-Date timestamps; wrapper regressions close those gaps.
- `app/auth-spike`: real SDK sign-in/up scaffold, loading/failed/degraded/unconfigured states. Signed-in UI offers same-origin boolean-only token verification and sign-out, accurate pending labels and safe retry. Checker state is keyed to the Clerk session, so old results/in-flight completion do not migrate to a replacement session.
- POST probe: exact Origin, no-store, bounded bearer and safe status-only responses. Production 404, missing config 503, wrong origin 403, invalid token 401. No raw token/identity logging, persistence or permissions granted.
- JWKS tests switch actual ephemeral keypairs, reject unknown keys and fail on unavailable loopback endpoints. These exercise the SDK only; the probe itself uses a manually pinned public key.

| Command/check | Result |
|---|---|
| `pnpm lint`, `pnpm typecheck`, `pnpm test:unit` | Pass across workspace; **201 unit tests**, including 85 web (44 local auth/config/route/JWKS cases and four component session/retry cases) |
| `pnpm --filter @evone/web build` | Pass production build, no instance/keys needed |
| `DATABASE_URL=postgresql://unused@127.0.0.1:1/unused pnpm --filter @evone/web exec playwright test tests/auth-spike.spec.ts tests/preview.spec.ts --config playwright.auth-local.config.ts` | 16 pass at 375/768/1280/1920: production auth 404 plus homepage/navigation regression |
| `AUTH_SPIKE_LOCAL_TEST=true DATABASE_URL=postgresql://unused@127.0.0.1:1/unused pnpm --filter @evone/web exec playwright test tests/auth-spike.spec.ts --config playwright.auth-local.config.ts` | Four pass in development: honest unconfigured state, no provider requests, axe WCAG 2.2 AA, keyboard, viewport, safe 503 |
| Impeccable detector on two UI source files | `[]`; 375/1280 screenshot inspection found skip-link focus could obscure the heading beneath sticky nav. Added scroll offset and a browser assertion; one confirmation round passed |

The temporary browser config inherited the normal four projects, two workers and only a web server (no API/database required). It used `pnpm start --port 3100` for the production check with the spike flag true, then `pnpm dev --port 3100` with the flag true and no publishable key for the development check. It was removed after use. No live sign-in was simulated as provider evidence.

Read-only security/integration review approved the boundaries. TypeScript review found the date bypass and React review found stale-session/busy-label issues; fixes and regressions were reviewed and approved. Source-level production auth behaviour remains unchanged outside the isolated routes. No broader decorative redesign or extra theme was introduced.

Remaining: no live application, real sign-in/delivery/cookie/logout/CSRF/provider-UI verification, new hosted CI or deployment verification. Production guard/RBAC and database migrations are out of scope. Keep EV-005 in progress and total completed tasks at 16/87. Setup and pending acceptance are in `PROJECT_SETUP.md`.

Next.js `dev` generated `apps/web/AGENTS.md`; its maintained instruction block is retained, and the bundled route-handler, notFound and Server/Client Component guidance was consulted.
