-- CreateEnum
CREATE TYPE "PublishStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('SCOOTER', 'MOTORCYCLE', 'CAR', 'THREE_WHEELER');

-- CreateEnum
CREATE TYPE "ModelAvailability" AS ENUM ('ON_SALE', 'UPCOMING', 'DISCONTINUED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "RangeStandard" AS ENUM ('MIDC', 'IDC', 'WLTP', 'NEDC', 'EPA', 'OEM_UNSPECIFIED');

-- CreateEnum
CREATE TYPE "SpecField" AS ENUM ('BATTERY_KWH', 'CLAIMED_RANGE', 'MOTOR_KW', 'CHARGING_AC_KW', 'CHARGING_DC_KW', 'WARRANTY');

-- CreateEnum
CREATE TYPE "SourceKind" AS ENUM ('OEM', 'REGULATOR', 'PRESS', 'DEALER', 'OTHER');

-- CreateTable
CREATE TABLE "brands" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo_key" TEXT,
    "status" "PublishStatus" NOT NULL DEFAULT 'DRAFT',
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ev_models" (
    "id" UUID NOT NULL,
    "brand_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "vehicle_type" "VehicleType" NOT NULL,
    "availability_status" "ModelAvailability" NOT NULL DEFAULT 'UNKNOWN',
    "release_date" DATE,
    "status" "PublishStatus" NOT NULL DEFAULT 'DRAFT',
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ev_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ev_variants" (
    "id" UUID NOT NULL,
    "model_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "battery_kwh" DECIMAL(6,2),
    "claimed_range_km" INTEGER,
    "range_standard" "RangeStandard",
    "motor_kw" DECIMAL(6,2),
    "charging_ac_kw" DECIMAL(5,2),
    "charging_dc_kw" DECIMAL(6,2),
    "warranty_text" TEXT,
    "status" "PublishStatus" NOT NULL DEFAULT 'DRAFT',
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ev_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spec_sources" (
    "id" UUID NOT NULL,
    "variant_id" UUID NOT NULL,
    "field_name" "SpecField" NOT NULL,
    "value_text" TEXT NOT NULL,
    "source_url" TEXT NOT NULL,
    "source_kind" "SourceKind" NOT NULL,
    "effective_at" DATE,
    "reviewed_at" TIMESTAMPTZ(6),
    "reviewer_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "spec_sources_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "brands_slug_key" ON "brands"("slug");

-- CreateIndex
CREATE INDEX "ev_models_status_vehicle_type_idx" ON "ev_models"("status", "vehicle_type");

-- CreateIndex
CREATE UNIQUE INDEX "ev_models_brand_id_slug_key" ON "ev_models"("brand_id", "slug");

-- CreateIndex
CREATE INDEX "ev_variants_status_idx" ON "ev_variants"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ev_variants_model_id_slug_key" ON "ev_variants"("model_id", "slug");

-- CreateIndex
CREATE INDEX "spec_sources_variant_id_field_name_idx" ON "spec_sources"("variant_id", "field_name");

-- AddForeignKey
ALTER TABLE "ev_models" ADD CONSTRAINT "ev_models_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ev_variants" ADD CONSTRAINT "ev_variants_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "ev_models"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spec_sources" ADD CONSTRAINT "spec_sources_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "ev_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Hand-written rules Prisma cannot express (EV-021) ──────────────────────

-- Slugs: lowercase words joined by single hyphens.
ALTER TABLE "brands" ADD CONSTRAINT "brands_slug_format" CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
ALTER TABLE "ev_models" ADD CONSTRAINT "ev_models_slug_format" CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
ALTER TABLE "ev_variants" ADD CONSTRAINT "ev_variants_slug_format" CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

-- Units: NULL means unknown; a stated value must be physically positive.
ALTER TABLE "ev_variants" ADD CONSTRAINT "ev_variants_battery_kwh_positive" CHECK ("battery_kwh" IS NULL OR "battery_kwh" > 0);
ALTER TABLE "ev_variants" ADD CONSTRAINT "ev_variants_claimed_range_km_positive" CHECK ("claimed_range_km" IS NULL OR "claimed_range_km" > 0);
ALTER TABLE "ev_variants" ADD CONSTRAINT "ev_variants_motor_kw_positive" CHECK ("motor_kw" IS NULL OR "motor_kw" > 0);
ALTER TABLE "ev_variants" ADD CONSTRAINT "ev_variants_charging_ac_kw_positive" CHECK ("charging_ac_kw" IS NULL OR "charging_ac_kw" > 0);
ALTER TABLE "ev_variants" ADD CONSTRAINT "ev_variants_charging_dc_kw_positive" CHECK ("charging_dc_kw" IS NULL OR "charging_dc_kw" > 0);
-- A range is meaningless without its test cycle, and vice versa.
ALTER TABLE "ev_variants" ADD CONSTRAINT "ev_variants_range_has_standard" CHECK (("claimed_range_km" IS NULL) = ("range_standard" IS NULL));

-- Sources must be fetchable https links; a review needs both who and when.
ALTER TABLE "spec_sources" ADD CONSTRAINT "spec_sources_url_https" CHECK ("source_url" ~ '^https://[^\s]+$');
ALTER TABLE "spec_sources" ADD CONSTRAINT "spec_sources_value_text_present" CHECK (length(btrim("value_text")) > 0);
ALTER TABLE "spec_sources" ADD CONSTRAINT "spec_sources_review_complete" CHECK (("reviewed_at" IS NULL) = ("reviewer_id" IS NULL));

-- Which stated specs lack a reviewed source. Empty for a publishable variant.
CREATE VIEW "ev_variant_unsourced_specs" AS
SELECT v."id" AS "variant_id", f."field_name"
FROM "ev_variants" v
CROSS JOIN LATERAL (VALUES
    ('BATTERY_KWH'::"SpecField", v."battery_kwh" IS NOT NULL),
    ('CLAIMED_RANGE'::"SpecField", v."claimed_range_km" IS NOT NULL),
    ('MOTOR_KW'::"SpecField", v."motor_kw" IS NOT NULL),
    ('CHARGING_AC_KW'::"SpecField", v."charging_ac_kw" IS NOT NULL),
    ('CHARGING_DC_KW'::"SpecField", v."charging_dc_kw" IS NOT NULL),
    ('WARRANTY'::"SpecField", v."warranty_text" IS NOT NULL)
) AS f("field_name", "is_stated")
WHERE f."is_stated"
  AND NOT EXISTS (
    SELECT 1 FROM "spec_sources" s
    WHERE s."variant_id" = v."id"
      AND s."field_name" = f."field_name"
      AND s."reviewed_at" IS NOT NULL
  );

-- Raises unless a variant may be PUBLISHED: its model and brand are
-- published and every stated spec has a reviewed source.
CREATE FUNCTION "evone_assert_variant_publishable"(p_variant_id UUID) RETURNS VOID
LANGUAGE plpgsql AS $$
DECLARE
  missing TEXT;
BEGIN
  IF EXISTS (
    SELECT 1 FROM "ev_variants" v
    JOIN "ev_models" m ON m."id" = v."model_id"
    JOIN "brands" b ON b."id" = m."brand_id"
    WHERE v."id" = p_variant_id
      AND (m."status" <> 'PUBLISHED' OR b."status" <> 'PUBLISHED')
  ) THEN
    RAISE EXCEPTION 'variant % cannot be published: its model and brand must be published first', p_variant_id
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT string_agg("field_name"::TEXT, ', ' ORDER BY "field_name") INTO missing
  FROM "ev_variant_unsourced_specs" WHERE "variant_id" = p_variant_id;
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'variant % cannot be published: no reviewed source for %', p_variant_id, missing
      USING ERRCODE = 'check_violation';
  END IF;
END;
$$;

-- Checked at commit (deferred), so an editor can add sources and publish in
-- one transaction.
CREATE FUNCTION "evone_ev_variants_publish_guard"() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD."status" = 'PUBLISHED' THEN
      RAISE EXCEPTION 'variant % is published: archive it instead of deleting', OLD."id"
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN OLD;
  END IF;
  -- Deferred: re-read the row as it stands at commit, not as it was when
  -- this event fired, so publish-then-revert in one transaction is allowed.
  IF EXISTS (SELECT 1 FROM "ev_variants" WHERE "id" = NEW."id" AND "status" = 'PUBLISHED') THEN
    PERFORM "evone_assert_variant_publishable"(NEW."id");
  END IF;
  RETURN NEW;
END;
$$;

CREATE CONSTRAINT TRIGGER "ev_variants_publish_guard"
AFTER INSERT OR UPDATE ON "ev_variants"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "evone_ev_variants_publish_guard"();

CREATE TRIGGER "ev_variants_no_delete_published"
BEFORE DELETE ON "ev_variants"
FOR EACH ROW EXECUTE FUNCTION "evone_ev_variants_publish_guard"();

-- Removing or un-reviewing a source must not leave a published variant
-- unsourced.
CREATE FUNCTION "evone_spec_sources_publish_guard"() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM "ev_variants" WHERE "id" = OLD."variant_id" AND "status" = 'PUBLISHED') THEN
    PERFORM "evone_assert_variant_publishable"(OLD."variant_id");
  END IF;
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER "spec_sources_publish_guard"
AFTER UPDATE OR DELETE ON "spec_sources"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "evone_spec_sources_publish_guard"();

-- Un-publishing a model or brand must not strand published variants.
CREATE FUNCTION "evone_parent_publish_guard"() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."status" = 'PUBLISHED' AND NEW."status" <> 'PUBLISHED' THEN
    IF TG_TABLE_NAME = 'ev_models' AND EXISTS (
      SELECT 1 FROM "ev_variants" WHERE "model_id" = NEW."id" AND "status" = 'PUBLISHED'
    ) THEN
      RAISE EXCEPTION 'model % has published variants: unpublish them first', NEW."id"
        USING ERRCODE = 'check_violation';
    END IF;
    IF TG_TABLE_NAME = 'brands' AND EXISTS (
      SELECT 1 FROM "ev_models" WHERE "brand_id" = NEW."id" AND "status" = 'PUBLISHED'
    ) THEN
      RAISE EXCEPTION 'brand % has published models: unpublish them first', NEW."id"
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "ev_models_parent_publish_guard"
BEFORE UPDATE OF "status" ON "ev_models"
FOR EACH ROW EXECUTE FUNCTION "evone_parent_publish_guard"();

CREATE TRIGGER "brands_parent_publish_guard"
BEFORE UPDATE OF "status" ON "brands"
FOR EACH ROW EXECUTE FUNCTION "evone_parent_publish_guard"();
