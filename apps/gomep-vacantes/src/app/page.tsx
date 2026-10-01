"use client";

import { useState } from "react";
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
import { useAuth } from "@/lib/auth-context";

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
            ) : user ? (
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
                      </Field>
                    </FieldGroup>
                  </form>
                </TabsContent>
              </Tabs>
            )}
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
