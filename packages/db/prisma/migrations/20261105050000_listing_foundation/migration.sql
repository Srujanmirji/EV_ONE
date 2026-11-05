BEGIN;
-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED', 'ARCHIVED', 'SOLD');

-- CreateEnum
CREATE TYPE "ListingReviewDecision" AS ENUM ('APPROVE', 'REJECT');

-- CreateTable
CREATE TABLE "listings" (
    "id" UUID NOT NULL,
    "seller_user_id" UUID NOT NULL,
    "variant_id" UUID,
    "slug" VARCHAR(160) NOT NULL,
    "year" INTEGER,
    "odometer_km" INTEGER,
    "city" VARCHAR(120),
    "asking_price_paise" BIGINT,
    "ownership_count" INTEGER,
    "condition_notes" VARCHAR(3000),
    "status" "ListingStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_demo" BOOLEAN NOT NULL DEFAULT true,
    "published_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listing_media" (
    "id" UUID NOT NULL,
    "listing_id" UUID NOT NULL,
    "media_asset_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "alt" VARCHAR(300) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "listing_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listing_reviews" (
    "id" UUID NOT NULL,
    "listing_id" UUID NOT NULL,
    "listing_version" INTEGER NOT NULL,
    "reviewer_id" UUID NOT NULL,
    "decision" "ListingReviewDecision" NOT NULL,
    "reason" VARCHAR(500),
    "snapshot" JSONB NOT NULL,
    "request_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "listing_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listing_history" (
    "id" UUID NOT NULL,
    "listing_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "from_status" "ListingStatus",
    "to_status" "ListingStatus" NOT NULL,
    "before_json" JSONB,
    "after_json" JSONB NOT NULL,
    "request_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "listing_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "listings_slug_key" ON "listings"("slug");

-- CreateIndex
CREATE INDEX "listings_seller_user_id_status_idx" ON "listings"("seller_user_id", "status");

-- CreateIndex
CREATE INDEX "listings_variant_id_idx" ON "listings"("variant_id");

-- CreateIndex
CREATE INDEX "listings_status_published_at_idx" ON "listings"("status", "published_at");

-- CreateIndex
CREATE INDEX "listings_status_asking_price_paise_idx" ON "listings"("status", "asking_price_paise");

-- CreateIndex
CREATE INDEX "listings_city_status_idx" ON "listings"("city", "status");

-- CreateIndex
CREATE INDEX "listing_media_media_asset_id_idx" ON "listing_media"("media_asset_id");

-- CreateIndex
CREATE UNIQUE INDEX "listing_media_listing_id_position_key" ON "listing_media"("listing_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "listing_media_listing_id_media_asset_id_key" ON "listing_media"("listing_id", "media_asset_id");

-- CreateIndex
CREATE INDEX "listing_reviews_reviewer_id_idx" ON "listing_reviews"("reviewer_id");

-- CreateIndex
CREATE UNIQUE INDEX "listing_reviews_listing_id_listing_version_key" ON "listing_reviews"("listing_id", "listing_version");

-- CreateIndex
CREATE INDEX "listing_history_actor_user_id_created_at_idx" ON "listing_history"("actor_user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "listing_history_listing_id_version_key" ON "listing_history"("listing_id", "version");

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_seller_user_id_fkey" FOREIGN KEY ("seller_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "ev_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_media" ADD CONSTRAINT "listing_media_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_media" ADD CONSTRAINT "listing_media_media_asset_id_fkey" FOREIGN KEY ("media_asset_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_reviews" ADD CONSTRAINT "listing_reviews_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_reviews" ADD CONSTRAINT "listing_reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_history" ADD CONSTRAINT "listing_history_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_history" ADD CONSTRAINT "listing_history_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE listings ADD CONSTRAINT listing_values CHECK (
 version > 0 AND is_demo AND slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND
 (year IS NULL OR year BETWEEN 1900 AND 2100) AND
 (odometer_km IS NULL OR odometer_km >= 0) AND
 (asking_price_paise IS NULL OR asking_price_paise > 0) AND
 (ownership_count IS NULL OR ownership_count > 0) AND
 (city IS NULL OR length(btrim(city)) > 0)
);
ALTER TABLE listings ADD CONSTRAINT listing_publication_time CHECK (
 (status IN ('PUBLISHED','ARCHIVED','SOLD') AND published_at IS NOT NULL) OR
 (status NOT IN ('PUBLISHED','ARCHIVED','SOLD') AND published_at IS NULL)
);
ALTER TABLE listing_media ADD CONSTRAINT listing_media_values CHECK (position BETWEEN 0 AND 11 AND length(btrim(alt)) > 0);
ALTER TABLE listing_reviews ADD CONSTRAINT listing_review_values CHECK (
 listing_version > 0 AND jsonb_typeof(snapshot) = 'object' AND
 (decision <> 'REJECT' OR (reason IS NOT NULL AND length(btrim(reason)) >= 10))
);
ALTER TABLE listing_history ADD CONSTRAINT listing_history_values CHECK (
 version > 0 AND jsonb_typeof(after_json) = 'object' AND
 (before_json IS NULL OR jsonb_typeof(before_json) = 'object')
);

-- Trusted server writers resolve a verified identity first, then set both GUCs
-- transaction-locally. Client-supplied actor IDs are never an authentication boundary.
CREATE FUNCTION evone_listing_actor(allowed_roles "AppRole"[]) RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE actor UUID := NULLIF(current_setting('evone.actor_id',true),'')::uuid;
BEGIN
 IF actor IS NULL OR NOT EXISTS (
  SELECT 1 FROM users u JOIN role_assignments r ON r.user_id = u.id
  WHERE u.id = actor AND u.status = 'ACTIVE' AND r.active AND r.scope_type = 'GLOBAL'
   AND r.scope_id IS NULL AND r.role = ANY(allowed_roles)
   AND (r.expires_at IS NULL OR r.expires_at > clock_timestamp())
 ) THEN RAISE EXCEPTION 'Listing permission denied' USING ERRCODE = '42501'; END IF;
 RETURN actor;
END;
$$;
CREATE FUNCTION evone_listing_request_id() RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE request UUID := NULLIF(current_setting('evone.request_id',true),'')::uuid;
BEGIN
 IF request IS NULL THEN RAISE EXCEPTION 'Listing request context required' USING ERRCODE = '42501'; END IF;
 RETURN request;
END;
$$;

-- Whitelist numeric facts/state and opaque IDs; never copy free text, contacts or storage URLs into history.
CREATE FUNCTION evone_listing_snapshot(item listings) RETURNS JSONB LANGUAGE sql STABLE AS $$
 SELECT jsonb_build_object('id',(item).id,'version',(item).version,'variantId',(item).variant_id,'status',(item).status,
  'year',(item).year,'odometerKm',(item).odometer_km,'askingPricePaise',(item).asking_price_paise::text,
  'ownershipCount',(item).ownership_count,'mediaIds',COALESCE((SELECT jsonb_agg(m.media_asset_id ORDER BY m.position) FROM listing_media m WHERE m.listing_id = (item).id),'[]'::jsonb));
$$;
CREATE FUNCTION evone_listing_complete(item listings) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
 PERFORM 1 FROM users WHERE id=item.seller_user_id AND status='ACTIVE' FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Active seller required' USING ERRCODE = '23514'; END IF;
 IF item.variant_id IS NULL OR item.year IS NULL OR item.odometer_km IS NULL OR item.city IS NULL OR
 item.asking_price_paise IS NULL OR item.ownership_count IS NULL OR item.condition_notes IS NULL OR length(btrim(item.condition_notes)) = 0 THEN
  RAISE EXCEPTION 'Complete listing fields before submission' USING ERRCODE = '23514';
 END IF;
 -- Share locks serialize approval with canonical unpublishing; recheck predicates after any wait.
 PERFORM 1 FROM ev_variants v JOIN ev_models m ON m.id=v.model_id JOIN brands b ON b.id=m.brand_id
  WHERE v.id=item.variant_id AND v.status='PUBLISHED' AND m.status='PUBLISHED' AND b.status='PUBLISHED'
  FOR SHARE OF v,m,b;
 IF NOT FOUND THEN
  RAISE EXCEPTION 'Published canonical variant required' USING ERRCODE = '23514';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM listing_media m JOIN media_assets a ON a.id=m.media_asset_id
  WHERE m.listing_id=item.id AND a.owner_id=item.seller_user_id AND a.status='READY') THEN
  RAISE EXCEPTION 'Validated owner media required' USING ERRCODE = '23514';
 END IF;
END;
$$;

CREATE FUNCTION evone_listing_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE actor UUID;
BEGIN
 PERFORM evone_listing_request_id();
 IF TG_OP = 'INSERT' THEN
  actor := evone_listing_actor(ARRAY['USER','ADMIN']::"AppRole"[]);
  IF NEW.seller_user_id <> actor OR NEW.status <> 'DRAFT' OR NEW.version <> 1 THEN
   RAISE EXCEPTION 'New listings must be owned drafts' USING ERRCODE = '42501';
  END IF;
  NEW.published_at := NULL;
  RETURN NEW;
 END IF;
 IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Retain listing evidence; archive instead' USING ERRCODE = '42501'; END IF;
 IF NEW.id <> OLD.id OR NEW.seller_user_id <> OLD.seller_user_id OR NEW.slug <> OLD.slug OR NEW.is_demo <> OLD.is_demo OR NEW.created_at <> OLD.created_at THEN
  RAISE EXCEPTION 'Listing identity is immutable' USING ERRCODE = '23514';
 END IF;
 IF NEW.version <> OLD.version + 1 THEN RAISE EXCEPTION 'Increment the listing version once' USING ERRCODE = '40001'; END IF;
 IF OLD.status = 'PENDING_REVIEW' AND NEW.status IN ('PUBLISHED','REJECTED') THEN
  actor := evone_listing_actor(ARRAY['MODERATOR','ADMIN']::"AppRole"[]);
  IF actor = OLD.seller_user_id OR
   ROW(NEW.variant_id,NEW.year,NEW.odometer_km,NEW.city,NEW.asking_price_paise,NEW.ownership_count,NEW.condition_notes) IS DISTINCT FROM
   ROW(OLD.variant_id,OLD.year,OLD.odometer_km,OLD.city,OLD.asking_price_paise,OLD.ownership_count,OLD.condition_notes) OR
   NOT EXISTS (SELECT 1 FROM listing_reviews r WHERE r.listing_id=OLD.id AND r.listing_version=OLD.version AND r.reviewer_id=actor
    AND r.request_id=evone_listing_request_id() AND r.decision::text=CASE WHEN NEW.status='PUBLISHED' THEN 'APPROVE' ELSE 'REJECT' END) THEN
   RAISE EXCEPTION 'Separate immutable review required' USING ERRCODE = '42501';
  END IF;
 ELSE
  actor := evone_listing_actor(ARRAY['USER','ADMIN']::"AppRole"[]);
  IF actor <> OLD.seller_user_id THEN RAISE EXCEPTION 'Only the owner may change a listing' USING ERRCODE = '42501'; END IF;
  IF NOT ((OLD.status='DRAFT' AND NEW.status IN ('DRAFT','PENDING_REVIEW')) OR
   (OLD.status IN ('REJECTED','ARCHIVED') AND NEW.status='DRAFT') OR
   (OLD.status='PUBLISHED' AND NEW.status IN ('ARCHIVED','SOLD','PENDING_REVIEW'))) THEN
   RAISE EXCEPTION 'Listing transition is not allowed' USING ERRCODE = '23514';
  END IF;
  IF OLD.status='PUBLISHED' AND NEW.status IN ('ARCHIVED','SOLD') AND
   ROW(NEW.variant_id,NEW.year,NEW.odometer_km,NEW.city,NEW.asking_price_paise,NEW.ownership_count,NEW.condition_notes) IS DISTINCT FROM
   ROW(OLD.variant_id,OLD.year,OLD.odometer_km,OLD.city,OLD.asking_price_paise,OLD.ownership_count,OLD.condition_notes) THEN
   RAISE EXCEPTION 'Published content changes need review' USING ERRCODE = '23514';
  END IF;
 END IF;
 IF NEW.status IN ('PENDING_REVIEW','PUBLISHED') THEN PERFORM evone_listing_complete(NEW); END IF;
 NEW.published_at := CASE WHEN NEW.status='PUBLISHED' THEN clock_timestamp()
  WHEN NEW.status IN ('SOLD','ARCHIVED') THEN OLD.published_at ELSE NULL END;
 NEW.updated_at := clock_timestamp();
 RETURN NEW;
END;
$$;
CREATE TRIGGER listings_guard BEFORE INSERT OR UPDATE OR DELETE ON listings FOR EACH ROW EXECUTE FUNCTION evone_listing_guard();

CREATE FUNCTION evone_listing_history_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE item listings; prior listing_history; actor UUID;
BEGIN
 actor := evone_listing_actor(ARRAY['USER','MODERATOR','ADMIN']::"AppRole"[]);
 SELECT * INTO STRICT item FROM listings WHERE id=NEW.listing_id FOR UPDATE;
 IF NEW.version<>item.version OR NEW.actor_user_id<>actor OR NEW.request_id<>evone_listing_request_id() OR NEW.to_status<>item.status THEN
  RAISE EXCEPTION 'Current generated listing history required' USING ERRCODE = '42501';
 END IF;
 IF NEW.version=1 THEN NEW.before_json:=NULL;NEW.from_status:=NULL;
 ELSE
  SELECT * INTO STRICT prior FROM listing_history WHERE listing_id=item.id AND version=item.version-1;
  NEW.before_json:=prior.after_json;NEW.from_status:=prior.to_status;
 END IF;
 NEW.after_json:=evone_listing_snapshot(item);
 NEW.created_at:=clock_timestamp();
 RETURN NEW;
END;
$$;
CREATE TRIGGER listing_history_guard BEFORE INSERT ON listing_history FOR EACH ROW EXECUTE FUNCTION evone_listing_history_guard();
CREATE FUNCTION evone_listing_history_append() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 INSERT INTO listing_history(id,listing_id,version,actor_user_id,to_status,after_json,request_id)
 VALUES(gen_random_uuid(),NEW.id,NEW.version,evone_listing_actor(ARRAY['USER','MODERATOR','ADMIN']::"AppRole"[]),
  NEW.status,'{}'::jsonb,evone_listing_request_id());
 RETURN NULL;
END;
$$;
CREATE TRIGGER listings_history AFTER INSERT OR UPDATE ON listings FOR EACH ROW EXECUTE FUNCTION evone_listing_history_append();

CREATE FUNCTION evone_listing_media_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE item listings; asset media_assets; actor UUID; target UUID;
BEGIN
 actor := evone_listing_actor(ARRAY['USER','ADMIN']::"AppRole"[]);
 PERFORM evone_listing_request_id();
 target := CASE WHEN TG_OP='DELETE' THEN OLD.listing_id ELSE NEW.listing_id END;
 SELECT * INTO STRICT item FROM listings WHERE id=target FOR UPDATE;
 IF actor <> item.seller_user_id OR item.status NOT IN ('DRAFT','REJECTED') THEN
  RAISE EXCEPTION 'Only owner draft media can change' USING ERRCODE = '42501';
 END IF;
 IF TG_OP='UPDATE' AND (NEW.id<>OLD.id OR NEW.listing_id<>OLD.listing_id OR NEW.media_asset_id<>OLD.media_asset_id) THEN
  RAISE EXCEPTION 'Media attachment identity is immutable' USING ERRCODE = '23514';
 END IF;
 IF TG_OP<>'DELETE' THEN
  SELECT * INTO STRICT asset FROM media_assets WHERE id=NEW.media_asset_id FOR SHARE;
  IF asset.owner_id<>item.seller_user_id OR asset.status<>'READY' THEN
   RAISE EXCEPTION 'Validated owner media required' USING ERRCODE = '23514';
  END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER listing_media_guard BEFORE INSERT OR UPDATE OR DELETE ON listing_media FOR EACH ROW EXECUTE FUNCTION evone_listing_media_guard();
CREATE FUNCTION evone_listing_media_changed() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 UPDATE listings SET status='DRAFT',version=version+1 WHERE id=CASE WHEN TG_OP='DELETE' THEN OLD.listing_id ELSE NEW.listing_id END;
 RETURN NULL;
END;
$$;
CREATE TRIGGER listing_media_changed AFTER INSERT OR UPDATE OR DELETE ON listing_media FOR EACH ROW EXECUTE FUNCTION evone_listing_media_changed();

CREATE FUNCTION evone_listing_review_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE item listings; actor UUID;
BEGIN
 actor := evone_listing_actor(ARRAY['MODERATOR','ADMIN']::"AppRole"[]);
 SELECT * INTO STRICT item FROM listings WHERE id=NEW.listing_id FOR UPDATE;
 IF item.status<>'PENDING_REVIEW' OR item.version<>NEW.listing_version THEN
  RAISE EXCEPTION 'Review the current submitted version' USING ERRCODE = '40001';
 END IF;
 IF actor=item.seller_user_id OR NEW.reviewer_id<>actor OR NEW.request_id<>evone_listing_request_id() THEN
  RAISE EXCEPTION 'Separate reviewer and request context required' USING ERRCODE = '42501';
 END IF;
 SELECT after_json INTO STRICT NEW.snapshot FROM listing_history WHERE listing_id=item.id AND version=item.version;
 NEW.created_at := clock_timestamp();
 RETURN NEW;
END;
$$;
CREATE TRIGGER listing_review_guard BEFORE INSERT ON listing_reviews FOR EACH ROW EXECUTE FUNCTION evone_listing_review_guard();
CREATE FUNCTION evone_listing_review_apply() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 UPDATE listings SET status=CASE WHEN NEW.decision='APPROVE' THEN 'PUBLISHED'::"ListingStatus" ELSE 'REJECTED'::"ListingStatus" END,
  version=version+1 WHERE id=NEW.listing_id;
 RETURN NULL;
END;
$$;
CREATE TRIGGER listing_review_apply AFTER INSERT ON listing_reviews FOR EACH ROW EXECUTE FUNCTION evone_listing_review_apply();
CREATE TRIGGER listing_reviews_immutable BEFORE UPDATE OR DELETE ON listing_reviews FOR EACH ROW EXECUTE FUNCTION refuse_audit_mutation();
CREATE TRIGGER listing_reviews_no_truncate BEFORE TRUNCATE ON listing_reviews FOR EACH STATEMENT EXECUTE FUNCTION refuse_audit_mutation();
CREATE TRIGGER listing_history_immutable BEFORE UPDATE OR DELETE ON listing_history FOR EACH ROW EXECUTE FUNCTION refuse_audit_mutation();
CREATE TRIGGER listing_history_no_truncate BEFORE TRUNCATE ON listing_history FOR EACH STATEMENT EXECUTE FUNCTION refuse_audit_mutation();
CREATE TRIGGER listings_no_truncate BEFORE TRUNCATE ON listings FOR EACH STATEMENT EXECUTE FUNCTION refuse_audit_mutation();
CREATE TRIGGER listing_media_no_truncate BEFORE TRUNCATE ON listing_media FOR EACH STATEMENT EXECUTE FUNCTION refuse_audit_mutation();

CREATE FUNCTION evone_attached_media_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF ROW(NEW.owner_id,NEW.status,NEW.object_key) IS DISTINCT FROM ROW(OLD.owner_id,OLD.status,OLD.object_key) AND
 EXISTS(SELECT 1 FROM listing_media WHERE media_asset_id=OLD.id) THEN
  RAISE EXCEPTION 'Attached validated media is immutable' USING ERRCODE = '23514';
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER media_assets_listing_guard BEFORE UPDATE ON media_assets FOR EACH ROW EXECUTE FUNCTION evone_attached_media_guard();
CREATE FUNCTION evone_listed_variant_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.status<>'PUBLISHED' AND EXISTS(SELECT 1 FROM listings WHERE variant_id=OLD.id AND status='PUBLISHED') THEN
  RAISE EXCEPTION 'Published listings require a published variant' USING ERRCODE = '23514';
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER ev_variants_listing_guard BEFORE UPDATE OF status ON ev_variants FOR EACH ROW EXECUTE FUNCTION evone_listed_variant_guard();
COMMIT;
