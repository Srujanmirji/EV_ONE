# Decisions, Assumptions, and Open Questions

All undecided decisions have an owner/date and block relevant implementation. The team should not silently fill these gaps with guesses.

| ID | Decision | Current baseline | Owner / action | Gate |
|---|---|---|---|---|
| ADR-001 | Architecture | modular NestJS monolith, REST, Next.js web; owner approved 2026-11-03 | accepted; EV-009 exception recorded below | before scaffold |
| ADR-002 | Brand | EVONE **working name**, reference image EVONE | founder legal/trademark check | before public launch |
| ADR-003 | Auth vendor | Clerk development spike approved 2026-11-04; production acceptance pending | live sign-in/cookie/claims checks; [decision packet](../04_Delivery/26_EV-005_auth_decision.md) | before EV-016 |
| ADR-004 | MVP commerce merchant | first-party accessories | founder ops/tax/shipping review | before checkout |
| ADR-005 | Vehicle transaction | contact-only for used EVs | product/legal | locked MVP |
| ADR-006 | Charging source | licensed Places/CPO source; no assumed live coverage | provider/terms analysis | before EV-051 |
| ADR-007 | Finance/insurance | informational + consented leads only after legal/partner approval | lawyer/partner lead | before EV-059/060 |
| ADR-008 | Pilot cities | one city/region; Hubli–Dharwad an option | founder interviews | before ads/inventory |
| ADR-009 | Catalogue content | curated sourced data (no unreviewed auto scrape) | editor | before content launch |
| ADR-010 | Battery inspection badge | independent signed report only | partner QA | before P1 marketing |
| ADR-011 | Search | PostgreSQL FTS/trigram first | engineer measures | MVP |
| ADR-012 | Prisma/PostGIS | **accepted** 2026-11-03 (option A): Prisma 7.10.1, `Unsupported` geography + raw spatial SQL; host PostGIS unverified | verify deployment host PostGIS | before production migration |
| ADR-013 | App | website first, Expo later | founder revisit after pilot | P1 |
| ADR-014 | Pricing | experiment after evidence; no fixed listing subscription price | business lead | pilot |
| ADR-015 | Retention/privacy | define exact retention, breach and deletion policy with legal counsel | legal + security | production gate |
| ADR-016 | Payment gateway | Razorpay for accessories and future paid promotions | finance/engineering review | EV-045 |

### EV-003 — Open-source software license

Date: 2026-11-05 | Status: MIT license adopted at owner request; broader IP review pending

Context: The owner requested verification of public visibility and an appropriate open-source license before applying to Codex for Open Source. GitHub's repository API reports `private: false`, `visibility: public` and no detected license before this change.

Decision: Use the standard MIT license for original EVONE source code and documentation, with copyright © 2026 Srujan Mirji (the local author name). MIT keeps reuse simple and allows commercial/proprietary forks with notice retention. Apache-2.0 adds an express patent grant; copyleft licenses require source sharing in defined circumstances. Neither additional policy was requested.

Scope: Root `LICENSE`, `package.json` SPDX identifier and README licensing section. The two reference PNGs in `assets/` are excluded pending documented reuse rights; dependencies and third-party content keep their own licenses. No brand/trademark or third-party data rights are granted. No runtime code, database or provider configuration changes.

Verification: Compared the license text with the SPDX MIT template, substituting only year/holder; validated root package JSON and checked the added diff for whitespace errors. No application tests are needed for this documentation/metadata change. Remote license detection must be verified after pushing the licensing-only commit. EV-003 remains open for brand/domain/trademark and image-rights checks.

Revisit trigger: Verified image provenance, contribution ownership concerns, an explicit patent-license requirement or a decision to require reciprocal source sharing.

## Assumptions to validate
- Used EV supply and buyer intent exist in initial market.
- Buyers are willing to contact sellers through EVONE rather than direct platforms.
- Dealers will allow publication of accurate inventory photos and prices.
- Compatible accessories can be fulfilled reliably by an identifiable merchant.
- Third-party charger coverage is sufficient in launch geography.
- Loan/insurance partner arrangement can legally operate in intended form; otherwise **disable those journeys**.
- Brand EVONE is available; currently unverified.

## Decision record template
```markdown
### ADR-0XX — Title
Date: YYYY-MM-DD | Status: proposed/accepted/superseded
Context: ...
Options: A, B, C
Decision: ...
Why: ...
Consequences: ...
Revisit trigger: ...
```

### ADR-001 — Foundation architecture approval
Date: 2026-11-03 | Status: accepted
Context: The workspace contains the blueprint only. The owner approved the proposed visual direction and Next.js/NestJS architecture in chat.
Decision: Use Next.js App Router for the web and a modular NestJS API when EV-012 begins. Begin EV-009 with a limited exception to its EV-004 prerequisite. EV-004 remains open; this is not core-screen sign-off.
Consequences: Scaffold only the workspace and minimal buildable web consumer. Do not infer approval for vendor integrations or for EV-062, whose other dependencies remain unsatisfied. Keep the approved visual proposal in `04_Delivery/07_initialization_audit.md` as the foundation direction.
Implementation note (EV-014, 2026-11-04): the already-approved separate BullMQ worker uses a NestJS application-context entry in `apps/api`, reusing its build and dependencies; there is no new service beyond the approved API + worker architecture.
Revisit trigger: A proposed architecture change or completion of EV-004.

### ADR-012 — Prisma with PostGIS
Date: 2026-11-03 | Status: accepted (owner approved option A in chat, 2026-11-03)
Context: EV-013 needs a pinned ORM with PostGIS for SRID 4326 charger points. `DATABASE.md` implied current Prisma had first-class PostGIS support. Spike evidence: `04_Delivery/11_ADR-012_prisma_postgis_spike.md`.
Options: A) Prisma 7.10.1 with `Unsupported("geography(Point, 4326)")` columns, GiST indexes in the schema, and spatial reads/writes via parameterised raw SQL. B) Drizzle ORM, which has native PostGIS column types, replacing Prisma throughout. C) Prisma for everything except a separate query builder for spatial tables.
Decision: A. Pin `prisma`, `@prisma/client` and `@prisma/adapter-pg` at 7.10.1 with the `postgresqlExtensions` preview feature.
Why: Migrations, drift detection, repeat deploys, GiST index use and coordinate round trips all passed against PostgreSQL 17.5 / PostGIS 3.5.2. Spatial code is confined to charging (gated by ADR-006), so a contained raw-SQL repository is cheaper than switching ORMs (B) or running two data layers (C).
Consequences: Geography columns must be nullable, because a required `Unsupported` column removes `create()` from the client. Spatial SQL lives in one charging repository, with integration tests against real PostGIS. Local databases are created from `template0` with only `postgis`, because extra extensions break `migrate dev`. Prisma 7 refuses agent-run `migrate reset` without explicit user consent; agents use fresh databases instead.
Open gate: confirm PostGIS 3.x is available on the chosen production Postgres host before the first production migration.
Revisit trigger: Prisma ships native PostGIS types or Prisma 8 goes stable; spatial queries spread beyond charging; host lacks PostGIS.


### ADR-003 — Clerk development spike
Date: 2026-11-04 | Status: accepted for development spike; production acceptance pending
Context: The owner selected “Clerk development spike” and confirmed no development instance exists, authorizing local implementation/testing.
Decision: Use pinned Clerk SDKs for an isolated, opt-in development-only sign-in scaffold and local token verification tests. No account provisioning, paid plans, production auth guard or RBAC is included.
Evidence: `04_Delivery/26_EV-005_auth_decision.md`. Local tests use ephemeral synthetic keys and a loopback JWKS server, plus mocked UI sessions; no provider-issued identity is claimed.
Consequences: EV-005 remains in progress until live sign-in/session/claims acceptance succeeds. EV-017 remains pending. A later owner-approved exception permits EV-016 local work only, as recorded below. App-owned authorization stays in the EVONE API/database.
Revisit trigger: Real development-instance evidence, provider compatibility/cost/privacy issues, or production approval review.


### EV-016 — Local-only prerequisite exception
Date: 2026-11-04 | Status: owner approved
Context: EV-005 has a verified local Clerk spike but no development instance. The owner explicitly selected “Proceed with local-only EV-016 exception”.
Decision: Implement and test the API bearer guard, strict token validation and a protected status-only endpoint locally before EV-005 live acceptance. Production refuses enabled local auth, and neither EV-005 nor EV-016 is marked complete without remaining acceptance evidence.
Consequences: No accounts, role assignments, DB writes, global auth middleware, new service or production auth enablement. EV-017/RBAC is outside this EV-016 exception; a separate EV-017 exception is recorded below. Live sign-in/claims, revocation/rotation and web/API flow remain unverified.
Evidence: `04_Delivery/27_EV-016_local_auth_evidence.md`.
Revisit trigger: Real development instance and verified provider/web/API flow, or a proposed production rollout.


### EV-017 — Local-only RBAC/audit prerequisite exception
Date: 2026-11-04 | Status: owner approved
Context: The owner explicitly instructed: “Proceed with local-only EV-017, keep production auth disabled and live acceptance pending”. EV-005 and EV-016 still await real Clerk acceptance.
Decision: Add app-owned identity mappings and scoped grants, an audited scope-read probe and local/database integration tests. Keep production auth disabled and task completion pending unverified acceptance. No provisioning API, grant-management API, production rollout or business-domain mutation policy is included.
Consequences: New identity/grant/audit tables and Prisma's partialIndexes preview feature (supported by pinned 7.10.1) are required. All new tables start empty; no existing catalogue data is backfilled or changed. Dealer scopes are opaque grant UUIDs, not approved dealer profiles or the EV-066 membership lifecycle. Normal audit DML/TRUNCATE is blocked; database owners remain an operational trust boundary.
Evidence: `04_Delivery/28_EV-017_local_rbac_evidence.md`. Native PostgreSQL migration/drift/rollback and full CI passed on PR #14; live-provider acceptance remains pending. This exception does not authorize later tasks.
Revisit trigger: Passing database CI, real auth acceptance, or introduction of protected business mutations/production deployment.

### EV-020 — Local-only media foundation, no R2 bucket
Date: 2026-11-04 | Status: owner approved
Context: The owner answered “No bucket yet; implement and test locally”. EV-012 is complete; local identity/RBAC has passed hosted CI, with live Clerk acceptance still pending.
Decision: Implement private image upload signing, owner-specific action checks, bounded validation/re-encoding and temporary owner read URLs against a synthetic local S3 HTTP fixture. Default media mode remains disabled; enabled mode refuses production/non-loopback API binds and requires local Clerk mode. No cloud provisioning, public gallery publishing, production rollout or scan-provider integration is authorized.
Consequences: Add MediaAsset state and nullable audit resource UUID; actual mutations/audit append commit together. Use distinct output keys per completion attempt so expired transactions cannot overwrite a committed object. The approved R2 stack uses AWS SDK SigV4; Sharp is already installed through Next and becomes an explicit API dependency. Decoding/re-encoding is not AV certification. Bucket privacy, CORS, signed-header enforcement, expiry, lifecycle cleanup and live auth require later evidence; task remains in progress.
Evidence: `04_Delivery/29_EV-020_local_media_evidence.md`.

### EV-022 — Local-only catalogue editor prerequisite exception
Date: 2026-11-04 | Status: owner approved; local checks recorded 2026-11-05
Context: The owner selected “Proceed with local-only EV-022 exception”. EV-021 is complete and the local auth/RBAC foundation has passed hosted CI; live Clerk acceptance remains pending.
Decision: Add new-entry catalogue drafts and forms, owner-controlled save/submit, a different admin’s explicit source review, rejection/resubmission and atomic publication as demo data. Keep production auth disabled and task completion pending remaining acceptance. Drafts never edit public rows; approved snapshots are immutable and version checks reject stale actions. No existing published model editing, public provisioning or role-management UI is included.
Consequences: One draft table with restricted owner/reviewer/model FKs, state constraints and snapshot retention; fixed catalogue audit actions. Existing SQL provenance/publish guards remain authoritative. Concurrent slug conflicts retry once so a policy-conflict denial can be audited. Availability/date remain UNKNOWN/null until model-level provenance is added. Reuse the local Clerk configuration and existing UI system; the editor page requires its own development-only opt-in. No service or project dependency is added. Temporary native PostgreSQL tooling and browser fixtures live outside the repository.
Evidence: `04_Delivery/31_EV-022_catalogue_editor_evidence.md` and the scoped plan. Live sign-in/session acceptance and hosted PostgreSQL 17/PostGIS CI remain pending; this exception does not authorize other later tasks or production rollout.


### EV-014 / EV-019 — Preserve PR #22 monitoring behavior

Date: 2026-11-05 | Status: owner authorized
Context: The owner requested adapting the three useful PR #22 additions to current main, testing them and closing the superseded PR, while preserving local changes and avoiding assistant commit attribution.
Decision: Keep the existing NestJS worker entry and telemetry allowlist. Add a private worker health listener, one timestamp outside BullMQ's job namespace, and retry warnings distinct from terminal error reports. No new workspace packages, dependencies, public API or customer data are introduced. Failed-job retention stays bounded. No external Sentry project is configured; EV-019 remains in progress pending real issue/alert acceptance.
Evidence: `04_Delivery/33_EV-014_worker_monitoring_evidence.md`. Implementation and tests use an isolated clone; the original working tree is not modified.
