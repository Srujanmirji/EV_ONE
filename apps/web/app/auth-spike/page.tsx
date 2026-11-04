import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  ClerkProvider,
  ClerkLoading,
  ClerkLoaded,
  ClerkFailed,
  ClerkDegraded,
} from "@clerk/nextjs";
import { EmptyState, ErrorState, Skeleton } from "@evone/ui";
import { authSpikeConfig } from "@/lib/auth-spike/config";
import { AuthSpike } from "@/components/auth-spike/auth-spike";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Clerk development spike",
  robots: { index: false, follow: false },
};

export default async function AuthSpikePage({
  searchParams,
}: {
  searchParams: Promise<{ flow?: string }>;
}) {
  const state = authSpikeConfig();
  if (state.kind === "disabled") notFound();
  const flow = (await searchParams).flow === "sign-up" ? "sign-up" : "sign-in";
  return (
    <main
      id="main"
      tabIndex={-1}
      className="mx-auto w-full max-w-content flex-1 scroll-mt-24 px-4 py-12 sm:px-8"
    >
      <h1 className="font-display text-3xl font-semibold">
        Clerk development spike
      </h1>
      <p className="mt-4 max-w-prose text-secondary">
        Isolated development sign-in and token check. This does not grant access
        to EVONE accounts or dealer/admin resources. Use only approved test
        identities.
      </p>
      <div className="mt-8">
        {state.kind === "unconfigured" ? (
          <EmptyState title="Clerk is not configured">
            Set the development instance configuration described in
            PROJECT_SETUP.md, then reload. No sign-in request has been sent.
          </EmptyState>
        ) : (
          <ClerkProvider
            publishableKey={state.config.publishableKey}
            telemetry={{ disabled: true }}
          >
            <ClerkLoading>
              <Skeleton label="Loading development sign-in" />
            </ClerkLoading>
            <ClerkFailed>
              <ErrorState title="Sign-in could not load">
                Check your development instance and connection, then reload.
              </ErrorState>
            </ClerkFailed>
            <ClerkDegraded>
              <ErrorState title="Sign-in service is degraded">
                Try again when the development service recovers.
              </ErrorState>
            </ClerkDegraded>
            <ClerkLoaded>
              <AuthSpike flow={flow} />
            </ClerkLoaded>
          </ClerkProvider>
        )}
      </div>
    </main>
  );
}
