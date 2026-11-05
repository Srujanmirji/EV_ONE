BEGIN;
-- CreateEnum
CREATE TYPE "CatalogueDraftStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'REJECTED', 'PUBLISHED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'CATALOGUE_READ';
ALTER TYPE "AuditAction" ADD VALUE 'CATALOGUE_WRITE';
ALTER TYPE "AuditAction" ADD VALUE 'CATALOGUE_SUBMIT';
ALTER TYPE "AuditAction" ADD VALUE 'CATALOGUE_REVIEW';

-- CreateTable
CREATE TABLE "catalogue_drafts" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "document" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "CatalogueDraftStatus" NOT NULL DEFAULT 'DRAFT',
    "review_reason" VARCHAR(500),
    "reviewer_id" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "model_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "catalogue_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "catalogue_drafts_owner_id_id_idx" ON "catalogue_drafts"("owner_id", "id");

-- AddForeignKey
ALTER TABLE "catalogue_drafts" ADD CONSTRAINT "catalogue_drafts_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalogue_drafts" ADD CONSTRAINT "catalogue_drafts_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalogue_drafts" ADD CONSTRAINT "catalogue_drafts_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "ev_models"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


CREATE INDEX "catalogue_drafts_reviewer_id_idx" ON catalogue_drafts(reviewer_id);
CREATE INDEX "catalogue_drafts_model_id_idx" ON catalogue_drafts(model_id);
ALTER TABLE catalogue_drafts ADD CONSTRAINT catalogue_draft_state CHECK (
 version > 0 AND jsonb_typeof(document) = 'object' AND
 ((status IN ('DRAFT','IN_REVIEW') AND reviewer_id IS NULL AND reviewed_at IS NULL AND review_reason IS NULL AND model_id IS NULL) OR
 (status = 'REJECTED' AND reviewer_id IS NOT NULL AND reviewer_id <> owner_id AND reviewed_at IS NOT NULL AND review_reason IS NOT NULL AND length(btrim(review_reason)) >= 10 AND model_id IS NULL) OR
 (status = 'PUBLISHED' AND reviewer_id IS NOT NULL AND reviewer_id <> owner_id AND reviewed_at IS NOT NULL AND model_id IS NOT NULL AND review_reason IS NULL))
);
CREATE FUNCTION refuse_published_catalogue_draft_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.status = 'PUBLISHED' THEN
  RAISE EXCEPTION 'Published catalogue snapshots are immutable' USING ERRCODE = '42501';
 END IF;
 IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER catalogue_drafts_published_immutable BEFORE UPDATE OR DELETE ON catalogue_drafts
FOR EACH ROW EXECUTE FUNCTION refuse_published_catalogue_draft_mutation();
CREATE TRIGGER catalogue_drafts_no_truncate BEFORE TRUNCATE ON catalogue_drafts
FOR EACH STATEMENT EXECUTE FUNCTION refuse_audit_mutation();
COMMIT;
