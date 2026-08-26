import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_CELL_NAMES,
  NTFY_MAX_BYTES,
  buildNotification,
  diffVacancies,
  filterVacancies,
  formatVacancy,
  parseCellNames,
  parseVacancies,
  splitFilterValues,
  truncateUtf8,
  uniqueVacancies,
  vacancyKey,
} from "./vacancies.js";

const FIXTURE_HTML = `
<table class="mud-table-root">
  <tbody>
    <tr>
      <td data-label="Vacante">101</td>
      <td data-label="Especialidad">Español</td>
      <td data-label="Clase de Puesto">Profesor de Enseñanza Media</td>
      <td data-label="Institución">Liceo Pérez Zeledón</td>
      <td data-label="Lecciones">32</td>
    </tr>
    <tr>
      <td data-label="Vacante">102</td>
      <td data-label="Especialidad">Inglés</td>
      <td data-label="Clase de Puesto">Profesor de Enseñanza General Básica</td>
      <td data-label="Institución">Escuela San Pedro</td>
      <td data-label="Lecciones">20</td>
    </tr>
    <tr>
      <td data-label="Vacante">103</td>
      <td data-label="Especialidad">Español</td>
      <td data-label="Clase de Puesto">Profesor de Enseñanza Media</td>
      <td data-label="Institución">CTP Daniel Oduber</td>
      <td data-label="Lecciones">40</td>
    </tr>
  </tbody>
</table>
`;

describe("parseVacancies", () => {
  it("reads table rows as objects by data-label", () => {
    const rows = parseVacancies(FIXTURE_HTML);
    assert.equal(rows.length, 3);
    assert.deepEqual(rows[0], {
      Vacante: "101",
      Especialidad: "Español",
      "Clase de Puesto": "Profesor de Enseñanza Media",
      Institución: "Liceo Pérez Zeledón",
      Lecciones: "32",
    });
  });

  it("skips empty rows", () => {
    const html = `<table><tbody><tr><td data-label="Vacante">  </td></tr></tbody></table>`;
    assert.deepEqual(parseVacancies(html), []);
  });
});

describe("filterVacancies", () => {
  const rows = parseVacancies(FIXTURE_HTML);

  it("keeps all rows when no filter values are set", () => {
    assert.equal(filterVacancies(rows, [{ column: "Especialidad", values: [] }]).length, 3);
  });

  it("filters by especialidad and extra columns", () => {
    const filtered = filterVacancies(rows, [
      { column: "Especialidad", values: ["Español"] },
      { column: "Lecciones", values: ["32"] },
    ]);
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].Institución, "Liceo Pérez Zeledón");
  });

  it("accepts comma-separated especialidades", () => {
    const values = splitFilterValues("Español, Inglés");
    const filtered = filterVacancies(rows, [
      { column: "Especialidad", values },
    ]);
    assert.equal(filtered.length, 3);
  });

  it("filters by puesto and institución", () => {
    const filtered = filterVacancies(rows, [
      { column: "Clase de Puesto", values: ["Profesor de Enseñanza Media"] },
      { column: "Institución", values: ["CTP Daniel Oduber"] },
    ]);
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].Vacante, "103");
  });
});

describe("diffVacancies", () => {
  const rows = parseVacancies(FIXTURE_HTML);

  it("detects added and removed vacancies", () => {
    const previous = [rows[0], rows[1]];
    const current = [rows[1], rows[2]];
    const { added, removed, unchanged } = diffVacancies(previous, current);
    assert.equal(unchanged, false);
    assert.deepEqual(added.map((row) => row.Vacante), ["103"]);
    assert.deepEqual(removed.map((row) => row.Vacante), ["101"]);
  });

  it("reports unchanged when the set is the same", () => {
    const { added, removed, unchanged } = diffVacancies(rows, [...rows]);
    assert.equal(unchanged, true);
    assert.equal(added.length, 0);
    assert.equal(removed.length, 0);
  });

  it("uses all configured cells as the identity key", () => {
    const a = { Vacante: "1", Especialidad: "Español", Institución: "A" };
    const b = { Vacante: "1", Especialidad: "Español", Institución: "B" };
    assert.notEqual(
      vacancyKey(a, ["Vacante", "Especialidad", "Institución"]),
      vacancyKey(b, ["Vacante", "Especialidad", "Institución"]),
    );
  });
});

describe("uniqueVacancies", () => {
  it("drops duplicate keys", () => {
    const rows = parseVacancies(FIXTURE_HTML);
    const deduped = uniqueVacancies([...rows, rows[0]]);
    assert.equal(deduped.length, rows.length);
  });
});

describe("buildNotification", () => {
  const rows = parseVacancies(FIXTURE_HTML);

  it("returns a short first-run message", () => {
    const notification = buildNotification({
      firstRun: true,
      current: rows,
      specialtyLabel: "Español",
      regionalLabel: "Regional Educación Perez Zeledon",
    });
    assert.match(notification.title, /Monitoreo iniciado: 3 vacantes/);
    assert.match(notification.body, /línea base/);
  });

  it("returns null when nothing changed", () => {
    const notification = buildNotification({
      added: [],
      removed: [],
      current: rows,
    });
    assert.equal(notification, null);
  });

  it("lists new vacancies with readable fields", () => {
    const notification = buildNotification({
      added: [rows[0]],
      removed: [],
      specialtyLabel: "Español",
      regionalLabel: "Regional Educación Perez Zeledon",
    });
    assert.match(notification.title, /1 vacante nueva de Español/);
    assert.match(notification.body, /Liceo Pérez Zeledón/);
    assert.match(notification.body, /Especialidad: Español/);
    assert.doesNotMatch(notification.body, / \| /);
  });

  it("lists removed vacancies", () => {
    const notification = buildNotification({
      added: [],
      removed: [rows[1]],
      regionalLabel: "Regional Educación Perez Zeledon",
    });
    assert.match(notification.title, /1 vacante ya no está/);
    assert.match(notification.body, /Ya no están/);
    assert.match(notification.body, /Escuela San Pedro/);
  });
});

describe("helpers", () => {
  it("falls back to default cell names", () => {
    assert.deepEqual(parseCellNames(""), DEFAULT_CELL_NAMES);
  });

  it("formats a vacancy without pipe-joined cells", () => {
    const text = formatVacancy({
      Vacante: "101",
      Especialidad: "Español",
      Institución: "Liceo Pérez Zeledón",
      Lecciones: "32",
    });
    assert.match(text, /^• Liceo Pérez Zeledón/);
    assert.doesNotMatch(text, / \| /);
  });

  it("truncates ntfy payloads near the 4KB limit", () => {
    const long = "á".repeat(5000);
    const truncated = truncateUtf8(long, NTFY_MAX_BYTES);
    assert.ok(Buffer.byteLength(truncated, "utf8") <= NTFY_MAX_BYTES);
    assert.match(truncated, /mensaje recortado/);
  });
});
