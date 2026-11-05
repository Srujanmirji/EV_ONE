-- Disposable development rollback only; never erase used review/audit evidence.
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM catalogue_drafts WHERE status = 'PUBLISHED') OR
 EXISTS (SELECT 1 FROM audit_events WHERE action::text LIKE 'CATALOGUE_%') THEN
  RAISE EXCEPTION 'Catalogue evidence exists; use a forward repair';
 END IF;
END $$;
DROP TABLE catalogue_drafts;
DROP FUNCTION refuse_published_catalogue_draft_mutation();
DROP TYPE "CatalogueDraftStatus";
ALTER TABLE audit_events ALTER COLUMN action DROP DEFAULT;
ALTER TYPE "AuditAction" RENAME TO "AuditAction_catalogue";
CREATE TYPE "AuditAction" AS ENUM ('ACCESS_CHECK','MEDIA_UPLOAD','MEDIA_COMPLETE','MEDIA_READ');
ALTER TABLE audit_events ALTER COLUMN action TYPE "AuditAction" USING action::text::"AuditAction";
ALTER TABLE audit_events ALTER COLUMN action SET DEFAULT 'ACCESS_CHECK'::"AuditAction";
DROP TYPE "AuditAction_catalogue";
