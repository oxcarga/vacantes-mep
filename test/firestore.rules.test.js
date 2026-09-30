import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, describe, it } from "node:test";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, getDocs, collection, setDoc } from "firebase/firestore";
import { COLLECTIONS } from "@gomep/schema";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const RULES = readFileSync(join(ROOT, "firestore.rules"), "utf8");

const claims = {
  docente: {
    email: "docente@example.com",
    email_verified: true,
    role: "docente",
  },
  admin: {
    email: "admin@example.com",
    email_verified: true,
    role: "admin",
  },
  unverified: {
    email: "pending@example.com",
    email_verified: false,
    role: "docente",
  },
};

describe("firestore.rules", () => {
  /** @type {import("@firebase/rules-unit-testing").RulesTestEnvironment} */
  let testEnv;

  before(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: "demo-gomep-rules",
      firestore: { rules: RULES },
    });

    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, COLLECTIONS.vacantes, "open-1"), {
        regional: "Pérez Zeledón",
        regionalValue: "54",
        especialidad: "Español",
        summary: "open",
        fields: {},
        firstSeen: "2026-01-01T00:00:00.000Z",
        lastSeen: "2026-01-02T00:00:00.000Z",
        active: true,
      });
      await setDoc(doc(db, COLLECTIONS.vacantes, "closed-1"), {
        regional: "Pérez Zeledón",
        regionalValue: "54",
        especialidad: "Español",
        summary: "closed",
        fields: {},
        firstSeen: "2026-01-01T00:00:00.000Z",
        lastSeen: "2026-01-02T00:00:00.000Z",
        active: false,
      });
      await setDoc(doc(db, COLLECTIONS.regionales, "54"), {
        label: "Pérez Zeledón",
        lastSeen: "2026-01-02T00:00:00.000Z",
      });
      await setDoc(doc(db, COLLECTIONS.especialidades, "abc"), {
        name: "Español",
        lastSeen: "2026-01-02T00:00:00.000Z",
      });
      await setDoc(doc(db, COLLECTIONS.suscripciones, "mine"), {
        uid: "docente-1",
        regionalValue: "54",
        especialidad: "Español",
        status: "active",
        createdAt: "2026-01-01T00:00:00.000Z",
        expiresAt: "2026-01-31T00:00:00.000Z",
        endedAt: null,
        endReason: null,
        reminders: {},
      });
      await setDoc(doc(db, COLLECTIONS.suscripciones, "theirs"), {
        uid: "other",
        regionalValue: "54",
        especialidad: "Inglés",
        status: "inactive",
        createdAt: "2026-01-01T00:00:00.000Z",
        expiresAt: "2026-01-31T00:00:00.000Z",
        endedAt: "2026-01-10T00:00:00.000Z",
        endReason: "removed",
        reminders: {},
      });
      await setDoc(doc(db, COLLECTIONS.usuarios, "docente-1"), {
        name: "Ana",
        email: "docente@example.com",
        phone: "8888-8888",
        role: "docente",
        createdAt: "2026-01-01T00:00:00.000Z",
      });
      await setDoc(doc(db, COLLECTIONS.usuarios, "admin-1"), {
        name: "Admin",
        email: "admin@example.com",
        phone: "8888-0000",
        role: "admin",
        createdAt: "2026-01-01T00:00:00.000Z",
      });
      await setDoc(doc(db, COLLECTIONS.corridasScrape, "run-1"), {
        startedAt: "2026-01-02T00:00:00.000Z",
        finishedAt: "2026-01-02T00:01:00.000Z",
        ok: true,
        regional: "all",
        rowCount: 1,
        contentHash: "x",
        error: null,
        newCount: 1,
        goneCount: 0,
        changedCount: 0,
      });
    });
  });

  after(async () => {
    await testEnv.cleanup();
  });

  function dbFor(uid, token) {
    return testEnv.authenticatedContext(uid, token).firestore();
  }

  it("lets a verified docente read only active vacantes", async () => {
    const db = dbFor("docente-1", claims.docente);
    await assertSucceeds(getDoc(doc(db, COLLECTIONS.vacantes, "open-1")));
    await assertFails(getDoc(doc(db, COLLECTIONS.vacantes, "closed-1")));
  });

  it("lets an admin read open and closed vacantes", async () => {
    const db = dbFor("admin-1", claims.admin);
    await assertSucceeds(getDoc(doc(db, COLLECTIONS.vacantes, "open-1")));
    await assertSucceeds(getDoc(doc(db, COLLECTIONS.vacantes, "closed-1")));
  });

  it("lets a docente read only their own subscriptions", async () => {
    const db = dbFor("docente-1", claims.docente);
    await assertSucceeds(getDoc(doc(db, COLLECTIONS.suscripciones, "mine")));
    await assertFails(getDoc(doc(db, COLLECTIONS.suscripciones, "theirs")));
  });

  it("lets an admin read all designed collections", async () => {
    const db = dbFor("admin-1", claims.admin);
    await assertSucceeds(getDoc(doc(db, COLLECTIONS.usuarios, "docente-1")));
    await assertSucceeds(getDoc(doc(db, COLLECTIONS.suscripciones, "theirs")));
    await assertSucceeds(getDoc(doc(db, COLLECTIONS.regionales, "54")));
    await assertSucceeds(getDoc(doc(db, COLLECTIONS.especialidades, "abc")));
    await assertSucceeds(getDoc(doc(db, COLLECTIONS.corridasScrape, "run-1")));
    await assertSucceeds(getDocs(collection(db, COLLECTIONS.vacantes)));
  });

  it("blocks client writes to usuarios, catalogs, subscriptions and vacantes", async () => {
    const docenteDb = dbFor("docente-1", claims.docente);
    const adminDb = dbFor("admin-1", claims.admin);
    await assertFails(
      setDoc(doc(docenteDb, COLLECTIONS.usuarios, "docente-1"), { role: "admin" }),
    );
    await assertFails(
      setDoc(doc(adminDb, COLLECTIONS.regionales, "54"), { label: "x" }),
    );
    await assertFails(
      setDoc(doc(docenteDb, COLLECTIONS.especialidades, "abc"), { name: "x" }),
    );
    await assertFails(
      setDoc(doc(docenteDb, COLLECTIONS.suscripciones, "mine"), { status: "inactive" }),
    );
    await assertFails(
      setDoc(doc(docenteDb, COLLECTIONS.vacantes, "open-1"), { active: false }),
    );
  });

  it("blocks unverified and anonymous reads of vacantes", async () => {
    const pending = dbFor("pending-1", claims.unverified);
    const anon = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(pending, COLLECTIONS.vacantes, "open-1")));
    await assertFails(getDoc(doc(anon, COLLECTIONS.vacantes, "open-1")));
  });
});
