"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/app-shell";

export default function AuthCompletePage() {
  const { completeEmailLink, verifyEmailCode, user, verified } = useAuth();
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get("mode");
    const oobCode = params.get("oobCode");

    async function run() {
      try {
        if (mode === "verifyEmail" && oobCode) {
          await verifyEmailCode(oobCode);
          return;
        }
        if (mode === "signIn" || !mode) {
          const result = await completeEmailLink(window.location.href);
          if (result === "signin") {
            return;
          }
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
  }, [completeEmailLink, verifyEmailCode, router]);

  useEffect(() => {
    if (user && verified) router.replace("/vacantes");
  }, [user, verified, router]);

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
