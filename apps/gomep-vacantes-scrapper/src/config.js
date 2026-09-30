import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: join(__dirname, "..", ".env"), quiet: true });

export const DEFAULT_CELL_NAMES = [
  "Vacante",
  "Especialidad",
  "Clase de Puesto",
  "Institución",
  "Lecciones",
];

/**
 * Cells that identify a vacancy. Anything else in TABLE_CELL_NAMES is a
 * detail: when it changes the vacancy is reported as modified instead of as
 * one removal plus one addition.
 */
export const DEFAULT_IDENTITY_CELL_NAMES = [
  "Vacante",
  "Especialidad",
  "Institución",
];

/**
 * Coerces an env var string to a boolean.
 * @param {string | undefined} value - Raw value from process.env.
 * @param {boolean} defaultValue - Returned when `value` is absent or unrecognised.
 * @returns {boolean}
 */
export function envFlag(value, defaultValue) {
  if (value === undefined || String(value).trim() === "") return defaultValue;
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "si", "sí"].includes(normalized)) return true;
  if (["0", "false", "no"].includes(normalized)) return false;
  return defaultValue;
}

/**
 * Returns the trimmed env var string, or `fallback` when the variable is absent or blank.
 * @param {string | undefined} value - Raw value from process.env.
 * @param {string} [fallback=""] - Value returned when `value` is empty.
 * @returns {string}
 */
export function envText(value, fallback = "") {
  const text = (value ?? "").toString().trim();
  return text || fallback;
}

/**
 * Parses an env var as an integer. Returns `fallback` when parsing fails or the result is below `min`.
 * @param {string | undefined} value - Raw value from process.env.
 * @param {number} fallback - Returned on parse failure or when the result is out of range.
 * @param {{ min?: number }} [options]
 * @returns {number}
 */
export function envInt(value, fallback, { min = 0 } = {}) {
  const parsed = Number.parseInt(String(value ?? "").trim(), 10);
  return Number.isFinite(parsed) && parsed >= min ? parsed : fallback;
}

/**
 * Splits a comma-separated env var into a trimmed string array. Returns `fallback` when empty.
 * @param {string | undefined} value - Raw value from process.env.
 * @param {string[]} [fallback=[]] - Returned when `value` is absent or produces no items.
 * @returns {string[]}
 */
export function envList(value, fallback = []) {
  const items = String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length > 0 ? items : [...fallback];
}

/**
 * Builds the active column filter list from the environment. Each filter is a
 * pair: TABLE_FILTER_<NAME> names the `data-label` column to read and
 * TABLE_FILTER_<NAME>_VALUE lists the accepted values (comma-separated).
 * @param {NodeJS.ProcessEnv} env
 * @returns {{ column: string, values: string[] }[]}
 */
function columnFilters(env) {
  return [
    ["TABLE_FILTER_ESPECIALIDAD", "Especialidad"],
    ["TABLE_FILTER_PUESTO", "Clase de Puesto"],
    ["TABLE_FILTER_INSTITUCION", "Institución"],
    ["TABLE_FILTER_LECCIONES", "Lecciones"],
  ]
    .map(([name, defaultColumn]) => ({
      column: envText(env[name], defaultColumn),
      values: envList(env[`${name}_VALUE`]),
    }))
    .filter((filter) => filter.column && filter.values.length > 0);
}

/**
 * Reads all environment variables and returns a validated, typed config object
 * used throughout the app. Accepts an optional `env` map so tests can inject
 * values without touching `process.env`.
 * @param {NodeJS.ProcessEnv} [env=process.env]
 * @returns {Object} Fully resolved config with typed, defaulted values for every setting.
 */
export function loadConfig(env = process.env) {
  const cellNames = envList(env.TABLE_CELL_NAMES, DEFAULT_CELL_NAMES);
  const identityCellNames = envList(
    env.TABLE_IDENTITY_CELL_NAMES,
    DEFAULT_IDENTITY_CELL_NAMES,
  ).filter((name) => cellNames.includes(name));

  return {
    targetUrl: envText(env.TARGET_URL, "https://apps.mep.go.cr/formulario"),
    contentSelector: envText(env.CONTENT_SELECTOR, ".mud-table-container"),

    usePlaywright: envFlag(env.USE_PLAYWRIGHT, true),
    headless: envFlag(env.HEADLESS, true),
    launchArgs: envList(env.PLAYWRIGHT_LAUNCH_ARGS),

    dropdownSelector: envText(env.DROPDOWN_SELECTOR, "#regionalSelect"),
    dropdownWaitAfterMs: envInt(env.DROPDOWN_WAIT_AFTER_MS, 2000),
    maxPages: envInt(env.MAX_PAGES, 30, { min: 1 }),
    scrapeAttempts: envInt(env.SCRAPE_ATTEMPTS, 3, { min: 1 }),
    scrapeRetryDelayMs: envInt(env.SCRAPE_RETRY_DELAY_MS, 5000),

    cellNames,
    identityCellNames:
      identityCellNames.length > 0 ? identityCellNames : cellNames,
    columnFilters: columnFilters(env),
    allowEmptyTable: envFlag(env.ALLOW_EMPTY_TABLE, false),

    regional: "todas las regionales",

    baselinePath: resolve(
      process.cwd(),
      envText(env.BASELINE_PATH, "data/baseline.json"),
    ),
    firestoreProjectId: envText(
      env.FIRESTORE_PROJECT_ID,
      envText(env.GOOGLE_CLOUD_PROJECT),
    ),
    firestoreEmulatorHost: envText(env.FIRESTORE_EMULATOR_HOST),
  };
}
