import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "@gomep/schema";

const PROJECT = "demo-gomep-vacantes";
process.env.FIRESTORE_EMULATOR_HOST ||= "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST ||= "127.0.0.1:9099";
const AUTH = `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`;

export function adminSdk() {
  const app = getApps()[0] ?? initializeApp({ projectId: PROJECT });
  return { auth: getAuth(app), db: getFirestore(app) };
}

export async function createAuthUser(email: string, password: string) {
  const response = await fetch(
    `${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  if (!response.ok) {
    throw new Error(`signUp failed ${response.status}: ${await response.text()}`);
  }
  return response.json() as Promise<{ localId: string; idToken: string }>;
}

export async function seedVerifiedUser(options: {
  email: string;
  password: string;
  role: "admin" | "docente";
  name: string;
  phone: string;
}) {
  const { auth, db } = adminSdk();
  let uid: string;
  try {
    const created = await createAuthUser(options.email, options.password);
    uid = created.localId;
  } catch {
    const existing = await auth.getUserByEmail(options.email);
    uid = existing.uid;
  }
  await auth.updateUser(uid, { emailVerified: true });
  await auth.setCustomUserClaims(uid, { role: options.role });
  await db.collection(COLLECTIONS.usuarios).doc(uid).set({
    name: options.name,
    email: options.email,
    phone: options.phone,
    role: options.role,
    createdAt: new Date().toISOString(),
  });
  return uid;
}

export async function seedCatalogsAndVacancies() {
  const { db } = adminSdk();
  await db.collection(COLLECTIONS.regionales).doc("57").set({
    label: "Regional Educación Perez Zeledon",
    lastSeen: new Date().toISOString(),
  });
  await db.collection(COLLECTIONS.especialidades).doc("esp").set({
    name: "Español",
    lastSeen: new Date().toISOString(),
  });
  await db.collection(COLLECTIONS.regionales).doc("78").set({
    label: "Regional Educación Santa Cruz",
    lastSeen: new Date().toISOString(),
  });
  await db.collection(COLLECTIONS.regionales).doc("99").set({
    label: "Regional sin vacantes",
    lastSeen: new Date().toISOString(),
  });
  await db.collection(COLLECTIONS.especialidades).doc("ing").set({
    name: "Inglés",
    lastSeen: new Date().toISOString(),
  });
  await db.collection(COLLECTIONS.vacantes).doc("1001").set({
    regional: "Regional Educación Perez Zeledon",
    regionalValue: "57",
    especialidad: "Español",
    summary: "1001 | Español",
    fields: { Vacante: "1001", Especialidad: "Español", Institución: "Liceo" },
    firstSeen: "2026-01-01T00:00:00.000Z",
    lastSeen: "2026-01-02T00:00:00.000Z",
    active: true,
  });
  await db.collection(COLLECTIONS.vacantes).doc("1002").set({
    regional: "Regional Educación Perez Zeledon",
    regionalValue: "57",
    especialidad: "Español",
    summary: "1002 | Español",
    fields: { Vacante: "1002", Especialidad: "Español", Institución: "Escuela" },
    firstSeen: "2026-01-01T00:00:00.000Z",
    lastSeen: "2026-01-02T00:00:00.000Z",
    active: false,
  });
  await db.collection(COLLECTIONS.vacantes).doc("1003").set({
    regional: "Etiqueta vieja",
    regionalValue: "78",
    especialidad: "Inglés",
    summary: "1003 | Inglés",
    fields: {
      Vacante: "1003",
      Especialidad: "Inglés",
      Institución: "Liceo Pérez Zeledón",
      "Clase de Puesto": "Profesor de Enseñanza Media",
      Lecciones: "30",
      Aplicar: "https://example.com/aplicar/1003",
    },
    firstSeen: "2025-06-01T12:00:00.000Z",
    lastSeen: "2026-01-02T00:00:00.000Z",
    active: true,
  });
  await db.collection(COLLECTIONS.vacantes).doc("1004").set({
    regional: "Regional Educación Perez Zeledon",
    regionalValue: "57",
    especialidad: "Español",
    summary: "1004 | Español",
    fields: { Vacante: "1004", Especialidad: "Español" },
    firstSeen: "2025-01-01T12:00:00.000Z",
    lastSeen: "2026-01-02T00:00:00.000Z",
    active: true,
  });
}

export async function listOobCodes() {
  const response = await fetch(
    `${AUTH}/emulator/v1/projects/${PROJECT}/oobCodes`,
  );
  if (!response.ok) {
    throw new Error(`oobCodes ${response.status}: ${await response.text()}`);
  }
  const body = (await response.json()) as {
    oobCodes?: { email: string; oobCode: string; requestType: string }[];
  };
  return body.oobCodes ?? [];
}

export async function waitForOob(email: string, requestType: string) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const codes = await listOobCodes();
    const match = [...codes].reverse().find(
      (row) => row.email === email && row.requestType === requestType,
    );
    if (match) return match;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`No oob for ${email} ${requestType}`);
}
