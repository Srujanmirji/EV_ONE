import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/catalogue/breadcrumbs";
import { AddToCompare } from "@/components/compare/add-to-compare";
import { SpecList } from "@/components/catalogue/spec-list";
import { CatalogueUnavailable } from "@/components/catalogue/unavailable";
import { loadVariant, modelHref, variantHref } from "@/lib/catalogue";
import { formatReviewDate, VEHICLE_TYPE_LABEL } from "@/lib/format";
import { specRows } from "@/lib/specs";

type Params = Promise<{ brand: string; model: string; variant: string }>;
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { brand, model, variant } = await params;
  const result = await loadVariant(brand, model, variant);
  if (result.kind !== "ok")
    return {
      title: "Electric vehicle",
      robots: { index: false, follow: false },
    };
  const { model: m, variant: v } = result.data;
  return {
    title: `${m.name} ${v.name}`,
    description: `Specifications of the ${m.name} ${v.name}, each with its reviewed source and date.`,
    alternates: { canonical: variantHref(m, v.slug) },
    robots: { index: false, follow: false },
  };
}

export default async function VariantPage({ params }: { params: Params }) {
  const { brand, model, variant } = await params;
  const result = await loadVariant(brand, model, variant);
  if (result.kind === "not-found") notFound();
  if (result.kind === "unavailable") {
    return (
      <CatalogueUnavailable retryHref={`/evs/${brand}/${model}/${variant}`} />
    );
  }
  const { model: m, variant: v } = result.data;
  const rows = specRows(v.specs, v.sources);
  const reviewed = v.sources
    .map((s) => s.reviewedAt)
    .sort()
    .at(-1);

  return (
    <main id="main" tabIndex={-1} className="flex-1">
      <section className="bg-graphite text-paper">
        <div className="mx-auto flex w-full max-w-content flex-col gap-4 px-4 py-10 sm:px-8 sm:py-14">
          <Breadcrumbs
            items={[
              { href: "/evs", label: "Explore EVs" },
              { href: modelHref(m), label: m.name },
              { label: v.name },
            ]}
          />
          <p className="text-titanium">
            {m.brand.name} · {VEHICLE_TYPE_LABEL[m.vehicleType]}
          </p>
          <h1 className="font-display text-4xl font-semibold text-balance sm:text-5xl">
            {m.name} <span className="text-titanium">{v.name}</span>
          </h1>
          {v.isDemo ? (
            <p>
              <span className="rounded-full bg-paper px-3 py-1 text-sm font-semibold text-ink">
                Demo data
              </span>
            </p>
          ) : null}
          <div className="pt-2 [&_button]:border-glass-line [&_button]:bg-glass [&_button]:text-paper">
            <AddToCompare variantId={v.id} variantName={v.name} />
          </div>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-content flex-col gap-6 px-4 py-10 sm:px-8 sm:py-14">
        <div className="flex flex-col gap-2">
          <h2 className="font-display text-2xl font-semibold">
            Specifications
          </h2>
          <p className="max-w-prose text-secondary">
            Every stated value links to the source it was checked against.
            {reviewed
              ? ` Most recently checked ${formatReviewDate(reviewed)}.`
              : ""}{" "}
            Figures can change; confirm with the manufacturer before buying.
          </p>
        </div>
        <SpecList rows={rows} />
      </div>
    </main>
  );
}
