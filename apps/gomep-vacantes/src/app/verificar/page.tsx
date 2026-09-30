"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/app-shell";

export default function VerificarPage() {
  const { user, loading, verified } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/");
    if (!loading && user && verified) router.replace("/vacantes");
  }, [loading, user, verified, router]);

  return (
    <AppShell title="Verifique su correo">
      <p className="leading-relaxed text-muted-foreground" data-testid="unverified-message">
        Confirme el enlace de verificación en su correo. Hasta entonces no
        puede ver vacantes, suscripciones ni la pantalla de admin.
      </p>
    </AppShell>
  );
}
