# EVONE — Locked Baseline Tech Stack and Rationale

> **Baseline, not installed software.** Versions must be pinned from currently tested stable dependencies during repository bootstrap; exact provider selection is recorded in ADR log.

| Area | Decision | Why / caution |
|---|---|---|
| Public web | Next.js + React + TypeScript strict | SEO/SSR for listings, model pages and journal |
| Mobile | React Native + Expo **later** | shared API/SDK, independent native design |
| Admin / dealer | Next.js app | protected operational UI, same web tokens |
| Styling | Tailwind CSS + shadcn/ui-style components | implemented in `@evone/ui` without the shadcn CLI or Radix (EV-015); native `<dialog>` for modals |
| Motion | Motion for React | tasteful interactions and reduced-motion support |
| API | NestJS on Node LTS | modular domains and validation boundaries |
| Contracts | Zod → generated OpenAPI 3.1 → typed SDK | keep schema/SDK aligned in CI |
| Database | PostgreSQL + PostGIS | transactional commerce + geo when licensed |
| Data layer | Prisma version with verified PostGIS support | review major version + migration mechanics |
| Cache/queue | Redis + BullMQ | retries, notifications and short-lived cache |
| Initial search | PostgreSQL FTS/trigram | avoid early separate search cluster |
| Object storage | Cloudflare R2 | signed media flows and image CDN |
| Authentication | managed provider (candidate: Clerk; decision pending) | API JWT/JWKS verification; cost/regulatory review |
| Payments | Razorpay for first-party accessory checkout | server order/webhook verification, refunds |
| Maps & chargers | Google Maps/Places or licensed CPO partner | availability optional, legal caching constraints |
| Email | Resend or suitable India-compliant service | template/outbox, retry |
| Analytics | PostHog | data-minimized funnel tracking |
| Errors | Sentry | scrub PII |
| Testing | Vitest, Playwright, API integration suite | gates for end-to-end quality |
| CI | GitHub Actions | lockfile install, lint, tests, build and migrations |
| Hosting | Vercel (web/admin) + Railway (API/worker) + managed DB/Redis | small-team operational simplicity |
| Monorepo | pnpm workspaces + Turborepo | atomic contracts and coordinated builds |

## Intentionally NOT in MVP
Elasticsearch/OpenSearch, Kafka, Kubernetes, microservices, AI recommendation service, native checkout for used vehicles, enterprise multi-tenancy, automated bank underwriting, real-time CPO feed absent a contract.

## Version compatibility checkpoint
Read current official Next.js, NestJS, Expo, Prisma and PostgreSQL docs; run a minimal Prisma-PostGIS migration/read query, JWT verifier, Razorpay sandbox webhook and Google Places field-mask test before the app implementation. Record actual package versions in `ADR-012`.
