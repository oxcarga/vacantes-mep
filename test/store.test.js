import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import { DEFAULT_IDENTITY_CELL_NAMES } from "../src/config.js";
import { createStore } from "../src/store/index.js";
import { diffVacancies } from "../src/vacancies/index.js";

const REGIONAL = "Regional Educación Perez Zeledon";

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

/** Both stores are interchangeable, so they run the same contract. */
for (const kind of ["json", "libsql"]) {
  describe(`${kind} store`, () => {
    let dir;
    let store;

    before(async () => {
      dir = mkdtempSync(join(tmpdir(), `vacantes-${kind}-`));
      store = await createStore({
        regional: REGIONAL,
        identityCellNames: DEFAULT_IDENTITY_CELL_NAMES,
        baselinePath: join(dir, "baseline.json"),
        databaseUrl: kind === "libsql" ? `file:${join(dir, "vacantes.db")}` : "",
        databaseAuthToken: "",
      });
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
        databaseUrl: "",
        databaseAuthToken: "",
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

describe("libsql store history", () => {
  it("keeps first_seen and deactivates closed vacancies", async () => {
    const dir = mkdtempSync(join(tmpdir(), "vacantes-history-"));
    const databaseUrl = `file:${join(dir, "vacantes.db")}`;
    try {
      const store = await createStore({
        regional: REGIONAL,
        identityCellNames: DEFAULT_IDENTITY_CELL_NAMES,
        baselinePath: join(dir, "baseline.json"),
        databaseUrl,
        databaseAuthToken: "",
      });
      await store.commit(commitArgs([], [espanolA, espanolB]));
      await store.commit(commitArgs([espanolA, espanolB], [espanolA]));
      await store.recordFailure({
        startedAt: new Date().toISOString(),
        error: "boom",
      });
      await store.close();

      const { createClient } = await import("@libsql/client");
      const client = createClient({ url: databaseUrl });
      const openings = await client.execute(
        "SELECT summary, active, first_seen, last_seen FROM openings ORDER BY summary",
      );
      const runs = await client.execute(
        "SELECT ok, row_count, new_count, gone_count, error FROM scrape_runs ORDER BY id",
      );
      client.close();

      assert.equal(openings.rows.length, 2);
      const closed = openings.rows.find((row) => Number(row.active) === 0);
      assert.match(String(closed.summary), /Escuela El General/);
      assert.ok(closed.first_seen <= closed.last_seen);

      assert.equal(runs.rows.length, 3);
      assert.equal(Number(runs.rows[0].new_count), 2);
      assert.equal(Number(runs.rows[1].gone_count), 1);
      assert.equal(Number(runs.rows[2].ok), 0);
      assert.match(String(runs.rows[2].error), /boom/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
