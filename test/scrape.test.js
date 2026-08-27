import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  findDropdownOption,
  formatMissingDropdownOption,
} from "../src/scrape.js";

const available = [
  { value: "54", label: "Regional Educación Alajuela" },
  { value: "53", label: "Regional Educación Perez Zeledon" },
];

describe("findDropdownOption", () => {
  it("prefers the option value over the label", () => {
    assert.deepEqual(
      findDropdownOption(available, { value: "53", label: "Alajuela" }),
      available[1],
    );
  });

  it("falls back to an exact label when the value is unknown", () => {
    assert.deepEqual(
      findDropdownOption(available, {
        value: "99",
        label: "Regional Educación Alajuela",
      }),
      available[0],
    );
  });

  it("accepts a partial label, ignoring case", () => {
    assert.deepEqual(
      findDropdownOption(available, { label: "perez zeledon" }),
      available[1],
    );
  });

  it("returns nothing when the regional is not offered", () => {
    assert.equal(
      findDropdownOption(available, { value: "1", label: "Cartago" }),
      undefined,
    );
  });
});

describe("formatMissingDropdownOption", () => {
  it("lists the regionales the page actually offered", () => {
    const message = formatMissingDropdownOption(
      { value: "1", label: "Cartago" },
      available,
    );
    assert.match(message, /No existe la opción "Cartago"/);
    assert.match(message, /54: Regional Educación Alajuela/);
    assert.match(message, /53: Regional Educación Perez Zeledon/);
  });

  it("says so when the page offered nothing", () => {
    assert.match(
      formatMissingDropdownOption({ value: "1", label: "Cartago" }, []),
      /\(ninguna\)/,
    );
  });
});
