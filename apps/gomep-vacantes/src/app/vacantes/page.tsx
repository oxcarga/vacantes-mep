"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import {
  Bookmark,
  Briefcase,
  Building2,
  CalendarDays,
  Check,
  Copy,
  ExternalLink,
  GraduationCap,
  MapPin,
  SearchX,
  X,
} from "lucide-react";
import { COLLECTIONS } from "@gomep/schema";
import { AppShell } from "@/components/app-shell";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownSearchable } from "@/components/dropdown-searchable";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { getClientDb } from "@/lib/firebase";
import { esVacanteNueva } from "@/lib/vacante-nueva";

const fieldClass = "flex-col items-stretch gap-2";
const selectClass =
  "h-10 w-full appearance-none rounded-lg border border-input bg-background pr-9 pl-3 text-sm font-normal outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
const chipClass =
  "inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground";

type Vacante = {
  id: string;
  regional: string;
  regionalValue?: string;
  especialidad: string;
  firstSeen?: string;
  fields?: {
    Institución?: string;
    "Clase de Puesto"?: string;
    Lecciones?: string;
    Aplicar?: string;
  };
};

type CatalogRegional = { id: string; label: string };
type CatalogEspecialidad = { id: string; name: string };

const firstSeenFormat = new Intl.DateTimeFormat("es-CR", {
  timeZone: "America/Costa_Rica",
  day: "numeric",
  month: "short",
  year: "numeric",
});

function fieldText(value: unknown) {
  return String(value ?? "").trim();
}

function formatFirstSeen(iso: string | undefined) {
  if (!iso) return "";
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return "";
  return firstSeenFormat.format(new Date(time));
}

function compareVacantes(a: Vacante, b: Vacante) {
  const byTime = Date.parse(b.firstSeen ?? "") - Date.parse(a.firstSeen ?? "");
  if (byTime !== 0 && !Number.isNaN(byTime)) return byTime;
  return b.id.localeCompare(a.id);
}

function fraseRegionales(etiquetas: string[]) {
  if (etiquetas.length === 0) return "";
  if (etiquetas.length === 1) return `en ${etiquetas[0]}`;
  if (etiquetas.length === 2) return `en ${etiquetas[0]} o en ${etiquetas[1]}`;
  const iniciales = etiquetas
    .slice(0, -1)
    .map((etiqueta) => `en ${etiqueta}`)
    .join(", ");
  return `${iniciales} o en ${etiquetas[etiquetas.length - 1]}`;
}

const filtroTones = {
  primary: {
    pill: "bg-primary/10 text-primary",
    quitar: "hover:bg-primary/15",
  },
  green: {
    pill: "bg-green-200 text-green-900 dark:bg-green-950 dark:text-green-200",
    quitar: "hover:bg-green-300 dark:hover:bg-green-900",
  },
} as const;

function FiltroActivo({
  testId,
  label,
  tone,
  onQuitar,
}: {
  testId: string;
  label: string;
  tone: keyof typeof filtroTones;
  onQuitar: () => void;
}) {
  const colors = filtroTones[tone];
  return (
    <span
      data-testid={testId}
      className={`inline-flex items-center gap-1 rounded-full py-1 pr-1 pl-3 text-xs font-medium ${colors.pill}`}
    >
      {label}
      <button
        type="button"
        aria-label={`Quitar filtro: ${label}`}
        onClick={onQuitar}
        className={`inline-flex size-5 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${colors.quitar}`}
      >
        <X aria-hidden className="size-3.5" />
      </button>
    </span>
  );
}

function EstadoVacio({
  icon: Icon,
  children,
}: {
  icon: typeof Briefcase;
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

function CopiarIdVacante({ id }: { id: string }) {
  const [copiado, setCopiado] = useState(false);
  const timer = useRef<ReturnType<typeof window.setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(id);
    } catch {
      return;
    }
    setCopiado(true);
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setCopiado(false);
      timer.current = null;
    }, 2000);
  }

  return (
    <div className="flex items-center gap-0.5">
      <span className="font-mono text-xs text-muted-foreground">#{id}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="text-muted-foreground cursor-pointer"
        data-testid={`vacante-${id}-copiar-id`}
        aria-label={copiado ? "ID copiado" : `Copiar ID de vacante ${id}`}
        onClick={() => {
          void copiar();
        }}
      >
        {copiado ? (
          <Check aria-hidden className="size-3.5" />
        ) : (
          <Copy aria-hidden className="size-3.5" />
        )}
      </Button>
      <span className="sr-only" aria-live="polite">
        {copiado ? "ID copiado" : ""}
      </span>
    </div>
  );
}

function FichasCargando() {
  return (
    <div
      data-testid="vacantes-loading"
      role="status"
      aria-busy="true"
      className="grid gap-4 sm:grid-cols-2"
    >
      <span className="sr-only">Cargando vacantes</span>
      {[0, 1, 2, 3].map((key) => (
        <div
          key={key}
          aria-hidden
          className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10"
        >
          <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
          <div className="h-3 w-1/4 animate-pulse rounded bg-muted" />
          <div className="h-3 w-5/6 animate-pulse rounded bg-muted" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-8 w-24 animate-pulse self-end rounded-lg bg-muted" />
        </div>
      ))}
    </div>
  );
}

export default function VacantesPage() {
  const { user, loading, verified, role } = useAuth();
  const router = useRouter();
  const [ahora] = useState(() => new Date());
  const [rows, setRows] = useState<Vacante[]>([]);
  const [regionales, setRegionales] = useState<CatalogRegional[]>([]);
  const [especialidades, setEspecialidades] = useState<CatalogEspecialidad[]>([]);
  const [vacantesListas, setVacantesListas] = useState(false);
  const [regionalesListas, setRegionalesListas] = useState(false);
  const [regionalValues, setRegionalValues] = useState<string[]>([]);
  const [especialidad, setEspecialidad] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/");
    if (!loading && user && !verified) router.replace("/verificar");
    if (!loading && user && verified && role === "admin") router.replace("/admin");
  }, [loading, user, verified, role, router]);

  useEffect(() => {
    if (!user || !verified || role !== "docente") return;
    const db = getClientDb();
    const unsubVacantes = onSnapshot(
      query(collection(db, COLLECTIONS.vacantes), where("active", "==", true)),
      (snap) => {
        setRows(
          snap.docs.map((docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() as Omit<Vacante, "id">),
          })),
        );
        setVacantesListas(true);
      },
      (err) => {
        setError(err.message);
        setVacantesListas(true);
      },
    );
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
    return () => {
      unsubVacantes();
      unsubReg();
      unsubEsp();
    };
  }, [user, verified, role]);

  const labelByValue = useMemo(
    () => new Map(regionales.map((row) => [row.id, row.label])),
    [regionales],
  );

  const elegidas = useMemo(() => new Set(regionalValues), [regionalValues]);
  const regionalesElegidas = useMemo(
    () => regionales.filter((row) => elegidas.has(row.id)),
    [regionales, elegidas],
  );

  const visible = useMemo(() => {
    return rows
      .filter((row) => elegidas.size === 0 || elegidas.has(row.regionalValue ?? ""))
      .filter((row) => !especialidad || row.especialidad === especialidad)
      .sort(compareVacantes);
  }, [rows, elegidas, especialidad]);

  const cargando = !vacantesListas || !regionalesListas;
  const hayFiltros = regionalesElegidas.length > 0 || Boolean(especialidad);

  const opcionesRegionales = useMemo(
    () => regionales.map((row) => ({ value: row.id, label: row.label })),
    [regionales],
  );

  const opcionesEspecialidades = useMemo(
    () => especialidades.map((row) => ({ value: row.name, label: row.name })),
    [especialidades],
  );

  function limpiarFiltros() {
    setRegionalValues([]);
    setEspecialidad("");
  }

  const donde = fraseRegionales(regionalesElegidas.map((row) => row.label));
  let filterEmpty = "";
  if (rows.length > 0 && visible.length === 0) {
    if (especialidad && donde) {
      filterEmpty = `No hay vacantes abiertas de ${especialidad} ${donde}.`;
    } else if (donde) {
      filterEmpty = `No hay vacantes abiertas ${donde}.`;
    } else if (especialidad) {
      filterEmpty = `No hay vacantes abiertas de ${especialidad}.`;
    }
  }

  return (
    <AppShell
      title="Vacantes abiertas"
      description="Plazas del MEP, de la más reciente a la más antigua."
    >
      {error ? (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      ) : null}

      <section
        aria-label="Filtros"
        className="flex flex-col gap-4 rounded-xl border bg-muted/50 p-4"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Label className={fieldClass}>
            <span className="inline-flex items-center gap-1.5">
              <MapPin aria-hidden className="size-4 text-muted-foreground" />
              Regional
            </span>
            <DropdownSearchable
              options={opcionesRegionales}
              value={regionalValues}
              onChange={setRegionalValues}
              multiple
              max={5}
              nombre="regionales"
              idPrefix="vacantes-regional"
              buttonClassName={selectClass}
            />
          </Label>
          <Label className={fieldClass}>
            <span className="inline-flex items-center gap-1.5">
              <GraduationCap aria-hidden className="size-4 text-muted-foreground" />
              Especialidad
            </span>
            <DropdownSearchable
              options={opcionesEspecialidades}
              value={especialidad ? [especialidad] : []}
              onChange={(next) => setEspecialidad(next[0] ?? "")}
              nombre="especialidades"
              idPrefix="vacantes-especialidad"
              buttonClassName={selectClass}
            />
          </Label>
        </div>
        {hayFiltros ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Filtros:</span>
            {regionalesElegidas.map((row) => (
              <FiltroActivo
                key={row.id}
                testId={`vacantes-filtro-regional-${row.id}`}
                label={row.label}
                tone="primary"
                onQuitar={() =>
                  setRegionalValues((prev) => prev.filter((value) => value !== row.id))
                }
              />
            ))}
            {especialidad ? (
              <FiltroActivo
                testId="vacantes-filtro-especialidad"
                label={especialidad}
                tone="green"
                onQuitar={() => setEspecialidad("")}
              />
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="ml-auto"
              onClick={limpiarFiltros}
              data-testid="vacantes-limpiar"
            >
              Limpiar filtros
            </Button>
          </div>
        ) : null}
      </section>

      {cargando ? (
        <FichasCargando />
      ) : (
        <>
          <p aria-live="polite" className="text-sm text-muted-foreground">
            <span data-testid="vacantes-count" className="font-semibold text-foreground">
              {visible.length}
            </span>{" "}
            {visible.length === 1 ? "vacante" : "vacantes"}
          </p>

          {visible.length > 0 ? (
            <ul className="grid list-none gap-4 p-0 sm:grid-cols-2" data-testid="vacantes-list">
              {visible.map((row) => {
                const institucion = fieldText(row.fields?.Institución);
                const puesto = fieldText(row.fields?.["Clase de Puesto"]);
                const lecciones = fieldText(row.fields?.Lecciones);
                const aplicar = fieldText(row.fields?.Aplicar);
                const regionalLabel = labelByValue.get(row.regionalValue ?? "") || row.regional;
                const seen = formatFirstSeen(row.firstSeen);
                const nueva = esVacanteNueva(row.firstSeen, ahora);
                return (
                  <li key={row.id} data-testid={`vacante-${row.id}`}>
                    <Card className="h-full gap-3 border-l-4 border-l-transparent transition-[box-shadow,border-color] hover:border-l-primary hover:shadow-md">
                      <CardHeader>
                        <div className="flex items-start justify-between gap-3">
                          <CardTitle className="font-semibold">{row.especialidad}</CardTitle>
                          {nueva ? (
                            <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                              Nueva
                            </span>
                          ) : null}
                        </div>
                        <CopiarIdVacante id={row.id} />
                      </CardHeader>
                      <CardContent className="flex flex-1 flex-col gap-2">
                        {institucion ? (
                          <p className="flex items-start gap-2">
                            <Building2
                              aria-hidden
                              className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                            />
                            {institucion}
                          </p>
                        ) : null}
                        <p className="flex items-start gap-2 text-muted-foreground">
                          <MapPin aria-hidden className="mt-0.5 size-4 shrink-0" />
                          {regionalLabel}
                        </p>
                        {puesto || lecciones ? (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {puesto ? <span className={chipClass}>{puesto}</span> : null}
                            {lecciones ? (
                              <span className={chipClass}>
                                {lecciones} {lecciones === "1" ? "lección" : "lecciones"}
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                      </CardContent>
                      {seen || aplicar ? (
                        <CardFooter className="flex-wrap justify-between gap-3">
                          {seen ? (
                            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                              <CalendarDays aria-hidden className="size-3.5" />
                              Vista el {seen}
                            </span>
                          ) : (
                            <span />
                          )}
                          {aplicar ? (
                            <a
                              className={buttonVariants({ className: "w-full sm:w-auto" })}
                              href={aplicar}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Aplicar
                              <ExternalLink aria-hidden data-icon="inline-end" />
                            </a>
                          ) : null}
                        </CardFooter>
                      ) : null}
                    </Card>
                  </li>
                );
              })}
            </ul>
          ) : null}

          {rows.length === 0 ? (
            <EstadoVacio icon={Briefcase}>
              <p className="font-medium" data-testid="vacantes-empty">
                No hay vacantes abiertas.
              </p>
              <Link
                href="/suscripciones"
                data-testid="vacantes-empty-suscripciones"
                className={buttonVariants({ variant: "outline" })}
              >
                <Bookmark aria-hidden />
                Le avisamos cuando salga una
              </Link>
            </EstadoVacio>
          ) : null}

          {filterEmpty ? (
            <EstadoVacio icon={SearchX}>
              <p className="font-medium" data-testid="vacantes-empty-filter">
                {filterEmpty}
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={limpiarFiltros}
                data-testid="vacantes-empty-filter-limpiar"
              >
                Limpiar filtros
              </Button>
            </EstadoVacio>
          ) : null}
        </>
      )}
    </AppShell>
  );
}
