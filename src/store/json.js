import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { vacancyId, vacancyRegional } from "../vacancies/identity.js";

/**
 * Creates a JSON store for the vacancy baseline. This store is used when the
 * database URL is not set.
 * @param {Object} config - App config from `loadConfig`.
 * @param {string} config.baselinePath - The path to the baseline file.
 * @param {string} config.regional - The regional name.
 * @param {string[]} config.identityCellNames - The identity cell names.
 * @returns {Object} The JSON store.
 */
export function createJsonStore({ baselinePath, regional, identityCellNames }) {
  return {
    kind: "json",
    description: baselinePath,

    async init() {
      mkdirSync(dirname(baselinePath), { recursive: true });
    },

    async loadPrevious() {
      if (!existsSync(baselinePath)) return { isFirstRun: true, vacancies: [] };
      try {
        const data = JSON.parse(readFileSync(baselinePath, "utf8"));
        if (!Array.isArray(data?.vacancies)) {
          return { isFirstRun: true, vacancies: [] };
        }
        return { isFirstRun: false, vacancies: data.vacancies };
      } catch (error) {
        console.warn(
          `No se pudo leer la línea base en ${baselinePath}: ${error.message}`,
        );
        return { isFirstRun: true, vacancies: [] };
      }
    },

    async commit({ current, added, removed, changed, contentHash }) {
      writeFileSync(
        baselinePath,
        `${JSON.stringify(
          {
            checkedAt: new Date().toISOString(),
            regional,
            contentHash,
            counts: {
              total: current.length,
              added: added.length,
              removed: removed.length,
              changed: changed.length,
            },
            vacancies: current.map((vacancy) => ({
              id: vacancyId(
                vacancy,
                identityCellNames,
                vacancyRegional(vacancy, regional),
              ),
              ...vacancy,
            })),
          },
          null,
          2,
        )}\n`,
      );
    },

    async recordFailure() {},

    async close() {},
  };
}
