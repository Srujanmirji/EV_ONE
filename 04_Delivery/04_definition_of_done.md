# Definition of Done (DoD) and Code Review Template

## Every ticket must include
- [ ] Requirement ID/UX screen linked; intended user outcome clear.
- [ ] Server data contract agreed before frontend hardcoding.
- [ ] Works on desktop and 390/360px mobile layouts.
- [ ] Loading, empty, error and unauthorized states handled.
- [ ] Correct business permissions, validations, safe input handling.
- [ ] No fake claims, user counts, inspections, finance offers or charger status.
- [ ] Unit/integration/E2E tests appropriate to risk, all green in CI.
- [ ] Accessibility keyboard/focus/labels/contrast reviewed.
- [ ] Data migration backward-safe and reviewed, if applicable.
- [ ] Logging/analytics events added with PII exclusions.
- [ ] Documentation API/screen/task updated.
- [ ] Demo screenshots/video + proof of expected behavior attached.
- [ ] Peer review + deploy preview test complete.

## Pull request template
```markdown
## Change
EV-### — [summary]
## PRD / UX / API references
- PRD: [CORE/MKT/...]
- UX: UX-##
- API/DB contract: [endpoint/entity]
## Behavior before/after
...
## Acceptance criteria
- [ ] ...
## Tests
- [ ] unit
- [ ] integration
- [ ] E2E/mobile
## Risks, secrets and migrations
...
## Evidence
- screenshots / links / test output
## Rollback plan
...
```

## No merges of placeholders pretending to work
Disabled/test-only features clearly flagged. Fake orders, badges, charging maps and reference mockup statistics must not bleed into live production.
