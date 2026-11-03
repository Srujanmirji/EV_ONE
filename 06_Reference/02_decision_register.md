# Decisions, Assumptions, and Open Questions

All undecided decisions have an owner/date and block relevant implementation. The team should not silently fill these gaps with guesses.

| ID | Decision | Current baseline | Owner / action | Gate |
|---|---|---|---|---|
| ADR-001 | Architecture | modular NestJS monolith, REST, Next.js web; owner approved 2026-11-03 | accepted; EV-009 exception recorded below | before scaffold |
| ADR-002 | Brand | EVONE **working name**, reference image EVONE | founder legal/trademark check | before public launch |
| ADR-003 | Auth vendor | managed auth, Clerk candidate | prototype and cost/privacy review | before EV-016 |
| ADR-004 | MVP commerce merchant | first-party accessories | founder ops/tax/shipping review | before checkout |
| ADR-005 | Vehicle transaction | contact-only for used EVs | product/legal | locked MVP |
| ADR-006 | Charging source | licensed Places/CPO source; no assumed live coverage | provider/terms analysis | before EV-051 |
| ADR-007 | Finance/insurance | informational + consented leads only after legal/partner approval | lawyer/partner lead | before EV-059/060 |
| ADR-008 | Pilot cities | one city/region; Hubli–Dharwad an option | founder interviews | before ads/inventory |
| ADR-009 | Catalogue content | curated sourced data (no unreviewed auto scrape) | editor | before content launch |
| ADR-010 | Battery inspection badge | independent signed report only | partner QA | before P1 marketing |
| ADR-011 | Search | PostgreSQL FTS/trigram first | engineer measures | MVP |
| ADR-012 | Prisma/PostGIS | pin and test current extension against host | tech lead spike | before DB migration |
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
Revisit trigger: A proposed architecture change or completion of EV-004.
