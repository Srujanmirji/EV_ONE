import { notFound } from "next/navigation";
import {
  ClerkProvider,
  ClerkLoading,
  ClerkLoaded,
  ClerkFailed,
  ClerkDegraded,
} from "@clerk/nextjs";
import { ListingParams } from "@evone/contracts";
import { EmptyState, ErrorState, Skeleton } from "@evone/ui";
import { ComingSoon } from "@/components/coming-soon";
import { sectionFor } from "@/lib/site";
import { sectionMetadata } from "@/lib/site-metadata";
import { sellConfig } from "@/lib/sell/config";
import { SellerSession } from "@/components/sell/session";
const section = sectionFor("/sell");
export const metadata = sectionMetadata(section);
export const dynamic = "force-dynamic";
export default async function SellPage({
  searchParams,
}: {
  searchParams: Promise<{ draft?: string }>;
}) {
  const state = sellConfig();
  if (state.kind === "disabled") return <ComingSoon section={section} />;
  const draft = (await searchParams).draft;
  const parsed = draft ? ListingParams.safeParse({ id: draft }) : null;
  if (parsed && !parsed.success) notFound();
  return (
    <main
      id="main"
      tabIndex={-1}
      className="mx-auto w-full max-w-content flex-1 scroll-mt-24 px-4 py-10 sm:px-8 sm:py-14"
    >
      <h1 className="font-display text-3xl font-semibold">Sell your EV</h1>
      <p className="mt-4 max-w-prose text-secondary">
        Local demo wizard. Drafts and photos stay private; submission requests
        moderation. No vehicle purchase or public listing is enabled.
      </p>
      {state.kind === "unconfigured" ? (
        <div className="mt-8">
          <EmptyState title="Seller sign-in is not configured">
            Configure the local Clerk development instance, API and private
            media settings described in PROJECT_SETUP.md. No sign-in or upload
            request has been sent.
          </EmptyState>
        </div>
      ) : (
        <ClerkProvider
          publishableKey={state.config.publishableKey}
          telemetry={{ disabled: true }}
        >
          <ClerkLoading>
            <div className="mt-8">
              <Skeleton label="Loading seller sign-in" />
            </div>
          </ClerkLoading>
          <ClerkFailed>
            <ErrorState title="Seller sign-in could not load">
              Retry when the development sign-in service is available.
            </ErrorState>
          </ClerkFailed>
          <ClerkDegraded>
            <ErrorState title="Sign-in service is degraded">
              Wait for the development service to recover, then reload.
            </ErrorState>
          </ClerkDegraded>
          <ClerkLoaded>
            <SellerSession
              initialDraftId={parsed?.success ? parsed.data.id : undefined}
            />
          </ClerkLoaded>
        </ClerkProvider>
      )}
    </main>
  );
}
