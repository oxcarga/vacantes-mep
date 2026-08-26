import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, describe, it } from "node:test";
import { createClient } from "@libsql/client";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE = readFileSync(join(__dirname, "fixtures", "vacantes.html"));
const MONITOR = join(__dirname, "..", "src", "monitor.js");

function runMonitor(env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [MONITOR], {
      env: { ...process.env, ...env },
      cwd: join(__dirname, ".."),
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
    child.on("close", (code) => {
      resolve({ code, stdout, stderr });
    });
  });
}

describe("monitor e2e (HTTP fixture, no Playwright)", () => {
  let server;
  let dir;
  let url;
  let dbUrl;

  before(async () => {
    dir = mkdtempSync(join(tmpdir(), "vacantes-e2e-"));
    dbUrl = `file:${join(dir, "vacantes.db")}`;
    server = createServer((req, res) => {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(FIXTURE);
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address();
    url = `http://127.0.0.1:${port}/vacantes.html`;
  });

  after(() => {
    server.close();
    rmSync(dir, { recursive: true, force: true });
  });

  const baseEnv = () => ({
    TARGET_URL: url,
    USE_PLAYWRIGHT: "0",
    CONTENT_SELECTOR: ".mud-table-container",
    TABLE_FILTER_ESPECIALIDAD_VALUE: "Español",
    TABLE_CELL_NAMES:
      "Vacante,Especialidad,Clase de Puesto,Institución,Lecciones",
    DATABASE_URL: dbUrl,
    NTFY_TOPIC: "",
    TELEGRAM_BOT_TOKEN: "",
    TELEGRAM_CHAT_ID: "",
    DROPDOWN_OPTION_LABEL: "Perez Zeledon",
  });

  it("stores openings on the first run and stays silent on the second", async () => {
    const first = await runMonitor(baseEnv());
    assert.equal(first.code, 0, first.stderr);
    assert.match(first.stdout, /Parsed 1 openings/);

    const second = await runMonitor(baseEnv());
    assert.equal(second.code, 0, second.stderr);
    assert.match(second.stdout, /No changes \(1 openings/);

    const client = createClient({ url: dbUrl });
    const openings = await client.execute(
      "SELECT vacante, especialidad, active FROM openings",
    );
    const runs = await client.execute(
      "SELECT ok, row_count, new_count, gone_count FROM scrape_runs ORDER BY id",
    );
    client.close();

    assert.equal(openings.rows.length, 1);
    assert.equal(openings.rows[0].vacante, "V-1");
    assert.equal(openings.rows[0].active, 1);
    assert.equal(runs.rows.length, 2);
    assert.equal(runs.rows[0].new_count, 1);
    assert.equal(runs.rows[1].new_count, 0);
  });
});
