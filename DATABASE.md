# EVONE — PostgreSQL Data Architecture and Schema Contract

## Conventions
- All entities: `id UUID PRIMARY KEY`, `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`; soft delete only where explicitly needed (`deleted_at`).
- Money: `BIGINT` in **INR paise** (`price_paise`, `amount_paise`), never JS float money. All external pricing snapshot into order rows.
- Distance: `INTEGER odometer_km`; battery: decimal kWh; energy consumption: decimal kWh per km with explicitly recorded source; range: integer km + `range_standard` enum.
- Coordinates: PostGIS point in SRID 4326, with GiST index **only for permitted cached provider data**. Prisma version and PostGIS extension must be tested and pinned.
- Common status enums are server validated. Use distinct source/provenance fields for uncertain specs. Use partial unique indexes where appropriate and schema migrations not destructive in production.
- Personally identifying details are never included in public listing DTOs unless explicitly released; public ids are non-enumerable UUIDs/slugs.

## Core tables (ERD overview)
```mermaid
erDiagram
  USER ||--o{ PROFILE : owns
  USER ||--o{ LISTING : posts
  DEALER ||--o{ DEALER_MEMBER : employs
  DEALER ||--o{ LISTING : owns
  BRAND ||--o{ EV_MODEL : has
  EV_MODEL ||--o{ EV_VARIANT : has
  EV_VARIANT ||--o{ LISTING : described_by
  LISTING ||--o{ LISTING_MEDIA : contains
  LISTING ||--o{ ENQUIRY : receives
  USER ||--o{ ENQUIRY : submits
  LISTING ||--o{ LISTING_VERIFICATION : documents
  PRODUCT ||--o{ PRODUCT_COMPATIBILITY : has
  EV_VARIANT ||--o{ PRODUCT_COMPATIBILITY : matches
  USER ||--o{ CART : owns
  CART ||--o{ CART_ITEM : contains
  ORDER ||--o{ ORDER_ITEM : contains
  ORDER ||--o{ PAYMENT : paid_by
  CHARGE_STATION ||--o{ CONNECTOR_GROUP : offers
  USER ||--o{ FINANCE_LEAD : submits
  CONSENT_RECORD ||--o{ FINANCE_LEAD : authorizes
  ARTICLE ||--o{ ARTICLE_REVISION : revised_as
```

## Tables by bounded context
| Table | Essential fields | Index/constraint and notes |
|---|---|---|
| `users` | `auth_provider_id UNIQUE`, `email`, `phone_e164`, `status` | no password hash if managed auth |
| `profiles` | `user_id UNIQUE`, `display_name`, `city`, `notification_prefs` | user-private |
| `role_assignments` | `user_id`, `role`, `scope_type`, `scope_id`, `granted_by` | tenant-scoped roles |
| `consent_records` | `user_id nullable`, `purpose`, `partner_id nullable`, `privacy_version`, `consent_text_hash`, `ip_hash`, `granted_at`, `withdrawn_at` | immutable grant event + withdrawal event |
| `dealer_orgs` | `legal_name`, `display_name`, `city`, `approval_status` | no automatic badge |
| `dealer_members` | `dealer_id`, `user_id`, `role`, `status` | unique dealer/user |
| `verification_records` | `subject_type`, `subject_id`, `verification_type`, `verifier_id`, `evidence_key`, `expires_at`, `status` | private docs and approval history |
| `brands` | `name`, `slug`, `logo_key`, `status` | unique slug |
| `ev_models` | `brand_id`, `name`, `slug`, `vehicle_type`, `availability_status`, `release_date nullable` | composite brand/slug |
| `ev_variants` | `model_id`, `name`, `slug`, `battery_kwh`, `claimed_range_km`, `range_standard`, `motor_kw`, `charging_ac_kw`, `charging_dc_kw`, `warranty_text`, `data_status` | unique model/slug |
| `spec_sources` | `variant_id`, `field_name`, `value_text`, `source_url`, `effective_at`, `reviewed_at`, `reviewer_id` | cite per disputed claim |
| `vehicle_prices` | `variant_id`, `region_code`, `type`, `amount_paise`, `source_url`, `checked_at`, `valid_to` | price as-of locality/date |
| `listings` | `seller_user_id`, `dealer_id nullable`, `variant_id`, `slug`, `year`, `odometer_km`, `city`, `asking_price_paise`, `ownership_count`, `condition_notes`, `status`, `published_at` | indexes: status, location, variant, price |
| `listing_media` | `listing_id`, `object_key`, `position`, `alt`, `scan_status` | unique listing/position |
| `listing_history` | `listing_id`, `actor_id`, `before_json`, `after_json`, `action`, `reason` | audit; redact PII |
| `listing_verifications` | `listing_id`, `type`, `record_id`, `status`, `inspected_at`, `expires_at` | badge only approved/valid |
| `battery_inspections` | `listing_id`, `provider_id`, `soh_percent nullable`, `method`, `tested_at`, `report_object_key`, `confidence` | inspection vendor only; never approximate SOH |
| `enquiries` | `listing_id`, `buyer_user_id`, `seller_user_id`, `message`, `status`, `contact_share_consent_id`, `sent_at` | prevent duplicate spam |
| `favourites` | `user_id`, `listing_id`, `created_at` | unique pair |
| `products` | `sku UNIQUE`, `name`, `slug`, `category_id`, `description`, `price_paise`, `tax_class`, `active` | first-party merchant |
| `product_categories` | `name`, `slug`, `parent_id nullable` | indexed hierarchy |
| `product_media` | `product_id`, `object_key`, `position` | image optimization |
| `product_compatibility` | `product_id`, `variant_id`, `compatibility_status`, `notes`, `validated_at` | explicit verified mapping |
| `inventory` | `product_id UNIQUE`, `on_hand`, `reserved`, `version` | `on_hand >= reserved >=0` |
| `carts` | `user_id nullable`, `session_id nullable`, `status` | expires unused carts |
| `cart_items` | `cart_id`, `product_id`, `quantity` | server recomputes pricing |
| `orders` | `order_no UNIQUE`, `user_id`, `subtotal_paise`, `shipping_paise`, `tax_paise`, `total_paise`, `currency`, `status`, `address_snapshot_json` | immutable money snapshot |
| `order_items` | `order_id`, `sku`, `name_snapshot`, `quantity`, `unit_price_paise`, `tax_paise` | no pricing from client |
| `payments` | `order_id`, `provider`, `provider_order_id`, `provider_payment_id`, `amount_paise`, `status` | unique provider ids |
| `payment_webhook_events` | `event_id UNIQUE`, `payload_hash`, `processed_at`, `outcome` | idempotent handler |
| `shipments` | `order_id`, `carrier`, `tracking_number`, `status`, `shipped_at` | carrier optional |
| `refunds` | `order_id`, `payment_id`, `provider_refund_id`, `amount_paise`, `status` | approval process |
| `charge_stations` | `provider`, `provider_station_id`, `name`, `geom`, `address`, `metadata_source`, `metadata_checked_at` | retention only per license; source composite unique |
| `connector_groups` | `station_id`, `connector_type`, `charge_type`, `max_kw`, `count`, `available_count nullable`, `status_observed_at nullable` | explicit unknown if absent/stale |
| `charger_reports` | `station_ref`, `user_id nullable`, `issue_type`, `details`, `review_status` | do not auto-update source facts |
| `articles` | `slug UNIQUE`, `title`, `summary`, `body`, `category`, `author_id`, `status`, `published_at`, `canonical_url`, `feature_image_key` | publish workflow |
| `article_revisions` | `article_id`, `editor_id`, `body_snapshot`, `reason` | changelog |
| `partners` | `name`, `partner_type`, `status`, `legal_approval_at`, `api_config_ref` | active only if approved |
| `finance_leads` | `user_id nullable`, `kind LOAN/INSURANCE`, `status`, `vehicle_ref nullable`, `contact_name`, `email/phone`, `consent_record_id`, `partner_id nullable`, `sent_at` | sensitive restricted access, expiry |
| `lead_delivery_attempts` | `lead_id`, `partner_id`, `attempt_no`, `status`, `error_code`, `sent_at` | no plaintext PII in log |
| `notification_outbox` | `event_key UNIQUE`, `topic`, `payload_json`, `state`, `attempts` | event idempotency |
| `notifications` | `user_id`, `channel`, `template`, `status`, `delivered_at` | retries and preferences |
| `audit_events` | `actor_id`, `action`, `resource_type`, `resource_id`, `ip_hash`, `event_time`, `metadata_redacted` | append-only, restricted |
| `feature_flags` | `key UNIQUE`, `enabled`, `audience_json`, `updated_by` | kill switches |
| `support_tickets` | `requester_id`, `category`, `status`, `assigned_to`, `resolution` | support queues |

## Relationship rules
- `listings.variant_id` required after catalogue mapping; allow `OTHER` manual variant only with moderation and normalized brand/model fields during draft; no direct arbitrary brand string published without review.
- `dealer_id` optional; if present the creator must have active dealer membership and `MANAGE_INVENTORY` permission.
- `battery_inspections` only independently-issued records; no generic “good battery” badge based on seller self-report.
- `product_compatibility.compatibility_status` is `CONFIRMED|UNCONFIRMED|INCOMPATIBLE`; never infer confirmed from simple model name match.
- `finance_leads` cannot be delivered unless `consent_records` valid for kind/purpose/partner.
- `connector_groups.available_count` nullable; `0` means positively measured no free connectors, `NULL` means unknown.

## Suggested enums
`ListingStatus = DRAFT | PENDING_REVIEW | PUBLISHED | REJECTED | ARCHIVED | SOLD`
`DealerStatus = PENDING | APPROVED | REJECTED | SUSPENDED`
`OrderStatus = PENDING_PAYMENT | PAID | PROCESSING | SHIPPED | DELIVERED | CANCELLED | REFUNDED | PAYMENT_FAILED`
`LeadStatus = RECEIVED | CONSENT_VALIDATED | QUEUED | SENT | ACKNOWLEDGED | REJECTED | WITHDRAWN`
`ArticleStatus = DRAFT | REVIEW | PUBLISHED | ARCHIVED`
`AvailabilityState = AVAILABLE | UNAVAILABLE | UNKNOWN` (computed, not truthy boolean)

## Performance indexes and queries
- `listings(status,published_at DESC)`, `(status,asking_price_paise)`, `(variant_id,status)`, `(city,status)` plus GIN for full text/trigram.
- `enquiries(seller_user_id,status,created_at DESC)`.
- `orders(user_id,created_at DESC)`.
- `finance_leads(kind,status,created_at DESC)`.
- Charger GiST spatial index only if provider terms allow persistence; otherwise provider-native nearby API.
- Enforce DB constraints: price>0, year plausible, km>=0, nonnegative stock, `available_count <= count`, `soh_percent BETWEEN 0 AND 100` if present.

## Data governance and migrations
- Source URL + checked date on specs/prices; do not scrape copyrighted descriptions wholesale.
- Restrict private IDs and signed document access; short-lived object access and review-only permissions.
- Data retention policy approved by counsel; deletion/request workflows and backups policy.
- Migration flow: schema review → migration SQL → staging test → backup → prod deploy → post-migration verification; prefer expand/contract.
- Generate seed demo content with `demo=true` and conspicuous labels; never push staged fake verification into production.

## Catalogue implementation (EV-021)

Implemented in `packages/db` (migration `20261103152727_catalogue`).

- **Tables:** `brands`, `ev_models`, `ev_variants`, `spec_sources`.
- **Enums:** `PublishStatus`, `VehicleType` (SCOOTER, MOTORCYCLE, CAR, THREE_WHEELER), `ModelAvailability`, `RangeStandard` (MIDC, IDC, WLTP, NEDC, EPA, OEM_UNSPECIFIED), `SpecField`, `SourceKind`.
- **Unknown values:** a NULL spec means unknown and is shown as such, never as zero.

**Database-enforced rules:**
- Units must be positive.
- `claimed_range_km` and `range_standard` are both set or both NULL.
- Slugs are lowercase words joined by hyphens, unique per parent.
- Sources must be `https`, and `reviewed_at` and `reviewer_id` are set together.
- **Publish guard** (deferred to commit, so sources and status can change in one transaction): a variant can be `PUBLISHED` only if its model and brand are published and every non-NULL spec has a reviewed source. Once published, its sources cannot be deleted or un-reviewed, unsourced specs cannot be added, the variant cannot be deleted (archive it instead), and its model and brand cannot be unpublished.

**Deviations from the table above, deliberate:**
- `ev_variants.data_status` is not stored. The view `ev_variant_unsourced_specs` computes which stated specs lack a reviewed source, so the rule and the status cannot disagree.
- `spec_sources.reviewer_id` has no foreign key yet. It will reference `users` once identity exists (EV-016/017).
- `vehicle_prices` is not part of EV-021. It is added with the first task that shows prices.

**Demo data:** `pnpm db:seed:demo` creates the fictional "DEMO Motors (fictional)" brand. Every row has `is_demo = true`, every name starts with `DEMO`, and every source is on `example.com`. It is idempotent and refuses `NODE_ENV=production`. Public read endpoints (EV-023) must exclude `is_demo` rows in production.

## Migration workflow and rollback strategy (EV-013)

Implemented in `packages/db` (Prisma 7.10.1, ADR-012). Commands run from the repository root.

**Writing a migration**
1. Edit `packages/db/prisma/schema.prisma`, then run `pnpm db:migrate:dev --name <change>` against the local Compose database (`pnpm db:up`).
2. Review the generated `migration.sql`. Never edit a migration that has been applied anywhere shared.
3. Write `down.sql` beside it by hand. Prisma's `migrate diff` does not generate reliable down scripts: for the baseline it produced an empty script instead of dropping PostGIS. CI fails if any migration lacks `down.sql`.
4. `pnpm db:migrate:verify` (CI runs it on an empty database) proves that:
   - deploy is repeatable and a second deploy is a no-op;
   - the database matches `schema.prisma`;
   - rolling back the latest migration leaves exactly the system-catalog state of the earlier migrations;
   - re-deploying after the rollback restores the full schema.

**Shape changes to be reversible (expand/contract).** Add nullable columns, tables and indexes first (expand). Deploy code that writes both shapes, backfill, and switch reads. Only then remove the old shape (contract) in a later release. Each step stays backward compatible with the application version before it, so rolling back the app never needs a schema rollback. Large indexes use `CREATE INDEX CONCURRENTLY` in their own migration, which cannot run inside a transaction.

**Rollback order of preference**
1. **Roll back the application, keep the schema.** Expand-phase migrations are safe to leave in place. This is the default response to a bad release.
2. **Forward fix.** Write a new migration that corrects the problem. Production history only moves forward.
3. **Failed migration** (Prisma marks it failed and blocks further deploys): inspect the partial state, apply the needed parts of `down.sql` manually, then `prisma migrate resolve --rolled-back <name>`. Fix the migration and redeploy.
4. **Revert a successful migration:** `pnpm db:migrate:rollback --confirm <latest_migration_name>`. It only reverts the latest applied migration and refuses any other name. It runs `down.sql` and removes the history row in one transaction, so either both happen or neither does. In production this needs a fresh backup and an owner-approved incident ticket, because `down.sql` can drop data the newer release wrote.
5. **Restore from backup / point-in-time recovery** for destructive contract migrations or data corruption. The production host must provide PITR before launch (ADR-015 retention policy, production gate).

**Deploy sequence:** backup or confirm PITR → `prisma migrate deploy` (never `migrate dev` or `reset` outside local) → `/api/v1/health/ready` → application deploy → smoke test. Prisma 7 refuses agent-run `migrate reset` without explicit user consent; keep that guard.

**Local database rule:** create databases from `template0` with only `postgis`. The stock `postgis/postgis` image pre-installs `postgis_topology`, `postgis_tiger_geocoder` and `fuzzystrmatch`, and `migrate dev` treats those as drift. `infra/docker/docker-compose.yml` replaces the image's init script to prevent this.

## Prisma/PostGIS note
Tested 2026-11-03 (ADR-012, `04_Delivery/11_ADR-012_prisma_postgis_spike.md`): Prisma 7.10.1 still has **no native PostGIS types**. Declare spatial columns as nullable `Unsupported("geography(Point, 4326)")?` with `@@index([geom], type: Gist)` and the `postgresqlExtensions` preview feature; read and write them with parameterised raw SQL. Migrations, drift checks and GiST index use were verified on PostgreSQL 17.5 / PostGIS 3.5.2. Deployment-host PostGIS support is still unverified. Reference: https://www.prisma.io/docs/orm/extensions/postgis


## EV-017 — Local authorization foundation (in progress)

The new migration adds `users`, `role_assignments` and `audit_events` without modifying or backfilling catalogue data. Implemented users are minimal identity mappings only (UUID, issuer, provider subject, status and timestamps), not the full profile/contact model above. New users default to SUSPENDED and get no automatic role. Identity uniqueness is **issuer + provider subject**, preventing accidental cross-instance identity conflation. Spec-source reviewer UUIDs remain uncoupled until the editor/provisioning work can reconcile existing demo reviewers; no new reviewer foreign key is silently imposed.

Global USER/EDITOR/MODERATOR/ADMIN grants require a null scope ID. DEALER_STAFF/DEALER_OWNER grants require a dealer UUID. SQL CHECK constraints reject mixed combinations. Two partial unique indexes prevent duplicate global and per-dealer grants, and a full user-ID index supports unscoped actor/grant queries and foreign-key checks. Prisma 7.10.1's `partialIndexes` preview models these indexes explicitly for migration drift checks; see [official index documentation](https://www.prisma.io/docs/orm/v7/prisma-schema/data-model/indexes).

The current policy is deliberately narrow: USER or ADMIN permits reading only one's own account scope; DEALER_STAFF/DEALER_OWNER permits reading only its exact dealer scope. There is no ADMIN wildcard or inferred role from a JWT. EDITOR/MODERATOR and business mutations require later action-specific policies. Dealer scope UUID grants do not implement dealer approval or membership lifecycle (EV-066).

Access checks load active, unexpired database grants and write one allow/deny audit record in a RepeatableRead transaction. The guard rejects after a denied decision commits; audit failure prevents an allow response. Unknown identities can be denied with a null audit actor; no provider subject, email, token or arbitrary JSON is copied into evidence. Events record fixed ACCESS_CHECK action, scope UUID, outcome, request UUID and time. User foreign keys restrict actor removal; UPDATE/DELETE/TRUNCATE triggers protect ordinary DML. This is not protection from database owners/superusers who control DDL. No audit read API or grant lifecycle mutation API is added.

`down.sql` removes these new tables and their evidence for disposable development rollback only; production must preserve audit data and use a reviewed forward repair. Integration tests wrap attempted destructive audit mutations in an always-rolled-back transaction, even if the protection regresses. Synthetic audit rows and their actors intentionally remain in the disposable test database. Native PostgreSQL/PostGIS migration, rollback and drift checks passed for EV-017 in [PR #14 CI](https://github.com/Srujanmirji/EV_ONE/actions/runs/41839062086). Supplemental PGlite SQL and API checks are recorded in `04_Delivery/28_EV-017_local_rbac_evidence.md`, including the socket-adapter limitation found while attempting the full database suite.

## Implemented private media foundation (EV-020, in progress)

`media_assets` references its owner with a restrictive user FK and stores declared MIME/size, upload expiry, PENDING/READY/REJECTED status and a private output key. SQL restricts input to JPEG/PNG/WebP and 1–5 MiB; READY requires an output key and other states prohibit one. No listing/public attachment or gallery data is backfilled.

Media actions are MEDIA_UPLOAD, MEDIA_COMPLETE and MEDIA_READ. Audit rows retain ACCOUNT scope plus nullable `resource_id` (media UUID, deliberately no FK so missing-resource denials remain recordable). Asset creation/transition and allow/deny evidence commit together. Complete locks the asset; each attempt uses a unique output key and only the winning committed key can be signed for reads. Failed transactions may leave private orphan objects, never a publicly accessible URL.

The new development down migration refuses rollback once media audit evidence exists; use a reviewed forward repair after use. Empty-schema down/reapply, constraints and retained audit targets have supplemental local PGlite coverage. Native PostgreSQL drift/rollback and concurrent integration passed in [PR #16 CI](https://github.com/Srujanmirji/EV_ONE/actions/runs/41846145951).

## Implemented catalogue drafts (EV-022, local only, in progress)

`catalogue_drafts` stores a strict API-validated JSON document separately from public brand/model/variant rows. It retains the owner, revision, DRAFT/IN_REVIEW/REJECTED/PUBLISHED state, reviewer/reason/time and resulting model FK. Owner/reviewer/model references use restrictive FKs with supporting indexes. SQL checks require positive versions, object documents, paired review metadata, a different reviewer, a meaningful rejection reason and a model only for PUBLISHED snapshots. Ordinary UPDATE/DELETE of published snapshots and table TRUNCATE are refused; database owners remain a DDL trust boundary.

The service locks before checking the expected revision. Editors can save only their own DRAFT/REJECTED entries and submit saved DRAFT entries with citation coverage; an ADMIN can review only another owner’s IN_REVIEW revision. Rejection returns it for owner edits. Approval creates/reuses a compatible published brand and creates a new model/variants/reviewed citations in one transaction with the immutable decision audit. All created catalogue rows are demo rows. Existing published models are not edited, and availability/release date remain unknown until model-level provenance exists. Existing EV-021 deferred SQL guards still apply.

CATALOGUE_READ/WRITE/SUBMIT/REVIEW audit actions retain request/resource UUIDs without storing tokens or arbitrary request JSON. Slug uniqueness races retry once to record the observed conflict; persistent DB conflicts fail closed. The development down migration refuses once catalogue audit/published evidence exists. Local native PostgreSQL 18.6 verifies non-spatial Prisma drift, catalog-equal down/reapply and evidence retention. Hosted PostgreSQL 17/PostGIS verification remains pending.
