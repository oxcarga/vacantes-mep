import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

/**
 * Flattens a baseline into vacancy rows.
 * Accepts a flat vacancy array, a baseline object whose `vacancies` array is
 * flat, or the same array grouped as `{ regional, total, scrapedAt, vacantes }`.
 * @param {Object | Object[]} data
 * @returns {Object[] | null}
 */
export function flattenBaselineVacancies(data) {
  const vacancies = Array.isArray(data) ? data : data?.vacancies;
  if (!Array.isArray(vacancies)) return null;
  if (vacancies.some((item) => item && Array.isArray(item.vacantes))) {
    return vacancies.flatMap((group) =>
      Array.isArray(group?.vacantes) ? group.vacantes : [],
    );
  }
  return vacancies;
}

/**
 * Creates a JSON store for the vacancy baseline. This store is used when the
 * database URL is not set.
 * @param {Object} config - App config from `loadConfig`.
 * @param {string} config.baselinePath - The path to the baseline file.
 * @param {string} config.regional - The regional name.
 * @returns {Object} The JSON store.
 */
export function createJsonStore({ baselinePath, regional }) {
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
        const vacancies = flattenBaselineVacancies(data);
        if (!vacancies) return { isFirstRun: true, vacancies: [] };
        return { isFirstRun: false, vacancies };
      } catch (error) {
        console.warn(
          `No se pudo leer la línea base en ${baselinePath}: ${error.message}`,
        );
        return { isFirstRun: true, vacancies: [] };
      }
    },

    async commit({
      current,
      byRegional,
      added,
      removed,
      changed,
      contentHash,
    }) {
      const vacancies = Array.isArray(byRegional)
        ? byRegional
        : [
            {
              regional: { value: "", label: regional },
              total: current.length,
              scrapedAt: new Date().toISOString(),
              vacantes: current,
            },
          ];
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
            vacancies,
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
