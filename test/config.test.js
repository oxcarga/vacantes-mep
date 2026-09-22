import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_CELL_NAMES,
  envFlag,
  envInt,
  envList,
  envText,
  loadConfig,
} from "../src/config.js";

describe("environment helpers", () => {
  it("reads flags in either language and either notation", () => {
    for (const value of ["1", "true", "TRUE", "yes", "sí"]) {
      assert.equal(envFlag(value, false), true, value);
    }
    for (const value of ["0", "false", "no"]) {
      assert.equal(envFlag(value, true), false, value);
    }
  });

  it("keeps the default for unset, blank or unreadable values", () => {
    assert.equal(envFlag(undefined, true), true);
    assert.equal(envFlag("   ", true), true);
    assert.equal(envFlag("quizás", true), true);
    assert.equal(envText("  ", "fallback"), "fallback");
    assert.equal(envInt("no-es-un-número", 2000), 2000);
    assert.equal(envInt("-5", 2000), 2000);
    assert.deepEqual(envList(" , ", ["a"]), ["a"]);
  });

  it("trims and splits lists", () => {
    assert.deepEqual(envList(" Español , Inglés "), ["Español", "Inglés"]);
  });
});

describe("loadConfig", () => {
  it("scrapes every regional and applies no filters out of the box", () => {
    const config = loadConfig({});
    assert.equal(config.targetUrl, "https://apps.mep.go.cr/formulario");
    assert.equal(config.dropdownOptionValue, "");
    assert.equal(config.dropdownOptionLabel, "");
    assert.equal(config.scrapeAllRegionales, true);
    assert.equal(config.regional, "todas las regionales");
    assert.deepEqual(config.cellNames, DEFAULT_CELL_NAMES);
    assert.deepEqual(config.columnFilters, []);
  });

  it("does not keep the default value when only a label is given", () => {
    const config = loadConfig({
      DROPDOWN_OPTION_LABEL: "Regional Educación Alajuela",
    });
    assert.equal(config.dropdownOptionValue, "");
    assert.equal(config.scrapeAllRegionales, false);
    assert.equal(config.regional, "Regional Educación Alajuela");
  });

  it("does not keep the default label when only a value is given", () => {
    const config = loadConfig({ DROPDOWN_OPTION_VALUE: "54" });
    assert.equal(config.dropdownOptionLabel, "");
    assert.equal(config.scrapeAllRegionales, false);
    assert.equal(config.regional, "54");
  });

  it("builds a filter only for columns that have values", () => {
    const config = loadConfig({
      TABLE_FILTER_ESPECIALIDAD_VALUE: "Español, Inglés",
      TABLE_FILTER_LECCIONES_VALUE: "32",
    });
    assert.deepEqual(config.columnFilters, [
      { column: "Especialidad", values: ["Español", "Inglés"] },
      { column: "Lecciones", values: ["32"] },
    ]);
    assert.deepEqual(config.especialidades, ["Español", "Inglés"]);
  });

  it("ignores identity columns that are not being read", () => {
    const config = loadConfig({
      TABLE_CELL_NAMES: "Vacante,Institución",
      TABLE_IDENTITY_CELL_NAMES: "Vacante,Especialidad,Institución",
    });
    assert.deepEqual(config.identityCellNames, ["Vacante", "Institución"]);
  });

  it("falls back to every column when no identity column is readable", () => {
    const config = loadConfig({
      TABLE_CELL_NAMES: "Puesto,Horario",
      TABLE_IDENTITY_CELL_NAMES: "Vacante",
    });
    assert.deepEqual(config.identityCellNames, ["Puesto", "Horario"]);
  });
});
