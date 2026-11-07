BEGIN;
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'LISTING_ACCESS';
ALTER TYPE "AuditAction" ADD VALUE 'LISTING_SUBMIT';

-- AlterTable
ALTER TABLE "listings" ADD COLUMN     "preferred_vehicle_type" "VehicleType";


CREATE OR REPLACE FUNCTION evone_listing_snapshot(item listings) RETURNS JSONB LANGUAGE sql STABLE AS $$
 SELECT jsonb_build_object('preferredVehicleType',(item).preferred_vehicle_type,'id',(item).id,'version',(item).version,'variantId',(item).variant_id,'status',(item).status,
  'year',(item).year,'odometerKm',(item).odometer_km,'askingPricePaise',(item).asking_price_paise::text,
  'ownershipCount',(item).ownership_count,'mediaIds',COALESCE((SELECT jsonb_agg(m.media_asset_id ORDER BY m.position) FROM listing_media m WHERE m.listing_id = (item).id),'[]'::jsonb));
$$;

CREATE FUNCTION evone_listing_preference_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='UPDATE' AND NEW.preferred_vehicle_type IS DISTINCT FROM OLD.preferred_vehicle_type
  AND OLD.status NOT IN ('DRAFT','REJECTED','ARCHIVED') AND NEW.status<>'PENDING_REVIEW' THEN
  RAISE EXCEPTION 'Published draft preference changes need review' USING ERRCODE='23514';
 END IF;
 IF NEW.variant_id IS NOT NULL AND NEW.preferred_vehicle_type IS NOT NULL THEN
  PERFORM 1 FROM ev_variants v JOIN ev_models m ON m.id=v.model_id
   WHERE v.id=NEW.variant_id AND m.vehicle_type=NEW.preferred_vehicle_type FOR SHARE OF v,m;
  IF NOT FOUND THEN RAISE EXCEPTION 'Variant must match the selected vehicle type' USING ERRCODE='23514'; END IF;
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER listings_preference_guard BEFORE INSERT OR UPDATE ON listings FOR EACH ROW EXECUTE FUNCTION evone_listing_preference_guard();
COMMIT;
