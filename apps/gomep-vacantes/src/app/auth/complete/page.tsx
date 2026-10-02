"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/app-shell";

export default function AuthCompletePage() {
  const { completeEmailLink, verifyEmailCode, user, verified, loading } = useAuth();
  const router = useRouter();
  const [error, setError] = useState("");
  const [accepted, setAccepted] = useState(false);
  const ran = useRef(false);

  useEffect(() => {
    if (loading || ran.current) return;
    ran.current = true;
    const params = new URLSearchParams(window.location.search);
    const mode = params.get("mode");
    const oobCode = params.get("oobCode");

    async function run() {
      try {
        if (mode === "verifyEmail" && oobCode) {
          const signedIn = await verifyEmailCode(oobCode);
          if (!signedIn) {
            router.replace("/?verificado=1");
            return;
          }
          setAccepted(true);
          return;
        }
        if (mode === "signIn" || !mode) {
          const result = await completeEmailLink(window.location.href);
          if (result === "signin") setAccepted(true);
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "El enlace no es válido o ya se usó",
        );
      }
    }
    void run();
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
