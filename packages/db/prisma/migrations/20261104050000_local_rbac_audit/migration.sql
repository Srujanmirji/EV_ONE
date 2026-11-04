BEGIN;

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "AppRole" AS ENUM ('USER', 'DEALER_STAFF', 'DEALER_OWNER', 'EDITOR', 'MODERATOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "RoleScope" AS ENUM ('GLOBAL', 'DEALER');

-- CreateEnum
CREATE TYPE "AccessScope" AS ENUM ('ACCOUNT', 'DEALER');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('ACCESS_CHECK');

-- CreateEnum
CREATE TYPE "AuditOutcome" AS ENUM ('ALLOWED', 'DENIED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "auth_issuer" VARCHAR(512) NOT NULL,
    "auth_provider_id" VARCHAR(256) NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'SUSPENDED',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_assignments" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "AppRole" NOT NULL,
    "scope_type" "RoleScope" NOT NULL,
    "scope_id" UUID,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "expires_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "role_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" UUID NOT NULL,
    "actor_user_id" UUID,
    "scope" "AccessScope" NOT NULL,
    "scope_id" UUID NOT NULL,
    "action" "AuditAction" NOT NULL DEFAULT 'ACCESS_CHECK',
    "outcome" "AuditOutcome" NOT NULL,
    "request_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_auth_issuer_auth_provider_id_key" ON "users"("auth_issuer", "auth_provider_id");

-- CreateIndex
CREATE UNIQUE INDEX "role_assignments_global_key" ON "role_assignments"("user_id", "role") WHERE (scope_id IS NULL);

-- CreateIndex
CREATE UNIQUE INDEX "role_assignments_dealer_key" ON "role_assignments"("user_id", "role", "scope_id") WHERE (scope_id IS NOT NULL);

-- CreateIndex
CREATE INDEX "audit_events_actor_user_id_created_at_idx" ON "audit_events"("actor_user_id", "created_at");

-- AddForeignKey
ALTER TABLE "role_assignments" ADD CONSTRAINT "role_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


CREATE INDEX "role_assignments_user_id_idx" ON "role_assignments"("user_id");

-- A global role has no tenant; dealer roles always name a tenant scope.
ALTER TABLE role_assignments ADD CONSTRAINT role_assignments_scope_check CHECK (
  (scope_type = 'GLOBAL' AND scope_id IS NULL AND role IN ('USER','EDITOR','MODERATOR','ADMIN')) OR
  (scope_type = 'DEALER' AND scope_id IS NOT NULL AND role IN ('DEALER_STAFF','DEALER_OWNER'))
);
ALTER TABLE users ADD CONSTRAINT users_auth_identity_check CHECK (
  length(btrim(auth_provider_id)) > 0 AND length(btrim(auth_issuer)) > 0
);

CREATE FUNCTION refuse_audit_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Audit events are append-only' USING ERRCODE = '42501';
END;
$$;
CREATE TRIGGER audit_events_immutable BEFORE UPDATE OR DELETE ON audit_events
FOR EACH ROW EXECUTE FUNCTION refuse_audit_mutation();
CREATE TRIGGER audit_events_no_truncate BEFORE TRUNCATE ON audit_events
FOR EACH STATEMENT EXECUTE FUNCTION refuse_audit_mutation();
COMMIT;
