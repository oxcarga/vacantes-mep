import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import {
  COLLECTIONS,
  DEFAULT_FIRESTORE_PROJECT_ID,
} from "@gomep/schema";
import { vacancyId, vacancyRegional } from "../vacancies/identity.js";
import { especialidadId, regionalValueByVacancyId } from "./catalogs.js";
import { summarize } from "./schema.js";
import { notifyAfterSuccessfulCommit } from "../notify/after-commit.js";

const WRITE_CHUNK = 400;
const GET_CHUNK = 100;

function ensureApp(projectId) {
  const name = projectId || DEFAULT_FIRESTORE_PROJECT_ID;
  const existing = getApps().find((app) => app.name === name);
  if (existing) return existing;
  return initializeApp({ projectId: name }, name);
}

/**
 * @param {FirebaseFirestore.Firestore} db
 * @param {FirebaseFirestore.DocumentReference[]} refs
 * @returns {Promise<FirebaseFirestore.DocumentSnapshot[]>}
 */
async function getAllChunked(db, refs) {
  const snapshots = [];
  for (let i = 0; i < refs.length; i += GET_CHUNK) {
    const chunk = await db.getAll(...refs.slice(i, i + GET_CHUNK));
    snapshots.push(...chunk);
  }
  return snapshots;
}

/**
 * Commits write operations in chunks so a full scrape stays under Firestore's
 * 500-op batch limit.
 * @param {FirebaseFirestore.Firestore} db
 * @param {((batch: FirebaseFirestore.WriteBatch) => void)[]} operations
 */
async function commitInChunks(db, operations) {
  for (let i = 0; i < operations.length; i += WRITE_CHUNK) {
    const batch = db.batch();
    for (const apply of operations.slice(i, i + WRITE_CHUNK)) apply(batch);
    await batch.commit();
  }
}

/**
 * Creates a Firestore store that implements the same interface as the JSON
 * store so main.js never branches on persistence.
 *
 * On Cloud Run, Application Default Credentials plus GOOGLE_CLOUD_PROJECT
 * are enough. Locally, set FIRESTORE_EMULATOR_HOST (and optionally
 * FIRESTORE_PROJECT_ID).
 *
 * @param {Object} options
 * @param {string} [options.firestoreProjectId]
 * @param {string} options.regional
 * @param {string[]} options.identityCellNames
 * @param {typeof import("../mail/resend.js").sendMail} [options.sendMail]
 */
export async function createFirestoreStore({
  firestoreProjectId,
  regional,
  identityCellNames,
  sendMail,
}) {
  const projectId = firestoreProjectId || DEFAULT_FIRESTORE_PROJECT_ID;
  const app = ensureApp(projectId);
  const db = getFirestore(app);
  const vacantes = db.collection(COLLECTIONS.vacantes);
  const corridas = db.collection(COLLECTIONS.corridasScrape);
  const regionales = db.collection(COLLECTIONS.regionales);
  const especialidades = db.collection(COLLECTIONS.especialidades);

  return {
    kind: "firestore",
    description: `firestore://${projectId}/${COLLECTIONS.vacantes}`,
    db,

    async init() {},

    async loadPrevious() {
      const runs = await corridas.where("ok", "==", true).limit(1).get();
      const snapshot = await vacantes.where("active", "==", true).get();
      return {
        isFirstRun: runs.empty,
        vacancies: snapshot.docs.map((doc) => doc.get("fields") ?? {}),
      };
    },

    async commit({
      current,
      byRegional,
      added,
      removed,
      changed,
      startedAt,
      contentHash,
    }) {
      const now = new Date().toISOString();
      const currentById = new Map();
      for (const vacancy of current) {
        currentById.set(vacancyId(vacancy), vacancy);
      }
      const uniqueCurrent = [...currentById.values()];
      const valueById = regionalValueByVacancyId(byRegional, vacancyId);
      const refs = uniqueCurrent.map((vacancy) =>
        vacantes.doc(vacancyId(vacancy)),
      );
      const existing = refs.length > 0 ? await getAllChunked(db, refs) : [];
      const firstSeenById = new Map();
      for (const snap of existing) {
        if (snap.exists) firstSeenById.set(snap.id, snap.get("firstSeen"));
      }

      const operations = uniqueCurrent.map((vacancy, index) => {
        const scope = vacancyRegional(vacancy, regional);
        const id = vacancyId(vacancy);
        const ref = refs[index];
        const firstSeen = firstSeenById.get(id) || now;
        const regionalValue = valueById.get(id) ?? "";
        return (batch) => {
          batch.set(
            ref,
            {
              regional: scope,
              regionalValue,
              especialidad: String(vacancy.Especialidad ?? "").trim(),
              summary: summarize(vacancy, identityCellNames),
              fields: vacancy,
              firstSeen,
              lastSeen: now,
              active: true,
            },
            { merge: true },
          );
        };
      });

      for (const vacancy of removed) {
        const id = vacancyId(vacancy);
        if (currentById.has(id)) continue;
        const ref = vacantes.doc(id);
        operations.push((batch) => {
          batch.set(
            ref,
            { active: false, lastSeen: now },
            { merge: true },
          );
        });
      }

      if (Array.isArray(byRegional)) {
        for (const group of byRegional) {
          const value = String(group?.regional?.value ?? "").trim();
          if (!value) continue;
          const label = String(group?.regional?.label ?? "").trim();
          const ref = regionales.doc(value);
          operations.push((batch) => {
            batch.set(
              ref,
              { label, lastSeen: now },
              { merge: true },
            );
          });
        }

        const seenEspecialidad = new Set();
        for (const group of byRegional) {
          for (const vacancy of group?.vacantes ?? []) {
            const name = String(vacancy?.Especialidad ?? "");
            if (!name || seenEspecialidad.has(name)) continue;
            seenEspecialidad.add(name);
            const ref = especialidades.doc(especialidadId(name));
            operations.push((batch) => {
              batch.set(ref, { name, lastSeen: now }, { merge: true });
            });
          }
        }
      }

      operations.push((batch) => {
        batch.set(corridas.doc(), {
          startedAt,
          finishedAt: now,
          ok: true,
          regional,
          rowCount: current.length,
          contentHash,
          error: null,
          newCount: added.length,
          goneCount: removed.length,
          changedCount: changed.length,
        });
      });

      await commitInChunks(db, operations);

      const addedWithValue = added.map((vacancy) => ({
        ...vacancy,
        regionalValue: valueById.get(vacancyId(vacancy)) ?? "",
      }));
      try {
        await notifyAfterSuccessfulCommit({
          db,
          added: addedWithValue,
          sendMail,
          now: new Date(),
        });
      } catch (error) {
        console.error("No se pudo enviar correo tras el scrape:", error);
      }
    },

    async recordFailure({ startedAt, error }) {
      await corridas.add({
        startedAt,
        finishedAt: new Date().toISOString(),
        ok: false,
        regional,
        rowCount: null,
        contentHash: null,
        error: String(error).slice(0, 2000),
        newCount: null,
        goneCount: null,
        changedCount: null,
      });
    },

    async close() {},
  };
}
