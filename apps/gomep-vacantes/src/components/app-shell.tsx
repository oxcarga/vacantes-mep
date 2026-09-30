"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import styles from "@/app/page.module.css";

export function AppShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const { user, role, verified, signOutUser } = useAuth();
  return (
    <div className={styles.page}>
      <main className={styles.mainWide}>
        <header className={styles.header}>
          <div>
            <p className={styles.kicker}>gomep-vacantes</p>
            <h1>{title}</h1>
          </div>
          {user ? (
            <div className={styles.headerMeta}>
              <span data-testid="session-email">{user.email}</span>
              <span data-testid="session-role">{role}</span>
              <button type="button" className={styles.secondary} onClick={signOutUser}>
                Cerrar sesión
              </button>
            </div>
          ) : null}
        </header>
        {user && verified ? (
          <nav className={styles.nav} data-testid="app-nav">
            <Link href="/vacantes">Vacantes</Link>
            {role === "docente" ? (
              <Link href="/suscripciones" data-testid="nav-suscripciones">
                Suscripciones
              </Link>
            ) : null}
            {role === "admin" ? (
              <Link href="/admin" data-testid="nav-admin">
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
