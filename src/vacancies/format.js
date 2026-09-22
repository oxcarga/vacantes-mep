import { DEFAULT_CELL_NAMES } from "../config.js";
import { detailCellNames } from "./identity.js";

/**
 * Formats a single vacancy as a human-readable bullet-point string, leading
 * with the institution name and listing remaining cells as `key: value` pairs.
 * @param {Object} vacancy - A parsed vacancy object.
 * @param {string[]} [cellNames=DEFAULT_CELL_NAMES]
 * @returns {string}
 */
export function formatVacancy(vacancy, cellNames = DEFAULT_CELL_NAMES) {
  const names =
    vacancy?.Regional && !cellNames.includes("Regional")
      ? ["Regional", ...cellNames]
      : cellNames;
  const headline = vacancy?.["Institución"] || vacancy?.[names[0]] || "";
  const details = names
    .filter((name) => name !== "Institución" && vacancy?.[name])
    .map((name) => `${name}: ${vacancy[name]}`)
    .join(" · ");
  if (!headline && !details) return "• (vacante)";
  return details ? `• ${headline}\n  ${details}` : `• ${headline}`;
}

/**
 * Formats an array of vacancies into a newline-separated string of bullet points.
 * @param {Object[]} rows - Parsed vacancy objects.
 * @param {string[]} [cellNames=DEFAULT_CELL_NAMES]
 * @returns {string}
 */
export function formatVacancyList(rows, cellNames = DEFAULT_CELL_NAMES) {
  return rows.map((row) => formatVacancy(row, cellNames)).join("\n");
}

/**
 * Formats a modified vacancy showing which detail cells changed and their
 * old → new values alongside the vacancy's identity information.
 * @param {{ before: Object, after: Object }} change - The before/after pair from `diffVacancies`.
 * @param {string[]} cellNames - All configured cell names.
 * @param {string[]} identityCellNames - Identity-only cell names.
 * @returns {string}
 */
export function formatChange({ before, after }, cellNames, identityCellNames) {
  const diffs = detailCellNames(cellNames, identityCellNames)
    .filter((name) => (before[name] ?? "") !== (after[name] ?? ""))
    .map((name) => `${name}: ${before[name] || "—"} → ${after[name] || "—"}`)
    .join(" · ");
  return `${formatVacancy(after, identityCellNames)}\n  ${diffs}`;
}
