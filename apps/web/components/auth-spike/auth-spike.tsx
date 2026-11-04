"use client";

import { useState } from "react";
import { SignIn, SignUp, useAuth, useClerk } from "@clerk/nextjs";
import { Button, ErrorState, Skeleton } from "@evone/ui";

export function AuthSpike({ flow }: { flow: "sign-in" | "sign-up" }) {
  const { isLoaded, isSignedIn, sessionId } = useAuth();
  if (!isLoaded) return <Skeleton label="Loading development session" />;
  if (!isSignedIn) {
    return flow === "sign-up" ? (
      <SignUp
        routing="hash"
        signInUrl="/auth-spike"
        forceRedirectUrl="/auth-spike"
      />
    ) : (
      <SignIn
        routing="hash"
        signUpUrl="/auth-spike?flow=sign-up"
        forceRedirectUrl="/auth-spike"
      />
    );
  }
  return <DevelopmentSession key={sessionId} />;
}

function DevelopmentSession() {
  const { getToken } = useAuth();
  const clerk = useClerk();
  const [pending, setPending] = useState<"verify" | "sign-out" | null>(null);
  const [result, setResult] = useState<"verified" | "error" | null>(null);
  async function checkToken() {
    setPending("verify");
    setResult(null);
    try {
      const token = await getToken({ template: "evone-api" });
      if (!token) throw new Error("No development token");
      const response = await fetch("/auth-spike/verify", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });
      setResult(response.ok ? "verified" : "error");
    } catch {
      setResult("error");
    } finally {
      setPending(null);
    }
  }
  return (
    <section aria-label="Development session" className="space-y-6">
      <p>
        Signed in to the development instance. No account permissions have been
        granted.
      </p>
      <div className="flex flex-wrap gap-4">
        <Button
          loading={pending === "verify"}
          disabled={pending !== null}
          loadingLabel="Checking token…"
          onClick={checkToken}
        >
          Check API token
        </Button>
        <Button
          variant="secondary"
          disabled={pending !== null}
          loading={pending === "sign-out"}
          loadingLabel="Signing out…"
          onClick={async () => {
            setPending("sign-out");
            setResult(null);
            try {
              await clerk.signOut({ redirectUrl: "/auth-spike" });
            } catch {
              setResult("error");
            } finally {
              setPending(null);
            }
          }}
        >
          Sign out
        </Button>
      </div>
      {result === "verified" ? (
        <p role="status">
          Development token signature and required claims verified.
        </p>
      ) : null}
      {result === "error" ? (
        <ErrorState title="The development check failed">
          Check the development configuration and connection, then retry. No
          token or identity is shown here.
        </ErrorState>
      ) : null}
    </section>
  );
}
