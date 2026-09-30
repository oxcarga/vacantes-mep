"use client";

import { useEffect, useState } from "react";
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
  especialidad: string;
  summary: string;
  active: boolean;
  fields?: { Institución?: string; Aplicar?: string };
};

export default function VacantesPage() {
  const { user, loading, verified, role } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<Vacante[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/");
    if (!loading && user && !verified) router.replace("/verificar");
    if (!loading && user && verified && role === "admin") router.replace("/admin");
  }, [loading, user, verified, role, router]);

  useEffect(() => {
    if (!user || !verified || role !== "docente") return;
    const q = query(
      collection(getClientDb(), COLLECTIONS.vacantes),
      where("active", "==", true),
    );
    return onSnapshot(
      q,
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
  }, [user, verified, role]);

  return (
    <AppShell title="Vacantes abiertas">
      {error ? <p className={styles.error}>{error}</p> : null}
      <ul className={styles.list} data-testid="vacantes-list">
        {rows.map((row) => (
          <li key={row.id} data-testid={`vacante-${row.id}`}>
            <strong>{row.id}</strong> · {row.especialidad} · {row.regional}
            <div className={styles.muted}>
              {row.fields?.Institución}{" "}
              {row.fields?.Aplicar ? (
                <a href={row.fields.Aplicar} target="_blank" rel="noreferrer">
                  Aplicar
                </a>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      {rows.length === 0 ? (
        <p className={styles.muted}>No hay vacantes abiertas.</p>
      ) : null}
    </AppShell>
  );
}
