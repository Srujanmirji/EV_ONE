-- Empty development rollback only. Retain all listing/review evidence after use.
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM listings) OR EXISTS(SELECT 1 FROM listing_reviews) OR EXISTS(SELECT 1 FROM listing_history) THEN
  RAISE EXCEPTION 'Listing evidence exists; use a forward repair';
 END IF;
END $$;
DROP TRIGGER media_assets_listing_guard ON media_assets;
DROP TRIGGER ev_variants_listing_guard ON ev_variants;
DROP FUNCTION evone_listing_snapshot(listings);
DROP FUNCTION evone_listing_complete(listings);
DROP TABLE listing_reviews;
DROP TABLE listing_media;
DROP TABLE listing_history;
DROP TABLE listings;
DROP FUNCTION evone_listing_review_apply();
DROP FUNCTION evone_listing_review_guard();
DROP FUNCTION evone_listing_media_changed();
DROP FUNCTION evone_listing_media_guard();
DROP FUNCTION evone_listing_history_append();
DROP FUNCTION evone_listing_history_guard();
DROP FUNCTION evone_listing_guard();
DROP FUNCTION evone_attached_media_guard();
DROP FUNCTION evone_listed_variant_guard();
DROP FUNCTION evone_listing_actor("AppRole"[]);
DROP FUNCTION evone_listing_request_id();
DROP TYPE "ListingReviewDecision";
DROP TYPE "ListingStatus";
