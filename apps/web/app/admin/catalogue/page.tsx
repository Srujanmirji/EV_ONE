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
import { catalogueEditorConfig } from "@/lib/catalogue-editor/config";
import { CatalogueEditorSession } from "@/components/catalogue-editor/session";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Catalogue workspace",
  robots: { index: false, follow: false },
};
export default function CatalogueEditorPage() {
  const state = catalogueEditorConfig();
  if (state.kind === "disabled") notFound();
  return (
    <main
      id="main"
      tabIndex={-1}
      className="mx-auto w-full max-w-content flex-1 scroll-mt-24 px-4 py-10 sm:px-8 sm:py-14"
    >
      <h1 className="font-display text-3xl font-semibold">
        Catalogue workspace
      </h1>
      <p className="mt-4 max-w-prose text-secondary">
        Local catalogue workspace. Drafts stay private until a different admin
        approves their sources. Published test entries are marked as demo data.
      </p>
      {state.kind === "unconfigured" ? (
        <div className="mt-8">
          <EmptyState title="Catalogue sign-in is not configured">
            Configure the local Clerk development instance and API connection
            described in PROJECT_SETUP.md. Production auth remains disabled.
          </EmptyState>
        </div>
      ) : (
        <ClerkProvider
          publishableKey={state.config.publishableKey}
          telemetry={{ disabled: true }}
        >
          <ClerkLoading>
            <div className="mt-8">
              <Skeleton label="Loading catalogue sign-in" />
            </div>
          </ClerkLoading>
          <ClerkFailed>
            <ErrorState title="Catalogue sign-in could not load">
              Retry when the development sign-in service is available.
            </ErrorState>
          </ClerkFailed>
          <ClerkDegraded>
            <ErrorState title="Sign-in service is degraded">
              Wait for the development service to recover, then reload.
            </ErrorState>
          </ClerkDegraded>
          <ClerkLoaded>
            <CatalogueEditorSession />
          </ClerkLoaded>
        </ClerkProvider>
      )}
    </main>
  );
}
