import type {
  ModelSummary,
  SpecSourceView,
  VariantSpecs,
  VariantSummary,
} from "@evone/contracts";

/** Shapes returned by the repository (Prisma rows, minimal fields). */
interface DecimalLike {
  toString(): string;
}
export interface VariantRow {
  id: string;
  slug: string;
  name: string;
  isDemo: boolean;
  batteryKwh: DecimalLike | null;
  claimedRangeKm: number | null;
  rangeStandard: NonNullable<VariantSpecs["claimedRange"]>["standard"] | null;
  motorKw: DecimalLike | null;
  chargingAcKw: DecimalLike | null;
  chargingDcKw: DecimalLike | null;
  warrantyText: string | null;
}
export interface ModelRow {
  id: string;
  slug: string;
  name: string;
  vehicleType: ModelSummary["vehicleType"];
  availabilityStatus: ModelSummary["availability"];
  releaseDate: Date | null;
  isDemo: boolean;
  brand: { slug: string; name: string };
}
export interface SourceRow {
  fieldName: SpecSourceView["fieldName"];
  valueText: string;
  sourceUrl: string;
  sourceKind: SpecSourceView["sourceKind"];
  effectiveAt: Date | null;
  reviewedAt: Date | null;
}

const num = (value: DecimalLike | null): number | null =>
  value === null ? null : Number(value.toString());
const isoDate = (value: Date | null): string | null =>
  value === null ? null : value.toISOString().slice(0, 10);

export function toSpecs(row: VariantRow): VariantSpecs {
  return {
    batteryKwh: num(row.batteryKwh),
    // The database guarantees both or neither; never expose one alone.
    claimedRange:
      row.claimedRangeKm !== null && row.rangeStandard !== null
        ? { km: row.claimedRangeKm, standard: row.rangeStandard }
        : null,
    motorKw: num(row.motorKw),
    chargingAcKw: num(row.chargingAcKw),
    chargingDcKw: num(row.chargingDcKw),
    warrantyText: row.warrantyText,
  };
}

export function toVariantSummary(row: VariantRow): VariantSummary {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    isDemo: row.isDemo,
    specs: toSpecs(row),
  };
}

export function toModelSummary(row: ModelRow): ModelSummary {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    vehicleType: row.vehicleType,
    availability: row.availabilityStatus,
    releaseDate: isoDate(row.releaseDate),
    isDemo: row.isDemo,
    brand: { slug: row.brand.slug, name: row.brand.name },
  };
}

/** Only reviewed sources are evidence; unreviewed rows are editorial drafts. */
export function toSources(rows: SourceRow[]): SpecSourceView[] {
  return rows
    .filter((r): r is SourceRow & { reviewedAt: Date } => r.reviewedAt !== null)
    .map((r) => ({
      fieldName: r.fieldName,
      valueText: r.valueText,
      sourceUrl: r.sourceUrl,
      sourceKind: r.sourceKind,
      effectiveAt: isoDate(r.effectiveAt),
      reviewedAt: r.reviewedAt.toISOString(),
    }));
}
