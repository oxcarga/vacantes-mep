"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, Bookmark, LogOut, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

const navLinkClass =
  "relative inline-flex items-center gap-1.5 pb-2.5 text-muted-foreground transition-colors hover:text-foreground aria-[current=page]:text-primary after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-transparent aria-[current=page]:after:bg-primary";

function NavLink({
  href,
  testId,
  children,
}: {
  href: string;
  testId?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const current = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      data-testid={testId}
      aria-current={current ? "page" : undefined}
      className={navLinkClass}
    >
      {children}
    </Link>
  );
}

export function AppShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const { user, role, verified, signOutUser } = useAuth();
  const showNav = Boolean(user && verified);
  return (
    <div className="min-h-svh">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl flex-col px-6">
          <div className={cn("flex items-center justify-between gap-4 pt-3", !showNav && "pb-3")}>
            <div className="flex items-center gap-2.5">
              <span
                aria-hidden
                className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground"
              >
                G
              </span>
              <span className="text-sm font-semibold tracking-tight">gomep vacantes</span>
            </div>
            {user ? (
              <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                <span
                  data-testid="session-email"
                  className="hidden max-w-56 truncate text-sm text-muted-foreground sm:inline"
                >
                  {user.email}
                </span>
                {role ? (
                  <span
                    data-testid="session-role"
                    className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground capitalize"
                  >
                    {role}
                  </span>
                ) : null}
                <Button type="button" variant="outline" onClick={signOutUser}>
                  <LogOut aria-hidden />
                  <span className="sr-only sm:not-sr-only">Cerrar sesión</span>
                </Button>
              </div>
            ) : null}
          </div>
          {showNav ? (
            <nav className="mt-3 flex gap-6 text-sm" data-testid="app-nav">
              <NavLink href="/vacantes">
                <Briefcase aria-hidden className="size-4" />
                Vacantes
              </NavLink>
              {role === "docente" ? (
                <NavLink href="/suscripciones" testId="nav-suscripciones">
                  <Bookmark aria-hidden className="size-4" />
                  Suscripciones
                </NavLink>
              ) : null}
              {role === "admin" ? (
                <NavLink href="/admin" testId="nav-admin">
                  <Shield aria-hidden className="size-4" />
                  Administración
                </NavLink>
              ) : null}
            </nav>
          ) : null}
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description ? <p className="text-muted-foreground">{description}</p> : null}
        </div>
        {children}
      </main>
    </div>
  );
}
