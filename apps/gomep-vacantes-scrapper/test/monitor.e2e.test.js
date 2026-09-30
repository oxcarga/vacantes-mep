import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, describe, it } from "node:test";
import { getApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "@gomep/schema";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const MONITOR = join(ROOT, "src", "main.js");

function row({ vacante, especialidad, puesto, institucion, lecciones }) {
  return `<tr>
    <td data-label="Vacante">${vacante}</td>
    <td data-label="Especialidad">${especialidad}</td>
    <td data-label="Clase de Puesto">${puesto}</td>
    <td data-label="Institución">${institucion}</td>
    <td data-label="Lecciones">${lecciones}</td>
  </tr>`;
}

function page(rows) {
  return `<!DOCTYPE html><html><body><div class="mud-table-container">
    <table><tbody>${rows.map(row).join("")}</tbody></table>
  </div></body></html>`;
}

const LICEO = {
  vacante: "1001",
  especialidad: "Español",
  puesto: "Profesor de Enseñanza Media",
  institucion: "Liceo Pérez Zeledón",
  lecciones: "30",
};
const CTP_INGLES = {
  vacante: "1002",
  especialidad: "Inglés",
  puesto: "Profesor de Enseñanza Media",
  institucion: "CTP San Isidro",
  lecciones: "24",
};
const EL_GENERAL = {
  vacante: "1003",
  especialidad: "Español",
  puesto: "Profesor de Enseñanza General Básica",
  institucion: "Escuela El General",
  lecciones: "20",
};
const LICEO_NUEVO = {
  vacante: "1004",
  especialidad: "Español",
  puesto: "Profesor de Enseñanza Media",
  institucion: "Liceo Nuevo",
  lecciones: "12",
};

const INITIAL = page([LICEO, CTP_INGLES, EL_GENERAL]);
const AFTER_CHANGES = page([
  { ...LICEO, lecciones: "32" },
  CTP_INGLES,
  LICEO_NUEVO,
]);
const EMPTY = page([]);

function runMonitor(env) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, [MONITOR], {
      cwd: ROOT,
      env: { ...process.env, ...env },
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => resolvePromise({ code, stdout, stderr }));
  });
}

// The scraper is exercised end to end against a local fixture server.
const FIRESTORE = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const STORE_KINDS = FIRESTORE ? ["json", "firestore"] : ["json"];

for (const kind of STORE_KINDS) {
  describe(`monitor end to end (${kind} store)`, () => {
    let server;
    let dir;
    let baseEnv;
    let body = INITIAL;

    before(async () => {
      dir = mkdtempSync(join(tmpdir(), `vacantes-e2e-${kind}-`));
      server = createServer((_req, res) => {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(body);
      });
      await new Promise((ready) => server.listen(0, "127.0.0.1", ready));

      baseEnv = {
        TARGET_URL: `http://127.0.0.1:${server.address().port}/vacantes`,
        USE_PLAYWRIGHT: "0",
        CONTENT_SELECTOR: ".mud-table-container",
        TABLE_CELL_NAMES:
          "Vacante,Especialidad,Clase de Puesto,Institución,Lecciones",
        TABLE_FILTER_ESPECIALIDAD_VALUE: "Español",
        SCRAPE_ATTEMPTS: "1",
        BASELINE_PATH: join(dir, "baseline.json"),
        FIRESTORE_PROJECT_ID:
          kind === "firestore" ? "demo-gomep-e2e" : "",
        GOOGLE_CLOUD_PROJECT:
          kind === "firestore" ? "demo-gomep-e2e" : "",
        FIRESTORE_EMULATOR_HOST:
          kind === "firestore"
            ? process.env.FIRESTORE_EMULATOR_HOST || ""
            : "",
      };

      if (kind === "firestore") {
        const { createFirestoreStore } = await import(
          "../src/store/firestore.js"
        );
        await createFirestoreStore({
          firestoreProjectId: "demo-gomep-e2e",
          regional: "Regional Educación Perez Zeledon",
          identityCellNames: [
            "Vacante",
            "Especialidad",
            "Institución",
          ],
        });
        const db = getFirestore(getApp("demo-gomep-e2e"));
        for (const name of [COLLECTIONS.openings, COLLECTIONS.scrapeRuns]) {
          const snapshot = await db.collection(name).get();
          if (snapshot.empty) continue;
          const batch = db.batch();
          for (const doc of snapshot.docs) batch.delete(doc.ref);
          await batch.commit();
        }
      }
    });

    after(() => {
      server.close();
      rmSync(dir, { recursive: true, force: true });
    });

    it("keeps only the filtered rows on the first run", async () => {
      const result = await runMonitor(baseEnv);
      assert.equal(result.code, 0, result.stderr);
      assert.match(result.stdout, /Se leyeron 3 vacantes/);
      assert.match(result.stdout, /2 pasan los filtros/);
      assert.match(
        result.stdout,
        /2 activas, 2 nuevas, 0 cerradas, 0 modificadas/,
      );
    });

    it("stays silent when nothing changed", async () => {
      const result = await runMonitor(baseEnv);
      assert.equal(result.code, 0, result.stderr);
      assert.match(result.stdout, /Sin cambios desde la última consulta/);
    });

    it("records additions, closures and edits together", async () => {
      body = AFTER_CHANGES;
      const result = await runMonitor(baseEnv);
      assert.equal(result.code, 0, result.stderr);
      assert.match(
        result.stdout,
        /2 activas, 1 nuevas, 1 cerradas, 1 modificadas/,
      );
    });

    it("refuses to overwrite state when the table comes back empty", async () => {
      body = EMPTY;
      const result = await runMonitor(baseEnv);
      assert.equal(result.code, 0, result.stderr);
      assert.match(result.stderr, /llegó vacía/);

      body = AFTER_CHANGES;
      const recovered = await runMonitor(baseEnv);
      assert.match(recovered.stdout, /Sin cambios desde la última consulta/);
    });

    it("exits non-zero when the site is unreachable", async () => {
      const result = await runMonitor({
        ...baseEnv,
        TARGET_URL: "http://127.0.0.1:1/nope",
      });
      assert.equal(result.code, 1);
      assert.match(result.stderr, /fetch failed|ECONNREFUSED/i);
    });
  });
}
