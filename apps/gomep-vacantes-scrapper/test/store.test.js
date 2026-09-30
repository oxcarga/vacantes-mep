import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import { getApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "@gomep/schema";
import { DEFAULT_IDENTITY_CELL_NAMES } from "../src/config.js";
import { especialidadId } from "../src/store/catalogs.js";
import { createStore } from "../src/store/index.js";
import { diffVacancies } from "../src/vacancies/index.js";

const REGIONAL = "Regional Educación Perez Zeledon";
const FIRESTORE = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const STORE_KINDS = FIRESTORE ? ["json", "firestore"] : ["json"];

const espanolA = {
  Vacante: "1001",
  Especialidad: "Español",
  "Clase de Puesto": "Profesor de Enseñanza Media",
  Institución: "Liceo Pérez Zeledón",
  Lecciones: "30",
};
const espanolB = {
  Vacante: "1003",
  Especialidad: "Español",
  "Clase de Puesto": "Profesor de Enseñanza General Básica",
  Institución: "Escuela El General",
  Lecciones: "20",
};

function commitArgs(previous, current) {
  const diff = diffVacancies(previous, current);
  return {
    current,
    added: diff.added,
    removed: diff.removed,
    changed: diff.changed,
    startedAt: new Date().toISOString(),
    contentHash: "hash",
  };
}

function storeConfig(kind, dir) {
  const base = {
    regional: REGIONAL,
    identityCellNames: DEFAULT_IDENTITY_CELL_NAMES,
    baselinePath: join(dir, "baseline.json"),
  };
  if (kind !== "firestore") return base;
  return {
    ...base,
    firestoreProjectId: "demo-gomep-store",
    firestoreEmulatorHost: process.env.FIRESTORE_EMULATOR_HOST,
  };
}

async function clearFirestore(projectId = "demo-gomep-store") {
  const db = getFirestore(getApp(projectId));
  for (const name of [
    COLLECTIONS.vacantes,
    COLLECTIONS.corridasScrape,
    COLLECTIONS.regionales,
    COLLECTIONS.especialidades,
    COLLECTIONS.suscripciones,
  ]) {
    const snapshot = await db.collection(name).get();
    if (snapshot.empty) continue;
    const batch = db.batch();
    for (const doc of snapshot.docs) batch.delete(doc.ref);
    await batch.commit();
  }
}

/** Both stores are interchangeable, so they run the same contract. */
for (const kind of STORE_KINDS) {
  describe(`${kind} store`, () => {
    let dir;
    let store;

    before(async () => {
      dir = mkdtempSync(join(tmpdir(), `vacantes-${kind}-`));
      store = await createStore(storeConfig(kind, dir));
      if (kind === "firestore") await clearFirestore();
    });

    after(async () => {
      await store.close();
      rmSync(dir, { recursive: true, force: true });
    });

    it("reports the very first load as a first run", async () => {
      const previous = await store.loadPrevious();
      assert.equal(previous.isFirstRun, true);
      assert.deepEqual(previous.vacancies, []);
    });

    it("round-trips committed vacancies", async () => {
      await store.commit(commitArgs([], [espanolA, espanolB]));
      const previous = await store.loadPrevious();
      assert.equal(previous.isFirstRun, false);
      assert.equal(previous.vacancies.length, 2);
      assert.deepEqual(
        previous.vacancies.map((row) => row.Vacante).sort(),
        ["1001", "1003"],
      );
    });

    it("forgets vacancies that stopped appearing", async () => {
      const previous = (await store.loadPrevious()).vacancies;
      await store.commit(commitArgs(previous, [espanolA]));
      const reloaded = await store.loadPrevious();
      assert.deepEqual(
        reloaded.vacancies.map((row) => row.Vacante),
        ["1001"],
      );
    });

    it("keeps edited details", async () => {
      const previous = (await store.loadPrevious()).vacancies;
      const edited = { ...espanolA, Lecciones: "32" };
      await store.commit(commitArgs(previous, [edited]));
      const reloaded = await store.loadPrevious();
      assert.equal(reloaded.vacancies[0].Lecciones, "32");
    });

    it("records a failure without touching the stored vacancies", async () => {
      await store.recordFailure({
        startedAt: new Date().toISOString(),
        error: "timeout",
      });
      const reloaded = await store.loadPrevious();
      assert.equal(reloaded.vacancies.length, 1);
    });
  });
}

describe("json baseline layout", () => {
  it("keeps the summary header and groups vacancies by regional", async () => {
    const dir = mkdtempSync(join(tmpdir(), "vacantes-layout-"));
    const baselinePath = join(dir, "baseline.json");
    try {
      const store = await createStore({
        regional: REGIONAL,
        identityCellNames: DEFAULT_IDENTITY_CELL_NAMES,
        baselinePath,
      });
      const byRegional = [
        {
          regional: { value: "54", label: "Regional Educación Alajuela" },
          total: 1,
          scrapedAt: "2026-09-25T05:20:14.354Z",
          vacantes: [{ ...espanolA, Regional: "Regional Educación Alajuela" }],
        },
        {
          regional: { value: "57", label: "Regional Educación Cartago" },
          total: 1,
          scrapedAt: "2026-09-25T05:20:44.904Z",
          vacantes: [{ ...espanolB, Regional: "Regional Educación Cartago" }],
        },
      ];
      await store.commit({
        ...commitArgs([], [espanolA, espanolB]),
        byRegional,
      });
      const saved = JSON.parse(readFileSync(baselinePath, "utf8"));
      assert.equal(saved.regional, REGIONAL);
      assert.equal(saved.contentHash, "hash");
      assert.deepEqual(saved.counts, {
        total: 2,
        added: 2,
        removed: 0,
        changed: 0,
      });
      assert.equal(typeof saved.checkedAt, "string");
      assert.deepEqual(saved.vacancies, byRegional);

      const previous = await store.loadPrevious();
      assert.deepEqual(
        previous.vacancies.map((row) => row.Vacante),
        ["1001", "1003"],
      );
      await store.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("still reads a legacy flat vacancies array", async () => {
    const dir = mkdtempSync(join(tmpdir(), "vacantes-legacy-"));
    const baselinePath = join(dir, "baseline.json");
    try {
      writeFileSync(
        baselinePath,
        JSON.stringify({
          checkedAt: "2026-09-25T05:22:03.463Z",
          regional: REGIONAL,
          vacancies: [espanolA],
        }),
      );
      const store = await createStore({
        regional: REGIONAL,
        identityCellNames: DEFAULT_IDENTITY_CELL_NAMES,
        baselinePath,
      });
      const previous = await store.loadPrevious();
      assert.equal(previous.isFirstRun, false);
      assert.deepEqual(previous.vacancies, [espanolA]);
      await store.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("json store recovery", () => {
  it("treats a corrupt baseline as a first run instead of crashing", async () => {
    const dir = mkdtempSync(join(tmpdir(), "vacantes-corrupt-"));
    const baselinePath = join(dir, "baseline.json");
    try {
      writeFileSync(baselinePath, "{not json");
      const store = await createStore({
        regional: REGIONAL,
        identityCellNames: DEFAULT_IDENTITY_CELL_NAMES,
        baselinePath,
      });
      const previous = await store.loadPrevious();
      assert.equal(previous.isFirstRun, true);
      assert.deepEqual(previous.vacancies, []);
      await store.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

(FIRESTORE ? describe : describe.skip)("firestore store history", () => {
  it("keeps firstSeen and deactivates closed vacancies", async () => {
    const dir = mkdtempSync(join(tmpdir(), "vacantes-history-"));
    try {
      const store = await createStore(storeConfig("firestore", dir));
      await clearFirestore();
      await store.commit(commitArgs([], [espanolA, espanolB]));
      await store.commit(commitArgs([espanolA, espanolB], [espanolA]));
      await store.recordFailure({
        startedAt: new Date().toISOString(),
        error: "boom",
      });
      await store.close();

      const db = getFirestore(getApp("demo-gomep-store"));
      const openings = await db.collection(COLLECTIONS.vacantes).get();
      const runs = await db
        .collection(COLLECTIONS.corridasScrape)
        .orderBy("startedAt")
        .get();

      assert.equal(openings.size, 2);
      assert.deepEqual(
        openings.docs.map((doc) => doc.id).sort(),
        ["1001", "1003"],
      );
      const closed = openings.docs.find((doc) => doc.get("active") === false);
      assert.match(String(closed.get("summary")), /Escuela El General/);
      assert.ok(closed.get("firstSeen") <= closed.get("lastSeen"));
      assert.equal(closed.get("especialidad"), "Español");

      assert.equal(runs.size, 3);
      assert.equal(runs.docs[0].get("newCount"), 2);
      assert.equal(runs.docs[1].get("goneCount"), 1);
      assert.equal(runs.docs[2].get("ok"), false);
      assert.match(String(runs.docs[2].get("error")), /boom/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

(FIRESTORE ? describe : describe.skip)("firestore catalogs", () => {
  it("upserts empty regionales, keeps missing ones, and does not merge spellings", async () => {
    const dir = mkdtempSync(join(tmpdir(), "vacantes-catalogs-"));
    try {
      const store = await createStore(storeConfig("firestore", dir));
      await clearFirestore();
      const firstSeenCommit = {
        ...commitArgs([], [espanolA]),
        byRegional: [
          {
            regional: { value: "57", label: "Regional Educación Perez Zeledon" },
            total: 1,
            scrapedAt: new Date().toISOString(),
            vacantes: [espanolA],
          },
          {
            regional: { value: "54", label: "Regional Educación Alajuela" },
            total: 0,
            scrapedAt: new Date().toISOString(),
            vacantes: [],
          },
        ],
      };
      await store.commit(firstSeenCommit);
      const db = getFirestore(getApp("demo-gomep-store"));
      const first = await db.collection(COLLECTIONS.vacantes).doc("1001").get();
      const firstSeen = first.get("firstSeen");
      assert.equal(first.get("regionalValue"), "57");

      await store.commit({
        ...commitArgs([espanolA], [
          { ...espanolA, Especialidad: "Sin Especialidad T-I" },
          { ...espanolB, Vacante: "1004", Especialidad: "Sin Especialidad T-Ii" },
        ]),
        byRegional: [
          {
            regional: { value: "57", label: "Pérez Zeledón (nuevo)" },
            total: 2,
            scrapedAt: new Date().toISOString(),
            vacantes: [
              { ...espanolA, Especialidad: "Sin Especialidad T-I" },
              { ...espanolB, Vacante: "1004", Especialidad: "Sin Especialidad T-Ii" },
            ],
          },
        ],
      });

      const regionales = await db.collection(COLLECTIONS.regionales).get();
      const ids = regionales.docs.map((docSnap) => docSnap.id).sort();
      assert.deepEqual(ids, ["54", "57"]);
      assert.equal(
        regionales.docs.find((docSnap) => docSnap.id === "54").get("label"),
        "Regional Educación Alajuela",
      );
      assert.equal(
        regionales.docs.find((docSnap) => docSnap.id === "57").get("label"),
        "Pérez Zeledón (nuevo)",
      );

      const especialidades = await db.collection(COLLECTIONS.especialidades).get();
      const names = especialidades.docs.map((docSnap) => docSnap.get("name")).sort();
      assert.ok(names.includes("Español"));
      assert.ok(names.includes("Sin Especialidad T-I"));
      assert.ok(names.includes("Sin Especialidad T-Ii"));
      assert.equal(
        especialidades.docs.find((docSnap) => docSnap.id === especialidadId("Sin Especialidad T-I")).get("name"),
        "Sin Especialidad T-I",
      );

      const again = await db.collection(COLLECTIONS.vacantes).doc("1001").get();
      assert.equal(again.get("firstSeen"), firstSeen);
      assert.equal(again.get("regionalValue"), "57");
      await store.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
