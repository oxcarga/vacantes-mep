"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import styles from "./page.module.css";

export default function Home() {
  const {
    user,
    loading,
    configured,
    verified,
    register,
    signInWithPassword,
    requestMagicLink,
    signOutUser,
  } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<"register" | "login">("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function onRegister(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await register({ email, password, phone, name });
      router.push("/verificar");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar");
    }
  }

  async function onPasswordLogin(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const signed = await signInWithPassword(email, password);
      router.push(signed.emailVerified ? "/vacantes" : "/verificar");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo entrar");
    }
  }

  async function onMagicLink(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await requestMagicLink(email);
      setInfo("Revise su correo para el enlace de acceso.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar el enlace");
    }
  }

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
            <code>.env.local</code> para activar el inicio de sesión.
          </p>
        ) : user ? (
          <>
            <p>
              Sesión iniciada como <strong>{user.email}</strong>.
            </p>
            {!verified ? (
              <p data-testid="unverified-message">
                Confirme el enlace de verificación en su correo. Hasta entonces
                no puede ver vacantes, suscripciones ni la pantalla de admin.
              </p>
            ) : (
              <p>
                <a href="/vacantes">Ir a vacantes</a>
              </p>
            )}
            <button type="button" className={styles.secondary} onClick={signOutUser}>
              Cerrar sesión
            </button>
          </>
        ) : (
          <>
            <div className={styles.tabs}>
              <button
                type="button"
                className={mode === "register" ? styles.primary : styles.secondary}
                onClick={() => setMode("register")}
              >
                Registrarse
              </button>
              <button
                type="button"
                className={mode === "login" ? styles.primary : styles.secondary}
                onClick={() => setMode("login")}
              >
                Entrar
              </button>
            </div>
            {mode === "register" ? (
              <form className={styles.form} onSubmit={onRegister} data-testid="register-form">
                <label>
                  Nombre
                  <input
                    name="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    autoComplete="name"
                  />
                </label>
                <label>
                  Teléfono
                  <input
                    name="phone"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    autoComplete="tel"
                  />
                </label>
                <label>
                  Correo
                  <input
                    name="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                  />
                </label>
                <label>
                  Contraseña
                  <input
                    name="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="new-password"
                  />
                </label>
                <button type="submit" className={styles.primary}>
                  Crear cuenta
                </button>
              </form>
            ) : (
              <form className={styles.form} onSubmit={onPasswordLogin} data-testid="login-form">
                <label>
                  Correo
                  <input
                    name="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                  />
                </label>
                <label>
                  Contraseña
                  <input
                    name="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                  />
                </label>
                <button type="submit" className={styles.primary}>
                  Entrar con contraseña
                </button>
                <button type="button" className={styles.secondary} onClick={onMagicLink}>
                  Enviar magic link
                </button>
              </form>
            )}
            {error ? (
              <p className={styles.error} data-testid="auth-error">
                {error}
              </p>
            ) : null}
            {info ? <p data-testid="auth-info">{info}</p> : null}
          </>
        )}
      </main>
    </div>
  );
}
