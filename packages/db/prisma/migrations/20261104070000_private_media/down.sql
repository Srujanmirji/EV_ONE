-- Development rollback refuses to erase immutable audit evidence. Use forward repair after use.
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM audit_events WHERE action::text IN ('MEDIA_UPLOAD','MEDIA_COMPLETE','MEDIA_READ')) THEN
  RAISE EXCEPTION 'Media audit evidence exists; use a forward repair';
 END IF;
END $$;
ALTER TABLE audit_events DROP COLUMN resource_id;
DROP TABLE media_assets;
DROP TYPE "MediaStatus";
ALTER TABLE audit_events ALTER COLUMN action DROP DEFAULT;
ALTER TYPE "AuditAction" RENAME TO "AuditAction_media";
CREATE TYPE "AuditAction" AS ENUM ('ACCESS_CHECK');
ALTER TABLE audit_events ALTER COLUMN action TYPE "AuditAction" USING action::text::"AuditAction";
ALTER TABLE audit_events ALTER COLUMN action SET DEFAULT 'ACCESS_CHECK'::"AuditAction";
DROP TYPE "AuditAction_media";
