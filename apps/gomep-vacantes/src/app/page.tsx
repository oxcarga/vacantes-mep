"use client";

import { useAuth } from "@/lib/auth-context";
import styles from "./page.module.css";

export default function Home() {
  const { user, loading, configured, signInWithGoogle, signOutUser } = useAuth();

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <p className={styles.kicker}>gomep-vacantes</p>
        <h1>Vacantes del MEP</h1>
        {loading ? (
          <p>Cargando…</p>
        ) : !configured ? (
          <p className={styles.muted}>
            Configure <code>NEXT_PUBLIC_FIREBASE_*</code> en{" "}
            <code>.env.local</code> (o en App Hosting) para activar el inicio
            de sesión.
          </p>
        ) : user ? (
          <>
            <p>
              Sesión iniciada como <strong>{user.email}</strong>.
            </p>
            <p className={styles.muted}>
              El panel de administración vendrá después. Por ahora el scraper
              escribe en Firestore y esta app sólo comprueba Firebase Auth.
            </p>
            <button type="button" className={styles.secondary} onClick={signOutUser}>
              Cerrar sesión
            </button>
          </>
        ) : (
          <>
            <p className={styles.muted}>
              Entre con Google para continuar. La lista de vacantes y las
              suscripciones por regional y especialidad se construyen en un
              siguiente paso.
            </p>
            <button type="button" className={styles.primary} onClick={signInWithGoogle}>
              Entrar con Google
            </button>
          </>
        )}
      </main>
    </div>
  );
}
