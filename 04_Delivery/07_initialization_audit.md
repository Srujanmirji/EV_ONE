# Initialization audit and foundation proposal

Date: 2026-11-03. Status: owner approved visual direction, Next.js/NestJS architecture and limited EV-009 exception. EV-009 is verified locally and in hosted CI. See accepted ADR-001 and `08_EV-009_foundation_evidence.md`.

## Workspace audit

- The blueprint is at the repository root, rather than inside an `EVONE_Startup_Blueprint` directory.
- Found 43 Markdown specifications, a checksum manifest and both approved visual references. No application source, package manifests, lockfile, CI or Git repository exists.
- Local commands: `node --version` → `v24.18.0`; `pnpm --version` → `11.20.0`; `git status --short --branch` → fails because Git is not initialized.
- The baseline consistently specifies Next.js/React/TypeScript/Tailwind/shadcn web, NestJS modular monolith, shared Zod contracts, PostgreSQL/PostGIS and web-first delivery. No stack replacement is needed.
- Auth selection, charger licensing, finance partner approval and merchant operations remain unresolved. They do not require credentials for a local workspace scaffold; their integrations must wait for their own gates.

## Dependency conflict and proposed resolution

`TASKS.md` makes dependencies hard: EV-009 requires EV-004, which has no signed-off desktop/mobile core-screen deliverables. The supplied images are approved style references, not evidence that all EV-004 acceptance criteria are complete. ADR-001 also requests architecture approval before scaffold.

Proposed owner exception: authorize **EV-009 only**, using the documented architecture and existing visual baseline, while leaving EV-004 unchecked. Record approval in the decision register before implementation. Do not infer approval from this proposal.

EV-062 requires EV-015, EV-030 and EV-025. Foundation completion alone does not authorize the homepage task. Preserve that dependency chain; do not create pretend listings or search results to bypass it.

## Visual direction for confirmation

Reference: `assets/approved_ui_reference.png`, with `assets/homepage_hero_reference.png` supplying the hero composition. These images are design references, not production photography or factual inventory.

| Palette token | Value | Role |
|---|---|---|
| Ink | `#090B0F` | headings, primary action, keyboard focus on light surfaces |
| Graphite | `#15171C` | cinematic panels and footer |
| Paper | `#FFFFFF` | cards, light text on dark surfaces |
| Pearl | `#F8F9FB` | main content background |
| Titanium | `#C7CCD4` | decorative metallic accents, never body copy |
| Secondary text | `#596170` | readable supporting text on Paper/Pearl |

The original `#747B87` remains a decorative reference only until rendered contrast is verified; accessibility takes priority over copying low-contrast concept text. Glass uses the documented translucent white treatment over a controlled dark background with an opaque fallback.

Type: **Manrope** display/headings and **Inter** body. Scale: 14 / 16 / 24 / 32 / 40 / 48 / 64 / 72 px; mobile display 36–44 px. Body 16 px, line-height 1.5–1.7. Use theme tokens for typography and spacing, with the documented 8 px rhythm and 16 px mobile gutters.

Composition: a wide cinematic vehicle hero with left-aligned editorial copy and one search panel at its base, followed by quiet pearl sections whose strongest commercial emphasis is used EV discovery.

```text
Desktop                              Mobile
┌─ EVONE · navigation · Sell ──────┐  ┌─ EVONE · Menu ───────┐
│ Headline          silver EV     │  │ Headline            │
│ One primary action              │  │ Silver EV crop      │
│ [tabs / search fields / Search] │  │ [stacked search]    │
└─────────────────────────────────┘  └─────────────────────┘
  Seven compact ecosystem links       Seven compact links
  Featured used EVs / honest empty     Featured / honest empty
  Later previews in documented order  Later previews
  Footer                              Footer
```

Signature: the silver EV above a single translucent search panel. Glass stays concentrated in the hero; other surfaces are calm and opaque. No mockup counters, verification labels or prices become real claims.

Brief review: preserves the approved automotive composition, typography and marketplace priority. No dashboard collage, decorative gradients or repeated generic feature cards. This is a direction proposal, not completed EV-004 screen design.

## EV-009 implementation boundary after approval

- Initialize Git with branch `feat/EV-009-monorepo` and preserve every existing blueprint file at its current path.
- Reach root package/workspace/Turbo configuration, pinned runtime/package versions and lockfile, one minimal buildable web consumer, only the shared configuration it actually uses, CI install/build, ignore rules, safe environment examples and setup documentation.
- Do not scaffold empty admin/mobile/worker applications or install vendor integrations. EV-010/011/012/015 retain their own acceptance criteria; incidental configuration does not complete them.
- Existing callers, fixtures, API exports and production data: none. No data migration or external publication is needed.
- Verify frozen-lockfile install, the available type/lint/test/build checks and local web startup. A minimal app smoke check must cover any executable scaffold. Record exact commands and outcomes before changing task status.
- Any later UI implementation requires responsive and keyboard checks plus the prescribed polish pass. Homepage implementation remains gated by EV-062 dependencies.

## Current tracking

- Completed task: EV-009, exception approved and local/hosted checks passing.
- Next foundation task: EV-010 (tooling acceptance).
- EV-004 remains open; no discovery, provider or legal sign-off is asserted.
- Application checks and eight browser tests now pass; see the evidence record. The workspace audit above records the initial pre-implementation state.
