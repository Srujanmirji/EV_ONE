"use client";
import { useCallback, useMemo } from "react";
import { SignIn, useAuth } from "@clerk/nextjs";
import { Skeleton } from "@evone/ui";
import { sellerRequest } from "@/lib/sell/request";
import { SellWorkspace } from "./workspace";
export function SellerSession({ initialDraftId }: { initialDraftId?: string }) {
  const { isLoaded, isSignedIn, sessionId, getToken } = useAuth();
  const token = useCallback(
    () => getToken({ template: "evone-api" }),
    [getToken],
  );
  const request = useMemo(() => sellerRequest(token), [token]);
  if (!isLoaded) return <Skeleton label="Loading seller session" />;
  if (!isSignedIn) return <SignIn routing="hash" forceRedirectUrl="/sell" />;
  return (
    <SellWorkspace
      key={sessionId}
      request={request}
      initialDraftId={initialDraftId}
    />
  );
}
