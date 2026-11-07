-- Empty development rollback only; retain submission/access evidence after use.
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM listings WHERE preferred_vehicle_type IS NOT NULL) OR
 EXISTS(SELECT 1 FROM audit_events WHERE action::text IN ('LISTING_ACCESS','LISTING_SUBMIT')) THEN
  RAISE EXCEPTION 'Listing writer evidence exists; use a forward repair';
 END IF;
END $$;
DROP TRIGGER listings_preference_guard ON listings;
DROP FUNCTION evone_listing_preference_guard();
CREATE OR REPLACE FUNCTION evone_listing_snapshot(item listings) RETURNS JSONB LANGUAGE sql STABLE AS $$
 SELECT jsonb_build_object('id',(item).id,'version',(item).version,'variantId',(item).variant_id,'status',(item).status,
  'year',(item).year,'odometerKm',(item).odometer_km,'askingPricePaise',(item).asking_price_paise::text,
  'ownershipCount',(item).ownership_count,'mediaIds',COALESCE((SELECT jsonb_agg(m.media_asset_id ORDER BY m.position) FROM listing_media m WHERE m.listing_id = (item).id),'[]'::jsonb));
$$;

ALTER TABLE listings DROP COLUMN preferred_vehicle_type;
ALTER TABLE audit_events ALTER COLUMN action DROP DEFAULT;
ALTER TYPE "AuditAction" RENAME TO "AuditAction_listing_writer";
CREATE TYPE "AuditAction" AS ENUM ('ACCESS_CHECK','MEDIA_UPLOAD','MEDIA_COMPLETE','MEDIA_READ','CATALOGUE_READ','CATALOGUE_WRITE','CATALOGUE_SUBMIT','CATALOGUE_REVIEW');
ALTER TABLE audit_events ALTER COLUMN action TYPE "AuditAction" USING action::text::"AuditAction";
ALTER TABLE audit_events ALTER COLUMN action SET DEFAULT 'ACCESS_CHECK'::"AuditAction";
DROP TYPE "AuditAction_listing_writer";
