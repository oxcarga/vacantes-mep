"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, onSnapshot } from "firebase/firestore";
import { COLLECTIONS } from "@gomep/schema";
import { setUserRole } from "@/app/actions";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { getClientAuth, getClientDb } from "@/lib/firebase";

type UserRow = { id: string; name: string; email: string; role: string };
type SubRow = {
  id: string;
  uid: string;
  regionalValue: string;
  especialidad: string;
  status: string;
};
type VacanteRow = {
  id: string;
  regional: string;
  especialidad: string;
  active: boolean;
};
type CatalogRow = { id: string; label?: string; name?: string };

export default function AdminPage() {
  const { user, loading, verified, role, refreshRole } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [vacantes, setVacantes] = useState<VacanteRow[]>([]);
  const [regionales, setRegionales] = useState<CatalogRow[]>([]);
  const [especialidades, setEspecialidades] = useState<CatalogRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/");
    if (!loading && user && !verified) router.replace("/verificar");
    if (!loading && user && verified && role !== "admin") router.replace("/vacantes");
  }, [loading, user, verified, role, router]);

  useEffect(() => {
    if (!user || !verified || role !== "admin") return;
    const db = getClientDb();
    const unsubs = [
      onSnapshot(collection(db, COLLECTIONS.usuarios), (snap) => {
        setUsers(
          snap.docs.map((docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() as Omit<UserRow, "id">),
          })),
        );
      }),
      onSnapshot(collection(db, COLLECTIONS.suscripciones), (snap) => {
        setSubs(
          snap.docs.map((docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() as Omit<SubRow, "id">),
          })),
        );
      }),
      onSnapshot(collection(db, COLLECTIONS.vacantes), (snap) => {
        setVacantes(
          snap.docs.map((docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() as Omit<VacanteRow, "id">),
          })),
        );
      }),
      onSnapshot(collection(db, COLLECTIONS.regionales), (snap) => {
        setRegionales(snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
      }),
      onSnapshot(collection(db, COLLECTIONS.especialidades), (snap) => {
        setEspecialidades(snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
      }),
    ];
    return () => unsubs.forEach((unsub) => unsub());
  }, [user, verified, role]);

  async function changeRole(uid: string, nextRole: "admin" | "docente") {
    setError("");
    try {
      const token = await getClientAuth().currentUser?.getIdToken(true);
      if (!token) throw new Error("Sin sesión");
      await setUserRole(token, uid, nextRole);
      await refreshRole();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cambiar el rol");
    }
  }

  return (
    <AppShell title="Administración">
      {error ? (
        <p className="text-destructive" data-testid="admin-error">
          {error}
        </p>
      ) : null}

      <h2>Cuentas</h2>
      <ul className="flex list-none flex-col gap-2 p-0" data-testid="admin-users">
        {users.map((row) => (
          <li key={row.id} className="flex flex-wrap items-center gap-2" data-testid={`user-${row.email}`}>
            {row.name} · {row.email} · {row.role}
            {row.id !== user?.uid ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => changeRole(row.id, "admin")}
                  data-testid={`promote-${row.email}`}
                >
                  Promover
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => changeRole(row.id, "docente")}
                  data-testid={`demote-${row.email}`}
                >
                  Degradar
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => changeRole(row.id, "docente")}
                data-testid={`demote-${row.email}`}
              >
                Degradarme
              </Button>
            )}
          </li>
        ))}
      </ul>

      <h2>Suscripciones</h2>
      <ul data-testid="admin-subs">
        {subs.map((row) => (
          <li key={row.id} data-testid={`admin-sub-${row.id}`}>
            {row.uid} · {row.regionalValue} · {row.especialidad} · {row.status}
          </li>
        ))}
      </ul>

      <h2>Vacantes</h2>
      <ul data-testid="admin-vacantes">
        {vacantes.map((row) => (
          <li
            key={row.id}
            data-testid={`admin-vacante-${row.id}`}
            data-active={row.active ? "true" : "false"}
          >
            {row.id} · {row.especialidad} · {row.regional} ·{" "}
            {row.active ? "abierta" : "cerrada"}
          </li>
        ))}
      </ul>

      <h2>Regionales</h2>
      <ul data-testid="admin-regionales">
        {regionales.map((row) => (
          <li key={row.id}>
            {row.id} · {row.label}
          </li>
        ))}
      </ul>

      <h2>Especialidades</h2>
      <ul data-testid="admin-especialidades">
        {especialidades.map((row) => (
          <li key={row.id}>{row.name}</li>
        ))}
      </ul>
    </AppShell>
  );
}
