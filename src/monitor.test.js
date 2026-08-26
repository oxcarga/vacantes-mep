import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { loadBaseline, saveBaseline } from "./monitor.js";

describe("baseline persistence", () => {
  it("round-trips vacancies and returns null when missing or invalid", () => {
    const dir = mkdtempSync(join(tmpdir(), "vacantes-"));
    const path = join(dir, "baseline.json");
    try {
      assert.equal(loadBaseline(path), null);

      const vacancies = [
        {
          Vacante: "101",
          Especialidad: "Español",
          Institución: "Liceo Pérez Zeledón",
        },
      ];
      saveBaseline(vacancies, path);
      const loaded = loadBaseline(path);
      assert.ok(loaded.timestamp);
      assert.deepEqual(loaded.vacancies, vacancies);

      saveBaseline("not-an-array", path);
      assert.equal(loadBaseline(path), null);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
