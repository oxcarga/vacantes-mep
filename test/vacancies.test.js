import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";
import {
  buildNotification,
  DEFAULT_CELL_NAMES,
  diffVacancies,
  loadBaseline,
  parseVacancies,
  saveBaseline,
  vacancyId,
} from "../src/vacancies.js";

const fixturePath = join(
  dirname(fileURLToPath(import.meta.url)),
  "fixtures",
  "table.html",
);
const fixtureHtml = readFileSync(fixturePath, "utf8");

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

test("parseVacancies keeps only Español rows from the fixture table", () => {
  const vacancies = parseVacancies(fixtureHtml, {
    contentSelector: ".mud-table-container",
    cellNames: DEFAULT_CELL_NAMES,
    filterLabel: "Especialidad",
    filterValue: "Español",
  });
  assert.equal(vacancies.length, 2);
  assert.deepEqual(vacancies[0], espanolA);
  assert.deepEqual(vacancies[1], espanolB);
});

test("parseVacancies throws when the content selector is missing", () => {
  assert.throws(
    () =>
      parseVacancies("<div></div>", {
        contentSelector: ".mud-table-container",
      }),
    /No se encontró el selector/,
  );
});

test("diffVacancies reports a new row", () => {
  const { added, removed } = diffVacancies(
    [espanolA],
    [espanolA, espanolC],
    DEFAULT_CELL_NAMES,
  );
  assert.deepEqual(added, [espanolC]);
  assert.deepEqual(removed, []);
});

test("diffVacancies reports a removed row", () => {
  const { added, removed } = diffVacancies(
    [espanolA, espanolB],
    [espanolA],
    DEFAULT_CELL_NAMES,
  );
  assert.deepEqual(added, []);
  assert.deepEqual(removed, [espanolB]);
});

test("diffVacancies reports no change when the set is the same", () => {
  const { added, removed } = diffVacancies(
    [espanolA, espanolB],
    [espanolB, espanolA],
    DEFAULT_CELL_NAMES,
  );
  assert.deepEqual(added, []);
  assert.deepEqual(removed, []);
});

test("vacancyId is stable for the same cells", () => {
  assert.equal(
    vacancyId(espanolA, DEFAULT_CELL_NAMES),
    vacancyId({ ...espanolA }, DEFAULT_CELL_NAMES),
  );
  assert.notEqual(
    vacancyId(espanolA, DEFAULT_CELL_NAMES),
    vacancyId(espanolB, DEFAULT_CELL_NAMES),
  );
});

test("buildNotification sends the full list on first run", () => {
  const notification = buildNotification({
    current: [espanolA, espanolB],
    added: [espanolA, espanolB],
    removed: [],
    isFirstRun: true,
    especialidad: "Español",
    regional: "Regional Educación Perez Zeledon",
  });
  assert.equal(notification.shouldNotify, true);
  assert.match(notification.title, /Hay 2 vacantes de Español/);
  assert.match(notification.body, /1001/);
  assert.match(notification.body, /1003/);
});

test("buildNotification stays quiet when nothing changed", () => {
  const notification = buildNotification({
    current: [espanolA],
    added: [],
    removed: [],
    isFirstRun: false,
    especialidad: "Español",
    regional: "Regional Educación Perez Zeledon",
  });
  assert.equal(notification.shouldNotify, false);
});

test("buildNotification describes new and closed vacancies", () => {
  const notification = buildNotification({
    current: [espanolC],
    added: [espanolC],
    removed: [espanolA],
    isFirstRun: false,
    especialidad: "Español",
    regional: "Regional Educación Perez Zeledon",
  });
  assert.equal(notification.shouldNotify, true);
  assert.match(notification.title, /Cambio en vacantes de Español/);
  assert.match(notification.body, /1 nueva/);
  assert.match(notification.body, /1004/);
  assert.match(notification.body, /ya no aparecen/);
  assert.match(notification.body, /1001/);
});

test("loadBaseline and saveBaseline round-trip vacancy rows", () => {
  const dir = mkdtempSync(join(tmpdir(), "vacantes-"));
  const path = join(dir, "baseline.json");
  assert.equal(loadBaseline(path), null);

  saveBaseline(path, [espanolA]);
  const loaded = loadBaseline(path);
  assert.ok(loaded);
  assert.deepEqual(loaded.vacancies, [espanolA]);
  assert.ok(loaded.checkedAt);

  writeFileSync(path, "{not json");
  assert.equal(loadBaseline(path), null);
});
