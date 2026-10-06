"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import {
  Bookmark,
  CalendarDays,
  ChevronDown,
  GraduationCap,
  History,
  MapPin,
} from "lucide-react";
import { COLLECTIONS } from "@gomep/schema";
import { createSubscription, removeSubscription } from "@/app/actions";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { getClientAuth, getClientDb } from "@/lib/firebase";

const fieldClass = "flex-col items-stretch gap-2";
const selectClass =
  "h-10 w-full appearance-none rounded-lg border border-input bg-background pr-9 pl-3 text-sm font-normal outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const expiresFormat = new Intl.DateTimeFormat("es-CR", {
  timeZone: "America/Costa_Rica",
  day: "numeric",
  month: "short",
  year: "numeric",
});

type CatalogRegional = { id: string; label: string };
type CatalogEspecialidad = { id: string; name: string };
type Sub = {
  id: string;
  regionalValue: string;
  especialidad: string;
  status: string;
  expiresAt: string;
  createdAt?: string;
  endedAt?: string | null;
  endReason?: string | null;
};

function formatExpires(iso: string | undefined) {
  if (!iso) return "";
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return "";
  return expiresFormat.format(new Date(time));
}

function motivo(endReason: string | null | undefined) {
  if (endReason === "removed") return "La quitaste";
  if (endReason === "expired") return "Venció";
  return "";
}

function compareByTimeDesc(
  a: { id: string },
  b: { id: string },
  timeA: string | null | undefined,
  timeB: string | null | undefined,
) {
  const left = Date.parse(timeA ?? "");
  const right = Date.parse(timeB ?? "");
  const leftOk = !Number.isNaN(left);
  const rightOk = !Number.isNaN(right);
  if (leftOk && rightOk && left !== right) return right - left;
  if (leftOk !== rightOk) return leftOk ? -1 : 1;
  return b.id.localeCompare(a.id);
}

function pairKey(regionalValue: string, especialidad: string) {
  return `${regionalValue}\0${especialidad}`;
}

function EstadoVacio({
  icon: Icon,
  children,
}: {
  icon: typeof Bookmark;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon aria-hidden className="size-6" />
      </span>
      {children}
    </div>
  );
}

function FichasCargando() {
  return (
    <div
      data-testid="subs-loading"
      role="status"
      aria-busy="true"
      className="grid gap-4 sm:grid-cols-2"
    >
      <span className="sr-only">Cargando suscripciones</span>
      {[0, 1].map((key) => (
        <div
          key={key}
          aria-hidden
          className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10"
        >
          <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
          <div className="h-3 w-5/6 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-8 w-24 animate-pulse self-end rounded-lg bg-muted" />
        </div>
      ))}
    </div>
  );
}

export default function SuscripcionesPage() {
  const { user, loading, verified, role } = useAuth();
  const router = useRouter();
  const [regionales, setRegionales] = useState<CatalogRegional[]>([]);
  const [especialidades, setEspecialidades] = useState<CatalogEspecialidad[]>([]);
  const [subs, setSubs] = useState<Sub[]>([]);
  const [regionalValue, setRegionalValue] = useState("");
  const [especialidad, setEspecialidad] = useState("");
  const [error, setError] = useState("");
  const [subsListas, setSubsListas] = useState(false);
  const [regionalesListas, setRegionalesListas] = useState(false);
  const [subsOk, setSubsOk] = useState(false);
  const [regionalesOk, setRegionalesOk] = useState(false);
  const [pendingId, setPendingId] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/");
    if (!loading && user && !verified) router.replace("/verificar");
    if (!loading && role === "admin") router.replace("/admin");
  }, [loading, user, verified, role, router]);

  useEffect(() => {
    if (!user || !verified || role !== "docente") return;
    const db = getClientDb();
    const unsubReg = onSnapshot(
      collection(db, COLLECTIONS.regionales),
      (snap) => {
        setRegionales(
          snap.docs
            .map((docSnap) => ({
              id: docSnap.id,
              label: String(docSnap.get("label") ?? docSnap.id),
            }))
            .sort((a, b) => a.label.localeCompare(b.label, "es")),
        );
        setRegionalesListas(true);
        setRegionalesOk(true);
      },
      (err) => {
        setError(err.message);
        setRegionalesListas(true);
      },
    );
    const unsubEsp = onSnapshot(collection(db, COLLECTIONS.especialidades), (snap) => {
      setEspecialidades(
        snap.docs
          .map((docSnap) => ({
            id: docSnap.id,
            name: String(docSnap.get("name") ?? ""),
          }))
          .sort((a, b) => a.name.localeCompare(b.name, "es")),
      );
    });
    const unsubSubs = onSnapshot(
      query(collection(db, COLLECTIONS.suscripciones), where("uid", "==", user.uid)),
      (snap) => {
        setSubs(
          snap.docs.map((docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() as Omit<Sub, "id">),
          })),
        );
        setSubsListas(true);
        setSubsOk(true);
      },
      (err) => {
        setError(err.message);
        setSubsListas(true);
      },
    );
    return () => {
      unsubReg();
      unsubEsp();
      unsubSubs();
    };
  }, [user, verified, role]);

  const labelByValue = useMemo(
    () => new Map(regionales.map((row) => [row.id, row.label])),
    [regionales],
  );

  const active = useMemo(
    () =>
      subs
        .filter((row) => row.status === "active")
        .sort((a, b) => compareByTimeDesc(a, b, a.createdAt, b.createdAt)),
    [subs],
  );
  const inactive = useMemo(
    () =>
      subs
        .filter((row) => row.status !== "active")
        .sort((a, b) => compareByTimeDesc(a, b, a.endedAt, b.endedAt)),
    [subs],
  );
  const activePairs = useMemo(
    () => new Set(active.map((row) => pairKey(row.regionalValue, row.especialidad))),
    [active],
  );

  const cargando = !subsListas || !regionalesListas;
  const listo = subsOk && regionalesOk;

  function regionalLabel(value: string) {
    return labelByValue.get(value) ?? value;
  }

  async function tokenOrThrow() {
    const token = await getClientAuth().currentUser?.getIdToken();
    if (!token) throw new Error("Sin sesión");
    return token;
  }

  async function onAdd(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const token = await tokenOrThrow();
      await createSubscription(token, regionalValue, especialidad);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo suscribir");
    }
  }

  async function onRemove(id: string) {
    setError("");
    try {
      const token = await tokenOrThrow();
      await removeSubscription(token, id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo quitar");
    }
  }

  async function onResubscribe(row: Sub) {
    setError("");
    setPendingId(row.id);
    try {
      const token = await tokenOrThrow();
      await createSubscription(token, row.regionalValue, row.especialidad);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo suscribir");
    } finally {
      setPendingId("");
    }
  }

  return (
    <AppShell
      title="Suscripciones"
      description="Avisos durante 30 días por un par de regional y especialidad."
    >
      {error ? (
        <p
          className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
          data-testid="subscribe-error"
        >
          {error}
        </p>
      ) : null}

      <form
        className="flex flex-col gap-4 rounded-xl border bg-muted/50 p-4"
        onSubmit={onAdd}
        data-testid="subscribe-form"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Label className={fieldClass}>
            <span className="inline-flex items-center gap-1.5">
              <MapPin aria-hidden className="size-4 text-muted-foreground" />
              Regional
            </span>
            <span className="relative">
              <select
                className={selectClass}
                name="regionalValue"
                value={regionalValue}
                onChange={(event) => setRegionalValue(event.target.value)}
                data-testid="subscribe-regional"
              >
                <option value="">Seleccione</option>
                {regionales.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                aria-hidden
                className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
              />
            </span>
          </Label>
          <Label className={fieldClass}>
            <span className="inline-flex items-center gap-1.5">
              <GraduationCap aria-hidden className="size-4 text-muted-foreground" />
              Especialidad
            </span>
            <span className="relative">
              <select
                className={selectClass}
                name="especialidad"
                value={especialidad}
                onChange={(event) => setEspecialidad(event.target.value)}
                data-testid="subscribe-especialidad"
              >
                <option value="">Seleccione</option>
                {especialidades.map((row) => (
                  <option key={row.id} value={row.name}>
                    {row.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                aria-hidden
                className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
              />
            </span>
          </Label>
        </div>
        <Button type="submit" className="w-fit">
          Agregar
        </Button>
      </form>

      {cargando ? (
        <FichasCargando />
      ) : listo ? (
        <>
          <p aria-live="polite" className="text-sm text-muted-foreground">
            <span data-testid="subs-count" className="font-semibold text-foreground">
              {active.length}
            </span>{" "}
            {active.length === 1 ? "activa" : "activas"}
          </p>

          {active.length > 0 ? (
            <ul className="grid list-none gap-4 p-0 sm:grid-cols-2" data-testid="subs-active">
              {active.map((row) => {
                const seen = formatExpires(row.expiresAt);
                const label = regionalLabel(row.regionalValue);
                return (
                  <li key={row.id} data-testid={`sub-active-${row.id}`}>
                    <Card className="h-full gap-3 border-l-4 border-l-transparent transition-[box-shadow,border-color] hover:border-l-primary hover:shadow-md">
                      <CardHeader>
                        <CardTitle className="font-semibold">{row.especialidad}</CardTitle>
                      </CardHeader>
                      <CardContent className="flex flex-1 flex-col gap-2">
                        <p className="flex items-start gap-2 text-muted-foreground">
                          <MapPin aria-hidden className="mt-0.5 size-4 shrink-0" />
                          {label}
                        </p>
                      </CardContent>
                      <CardFooter className="flex-wrap justify-between gap-3">
                        {seen ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                            <CalendarDays aria-hidden className="size-3.5" />
                            Vence el {seen}
                          </span>
                        ) : (
                          <span />
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => onRemove(row.id)}
                          data-testid={`remove-sub-${row.id}`}
                        >
                          Quitar
                        </Button>
                      </CardFooter>
                    </Card>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EstadoVacio icon={Bookmark}>
              <p className="font-medium" data-testid="subs-empty-active">
                No tienes suscripciones activas.
              </p>
            </EstadoVacio>
          )}

          <h2 className="text-sm font-medium text-muted-foreground">Historial</h2>
          {inactive.length > 0 ? (
            <ul className="grid list-none gap-4 p-0 sm:grid-cols-2" data-testid="subs-history">
              {inactive.map((row) => {
                const label = regionalLabel(row.regionalValue);
                const phrase = motivo(row.endReason);
                const canResubscribe = !activePairs.has(
                  pairKey(row.regionalValue, row.especialidad),
                );
                return (
                  <li key={row.id} data-testid={`sub-inactive-${row.id}`}>
                    <Card className="h-full gap-3">
                      <CardHeader>
                        <CardTitle className="font-semibold">{row.especialidad}</CardTitle>
                      </CardHeader>
                      <CardContent className="flex flex-1 flex-col gap-2">
                        <p className="flex items-start gap-2 text-muted-foreground">
                          <MapPin aria-hidden className="mt-0.5 size-4 shrink-0" />
                          {label}
                        </p>
                        {phrase ? <p className="text-sm">{phrase}</p> : null}
                      </CardContent>
                      {canResubscribe ? (
                        <CardFooter className="justify-end">
                          <Button
                            type="button"
                            onClick={() => onResubscribe(row)}
                            disabled={pendingId === row.id}
                            data-testid={`resubscribe-${row.id}`}
                          >
                            Agregar de nuevo
                          </Button>
                        </CardFooter>
                      ) : null}
                    </Card>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EstadoVacio icon={History}>
              <p className="font-medium" data-testid="subs-empty-history">
                Todavía no hay historial.
              </p>
            </EstadoVacio>
          )}
        </>
      ) : null}
    </AppShell>
  );
}
