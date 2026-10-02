import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { esVacanteNueva } from "./vacante-nueva";

const ahora = new Date("2026-01-02T10:00:00-06:00");

describe("esVacanteNueva", () => {
  it("marca una vacante vista hoy en Costa Rica", () => {
    assert.equal(esVacanteNueva("2026-01-02T00:01:00-06:00", ahora), true);
  });

  it("marca una vacante vista ayer a las 00:05 en Costa Rica", () => {
    assert.equal(esVacanteNueva("2026-01-01T00:05:00-06:00", ahora), true);
  });

  it("no marca una vacante vista anteayer a las 23:55 en Costa Rica", () => {
    assert.equal(esVacanteNueva("2025-12-31T23:55:00-06:00", ahora), false);
  });

  it("usa el día de Costa Rica y no el de UTC", () => {
    assert.equal(esVacanteNueva("2026-01-01T05:00:00.000Z", ahora), false);
    assert.equal(esVacanteNueva("2026-01-01T06:00:00.000Z", ahora), true);
  });

  it("cruza el cambio de mes y de año", () => {
    const primeroDeMarzo = new Date("2028-03-01T08:00:00-06:00");
    assert.equal(esVacanteNueva("2028-02-29T12:00:00-06:00", primeroDeMarzo), true);
    assert.equal(esVacanteNueva("2028-02-28T12:00:00-06:00", primeroDeMarzo), false);

    const anoNuevo = new Date("2026-01-01T08:00:00-06:00");
    assert.equal(esVacanteNueva("2025-12-31T23:00:00-06:00", anoNuevo), true);
    assert.equal(esVacanteNueva("2025-12-30T23:00:00-06:00", anoNuevo), false);
  });

  it("marca una primera vista con fecha futura", () => {
    assert.equal(esVacanteNueva("2026-01-05T09:00:00-06:00", ahora), true);
  });

  it("no marca una vacante sin firstSeen", () => {
    assert.equal(esVacanteNueva(undefined, ahora), false);
    assert.equal(esVacanteNueva("", ahora), false);
  });

  it("no marca un firstSeen inválido", () => {
    assert.equal(esVacanteNueva("no-es-fecha", ahora), false);
  });
});
