import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
  DEFAULT_IDENTITY_CELL_NAMES,
  diffVacancies,
  filterVacancies,
  hashVacancies,
  parseVacancies,
  uniqueVacancies,
  vacancyId,
  vacancyKey,
} from "../src/vacancies/index.js";

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

  it("keeps the Aplicar URL stamped on the row", () => {
    const html = `<table><tbody><tr data-aplicar="https://apps.mep.go.cr/formulario/solicitud?data=abc">
      <td data-label="Vacante">1001</td>
      <td data-label="Especialidad">Español</td>
      <td data-label="Clase de Puesto">Profesor de Enseñanza Media</td>
      <td data-label="Institución">Liceo Pérez Zeledón</td>
      <td data-label="Lecciones">30</td>
    </tr></tbody></table>`;
    const [row] = parseVacancies(html);
    assert.equal(
      row.Aplicar,
      "https://apps.mep.go.cr/formulario/solicitud?data=abc",
    );
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

  it("keeps the same vacancy when it appears in two regionales", () => {
    const a = { ...espanolA, Regional: "Pérez Zeledón" };
    const b = { ...espanolA, Regional: "Alajuela" };
    assert.deepEqual(uniqueVacancies([a, b], DEFAULT_IDENTITY_CELL_NAMES), [
      a,
      b,
    ]);
  });
});

describe("vacancy identity", () => {
  it("uses the Vacante number as the document id", () => {
    assert.equal(vacancyId(espanolA), "1001");
    assert.equal(vacancyId({ ...espanolA, Vacante: " 1546958 " }), "1546958");
  });

  it("ignores detail cells and regional so an edited row keeps its id", () => {
    assert.equal(
      vacancyId(espanolA),
      vacancyId({ ...espanolA, Lecciones: "32", Regional: "Alajuela" }),
    );
  });

  it("rejects a vacancy without a Vacante number", () => {
    assert.throws(() => vacancyId({ Especialidad: "Español" }), /Vacante/);
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
    assert.notEqual(
      hashVacancies([{ ...espanolA, Regional: "Pérez Zeledón" }]),
      hashVacancies([{ ...espanolA, Regional: "Alajuela" }]),
    );
    assert.notEqual(
      hashVacancies([espanolA]),
      hashVacancies([{ ...espanolA, Aplicar: "https://apps.mep.go.cr/formulario/solicitud?data=abc" }]),
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

  it("treats the same identity in two regionales as two vacancies", () => {
    const pz = { ...espanolA, Regional: "Pérez Zeledón" };
    const alajuela = { ...espanolA, Regional: "Alajuela" };
    const diff = diffVacancies([pz], [pz, alajuela]);
    assert.deepEqual(diff.added, [alajuela]);
    assert.deepEqual(diff.removed, []);
  });

  it("stays quiet when the same rows come back in another order", () => {
    const diff = diffVacancies([espanolA, espanolB], [espanolB, espanolA]);
    assert.equal(diff.hasChanges, false);
  });

  it("treats a new or edited Aplicar link as a modification", () => {
    const withLink = {
      ...espanolA,
      Aplicar: "https://apps.mep.go.cr/formulario/solicitud?data=abc",
    };
    const added = diffVacancies([espanolA], [withLink]);
    assert.equal(added.changed.length, 1);
    assert.equal(added.changed[0].after.Aplicar, withLink.Aplicar);

    const edited = diffVacancies(
      [withLink],
      [{ ...withLink, Aplicar: "https://apps.mep.go.cr/formulario/solicitud?data=xyz" }],
    );
    assert.equal(edited.changed.length, 1);
  });
});
