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
Consequences: EV-005 remains in progress until live sign-in/session/claims acceptance succeeds. EV-016/EV-017 remain pending; no dependency exception is granted. App-owned authorization stays in the EVONE API/database.
Revisit trigger: Real development-instance evidence, provider compatibility/cost/privacy issues, or production approval review.
