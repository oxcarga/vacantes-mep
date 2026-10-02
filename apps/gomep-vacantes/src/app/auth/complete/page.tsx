"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/app-shell";

type LinkAttempt = "signin" | "verify-signed" | "verify-unsigned" | "none";

const linkAttempts = new Map<string, Promise<LinkAttempt>>();

export default function AuthCompletePage() {
  const { completeEmailLink, verifyEmailCode, user, verified, loading } = useAuth();
  const router = useRouter();
  const [error, setError] = useState("");
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (loading) return;
    const href = window.location.href;
    const params = new URLSearchParams(window.location.search);
    const mode = params.get("mode");
    const oobCode = params.get("oobCode");

    let attempt = linkAttempts.get(href);
    if (!attempt) {
      attempt = (async () => {
        if (mode === "verifyEmail" && oobCode) {
          const signedIn = await verifyEmailCode(oobCode);
          return signedIn ? "verify-signed" : "verify-unsigned";
        }
        if (mode === "signIn" || !mode) {
          const result = await completeEmailLink(href);
          if (result === "signin") return "signin";
        }
        return "none";
      })();
      linkAttempts.set(href, attempt);
    }

    let cancelled = false;
    attempt.then(
      (result) => {
        if (cancelled) return;
        if (result === "verify-unsigned") {
          router.replace("/?verificado=1");
          return;
        }
        if (result === "signin" || result === "verify-signed") setAccepted(true);
      },
      (err) => {
        if (cancelled) return;
        setError(
          err instanceof Error
            ? err.message
            : "El enlace no es válido o ya se usó",
        );
      },
    );
    return () => {
      cancelled = true;
    };
  }, [completeEmailLink, verifyEmailCode, router, loading]);

  useEffect(() => {
    if (accepted && user && verified) router.replace("/vacantes");
  }, [accepted, user, verified, router]);

  return (
    <AppShell title="Completando acceso">
      {error ? (
        <p className="text-destructive" data-testid="link-error">
          El enlace no es válido o ya se usó. {error}
        </p>
      ) : (
        <p>Procesando el enlace…</p>
      )}
    </AppShell>
  );
}
