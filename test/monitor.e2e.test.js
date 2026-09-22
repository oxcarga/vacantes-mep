import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, describe, it } from "node:test";

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

// The monitor is exercised end to end against a local fixture server, with no
// notification channel configured so the message it would send lands on stdout.
for (const kind of ["json", "libsql"]) {
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
        DROPDOWN_OPTION_LABEL: "Regional Educación Perez Zeledon",
        SCRAPE_ATTEMPTS: "1",
        BASELINE_PATH: join(dir, "baseline.json"),
        DATABASE_URL:
          kind === "libsql" ? `file:${join(dir, "vacantes.db")}` : "",
        NTFY_TOPIC: "",
        TELEGRAM_BOT_TOKEN: "",
        TELEGRAM_CHAT_ID: "",
      };
    });

    after(() => {
      server.close();
      rmSync(dir, { recursive: true, force: true });
    });

    it("reports the full filtered list on the first run", async () => {
      const result = await runMonitor(baseEnv);
      assert.equal(result.code, 0, result.stderr);
      assert.match(result.stdout, /Hay 2 vacantes de Español/);
      assert.match(result.stdout, /Liceo Pérez Zeledón/);
      assert.match(result.stdout, /Escuela El General/);
      assert.doesNotMatch(result.stdout, /CTP San Isidro/);
    });

    it("stays silent when nothing changed", async () => {
      const result = await runMonitor(baseEnv);
      assert.equal(result.code, 0, result.stderr);
      assert.match(result.stdout, /Sin cambios desde la última consulta/);
    });

    it("reports additions, closures and edits together", async () => {
      body = AFTER_CHANGES;
      const result = await runMonitor(baseEnv);
      assert.equal(result.code, 0, result.stderr);
      assert.match(result.stdout, /1 nueva, 1 cerrada, 1 modificada/);
      assert.match(result.stdout, /Liceo Nuevo/);
      assert.match(result.stdout, /Escuela El General/);
      assert.match(result.stdout, /Lecciones: 30 → 32/);
    });

    it("refuses to overwrite state when the table comes back empty", async () => {
      body = EMPTY;
      const result = await runMonitor(baseEnv);
      assert.equal(result.code, 0, result.stderr);
      assert.match(result.stdout, /llegó vacía/);

      body = AFTER_CHANGES;
      const recovered = await runMonitor(baseEnv);
      assert.match(recovered.stdout, /Sin cambios desde la última consulta/);
    });

    it("notifies and exits non-zero when the site is unreachable", async () => {
      const result = await runMonitor({
        ...baseEnv,
        TARGET_URL: "http://127.0.0.1:1/nope",
      });
      assert.equal(result.code, 1);
      assert.match(result.stdout, /Error al consultar las vacantes del MEP/);
    });
  });
}
