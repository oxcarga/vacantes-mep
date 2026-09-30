"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { COLLECTIONS } from "@gomep/schema";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth-context";
import { getClientDb } from "@/lib/firebase";
import styles from "@/app/page.module.css";

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

export default function VacantesPage() {
  const { user, loading, verified, role } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<Vacante[]>([]);
  const [regionales, setRegionales] = useState<CatalogRegional[]>([]);
  const [especialidades, setEspecialidades] = useState<CatalogEspecialidad[]>([]);
  const [regionalValue, setRegionalValue] = useState("");
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
      },
      (err) => setError(err.message),
    );
    const unsubReg = onSnapshot(collection(db, COLLECTIONS.regionales), (snap) => {
      setRegionales(
        snap.docs
          .map((docSnap) => ({
            id: docSnap.id,
            label: String(docSnap.get("label") ?? docSnap.id),
          }))
          .sort((a, b) => a.label.localeCompare(b.label, "es")),
      );
    });
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

  const visible = useMemo(() => {
    return rows
      .filter((row) => !regionalValue || row.regionalValue === regionalValue)
      .filter((row) => !especialidad || row.especialidad === especialidad)
      .sort(compareVacantes);
  }, [rows, regionalValue, especialidad]);

  const selectedRegionalLabel = regionalValue ? (labelByValue.get(regionalValue) ?? "") : "";

  let filterEmpty = "";
  if (rows.length > 0 && visible.length === 0) {
    if (regionalValue && especialidad) {
      filterEmpty = `No hay vacantes abiertas de ${especialidad} en ${selectedRegionalLabel}.`;
    } else if (regionalValue) {
      filterEmpty = `No hay vacantes abiertas en ${selectedRegionalLabel}.`;
    } else if (especialidad) {
      filterEmpty = `No hay vacantes abiertas de ${especialidad}.`;
    }
  }

  return (
    <AppShell title="Vacantes abiertas">
      {error ? <p className={styles.error}>{error}</p> : null}
      <div className={styles.filters}>
        <label>
          Regional
          <select
            value={regionalValue}
            onChange={(event) => setRegionalValue(event.target.value)}
            data-testid="vacantes-regional"
          >
            <option value="">Todas las regionales</option>
            {regionales.map((row) => (
              <option key={row.id} value={row.id}>
                {row.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Especialidad
          <select
            value={especialidad}
            onChange={(event) => setEspecialidad(event.target.value)}
            data-testid="vacantes-especialidad"
          >
            <option value="">Todas las especialidades</option>
            {especialidades.map((row) => (
              <option key={row.id} value={row.name}>
                {row.name}
              </option>
            ))}
          </select>
        </label>
        <p className={styles.count} data-testid="vacantes-count">
          {visible.length}
        </p>
      </div>
      <ul className={styles.list} data-testid="vacantes-list">
        {visible.map((row) => {
          const institucion = fieldText(row.fields?.Institución);
          const puesto = fieldText(row.fields?.["Clase de Puesto"]);
          const lecciones = fieldText(row.fields?.Lecciones);
          const aplicar = fieldText(row.fields?.Aplicar);
          const regionalLabel = labelByValue.get(row.regionalValue ?? "") || row.regional;
          const seen = formatFirstSeen(row.firstSeen);
          return (
            <li key={row.id} className={styles.card} data-testid={`vacante-${row.id}`}>
              <div className={styles.cardTop}>
                <strong>{row.especialidad}</strong>
                <span>{row.id}</span>
              </div>
              {institucion ? <div>{institucion}</div> : null}
              <div className={styles.muted}>
                {regionalLabel}
                {seen ? ` · ${seen}` : ""}
              </div>
              {puesto || lecciones ? (
                <div>
                  {puesto}
                  {puesto && lecciones ? " · " : ""}
                  {lecciones}
                </div>
              ) : null}
              {aplicar ? (
                <a className={styles.primary} href={aplicar} target="_blank" rel="noreferrer">
                  Aplicar
                </a>
              ) : null}
            </li>
          );
        })}
      </ul>
      {rows.length === 0 ? (
        <p className={styles.muted} data-testid="vacantes-empty">
          No hay vacantes abiertas.
        </p>
      ) : null}
      {filterEmpty ? (
        <p className={styles.muted} data-testid="vacantes-empty-filter">
          {filterEmpty}
        </p>
      ) : null}
    </AppShell>
  );
}
