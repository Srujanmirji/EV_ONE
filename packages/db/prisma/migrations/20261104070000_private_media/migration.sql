BEGIN;
-- CreateEnum
CREATE TYPE "MediaStatus" AS ENUM ('PENDING', 'READY', 'REJECTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'MEDIA_UPLOAD';
ALTER TYPE "AuditAction" ADD VALUE 'MEDIA_COMPLETE';
ALTER TYPE "AuditAction" ADD VALUE 'MEDIA_READ';

-- AlterTable
ALTER TABLE "audit_events" ADD COLUMN     "resource_id" UUID;

-- CreateTable
CREATE TABLE "media_assets" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "content_type" VARCHAR(32) NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "object_key" VARCHAR(160),
    "status" "MediaStatus" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "media_assets_owner_id_status_idx" ON "media_assets"("owner_id", "status");

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE media_assets ADD CONSTRAINT media_valid_input CHECK (
 content_type IN ('image/jpeg','image/png','image/webp') AND size_bytes BETWEEN 1 AND 5242880
);
ALTER TABLE media_assets ADD CONSTRAINT media_ready_object CHECK (
 (status = 'READY' AND object_key IS NOT NULL) OR (status <> 'READY' AND object_key IS NULL)
);
COMMIT;
