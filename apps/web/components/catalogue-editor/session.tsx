"use client";
import { useCallback } from "react";
import { SignIn, useAuth } from "@clerk/nextjs";
import { ErrorEnvelope } from "@evone/contracts";
import { Skeleton } from "@evone/ui";
import { CatalogueWorkspace } from "./workspace";
import type { EditorRequest } from "./workspace";

export function CatalogueEditorSession() {
  const { isLoaded, isSignedIn, sessionId, getToken } = useAuth();
  const request = useCallback<EditorRequest>(
    async (path, method = "GET", body) => {
      const token = await getToken({ template: "evone-api" });
      if (!token) throw new Error("Sign in again before continuing.");
      const response = await fetch(`/admin/catalogue/api${path}`, {
        method,
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(10000),
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        const error = ErrorEnvelope.safeParse(data);
        throw new Error(
          error.success
            ? error.data.error.message
            : "The catalogue API is unavailable. Retry shortly.",
        );
      }
      return data;
    },
    [getToken],
  );
  if (!isLoaded) return <Skeleton label="Loading catalogue session" />;
  if (!isSignedIn)
    return <SignIn routing="hash" forceRedirectUrl="/admin/catalogue" />;
  return <CatalogueWorkspace key={sessionId} request={request} />;
}
