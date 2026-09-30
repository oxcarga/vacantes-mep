"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";

const fieldClass = "flex-col items-stretch gap-1.5 font-normal";

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
    <div className="flex min-h-svh items-center justify-center px-6 py-8">
      <main className="flex w-full max-w-lg flex-col gap-4">
        <p className="text-xs tracking-widest text-muted-foreground uppercase">
          gomep-vacantes
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Vacantes del MEP</h1>
        {loading ? (
          <p>Cargando…</p>
        ) : !configured ? (
          <p className="leading-relaxed text-muted-foreground">
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
            <Button type="button" variant="outline" onClick={signOutUser}>
              <LogOut aria-hidden />
              Cerrar sesión
            </Button>
          </>
        ) : (
          <>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={mode === "register" ? "default" : "outline"}
                onClick={() => setMode("register")}
              >
                Registrarse
              </Button>
              <Button
                type="button"
                variant={mode === "login" ? "default" : "outline"}
                onClick={() => setMode("login")}
              >
                Entrar
              </Button>
            </div>
            {mode === "register" ? (
              <form className="flex flex-col gap-3" onSubmit={onRegister} data-testid="register-form">
                <Label className={fieldClass}>
                  Nombre
                  <Input
                    name="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    autoComplete="name"
                  />
                </Label>
                <Label className={fieldClass}>
                  Teléfono
                  <Input
                    name="phone"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    autoComplete="tel"
                  />
                </Label>
                <Label className={fieldClass}>
                  Correo
                  <Input
                    name="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                  />
                </Label>
                <Label className={fieldClass}>
                  Contraseña
                  <Input
                    name="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="new-password"
                  />
                </Label>
                <Button type="submit" className="w-fit">
                  Crear cuenta
                </Button>
              </form>
            ) : (
              <form className="flex flex-col gap-3" onSubmit={onPasswordLogin} data-testid="login-form">
                <Label className={fieldClass}>
                  Correo
                  <Input
                    name="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                  />
                </Label>
                <Label className={fieldClass}>
                  Contraseña
                  <Input
                    name="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                  />
                </Label>
                <Button type="submit" className="w-fit">
                  Entrar con contraseña
                </Button>
                <Button type="button" variant="outline" className="w-fit" onClick={onMagicLink}>
                  Enviar magic link
                </Button>
              </form>
            )}
            {error ? (
              <p className="text-destructive" data-testid="auth-error">
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
