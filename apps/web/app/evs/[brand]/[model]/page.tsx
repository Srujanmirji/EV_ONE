import { Card, Gallery } from "@evone/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/catalogue/breadcrumbs";
import { CatalogueUnavailable } from "@/components/catalogue/unavailable";
import { loadModel, modelHref, variantHref } from "@/lib/catalogue";
import {
  AVAILABILITY_LABEL,
  formatSpan,
  VEHICLE_TYPE_LABEL,
} from "@/lib/format";

type Params = Promise<{ brand: string; model: string }>;
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { brand, model } = await params;
  const result = await loadModel(brand, model);
  if (result.kind !== "ok")
    return {
      title: "Electric vehicle",
      robots: { index: false, follow: false },
    };
  const m = result.data;
  return {
    title: m.name,
    description: `${m.name} by ${m.brand.name}: published variants with sourced specifications.`,
    alternates: { canonical: modelHref(m) },
    robots: { index: false, follow: false },
  };
}

export default async function ModelPage({ params }: { params: Params }) {
  const { brand, model } = await params;
  const result = await loadModel(brand, model);
  if (result.kind === "not-found") notFound();
  if (result.kind === "unavailable")
    return <CatalogueUnavailable retryHref={`/evs/${brand}/${model}`} />;
  const m = result.data;

  return (
    <main id="main" tabIndex={-1} className="flex-1">
      <section className="bg-graphite text-paper">
        <div className="mx-auto flex w-full max-w-content flex-col gap-4 px-4 py-10 sm:px-8 sm:py-14">
          <Breadcrumbs
            items={[{ href: "/evs", label: "Explore EVs" }, { label: m.name }]}
          />
          <p className="text-titanium">{m.brand.name}</p>
          <h1 className="font-display text-4xl font-semibold text-balance sm:text-5xl">
            {m.name}
          </h1>
          <p className="flex flex-wrap gap-2 text-sm">
            <span className="rounded-full border border-glass-line px-3 py-1">
              {VEHICLE_TYPE_LABEL[m.vehicleType]}
            </span>
            <span className="rounded-full border border-glass-line px-3 py-1">
              {AVAILABILITY_LABEL[m.availability]}
            </span>
            {m.isDemo ? (
              <span className="rounded-full bg-paper px-3 py-1 font-semibold text-ink">
                Demo data
              </span>
            ) : null}
          </p>
        </div>
      </section>

      <div className="mx-auto grid w-full max-w-content gap-10 px-4 py-10 sm:px-8 sm:py-14 lg:grid-cols-[3fr_2fr]">
        <Gallery
          images={[]}
          label={`Photos of ${m.name}`}
          emptyText="No photos yet. EVONE only shows photos it has permission to publish."
        />
        <section
          aria-labelledby="variants-heading"
          className="flex flex-col gap-4"
        >
          <h2
            id="variants-heading"
            className="font-display text-2xl font-semibold"
          >
            Variants
          </h2>
          {m.variants.length === 0 ? (
            <p className="text-secondary">
              No variants have been published for this model yet.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {m.variants.map((v) => (
                <li key={v.id}>
                  <Card className="flex flex-col gap-2 p-5 sm:p-6">
                    <h3 className="font-display text-lg font-semibold">
                      <Link
                        href={variantHref(m, v.slug)}
                        className="underline-offset-4 hover:underline"
                      >
                        {v.name}
                      </Link>
                    </h3>
                    <p className="text-sm text-secondary">
                      {v.specs.batteryKwh
                        ? `${formatSpan(v.specs.batteryKwh, v.specs.batteryKwh, "kWh")} battery`
                        : "Battery not stated"}
                      {" · "}
                      {v.specs.claimedRange
                        ? `${formatSpan(v.specs.claimedRange.km, v.specs.claimedRange.km, "km")} (${v.specs.claimedRange.standard === "OEM_UNSPECIFIED" ? "maker claim" : v.specs.claimedRange.standard})`
                        : "Range not stated"}
                    </p>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
