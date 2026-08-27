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

export function envFlag(value, defaultValue) {
  if (value === undefined || String(value).trim() === "") return defaultValue;
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "si", "sí"].includes(normalized)) return true;
  if (["0", "false", "no"].includes(normalized)) return false;
  return defaultValue;
}

export function envText(value, fallback = "") {
  const text = (value ?? "").toString().trim();
  return text || fallback;
}

export function envInt(value, fallback, { min = 0 } = {}) {
  const parsed = Number.parseInt(String(value ?? "").trim(), 10);
  return Number.isFinite(parsed) && parsed >= min ? parsed : fallback;
}

export function envList(value, fallback = []) {
  const items = String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length > 0 ? items : [...fallback];
}

/**
 * Column filters are declared as a pair of variables so the column heading and
 * the value to match stay configurable: TABLE_FILTER_<NAME> is the data-label
 * to read and TABLE_FILTER_<NAME>_VALUE holds one or more accepted values.
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

export function loadConfig(env = process.env) {
  const cellNames = envList(env.TABLE_CELL_NAMES, DEFAULT_CELL_NAMES);
  const identityCellNames = envList(
    env.TABLE_IDENTITY_CELL_NAMES,
    DEFAULT_IDENTITY_CELL_NAMES,
  ).filter((name) => cellNames.includes(name));

  const especialidades = envList(env.TABLE_FILTER_ESPECIALIDAD_VALUE);
  // Only fall back to Pérez Zeledón when neither half of the pair is set:
  // defaulting the value on its own would override a label chosen alone.
  const chosenLabel = envText(env.DROPDOWN_OPTION_LABEL);
  const chosenValue = envText(env.DROPDOWN_OPTION_VALUE);
  const dropdownLabel =
    chosenLabel || (chosenValue ? "" : "Regional Educación Perez Zeledon");
  const dropdownValue = chosenValue || (chosenLabel ? "" : "53");

  return {
    targetUrl: envText(env.TARGET_URL, "https://apps.mep.go.cr/formulario"),
    contentSelector: envText(env.CONTENT_SELECTOR, ".mud-table-container"),

    usePlaywright: envFlag(env.USE_PLAYWRIGHT, true),
    headless: envFlag(env.HEADLESS, true),
    launchArgs: envList(env.PLAYWRIGHT_LAUNCH_ARGS),

    dropdownSelector: envText(env.DROPDOWN_SELECTOR, "#regionalSelect"),
    dropdownOptionValue: dropdownValue,
    dropdownOptionLabel: dropdownLabel,
    dropdownWaitAfterMs: envInt(env.DROPDOWN_WAIT_AFTER_MS, 2000),
    dropdownCustom: envFlag(env.DROPDOWN_CUSTOM, true),
    dropdownOptionSelector: envText(
      env.DROPDOWN_OPTION_SELECTOR,
      ".mud-list-item, [role='option'], .mud-select-item",
    ),
    maxPages: envInt(env.MAX_PAGES, 30, { min: 1 }),
    scrapeAttempts: envInt(env.SCRAPE_ATTEMPTS, 3, { min: 1 }),
    scrapeRetryDelayMs: envInt(env.SCRAPE_RETRY_DELAY_MS, 5000),

    cellNames,
    identityCellNames:
      identityCellNames.length > 0 ? identityCellNames : cellNames,
    columnFilters: columnFilters(env),
    allowEmptyTable: envFlag(env.ALLOW_EMPTY_TABLE, false),

    regional: dropdownLabel || dropdownValue,
    especialidades,

    baselinePath: resolve(
      process.cwd(),
      envText(env.BASELINE_PATH, "data/baseline.json"),
    ),
    databaseUrl: envText(env.DATABASE_URL),
    databaseAuthToken: envText(env.DATABASE_AUTH_TOKEN),

    ntfyTopic: envText(env.NTFY_TOPIC),
    telegramBotToken: envText(env.TELEGRAM_BOT_TOKEN),
    telegramChatId: envText(env.TELEGRAM_CHAT_ID),
  };
}
