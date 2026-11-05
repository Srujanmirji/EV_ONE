# EV-022 — Catalogue editor scope and implementation plan

Status: prepared 2026-11-04; owner explicitly approved “Proceed with local-only EV-022 exception”. Local implementation verified 2026-11-05; evidence is in `31_EV-022_catalogue_editor_evidence.md`. EV-021 is complete; live Clerk acceptance remains pending and EV-022 stays in progress.

## Core journey

An authenticated ACTIVE editor creates and saves a catalogue draft, submits its current revision, and an ACTIVE admin reviews that exact revision before publishing. Draft changes must not modify the public catalogue before approval. Public reads retain their existing published-only/provenance filters. Production auth stays disabled; live sign-in acceptance remains required.

Use a separate stored draft/review boundary and optimistic version checks. A draft carries brand/model/variant specifications and per-field citations; unknowns remain null, range includes its test standard, and stated values need reviewed sources before publication. Publication applies a validated snapshot and immutable audit evidence in one transaction using existing SQL publish guards. No caller-supplied reviewer identity/time, token role trust or automatic publication by an editor. Stale saves/approvals must conflict rather than overwrite another revision. Keep an approved snapshot for revision history. Do not add a CMS service.

## Reach of the change, after authorization

- Prisma draft/revision state and reviewed up/down migration; catalogue rows and existing provenance/publish guards remain authoritative for public reads.
- Strict shared Zod requests/responses and generated OpenAPI/SDK; private draft reads/writes, submit and admin approval endpoints with action-specific database grant checks and transactional audit.
- Development-only `/admin/catalogue` form/review surface, reusing local Clerk configuration and existing UI components. No public provisioning, grant-management or production admin rollout.
- Tests/fixtures for editor/admin separation, anonymous/user/dealer denial, cross-editor draft reads, suspended/revoked/expired grants, stale revisions, provenance failures, atomic publication/audit failure and unchanged published content before approval.
- HTTP contract requests for every documented status; real API/DB integration and browser flows with synthetic identities/catalogue data. Update API/database/setup/progress docs and record verification evidence.

## Inherited UI direction

Use the established EVONE system; no new aesthetic is proposed. Pearl `#F8F9FB` page, White `#FFFFFF` form surface, Ink `#090B0F` headings/actions, Graphite `#15171C` compact status header, Muted `#596170` secondary copy and Control Border `#747B87`. Reference semantic theme tokens in code. Manrope headings (24/32px), Inter body/control text (16px), 14px status metadata. Existing UI theme is light only.

Composition: a quiet, single-column editing workspace with a compact draft/status list; at wide widths the provenance/review summary can sit beside the main form. The signature element is the source/review summary next to the publish decision, not a decorative hero.

```text
Catalogue                         New draft
[draft name | status | open]
[brand + model fields]       [revision / review status]
[variant + spec fields]      [source review summary]
[source URL + kind/date]
Save draft    Submit         Approve (admin only)
```

Retain values after failures; label every field; provide loading, empty, unavailable/auth-required, validation, conflict and success states. Pending actions expose status text and block duplicate submissions. Check 375/768/1280/1920 widths, keyboard-only focus, axe and reduced motion; run the required impeccable polish and frontend-ui restraint pass before delivery. Synthetic fixtures must be visibly fictional; no real vehicle claims, prices or licensed imagery are introduced.

## Approved boundaries

The owner explicitly approved the task-specific local-only exception. Keep production auth disabled and EV-022 in progress until hosted CI and remaining live acceptance pass. This slice creates new catalogue entries; it does not edit existing published models. Availability and release date remain unknown because model-level provenance is not captured by this local flow. Media attachment/public image publishing, inventory, editorial CMS and launch permissions remain separate tasks.
