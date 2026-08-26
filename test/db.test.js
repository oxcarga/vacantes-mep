import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import {
  buildDiffMessage,
  createDbClient,
  ensureSchema,
  persistAndDiff,
  recordFailedRun,
  withIds,
} from "../src/db.js";
import { parseVacancyRows } from "../src/parse.js";

const SAMPLE_HTML = `
<table>
  <tbody>
    <tr>
      <td data-label="Vacante">V-1</td>
      <td data-label="Especialidad">Español</td>
      <td data-label="Clase de Puesto">Propietario</td>
      <td data-label="Institución">Escuela A</td>
      <td data-label="Lecciones">30</td>
    </tr>
    <tr>
      <td data-label="Vacante">V-2</td>
      <td data-label="Especialidad">Inglés</td>
      <td data-label="Clase de Puesto">Interino</td>
      <td data-label="Institución">Escuela B</td>
      <td data-label="Lecciones">20</td>
    </tr>
    <tr>
      <td data-label="Vacante">V-3</td>
      <td data-label="Especialidad">Español</td>
      <td data-label="Clase de Puesto">Interino</td>
      <td data-label="Institución">Escuela C</td>
      <td data-label="Lecciones">40</td>
    </tr>
  </tbody>
</table>
`;

describe("parseVacancyRows", () => {
  it("filters by especialidad and maps cells", () => {
    const rows = parseVacancyRows(SAMPLE_HTML, {
      especialidadFilter: "Español",
    });
    assert.equal(rows.length, 2);
    assert.deepEqual(rows[0], {
      vacante: "V-1",
      especialidad: "Español",
      puesto: "Propietario",
      institucion: "Escuela A",
      lecciones: "30",
    });
  });

  it("returns all rows when no filter is set", () => {
    const rows = parseVacancyRows(SAMPLE_HTML);
    assert.equal(rows.length, 3);
  });
});

describe("persistAndDiff", () => {
  let dir;
  let client;

  before(async () => {
    dir = mkdtempSync(join(tmpdir(), "vacantes-"));
    client = createDbClient(`file:${join(dir, "vacantes.db")}`);
    await ensureSchema(client);
  });

  after(() => {
    if (client && typeof client.close === "function") client.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it("treats the first scrape as new openings and isFirstRun", async () => {
    const openings = withIds(
      parseVacancyRows(SAMPLE_HTML, { especialidadFilter: "Español" }),
      "Perez Zeledon",
    );
    const diff = await persistAndDiff(client, openings, {
      regional: "Perez Zeledon",
      startedAt: "2026-01-01T00:00:00.000Z",
    });
    assert.equal(diff.isFirstRun, true);
    assert.equal(diff.added.length, 2);
    assert.equal(diff.removed.length, 0);
    assert.equal(diff.changed.length, 0);
  });

  it("is silent when the same openings appear again", async () => {
    const openings = withIds(
      parseVacancyRows(SAMPLE_HTML, { especialidadFilter: "Español" }),
      "Perez Zeledon",
    );
    const diff = await persistAndDiff(client, openings, {
      regional: "Perez Zeledon",
      startedAt: "2026-01-01T01:00:00.000Z",
    });
    assert.equal(diff.isFirstRun, false);
    assert.equal(diff.added.length, 0);
    assert.equal(diff.removed.length, 0);
    assert.equal(diff.changed.length, 0);
  });

  it("detects added, removed, and changed rows", async () => {
    const next = withIds(
      [
        {
          vacante: "V-1",
          especialidad: "Español",
          puesto: "Propietario",
          institucion: "Escuela A",
          lecciones: "32",
        },
        {
          vacante: "V-9",
          especialidad: "Español",
          puesto: "Interino",
          institucion: "Escuela Z",
          lecciones: "10",
        },
      ],
      "Perez Zeledon",
    );
    const diff = await persistAndDiff(client, next, {
      regional: "Perez Zeledon",
      startedAt: "2026-01-01T02:00:00.000Z",
    });
    assert.equal(diff.added.length, 1);
    assert.equal(diff.added[0].vacante, "V-9");
    assert.equal(diff.removed.length, 1);
    assert.equal(diff.removed[0].vacante, "V-3");
    assert.equal(diff.changed.length, 1);
    assert.equal(diff.changed[0].next.lecciones, "32");
    assert.equal(diff.changed[0].prev.lecciones, "30");
  });

  it("records failed scrapes without changing openings", async () => {
    await recordFailedRun(client, {
      startedAt: "2026-01-01T03:00:00.000Z",
      error: "[ERROR] timeout",
    });
    const runs = await client.execute(
      "SELECT ok, error FROM scrape_runs ORDER BY id DESC LIMIT 1",
    );
    assert.equal(runs.rows[0].ok, 0);
    assert.match(String(runs.rows[0].error), /timeout/);
  });
});

describe("buildDiffMessage", () => {
  it("summarizes new and gone openings", () => {
    const { title, body } = buildDiffMessage({
      specialty: "Español",
      regional: "Perez Zeledon",
      added: [
        {
          vacante: "V-9",
          especialidad: "Español",
          puesto: "Interino",
          institucion: "Escuela Z",
          lecciones: "10",
        },
      ],
      removed: [
        {
          vacante: "V-3",
          especialidad: "Español",
          puesto: "Interino",
          institucion: "Escuela C",
          lecciones: "40",
        },
      ],
      changed: [],
      total: 2,
    });
    assert.match(title, /1 nueva/);
    assert.match(title, /1 desaparecida/);
    assert.match(body, /Nuevas:/);
    assert.match(body, /Ya no aparecen:/);
  });
});
