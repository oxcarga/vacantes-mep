import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
  DEFAULT_CELL_NAMES,
  DEFAULT_IDENTITY_CELL_NAMES,
  NTFY_MAX_BYTES,
  buildNotification,
  diffVacancies,
  filterVacancies,
  formatVacancy,
  hashVacancies,
  parseVacancies,
  specialtyLabel,
  truncateUtf8,
  uniqueVacancies,
  vacancyId,
  vacancyKey,
} from "../src/vacancies.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE = readFileSync(
  join(__dirname, "fixtures", "vacantes.html"),
  "utf8",
);

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
const espanolC = {
  Vacante: "1004",
  Especialidad: "Español",
  "Clase de Puesto": "Profesor de Enseñanza Media",
  Institución: "Liceo Nuevo",
  Lecciones: "12",
};

describe("parseVacancies", () => {
  it("reads rows as objects keyed by data-label", () => {
    const rows = parseVacancies(FIXTURE, {
      contentSelector: ".mud-table-container",
    });
    assert.equal(rows.length, 3);
    assert.deepEqual(rows[0], espanolA);
  });

  it("collapses cell text that wraps across lines", () => {
    const rows = parseVacancies(FIXTURE, {
      contentSelector: ".mud-table-container",
    });
    assert.equal(rows[2]["Clase de Puesto"], espanolB["Clase de Puesto"]);
  });

  it("throws when the content selector is missing from the page", () => {
    assert.throws(
      () =>
        parseVacancies("<div></div>", {
          contentSelector: ".mud-table-container",
        }),
      /No se encontró el selector/,
    );
  });

  it("skips blank rows", () => {
    const html = `<table><tbody><tr><td data-label="Vacante">  </td></tr></tbody></table>`;
    assert.deepEqual(parseVacancies(html), []);
  });
});

describe("filterVacancies", () => {
  const rows = parseVacancies(FIXTURE, {
    contentSelector: ".mud-table-container",
  });

  it("keeps every row when a filter has no values", () => {
    assert.equal(
      filterVacancies(rows, [{ column: "Especialidad", values: [] }]).length,
      3,
    );
  });

  it("keeps only the matching especialidad", () => {
    const filtered = filterVacancies(rows, [
      { column: "Especialidad", values: ["Español"] },
    ]);
    assert.deepEqual(filtered, [espanolA, espanolB]);
  });

  it("accepts several especialidades at once", () => {
    const filtered = filterVacancies(rows, [
      { column: "Especialidad", values: ["Español", "Inglés"] },
    ]);
    assert.equal(filtered.length, 3);
  });

  it("combines filters across columns", () => {
    const filtered = filterVacancies(rows, [
      { column: "Especialidad", values: ["Español"] },
      { column: "Lecciones", values: ["20"] },
    ]);
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].Institución, "Escuela El General");
  });
});

describe("uniqueVacancies", () => {
  it("drops rows repeated across paginated pages", () => {
    const deduped = uniqueVacancies(
      [espanolA, espanolB, { ...espanolA }],
      DEFAULT_IDENTITY_CELL_NAMES,
    );
    assert.deepEqual(deduped, [espanolA, espanolB]);
  });
});

describe("vacancy identity", () => {
  it("ignores detail cells so an edited row keeps its id", () => {
    assert.equal(
      vacancyId(espanolA, DEFAULT_IDENTITY_CELL_NAMES, "Perez Zeledon"),
      vacancyId(
        { ...espanolA, Lecciones: "32" },
        DEFAULT_IDENTITY_CELL_NAMES,
        "Perez Zeledon",
      ),
    );
  });

  it("separates the same vacancy in different regionales", () => {
    assert.notEqual(
      vacancyId(espanolA, DEFAULT_IDENTITY_CELL_NAMES, "Perez Zeledon"),
      vacancyId(espanolA, DEFAULT_IDENTITY_CELL_NAMES, "Alajuela"),
    );
  });

  it("distinguishes rows that differ in an identity cell", () => {
    assert.notEqual(
      vacancyKey(espanolA, DEFAULT_IDENTITY_CELL_NAMES),
      vacancyKey(espanolB, DEFAULT_IDENTITY_CELL_NAMES),
    );
  });

  it("hashes a list independently of row order", () => {
    assert.equal(
      hashVacancies([espanolA, espanolB]),
      hashVacancies([espanolB, espanolA]),
    );
    assert.notEqual(
      hashVacancies([espanolA]),
      hashVacancies([espanolA, espanolB]),
    );
  });
});

describe("diffVacancies", () => {
  it("reports a new vacancy", () => {
    const diff = diffVacancies([espanolA], [espanolA, espanolC]);
    assert.deepEqual(diff.added, [espanolC]);
    assert.deepEqual(diff.removed, []);
    assert.deepEqual(diff.changed, []);
    assert.equal(diff.hasChanges, true);
  });

  it("reports a closed vacancy", () => {
    const diff = diffVacancies([espanolA, espanolB], [espanolA]);
    assert.deepEqual(diff.added, []);
    assert.deepEqual(diff.removed, [espanolB]);
  });

  it("reports an edited vacancy as changed, not as removed plus added", () => {
    const edited = { ...espanolA, Lecciones: "32" };
    const diff = diffVacancies([espanolA], [edited]);
    assert.deepEqual(diff.added, []);
    assert.deepEqual(diff.removed, []);
    assert.equal(diff.changed.length, 1);
    assert.equal(diff.changed[0].before.Lecciones, "30");
    assert.equal(diff.changed[0].after.Lecciones, "32");
  });

  it("stays quiet when the same rows come back in another order", () => {
    const diff = diffVacancies([espanolA, espanolB], [espanolB, espanolA]);
    assert.equal(diff.hasChanges, false);
  });
});

describe("buildNotification", () => {
  it("lists everything on the first run", () => {
    const notification = buildNotification({
      isFirstRun: true,
      current: [espanolA, espanolB],
      specialty: "Español",
      regional: "Regional Educación Perez Zeledon",
    });
    assert.match(notification.title, /Hay 2 vacantes de Español/);
    assert.match(notification.body, /Liceo Pérez Zeledón/);
    assert.match(notification.body, /Escuela El General/);
  });

  it("explains an empty first run", () => {
    const notification = buildNotification({ isFirstRun: true, current: [] });
    assert.match(notification.title, /Hay 0 vacantes/);
    assert.match(notification.body, /No hay vacantes disponibles/);
  });

  it("returns null when nothing changed", () => {
    assert.equal(
      buildNotification({ current: [espanolA], added: [], removed: [] }),
      null,
    );
  });

  it("summarises additions, closures and edits in the title", () => {
    const notification = buildNotification({
      current: [espanolC],
      added: [espanolC],
      removed: [espanolA],
      changed: [{ before: espanolB, after: { ...espanolB, Lecciones: "24" } }],
      specialty: "Español",
      regional: "Regional Educación Perez Zeledon",
    });
    assert.match(notification.title, /1 nueva, 1 cerrada, 1 modificada/);
    assert.match(notification.body, /Nuevas \(1\)/);
    assert.match(notification.body, /Ya no aparecen \(1\)/);
    assert.match(notification.body, /Modificadas \(1\)/);
    assert.match(notification.body, /Lecciones: 20 → 24/);
  });

  it("uses singular and plural correctly", () => {
    const two = buildNotification({
      current: [],
      added: [espanolA, espanolB],
      removed: [],
    });
    assert.match(two.title, /2 nuevas/);
  });
});

describe("formatting helpers", () => {
  it("leads with the institution and labels the rest", () => {
    const text = formatVacancy(espanolA, DEFAULT_CELL_NAMES);
    assert.match(text, /^• Liceo Pérez Zeledón/);
    assert.match(text, /Lecciones: 30/);
  });

  it("names the specialties being watched", () => {
    assert.equal(specialtyLabel([]), "todas las especialidades");
    assert.equal(specialtyLabel(["Español", "Inglés"]), "Español, Inglés");
  });

  it("truncates to a byte budget without splitting a character", () => {
    const truncated = truncateUtf8("á".repeat(5000), NTFY_MAX_BYTES);
    assert.ok(Buffer.byteLength(truncated, "utf8") <= NTFY_MAX_BYTES);
    assert.match(truncated, /mensaje recortado/);
    assert.doesNotMatch(truncated, /\uFFFD/);
  });

  it("leaves short messages untouched", () => {
    assert.equal(truncateUtf8("hola", NTFY_MAX_BYTES), "hola");
  });
});
