# EVONE — Repository Rules for Claude Code, Codex, Antigravity and Other Agents

1. Before working, read `README.md`, `PRD.md`, `UI_UX.md`, `SYSTEM_DESIGN.md`, `TECH_STACK.md`, `DATABASE.md`, `API_CONTRACT.md`, `TASKS.md` and `06_Reference/02_decision_register.md`.
2. Select a single `EV-###` task with prerequisites satisfied. State the task ID in branch/PR and update its checklist upon verified completion only.
3. Use the approved reference `assets/approved_ui_reference.png` for design. **Do not present mockup counts/verified labels/prices as true production data.**
4. Produce secure, working and tested features, not disconnected screenshot clones.
5. Follow domain modular monolith; server-side auth + per-resource RBAC, Zod contracts, no new services without ADR.
6. No real user PII, keys, tokens, copyrighted imagery, financial documents or credentials in code/fixtures/logs.
7. Used vehicle listings are enquiry-only; accessories are first-party checkout; finance is consented partner referral only after approvals; charging real-time status unknown unless sourced.
8. Every change must include loading/error/empty mobile states, accessibility, meaningful tests, monitoring appropriate to scope and updated docs.
9. If blocked by legal/licensing/partner decision, stop that integration, feature-flag disabled and report precise blocker. Do not guess.
10. Report exact commands/results, changed files, acceptance evidence and remaining risks. Never mark incomplete task done.

See `04_Delivery/05_agent_execution.md` for agent template and `04_Delivery/06_parallel_agent_prompts.md` for four role-based prompts.
