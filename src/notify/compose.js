import {
  DEFAULT_CELL_NAMES,
  DEFAULT_IDENTITY_CELL_NAMES,
} from "../config.js";
import { formatChange, formatVacancyList } from "../vacancies/format.js";

/**
 * Returns `singular` when `count` is 1, otherwise `pluralForm`.
 * @param {number} count
 * @param {string} singular
 * @param {string} pluralForm
 * @returns {string}
 */
function plural(count, singular, pluralForm) {
  return count === 1 ? singular : pluralForm;
}

function regionalPhrase(regional) {
  const name = regional || "todas las regionales";
  if (/^(todas las |la )/i.test(name)) return name;
  return `la ${name}`;
}

/**
 * Returns a comma-joined label for the active specialty filter, or a generic
 * fallback phrase when no filter is configured.
 * @param {string[]} [values=[]] - Active specialty filter values from config.
 * @returns {string}
 */
export function specialtyLabel(values = []) {
  return values.length > 0 ? values.join(", ") : "todas las especialidades";
}

/**
 * Decides what notification (if any) to send based on the diff result. The
 * first run always returns the full list so the user can confirm filters are
 * working. Subsequent runs return `null` when nothing changed, or a title +
 * body describing additions, removals, and modifications.
 * @param {{ isFirstRun?: boolean, current?: Object[], added?: Object[],
 *   removed?: Object[], changed?: { before: Object, after: Object }[],
 *   specialty?: string, regional?: string,
 *   cellNames?: string[], identityCellNames?: string[] }} [options]
 * @returns {{ title: string, body: string } | null}
 *   A notification payload, or `null` when there is nothing to report.
 */
export function buildNotification({
  isFirstRun = false,
  current = [],
  added = [],
  removed = [],
  changed = [],
  specialty = "todas las especialidades",
  regional = "todas las regionales",
  cellNames = DEFAULT_CELL_NAMES,
  identityCellNames = DEFAULT_IDENTITY_CELL_NAMES,
} = {}) {
  if (isFirstRun) {
    return {
      title: `Hay ${current.length} ${plural(current.length, "vacante", "vacantes")} de ${specialty} en ${regionalPhrase(regional)}`,
      body:
        current.length > 0
          ? formatVacancyList(current, cellNames)
          : "No hay vacantes disponibles con ese filtro.",
    };
  }

  if (added.length === 0 && removed.length === 0 && changed.length === 0) {
    return null;
  }

  const summary = [];
  if (added.length > 0) {
    summary.push(`${added.length} ${plural(added.length, "nueva", "nuevas")}`);
  }
  if (removed.length > 0) {
    summary.push(
      `${removed.length} ${plural(removed.length, "cerrada", "cerradas")}`,
    );
  }
  if (changed.length > 0) {
    summary.push(
      `${changed.length} ${plural(changed.length, "modificada", "modificadas")}`,
    );
  }

  const sections = [];
  if (added.length > 0) {
    sections.push(
      `Nuevas (${added.length}):\n${formatVacancyList(added, cellNames)}`,
    );
  }
  if (removed.length > 0) {
    sections.push(
      `Ya no aparecen (${removed.length}):\n${formatVacancyList(removed, cellNames)}`,
    );
  }
  if (changed.length > 0) {
    sections.push(
      `Modificadas (${changed.length}):\n${changed
        .map((change) => formatChange(change, cellNames, identityCellNames))
        .join("\n")}`,
    );
  }

  return {
    title: `Vacantes de ${specialty} en ${regionalPhrase(regional)}: ${summary.join(", ")} (${current.length} activas)`,
    body: sections.join("\n\n"),
  };
}
