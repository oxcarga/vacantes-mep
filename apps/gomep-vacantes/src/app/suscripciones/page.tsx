"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { COLLECTIONS } from "@gomep/schema";
import {
  createSubscription,
  removeSubscription,
} from "@/app/actions";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth-context";
import { getClientAuth, getClientDb } from "@/lib/firebase";
import styles from "@/app/page.module.css";

type CatalogRegional = { id: string; label: string };
type CatalogEspecialidad = { id: string; name: string };
type Sub = {
  id: string;
  regionalValue: string;
  especialidad: string;
  status: string;
  expiresAt: string;
  endReason?: string | null;
};

export default function SuscripcionesPage() {
  const { user, loading, verified, role } = useAuth();
  const router = useRouter();
  const [regionales, setRegionales] = useState<CatalogRegional[]>([]);
  const [especialidades, setEspecialidades] = useState<CatalogEspecialidad[]>([]);
  const [subs, setSubs] = useState<Sub[]>([]);
  const [regionalValue, setRegionalValue] = useState("");
  const [especialidad, setEspecialidad] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/");
    if (!loading && user && !verified) router.replace("/verificar");
    if (!loading && role === "admin") router.replace("/admin");
  }, [loading, user, verified, role, router]);

  useEffect(() => {
    if (!user || !verified || role !== "docente") return;
    const db = getClientDb();
    const unsubReg = onSnapshot(collection(db, COLLECTIONS.regionales), (snap) => {
      setRegionales(
        snap.docs.map((docSnap) => ({
          id: docSnap.id,
          label: String(docSnap.get("label") ?? docSnap.id),
        })),
      );
    });
    const unsubEsp = onSnapshot(collection(db, COLLECTIONS.especialidades), (snap) => {
      setEspecialidades(
        snap.docs.map((docSnap) => ({
          id: docSnap.id,
          name: String(docSnap.get("name") ?? ""),
        })),
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
      },
    );
    return () => {
      unsubReg();
      unsubEsp();
      unsubSubs();
    };
  }, [user, verified, role]);

  async function onAdd(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const token = await getClientAuth().currentUser?.getIdToken();
      if (!token) throw new Error("Sin sesión");
      await createSubscription(token, regionalValue, especialidad);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo suscribir");
    }
  }

  async function onRemove(id: string) {
    setError("");
    try {
      const token = await getClientAuth().currentUser?.getIdToken();
      if (!token) throw new Error("Sin sesión");
      await removeSubscription(token, id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo quitar");
    }
  }

  const active = subs.filter((row) => row.status === "active");
  const inactive = subs.filter((row) => row.status !== "active");

  return (
    <AppShell title="Suscripciones">
      <form className={styles.form} onSubmit={onAdd} data-testid="subscribe-form">
        <label>
          Regional
          <select
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
        </label>
        <label>
          Especialidad
          <select
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
        </label>
        <button type="submit" className={styles.primary}>
          Agregar
        </button>
      </form>
      {error ? (
        <p className={styles.error} data-testid="subscribe-error">
          {error}
        </p>
      ) : null}

      <h2>Activas</h2>
      <ul data-testid="subs-active">
        {active.map((row) => (
          <li key={row.id} data-testid={`sub-active-${row.id}`}>
            {row.regionalValue} · {row.especialidad} (vence {row.expiresAt.slice(0, 10)})
            <button
              type="button"
              className={styles.secondary}
              onClick={() => onRemove(row.id)}
              data-testid={`remove-sub-${row.id}`}
            >
              Quitar
            </button>
          </li>
        ))}
      </ul>

      <h2>Historial</h2>
      <ul data-testid="subs-history">
        {inactive.map((row) => (
          <li key={row.id} data-testid={`sub-inactive-${row.id}`}>
            {row.regionalValue} · {row.especialidad} ({row.endReason})
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
