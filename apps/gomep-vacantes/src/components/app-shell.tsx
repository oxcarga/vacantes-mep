"use client";

import Link from "next/link";
import { Briefcase, Bookmark, LogOut, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

export function AppShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const { user, role, verified, signOutUser } = useAuth();
  return (
    <div className="flex min-h-svh justify-center px-6 py-8">
      <main className="flex w-full max-w-4xl flex-col gap-4">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs tracking-widest text-muted-foreground uppercase">
              gomep-vacantes
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          </div>
          {user ? (
            <div className="flex flex-wrap items-center gap-3">
              <span data-testid="session-email">{user.email}</span>
              <span data-testid="session-role">{role}</span>
              <Button type="button" variant="outline" onClick={signOutUser}>
                <LogOut aria-hidden />
                Cerrar sesión
              </Button>
            </div>
          ) : null}
        </header>
        {user && verified ? (
          <nav className="flex gap-4 text-sm" data-testid="app-nav">
            <Link href="/vacantes" className="inline-flex items-center gap-1.5">
              <Briefcase aria-hidden className="size-4" />
              Vacantes
            </Link>
            {role === "docente" ? (
              <Link
                href="/suscripciones"
                data-testid="nav-suscripciones"
                className="inline-flex items-center gap-1.5"
              >
                <Bookmark aria-hidden className="size-4" />
                Suscripciones
              </Link>
            ) : null}
            {role === "admin" ? (
              <Link
                href="/admin"
                data-testid="nav-admin"
                className="inline-flex items-center gap-1.5"
              >
                <Shield aria-hidden className="size-4" />
                Administración
              </Link>
            ) : null}
          </nav>
        ) : null}
        {children}
      </main>
    </div>
  );
}
