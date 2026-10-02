"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { readLocalAuthLink, requestEmailAccess } from "@/app/actions";
import { useAuth } from "@/lib/auth-context";
import { EMAIL_ACCESS_COPY } from "@/lib/email-access";
import { isLocalAuthDev } from "@/lib/local-auth-link";

function localAuthDev() {
  return isLocalAuthDev({
    useEmulators: process.env.NEXT_PUBLIC_USE_EMULATORS === "1",
    hostname: window.location.hostname,
  });
}

function DevAuthLink({
  href,
  testId,
  error,
}: {
  href: string | null;
  testId: "dev-verify-link" | "dev-magic-link" | "dev-login-verify-link";
  error: boolean;
}) {
  if (href) {
    return (
      <a data-testid={testId} href={href} className="text-sm break-all underline">
        {href}
      </a>
    );
  }
  if (!error) return null;
  return (
    <p data-testid="dev-auth-link-error" className="text-sm text-destructive">
      No se pudo obtener el enlace del emulador.
    </p>
  );
}

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
  const [mode, setMode] = useState("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [keepRegisterForm, setKeepRegisterForm] = useState(false);
  const [devVerifyLink, setDevVerifyLink] = useState<string | null>(null);
  const [devMagicLink, setDevMagicLink] = useState<string | null>(null);
  const [devLoginVerifyLink, setDevLoginVerifyLink] = useState<string | null>(null);
  const [devLinkError, setDevLinkError] = useState<
    "verify" | "signin" | "login-verify" | null
  >(null);
  const [verifiedNotice, setVerifiedNotice] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setVerifiedNotice(params.get("verificado") === "1");
  }, []);

  async function onRegister(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setDevVerifyLink(null);
    if (devLinkError === "verify") setDevLinkError(null);
    const local = localAuthDev();
    if (local) setKeepRegisterForm(true);
    try {
      await register({ email, password, phone, name });
      if (!local) {
        router.push("/verificar");
        return;
      }
      const result = await readLocalAuthLink(
        email.trim(),
        "verify",
        window.location.origin,
      );
      if (result?.href) setDevVerifyLink(result.href);
      else setDevLinkError("verify");
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
    setInfo("");
    setDevMagicLink(null);
    setDevLoginVerifyLink(null);
    setDevLinkError(null);
    const local = localAuthDev();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setError(EMAIL_ACCESS_COPY.empty);
      return;
    }
    try {
      const access = await requestEmailAccess(trimmed);
      if (access.kind === "error") {
        setError(access.message);
        return;
      }
      if (access.kind === "missing") {
        setInfo(EMAIL_ACCESS_COPY.missing);
        return;
      }
      if (access.kind === "verify") {
        setInfo(EMAIL_ACCESS_COPY.verify);
        if (!local) return;
        if (access.href) {
          setDevLoginVerifyLink(access.href);
          return;
        }
        const result = await readLocalAuthLink(
          trimmed,
          "verify",
          window.location.origin,
        );
        if (result?.href) setDevLoginVerifyLink(result.href);
        else setDevLinkError("login-verify");
        return;
      }
      await requestMagicLink(trimmed);
      setInfo(EMAIL_ACCESS_COPY.magic);
      if (!local) return;
      const result = await readLocalAuthLink(
        trimmed,
        "signin",
        window.location.origin,
      );
      if (result?.href) setDevMagicLink(result.href);
      else setDevLinkError("signin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar el enlace");
    }
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex items-center gap-2 font-medium">
          <div className="flex size-6 items-center justify-center rounded-md bg-primary text-xs text-primary-foreground">
            G
          </div>
          gomep-vacantes
        </div>
        <div className="flex flex-1 items-center justify-center">
          <main className="flex w-full max-w-sm flex-col gap-6">
            <h1 className="text-2xl font-semibold tracking-tight lg:hidden">
              Vacantes del MEP
            </h1>
            {loading ? (
              <p>Cargando…</p>
            ) : !configured ? (
              <Alert>
                <AlertDescription>
                  Configure <code>NEXT_PUBLIC_FIREBASE_*</code> en{" "}
                  <code>.env.local</code> para activar el inicio de sesión.
                </AlertDescription>
              </Alert>
            ) : user && !keepRegisterForm ? (
              <Card>
                <CardHeader>
                  <CardTitle>Sesión iniciada</CardTitle>
                  <CardDescription>
                    Sesión iniciada como <strong>{user.email}</strong>.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!verified ? (
                    <p data-testid="unverified-message">
                      Confirme el enlace de verificación en su correo. Hasta
                      entonces no puede ver vacantes, suscripciones ni la
                      pantalla de admin.
                    </p>
                  ) : (
                    <p>
                      <a href="/vacantes">Ir a vacantes</a>
                    </p>
                  )}
                </CardContent>
                <CardFooter>
                  <Button type="button" variant="outline" onClick={signOutUser}>
                    <LogOut data-icon="inline-start" aria-hidden />
                    Cerrar sesión
                  </Button>
                </CardFooter>
              </Card>
            ) : (
              <Tabs
                value={mode}
                onValueChange={(value) => {
                  setMode(value);
                  setError("");
                  setInfo("");
                }}
              >
                <TabsList className="w-full">
                  <TabsTrigger value="register">Registrarse</TabsTrigger>
                  <TabsTrigger value="login">Entrar</TabsTrigger>
                </TabsList>
                <TabsContent value="register">
                  <form onSubmit={onRegister} data-testid="register-form">
                    <FieldGroup>
                      <Field>
                        <FieldLabel htmlFor="register-name">Nombre</FieldLabel>
                        <Input
                          id="register-name"
                          name="name"
                          value={name}
                          onChange={(event) => setName(event.target.value)}
                          autoComplete="name"
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="register-phone">Teléfono</FieldLabel>
                        <Input
                          id="register-phone"
                          name="phone"
                          value={phone}
                          onChange={(event) => setPhone(event.target.value)}
                          autoComplete="tel"
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="register-email">Correo</FieldLabel>
                        <Input
                          id="register-email"
                          name="email"
                          type="email"
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          autoComplete="email"
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="register-password">Contraseña</FieldLabel>
                        <Input
                          id="register-password"
                          name="password"
                          type="password"
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          autoComplete="new-password"
                        />
                      </Field>
                      <Field>
                        <Button type="submit" className="w-full">
                          Crear cuenta
                        </Button>
                        <DevAuthLink
                          href={devVerifyLink}
                          testId="dev-verify-link"
                          error={devLinkError === "verify"}
                        />
                      </Field>
                    </FieldGroup>
                  </form>
                </TabsContent>
                <TabsContent value="login">
                  <form onSubmit={onPasswordLogin} data-testid="login-form">
                    <FieldGroup>
                      <Field>
                        <FieldLabel htmlFor="login-email">Correo</FieldLabel>
                        <Input
                          id="login-email"
                          name="email"
                          type="email"
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          autoComplete="email"
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="login-password">Contraseña</FieldLabel>
                        <Input
                          id="login-password"
                          name="password"
                          type="password"
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          autoComplete="current-password"
                        />
                      </Field>
                      <Field>
                        <Button type="submit" className="w-full">
                          Entrar con contraseña
                        </Button>
                      </Field>
                      <FieldSeparator>o</FieldSeparator>
                      <Field>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          onClick={onMagicLink}
                        >
                          Enviar magic link
                        </Button>
                        <DevAuthLink
                          href={devMagicLink}
                          testId="dev-magic-link"
                          error={devLinkError === "signin"}
                        />
                        <DevAuthLink
                          href={devLoginVerifyLink}
                          testId="dev-login-verify-link"
                          error={devLinkError === "login-verify"}
                        />
                      </Field>
                    </FieldGroup>
                  </form>
                </TabsContent>
              </Tabs>
            )}
            {verifiedNotice ? (
              <Alert data-testid="verified-email-notice">
                <AlertDescription>{EMAIL_ACCESS_COPY.verifiedDone}</AlertDescription>
              </Alert>
            ) : null}
            {error ? (
              <Alert variant="destructive" data-testid="auth-error">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            {info ? (
              <Alert data-testid="auth-info">
                <AlertDescription>{info}</AlertDescription>
              </Alert>
            ) : null}
          </main>
        </div>
      </div>
      <div className="hidden items-center justify-center bg-primary px-10 text-center text-primary-foreground lg:flex">
        <div className="flex max-w-xs flex-col items-center gap-4 font-serif">
          <h1 className="text-4xl font-medium tracking-tight">Vacantes del MEP</h1>
          <ul className="flex flex-col items-center gap-2 text-base">
            <li>Plazas abiertas</li>
            <li>Alertas por regional y especialidad</li>
            <li>Acceso con correo verificado</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
